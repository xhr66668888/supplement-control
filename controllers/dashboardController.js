/**
 * Dashboard Controller — GET /api/dashboard, POST /api/dashboard/check
 *
 * Aggregates:
 *   - Today's schedule (grouped by morning-empty/with-meal/after-lunch/before-bed)
 *   - Per-element intake progress bars (current intake vs RDA vs UL)
 *   - Stock alerts
 *   - Supplement consumption (checkbox)
 */

const { getDb } = require('../config/database');
const schedulerCore = require('../utils/schedulerCore');
const { convert } = require('../utils/unitConverter');
const { buildAbsorptionProfile, absorptionMultiplierFor } = require('../utils/absorptionProfile');

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

    // Get inventory
    const inventory = db.prepare(`
      SELECT * FROM inventory
      WHERE user_id = ? AND current_count > 0
      ORDER BY created_at DESC
    `).all(userId);

    // Auto-generate or complete today's schedule when active inventory changes.
    const scheduledActiveCount = db.prepare(`
      SELECT COUNT(DISTINCT ds.inventory_id) as cnt
      FROM daily_schedule ds
      JOIN inventory i ON i.id = ds.inventory_id
      WHERE ds.user_id = ?
        AND ds.scheduled_date = ?
        AND i.current_count > 0
    `).get(userId, today);

    if (scheduledActiveCount.cnt < inventory.length) {
      schedulerCore.generatePlan(userId);
    }

    // Get schedule
    const schedule = schedulerCore.getTodaySchedule(userId);

    const absorptionProfile = buildAbsorptionProfile(user);

    // Calculate per-element totals from active inventory
    const elementTotals = {};
    for (const item of inventory) {
      const nutrients = JSON.parse(item.nutrients_json || '[]');
      for (const n of nutrients) {
        const en = n.element;
        if (!en) continue;
        if (!elementTotals[en]) {
          elementTotals[en] = {
            amount: 0,
            effective_amount: 0,
            unit: n.unit,
            rda: null,
            ul: null,
            category: null,
            tier: n.tier || 3,
            sources: [],
            forms: new Set(),
            bioavailability_notes: new Set(),
            absorption_notes: new Set(),
          };
        }
        elementTotals[en].sources.push({
          amount: (n.amount_per_serving || 0) * item.dosage_per_day,
          unit: n.unit,
          nutrient: n,
        });
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
        total.unit = std.unit;
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
          total.unit = fallback.unit;
        }
      }

      for (const source of total.sources) {
        const converted = convert(source.amount, source.unit, total.unit, elName);
        const rawAmount = converted.unit === total.unit ? converted.value : source.amount;
        const formFactor = Number(source.nutrient.bioavailability_factor) || 1;
        const absorption = absorptionMultiplierFor(elName, total.category, source.nutrient, absorptionProfile);
        total.amount += rawAmount;
        total.effective_amount += rawAmount * formFactor * absorption.multiplier;

        if (source.nutrient.form) total.forms.add(source.nutrient.form);
        if (source.nutrient.bioavailability_note) total.bioavailability_notes.add(source.nutrient.bioavailability_note);
        for (const note of absorption.notes) total.absorption_notes.add(note);
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
    const consumptionStats = getConsumptionStats(db, userId, inventory);

    const stockAlerts = inventory.map(item => {
      const stats = consumptionStats.get(item.id) || {};
      const remainingDays = item.dosage_per_day > 0
        ? Math.floor(item.current_count / item.dosage_per_day)
        : Infinity;
      const predictedDailyUse = stats.avg_daily_units > 0 ? stats.avg_daily_units : item.dosage_per_day;
      const predictedRemainingDays = predictedDailyUse > 0
        ? Math.floor(item.current_count / predictedDailyUse)
        : null;

      let status = 'ok';
      if (remainingDays <= 7) status = 'critical';
      else if (remainingDays <= 30) status = 'low';

      return {
        inventory_id: item.id,
        product_name: item.product_name,
        current_count: item.current_count,
        dosage_per_day: item.dosage_per_day,
        remaining_days: remainingDays === Infinity ? null : remainingDays,
        predicted_remaining_days: predictedRemainingDays,
        predicted_depletion_date: predictedRemainingDays !== null ? addDaysIso(predictedRemainingDays) : null,
        adherence_percent: stats.adherence_percent ?? null,
        avg_daily_units: stats.avg_daily_units ?? null,
        status,
      };
    });

    const adherenceSummary = summarizeAdherence(stockAlerts);

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
        effective_intake: Math.round(data.effective_amount * 100) / 100,
        unit: data.unit,
        rda: data.rda,
        ul: data.ul,
        tier: data.tier,
        rda_percent: data.rda ? Math.round((data.amount / data.rda) * 100) : null,
        effective_rda_percent: data.rda ? Math.round((data.effective_amount / data.rda) * 100) : null,
        ul_percent: data.ul ? Math.round((data.amount / data.ul) * 100) : null,
        absorption_adjusted: Math.abs(data.effective_amount - data.amount) > 0.01,
        forms: [...data.forms],
        bioavailability_notes: [...data.bioavailability_notes],
        absorption_notes: [...data.absorption_notes],
      })),
      stock_alerts: stockAlerts,
      alerts,
      absorption_profile: absorptionProfile,
      adherence_summary: adherenceSummary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/dashboard/check
 * Body: { schedule_id }
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
    if (scheduleItem.consumed === 1) {
      return res.status(400).json({ error: 'Already consumed' });
    }
    if (scheduleItem.consumed === -1) {
      return res.status(400).json({ error: 'Dose was skipped' });
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
          insertAlertOnce(db, userId, inv.id, 'critical_stock', `${inv.product_name}: only ${inv.current_count} units left (${remainingDays} days)`);
        } else if (remainingDays <= 30) {
          insertAlertOnce(db, userId, inv.id, 'low_stock', `${inv.product_name}: ${inv.current_count} units remaining (${remainingDays} days)`);
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
    if (item.consumed !== 1) return res.status(400).json({ error: 'Dose was not consumed' });

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
    if (item.consumed === 1) return res.status(400).json({ error: 'Already consumed' });
    if (item.consumed === -1) return res.status(400).json({ error: 'Already skipped' });

    db.prepare('UPDATE daily_schedule SET consumed = -1 WHERE id = ?').run(schedule_id);
    res.json({ success: true, skipped: schedule_id });
  } catch (err) { next(err); }
}

// POST /api/dashboard/alerts/:id/ack -- acknowledge an alert for current user
async function acknowledgeAlert(req, res, next) {
  try {
    const userId = req.user ? req.user.user_id : req.body.user_id;
    const alertId = parseInt(req.params.id);
    if (!userId || !alertId) return res.status(400).json({ error: 'alert id is required' });

    const result = getDb().prepare(`
      UPDATE alerts
      SET acknowledged = 1
      WHERE id = ? AND user_id = ?
    `).run(alertId, userId);

    if (result.changes === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json({ success: true, alert_id: alertId });
  } catch (err) { next(err); }
}

module.exports = { getDashboard, checkDose, undoCheckDose, skipDose, acknowledgeAlert };

function calculateAge(birthDate) {
  if (!birthDate) return 35;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getConsumptionStats(db, userId, inventory) {
  const stats = new Map();
  const rows = db.prepare(`
    SELECT inventory_id,
           SUM(dosage_taken) as units_taken,
           COUNT(*) as dose_events
    FROM consumption_log
    WHERE user_id = ?
      AND date(consumed_at) >= date('now', '-30 day')
    GROUP BY inventory_id
  `).all(userId);

  const byInventory = new Map(rows.map(r => [r.inventory_id, r]));
  const now = Date.now();
  for (const item of inventory) {
    const row = byInventory.get(item.id) || { units_taken: 0, dose_events: 0 };
    const created = new Date(item.created_at).getTime();
    const createdAt = Number.isFinite(created) ? created : now;
    const daysTracked = Math.max(1, Math.min(30, Math.floor((now - createdAt) / 86400000) + 1));
    const expectedUnits = Math.max(1, daysTracked * Math.max(1, item.dosage_per_day || 1));
    const unitsTaken = Number(row.units_taken) || 0;
    if (unitsTaken === 0 && daysTracked <= 1) {
      stats.set(item.id, {
        days_tracked: daysTracked,
        units_taken: 0,
        dose_events: 0,
        avg_daily_units: null,
        adherence_percent: null,
      });
      continue;
    }
    const avgDailyUnits = unitsTaken > 0 ? unitsTaken / daysTracked : 0;
    const adherence = Math.min(1.5, unitsTaken / expectedUnits);
    stats.set(item.id, {
      days_tracked: daysTracked,
      units_taken: unitsTaken,
      dose_events: Number(row.dose_events) || 0,
      avg_daily_units: Math.round(avgDailyUnits * 100) / 100,
      adherence_percent: Math.round(adherence * 100),
    });
  }

  return stats;
}

function summarizeAdherence(stockAlerts) {
  const withData = stockAlerts.filter(s => s.adherence_percent !== null);
  if (withData.length === 0) return { adherence_percent: null, status: 'unknown' };
  const avg = Math.round(withData.reduce((sum, s) => sum + s.adherence_percent, 0) / withData.length);
  return {
    adherence_percent: avg,
    status: avg >= 85 ? 'steady' : avg >= 50 ? 'irregular' : 'low',
  };
}

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function insertAlertOnce(db, userId, inventoryId, alertType, message) {
  const existing = db.prepare(`
    SELECT id FROM alerts
    WHERE user_id = ?
      AND COALESCE(inventory_id, -1) = COALESCE(?, -1)
      AND alert_type = ?
      AND message = ?
      AND date(created_at) = date('now')
    LIMIT 1
  `).get(userId, inventoryId, alertType, message);

  if (existing) return;
  db.prepare(`
    INSERT INTO alerts (user_id, inventory_id, alert_type, message)
    VALUES (?, ?, ?, ?)
  `).run(userId, inventoryId, alertType, message);
}
