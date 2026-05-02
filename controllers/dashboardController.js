/**
 * Dashboard Controller — GET /api/dashboard, POST /api/dashboard/check
 *
 * Aggregates:
 *   - Today's schedule (grouped by morning/noon/night)
 *   - Per-element intake progress bars (current intake vs RDA vs UL)
 *   - Stock alerts
 *   - Supplement consumption (checkbox)
 */

const { getDb } = require('../config/database');
const schedulerCore = require('../utils/schedulerCore');

/**
 * GET /api/dashboard — uses JWT user_id from auth middleware
 */
async function getDashboard(req, res, next) {
  try {
    const userId = req.user ? req.user.user_id : parseInt(req.query.user_id);
    if (!userId) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // Verify user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: `User ${userId} not found` });

    // Auto-generate schedule if not already done for today
    const existingSchedule = db.prepare(
      'SELECT COUNT(*) as cnt FROM daily_schedule WHERE user_id = ? AND scheduled_date = ?'
    ).get(userId, today);

    if (existingSchedule.cnt === 0) {
      schedulerCore.generatePlan(userId);
    }

    // Get schedule
    const schedule = schedulerCore.getTodaySchedule(userId);

    // Get inventory
    const inventory = db.prepare(`
      SELECT * FROM inventory
      WHERE user_id = ? AND current_count > 0
      ORDER BY created_at DESC
    `).all(userId);

    // Calculate per-element totals from active inventory
    const elementTotals = {};
    for (const item of inventory) {
      const nutrients = JSON.parse(item.nutrients_json || '[]');
      for (const n of nutrients) {
        const en = n.element;
        if (!elementTotals[en]) {
          elementTotals[en] = { amount: 0, unit: n.unit, rda: null, ul: null, category: null, tier: n.tier || 3 };
        }
        elementTotals[en].amount += (n.amount_per_serving || 0) * item.dosage_per_day;
      }
    }

    // Dynamic age calculation for RDA matching
    const currentAge = calculateAge(user.birth_date);

    // Enrich with standards data — dynamically matched by current age
    for (const [elName, total] of Object.entries(elementTotals)) {
      const std = db.prepare(`
        SELECT * FROM nutrient_standards
        WHERE element_name = ?
          AND region = 'US'
          AND (gender = ? OR gender = 'all')
          AND age_min <= ?
          AND age_max >= ?
        LIMIT 1
      `).get(elName, user.gender || 'all', currentAge, currentAge);

      if (std) {
        total.rda = std.rda;
        total.ul = std.ul;
        total.category = std.category;
      } else {
        // Fallback: match without age restriction
        const fallback = db.prepare(`
          SELECT * FROM nutrient_standards
          WHERE element_name = ? AND region = 'US'
          LIMIT 1
        `).get(elName);
        if (fallback) {
          total.rda = fallback.rda;
          total.ul = fallback.ul;
          total.category = fallback.category;
        }
      }
    }

    // Get unacknowledged alerts
    const alerts = db.prepare(`
      SELECT * FROM alerts
      WHERE user_id = ? AND acknowledged = 0
      ORDER BY
        CASE alert_type
          WHEN 'ul_warning' THEN 1
          WHEN 'critical_stock' THEN 2
          WHEN 'expired' THEN 3
          WHEN 'low_stock' THEN 4
        END,
        created_at DESC
    `).all(userId);

    // Stock alerts for each inventory item
    const stockAlerts = inventory.map(item => {
      const remainingDays = item.dosage_per_day > 0
        ? Math.floor(item.current_count / item.dosage_per_day)
        : Infinity;

      let status = 'ok';
      if (remainingDays <= 7) status = 'critical';
      else if (remainingDays <= 30) status = 'low';

      return {
        inventory_id: item.id,
        product_name: item.product_name,
        current_count: item.current_count,
        dosage_per_day: item.dosage_per_day,
        remaining_days: remainingDays === Infinity ? null : remainingDays,
        status,
      };
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        birth_date: user.birth_date,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        conditions: JSON.parse(user.conditions || '[]'),
        atc_conditions: JSON.parse(user.atc_conditions || '[]'),
        goals: JSON.parse(user.goals || '[]'),
      },
      schedule: schedule.map(s => ({
        id: s.id,
        inventory_id: s.inventory_id,
        product_name: s.product_name,
        time_of_day: s.time_of_day,
        dosage: s.dosage,
        consumed: s.consumed === 1,
      })),
      element_progress: Object.entries(elementTotals).map(([name, data]) => ({
        element: name,
        category: data.category,
        current_intake: data.amount,
        unit: data.unit,
        rda: data.rda,
        ul: data.ul,
        tier: data.tier,
        rda_percent: data.rda ? Math.round((data.amount / data.rda) * 100) : null,
        ul_percent: data.ul ? Math.round((data.amount / data.ul) * 100) : null,
      })),
      stock_alerts: stockAlerts,
      alerts,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/dashboard/check
 * Body: { user_id, schedule_id }
 * Marks a schedule item as consumed and decrements inventory.
 */
async function checkDose(req, res, next) {
  try {
    const userId = req.user ? req.user.user_id : req.body.user_id;
    const { schedule_id } = req.body;
    if (!userId || !schedule_id) {
      return res.status(400).json({ error: 'schedule_id is required' });
    }

    const db = getDb();

    // Verify schedule item
    const scheduleItem = db.prepare(`
      SELECT * FROM daily_schedule WHERE id = ? AND user_id = ?
    `).get(schedule_id, userId);

    if (!scheduleItem) {
      return res.status(404).json({ error: 'Schedule item not found' });
    }
    if (scheduleItem.consumed) {
      return res.status(400).json({ error: 'Already consumed' });
    }

    const tx = db.transaction(() => {
      // Mark as consumed
      db.prepare('UPDATE daily_schedule SET consumed = 1 WHERE id = ?').run(schedule_id);

      // Decrement inventory
      db.prepare(`
        UPDATE inventory SET current_count = MAX(0, current_count - ?)
        WHERE id = ? AND user_id = ?
      `).run(scheduleItem.dosage, scheduleItem.inventory_id, userId);

      // Log consumption
      db.prepare(`
        INSERT INTO consumption_log (user_id, inventory_id, time_of_day, dosage_taken)
        VALUES (?, ?, ?, ?)
      `).run(userId, scheduleItem.inventory_id, scheduleItem.time_of_day, scheduleItem.dosage);

      // Check if stock alert is needed
      const inv = db.prepare('SELECT * FROM inventory WHERE id = ?').get(scheduleItem.inventory_id);
      if (inv && inv.dosage_per_day > 0) {
        const remainingDays = Math.floor(inv.current_count / inv.dosage_per_day);
        if (remainingDays <= 7) {
          db.prepare(`
            INSERT INTO alerts (user_id, inventory_id, alert_type, message)
            VALUES (?, ?, 'critical_stock', ?)
          `).run(userId, inv.id, `${inv.product_name}: only ${inv.current_count} units left (${remainingDays} days)`);
        } else if (remainingDays <= 30) {
          db.prepare(`
            INSERT INTO alerts (user_id, inventory_id, alert_type, message)
            VALUES (?, ?, 'low_stock', ?)
          `).run(user_id, inv.id, `${inv.product_name}: ${inv.current_count} units remaining (${remainingDays} days)`);
        }
      }
    });
    tx();

    // Get updated inventory count
    const updatedInv = db.prepare(
      'SELECT current_count FROM inventory WHERE id = ?'
    ).get(scheduleItem.inventory_id);

    res.json({
      success: true,
      schedule_id,
      time_of_day: scheduleItem.time_of_day,
      remaining_units: updatedInv.current_count,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/dashboard/undo -- undo a recently checked dose
async function undoCheckDose(req, res, next) {
  try {
    const userId = req.user ? req.user.user_id : req.body.user_id;
    const { schedule_id } = req.body;
    if (!userId || !schedule_id) return res.status(400).json({ error: 'schedule_id is required' });

    const db = getDb();
    const item = db.prepare('SELECT * FROM daily_schedule WHERE id = ? AND user_id = ?').get(schedule_id, userId);
    if (!item) return res.status(404).json({ error: 'Schedule item not found' });
    if (!item.consumed) return res.status(400).json({ error: 'Dose was not consumed' });

    db.transaction(() => {
      db.prepare('UPDATE daily_schedule SET consumed = 0 WHERE id = ?').run(schedule_id);
      db.prepare('UPDATE inventory SET current_count = current_count + ? WHERE id = ?').run(item.dosage, item.inventory_id);
      db.prepare('DELETE FROM consumption_log WHERE user_id = ? AND inventory_id = ? AND consumed_at = (SELECT MAX(consumed_at) FROM consumption_log WHERE user_id = ? AND inventory_id = ?)').run(userId, item.inventory_id, userId, item.inventory_id);
    })();

    res.json({ success: true, undone: schedule_id });
  } catch (err) { next(err); }
}

// POST /api/dashboard/skip -- skip a dose today (no inventory decrement)
async function skipDose(req, res, next) {
  try {
    const userId = req.user ? req.user.user_id : req.body.user_id;
    const { schedule_id } = req.body;
    if (!userId || !schedule_id) return res.status(400).json({ error: 'schedule_id is required' });

    const db = getDb();
    const item = db.prepare('SELECT * FROM daily_schedule WHERE id = ? AND user_id = ?').get(schedule_id, userId);
    if (!item) return res.status(404).json({ error: 'Schedule item not found' });
    if (item.consumed) return res.status(400).json({ error: 'Already consumed' });

    db.prepare('UPDATE daily_schedule SET consumed = -1 WHERE id = ?').run(schedule_id);
    res.json({ success: true, skipped: schedule_id });
  } catch (err) { next(err); }
}

module.exports = { getDashboard, checkDose, undoCheckDose, skipDose };

function calculateAge(birthDate) {
  if (!birthDate) return 35;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
