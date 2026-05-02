const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;

function getDb(dbPath) {
  if (db) return db;

  const resolvedPath = dbPath || process.env.DB_PATH || './data/supplement-control.db';
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb(dbPath) {
  const database = getDb(dbPath);
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8'
  );
  database.exec(schema);
  runDataMigrations(database);
  console.log('[db] Schema initialized');
  return database;
}

function runDataMigrations(database) {
  database.prepare(`
    UPDATE nutrient_standards
    SET rda = 9.0
    WHERE element_name = 'Vitamin D3'
      AND region = 'JP'
      AND age_min >= 18
      AND rda = 8.5
  `).run();
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initDb, closeDb };
