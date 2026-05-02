/**
 * Baseline Dietary Value (DV) Engine.
 *
 * Combines a user's standardized profile (age, gender, conditions, goals)
 * with the standard_guidelines seed data to produce a Personalized_DV_Target
 * for every tracked micronutrient element.
 */

const { getDb } = require('../config/database');

/**
 * Build personalized DV targets for a user.
 *
 * @param {number} userId
 * @returns {Promise<Array<{element, daily_target, upper_limit, unit}>>}
 */
function generatePersonalizedDV(userId) {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error(`User ${userId} not found`);

  const profile = JSON.parse(user.structured_profile || '{}');
  const age = profile.age || 35;
  const gender = profile.gender || 'all';

  // Find matching guideline rows
  const guidelines = db.prepare(`
    SELECT element, rda, ul, unit
    FROM standard_guidelines
    WHERE (gender = ? OR gender = 'all')
      AND age_min <= ?
      AND age_max >= ?
    ORDER BY element, standard_type
  `).all(gender, age, age);

  // Deduplicate: pick the stricter RDA when both US and JP exist for same element.
  // If two entries for the same element, take max RDA and min UL.
  const merged = new Map();
  for (const g of guidelines) {
    const existing = merged.get(g.element);
    if (existing) {
      existing.rda = Math.max(existing.rda, g.rda || 0);
      existing.ul = existing.ul && g.ul ? Math.min(existing.ul, g.ul) : (existing.ul || g.ul);
    } else {
      merged.set(g.element, { ...g });
    }
  }

  // Upsert into personalized_dv
  const upsert = db.prepare(`
    INSERT INTO personalized_dv (user_id, element, daily_target, upper_limit, unit)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, element) DO UPDATE SET
      daily_target = excluded.daily_target,
      upper_limit  = excluded.upper_limit,
      unit         = excluded.unit
  `);

  const results = [];
  const tx = db.transaction(() => {
    // Clear previous
    db.prepare('DELETE FROM personalized_dv WHERE user_id = ?').run(userId);

    for (const [, g] of merged) {
      const dailyTarget = g.rda || 0;
      const upperLimit = g.ul || null;
      upsert.run(userId, g.element, dailyTarget, upperLimit, g.unit);
      results.push({
        element: g.element,
        daily_target: dailyTarget,
        upper_limit: upperLimit,
        unit: g.unit,
      });
    }
  });
  tx();

  return results;
}

module.exports = { generatePersonalizedDV };
