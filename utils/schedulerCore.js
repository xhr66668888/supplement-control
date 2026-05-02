/**
 * SchedulerCore — Hardcoded supplement scheduling engine.
 *
 * ZERO AI. Pure rule-based allocation.
 *
 * Rules (in priority order):
 *   1. UL Check: sum intake per element → if > UL → CRITICAL alert, flag item
 *   2. Conflict Check: query interaction_rules → if conflict found → separate times
 *   3. Time Allocation by element category and property:
 *      a) Sleep aids → before-bed
 *      b) Energizers → morning-empty
 *      c) Fat-soluble vitamins + fatty-acids → with-meal
 *      d) Ca/Fe conflict: Ca → morning-empty, Fe → after-lunch (absorbed better later)
 *      e) Category 'herbal' → morning-empty (default)
 *      f) Amino acids: energizing → morning-empty, calming → before-bed
 *      g) Minerals (not Ca/Fe) → with-meal or after-lunch
 *      h) Everything else → with-meal (safest default, reduces stomach upset)
 */

const { getDb } = require('../config/database');

// ---- Element Classification Maps ----

/** These elements are best taken with food (fat-soluble absorption). */
const WITH_MEAL = new Set([
  'Vitamin A', 'Vitamin D', 'Vitamin D3', 'Vitamin E', 'Vitamin K1', 'Vitamin K2 (MK-7)',
]);

/** Category-level: fatty-acids also need food */
const FAT_SOLUBLE_CATEGORIES = new Set(['fatty-acid']);

/** These promote sleep — allocate to NIGHT. */
const SLEEP_AIDS = new Set([
  'Melatonin', 'Magnesium Glycinate', 'Valerian Root', '5-HTP', 'GABA',
  'L-Theanine', 'L-Tryptophan', 'Glycine',
]);

/** These increase energy/alertness — allocate to MORNING. */
const ENERGIZERS = new Set([
  'Vitamin B1 (Thiamin)', 'Vitamin B2 (Riboflavin)', 'Vitamin B3 (Niacin)',
  'Vitamin B5 (Pantothenic Acid)', 'Vitamin B6', 'Vitamin B7 (Biotin)',
  'Vitamin B9 (Folate)', 'Vitamin B12 (Cobalamin)', 'Vitamin C',
  'L-Tyrosine', 'Panax Ginseng', 'Rhodiola Rosea', 'Cordyceps',
  'Coenzyme Q10 (CoQ10)', 'Creatine', 'Beta-Alanine',
]);

/** Calming amino acids → NIGHT; energizing → MORNING (handled above for specific ones). */
const CALMING_AMINO_ACIDS = new Set([
  'L-Theanine', 'L-Tryptophan', 'Glycine', 'GABA', 'Taurine',
]);

class SchedulerCore {
  /**
   * Generate today's supplement schedule for a user.
   * @param {number} userId
   * @returns {{ schedule: Array, alerts: Array, totals: Object }}
   */
  generatePlan(userId) {
    const db = getDb();

    // Verify user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Clear today's existing schedule for this user (idempotent)
    db.prepare('DELETE FROM daily_schedule WHERE user_id = ? AND scheduled_date = ?').run(userId, today);

    // Get all active inventory items
    const invItems = db.prepare(
      'SELECT * FROM inventory WHERE user_id = ? AND current_count > 0'
    ).all(userId);

    if (invItems.length === 0) {
      return { schedule: [], alerts: [], totals: {} };
    }

    // ---- Step 1: Sum total daily intake per element ----
    const elementTotals = {}; // { elementName: { amount, unit, rda, ul, category } }
    const parsedItems = [];   // { inventoryItem, nutrients: [{element, amount, unit}] }

    for (const item of invItems) {
      const nutrients = JSON.parse(item.nutrients_json || '[]');
      parsedItems.push({ item, nutrients });

      for (const n of nutrients) {
        const en = n.element || n.name;
        if (!elementTotals[en]) {
          elementTotals[en] = { amount: 0, unit: n.unit, rda: null, ul: null, category: 'unclassified' };
        }
        elementTotals[en].amount += (n.amount_per_serving || n.amount || 0) * item.dosage_per_day;
      }
    }

    // Enrich with standards data
    const alerts = [];
    for (const [elName, total] of Object.entries(elementTotals)) {
      const std = db.prepare(
        "SELECT * FROM nutrient_standards WHERE element_name = ? AND region = 'US' LIMIT 1"
      ).get(elName);

      if (std) {
        total.rda = std.rda;
        total.ul = std.ul;
        total.category = std.category;
      }

      // UL Check: if over UL, flag alert. (Only for Tier 1 elements with UL)
      if (total.ul !== null && total.amount > total.ul) {
        alerts.push({
          alert_type: 'ul_warning',
          inventory_id: null,
          message: `${elName}: ${total.amount} ${total.unit} exceeds UL of ${total.ul} ${total.unit}. Reduce dosage or remove supplement.`,
        });
      }
    }

    // ---- Step 2: Conflict Check ----
    const interactionRows = db.prepare('SELECT * FROM interaction_rules').all();
    const inventoryElementNames = parsedItems.map(p => p.nutrients.map(n => n.element || n.name)).flat();
    const uniqueElements = [...new Set(inventoryElementNames)];

    for (const ir of interactionRows) {
      const hasA = uniqueElements.some(e => e.toLowerCase().includes(ir.element_a.toLowerCase()));
      const hasB = uniqueElements.some(e => e.toLowerCase().includes(ir.element_b.toLowerCase()));
      if (hasA && hasB) {
        if (ir.effect === 'toxic') {
          alerts.push({
            alert_type: 'ul_warning',
            inventory_id: null,
            message: `TOXIC COMBINATION: ${ir.element_a} + ${ir.element_b}. ${ir.advice}`,
          });
        }
      }
    }

    // Pre-load all element→category mappings for O(1) lookup
    const elementCategoryMap = new Map();
    for (const elName of Object.keys(elementTotals)) {
      const cat = elementTotals[elName].category;
      if (cat) elementCategoryMap.set(elName, cat);
    }

    // ---- Step 3: Time Allocation per inventory item ----
    const schedule = [];
    const insertSchedule = db.prepare(`
      INSERT INTO daily_schedule (user_id, inventory_id, time_of_day, dosage, scheduled_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      for (const { item, nutrients } of parsedItems) {
        const timeOfDay = this._determineTimeOfDay(nutrients, parsedItems, elementCategoryMap);

        insertSchedule.run(userId, item.id, timeOfDay, item.dosage_per_day, today);

        schedule.push({
          inventory_id: item.id,
          product_name: item.product_name,
          time_of_day: timeOfDay,
          dosage: item.dosage_per_day,
          scheduled_date: today,
        });
      }
    });
    tx();

    // ---- Step 4: Insert alerts into DB ----
    const insertAlert = db.prepare(`
      INSERT INTO alerts (user_id, inventory_id, alert_type, message)
      VALUES (?, ?, ?, ?)
    `);
    for (const a of alerts) {
      insertAlert.run(userId, a.inventory_id, a.alert_type, a.message);
    }

    return { schedule, alerts, totals: elementTotals };
  }

  /**
   * Determine the best time of day for a supplement.
   */
  _determineTimeOfDay(nutrients, allParsedItems, categoryMap) {
    const names = nutrients.map(n => n.element || n.name || '');
    const lowerNames = names.map(n => n.toLowerCase());

    // Rule A: Sleep aids -> before-bed
    for (const name of names) { if (SLEEP_AIDS.has(name)) return 'before-bed'; }

    // Rule B: Energizers -> morning-empty (empty stomach best for absorption)
    for (const name of names) { if (ENERGIZERS.has(name)) return 'morning-empty'; }

    // Rule C: Fat-soluble vitamins or fatty-acid category -> with-meal
    for (const name of names) {
      if (WITH_MEAL.has(name)) return 'with-meal';
      const cat = categoryMap.get(name);
      if (cat && FAT_SOLUBLE_CATEGORIES.has(cat)) return 'with-meal';
    }

    // Rule D: Ca/Fe conflict resolution
    // Calcium in morning (empty stomach, better absorption), iron after lunch
    const allLowerNames = new Set();
    for (const { nutrients: nl } of allParsedItems) {
      for (const n of nl) { allLowerNames.add((n.element || n.name || '').toLowerCase()); }
    }
    const hasCalcium = lowerNames.some(e => e.includes('calcium'));
    const hasIron = lowerNames.some(e => e.includes('iron'));
    if (hasCalcium && hasIron) {
      if (lowerNames.some(e => e.includes('calcium'))) return 'morning-empty';
      if (lowerNames.some(e => e.includes('iron'))) return 'after-lunch';
    }

    // Rule E: Calming amino acids -> before-bed
    for (const name of names) { if (CALMING_AMINO_ACIDS.has(name)) return 'before-bed'; }

    // Rule F: Mineral category -> with-meal (better tolerated with food)
    for (const name of names) {
      if (categoryMap.get(name) === 'mineral') return 'with-meal';
    }

    // Rule G: Herbal -> morning-empty (traditional dosing)
    for (const name of names) {
      if (categoryMap.get(name) === 'herbal') return 'morning-empty';
    }

    // Rule H: Default -> with-meal (safest, reduces stomach upset)
    return 'with-meal';
  }

  /**
   * Get today's schedule for a user (for dashboard display).
   */
  getTodaySchedule(userId) {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    return db.prepare(`
      SELECT ds.*, i.product_name, i.nutrients_json, i.current_count, i.dosage_per_day
      FROM daily_schedule ds
      JOIN inventory i ON ds.inventory_id = i.id
      WHERE ds.user_id = ? AND ds.scheduled_date = ?
      ORDER BY
        CASE ds.time_of_day
          WHEN 'morning' THEN 1
          WHEN 'noon' THEN 2
          WHEN 'night' THEN 3
        END
    `).all(userId, today);
  }

  /**
   * Rebuild today's schedule for a user.
   */
  rebuildToday(userId) {
    return this.generatePlan(userId);
  }
}

module.exports = new SchedulerCore();
