/**
 * Seed runner: initializes DB schema and inserts all reference data.
 * Usage: node seed/run.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { initDb } = require('../config/database');
const guidelines = require('./guidelines');
const interactions = require('./interactions');
const atcConditions = require('./atc_conditions');
const elementNamesCN = require('./element_names_cn');
const atcNamesCN = require('./atc_names_cn');

const db = initDb();

// --- Seed nutrient_standards ---
const insertNs = db.prepare(`
  INSERT OR IGNORE INTO nutrient_standards
    (element_name, element_name_cn, category, region, age_min, age_max, gender, rda, ul, unit, source)
  VALUES (@element_name, @element_name_cn, @category, @region, @age_min, @age_max, @gender, @rda, @ul, @unit, @source)
`);

const tx1 = db.transaction(() => {
  for (const g of guidelines) {
    insertNs.run({ ...g, element_name_cn: elementNamesCN[g.element_name] || null });
  }
});
tx1();
console.log(`[seed] nutrient_standards: ${guidelines.length} rows (with Chinese names)`);

// --- Apply Chinese names to existing rows ---
const updateCN = db.prepare('UPDATE nutrient_standards SET element_name_cn = ? WHERE element_name = ? AND element_name_cn IS NULL');
for (const [en, cn] of Object.entries(elementNamesCN)) {
  updateCN.run(cn, en);
}

// --- Seed interaction_rules ---
const insertIr = db.prepare(`
  INSERT OR IGNORE INTO interaction_rules (element_a, element_b, effect, advice)
  VALUES (@element_a, @element_b, @effect, @advice)
`);

const tx2 = db.transaction(() => {
  for (const ir of interactions) {
    insertIr.run(ir);
  }
});
tx2();
console.log(`[seed] interaction_rules: ${interactions.length} rows`);

// --- Seed ATC condition reference data into nutrient_standards (as notes/comments) ---
// The ATC conditions seed file is used by medicalValidator for evidence-based linking.
// It does not create a separate table; it serves as a runtime reference.
console.log(`[seed] atc_conditions: ${atcConditions.length} condition mappings loaded`);

// --- Seed a demo user with bcrypt hashed password ---
const bcrypt = require('bcryptjs');
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, password_hash, birth_date, gender, height, weight, conditions, goals)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
insertUser.run(
  'demo',
  bcrypt.hashSync('demo123', 10),
  '1990-05-15',
  'male',
  178,
  82,
  JSON.stringify(['mild insomnia']),
  JSON.stringify(['improve sleep quality', 'reduce stress', 'boost immunity'])
);
console.log('[seed] demo user created (username: demo, password: demo123)');

process.exit(0);
