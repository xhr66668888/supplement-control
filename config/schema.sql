-- Bio-Nutrient Manager: SQLite Schema
-- Rule-Engine-First architecture. AI only at the edges.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    password_hash   TEXT    NOT NULL,
    birth_date      TEXT,               -- ISO-8601 date
    gender          TEXT,               -- 'male', 'female', 'other'
    height          REAL,               -- cm
    weight          REAL,               -- kg
    conditions      TEXT,               -- JSON array of standardized condition objects with ATC codes
    atc_conditions  TEXT,               -- JSON: [{code, name, keywords}] from ATC classification
    goals           TEXT,               -- JSON array of standardized goal objects
    raw_profile     TEXT,               -- original free-text input from onboarding
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. Nutrient Standards (hardcoded RDA/UL reference data)
--    RDA and UL are NULLABLE — Tier 2/3 elements have no standards.
-- ============================================================
CREATE TABLE IF NOT EXISTS nutrient_standards (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    element_name    TEXT    NOT NULL,    -- e.g. 'Vitamin D3', 'Maca Root'
    element_name_cn TEXT,               -- Chinese display name e.g. '维生素D3', '玛卡根'
    category        TEXT,               -- vitamin, mineral, amino-acid, fatty-acid,
                                        --   herbal, enzyme, probiotic, other, unclassified
    region          TEXT    NOT NULL DEFAULT 'US',  -- 'US' or 'JP'
    age_min         INTEGER NOT NULL DEFAULT 0,
    age_max         INTEGER NOT NULL DEFAULT 120,
    gender          TEXT    NOT NULL DEFAULT 'all', -- 'male', 'female', 'all'
    rda             REAL,               -- NULLABLE: Recommended Daily Allowance
    ul              REAL,               -- NULLABLE: Tolerable Upper Intake Level
    unit            TEXT    NOT NULL,    -- mg, mcg, IU, g, CFU
    source          TEXT    NOT NULL DEFAULT 'manual',  -- 'usda','nih','mhlw','manual','ai-estimated','unknown'
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_ns_element ON nutrient_standards(element_name);
CREATE INDEX IF NOT EXISTS idx_ns_region  ON nutrient_standards(region);
CREATE INDEX IF NOT EXISTS idx_ns_category ON nutrient_standards(category);

-- ============================================================
-- 3. Inventory (supplements a user owns)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_name    TEXT    NOT NULL,
    brand           TEXT,
    total_count     INTEGER NOT NULL,       -- total pills/units in bottle
    current_count   INTEGER NOT NULL,       -- remaining pills/units
    dosage_per_day  INTEGER NOT NULL DEFAULT 1,
    nutrients_json  TEXT    NOT NULL,       -- JSON: [{element, amount_per_serving, unit}]
    image_url       TEXT,                   -- path to uploaded label image
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);

-- ============================================================
-- 4. Interaction Rules (hardcoded supplement interactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS interaction_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    element_a   TEXT NOT NULL,
    element_b   TEXT NOT NULL,
    effect      TEXT NOT NULL CHECK(effect IN ('inhibit','synergy','toxic','caution')),
    advice      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interaction_elements ON interaction_rules(element_a, element_b);

-- ============================================================
-- 5. Supplements Catalog (shared across all users)
-- ============================================================
CREATE TABLE IF NOT EXISTS supplements_catalog (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name    TEXT    NOT NULL,
    brand           TEXT,
    serving_size    REAL,
    serving_unit    TEXT    DEFAULT 'capsules',
    total_units      INTEGER,
    nutrients_json  TEXT    NOT NULL,
    image_count     INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(product_name, brand)
);

CREATE INDEX IF NOT EXISTS idx_catalog_name ON supplements_catalog(product_name);
CREATE INDEX IF NOT EXISTS idx_catalog_brand ON supplements_catalog(brand);

-- 6. Daily Schedule (generated by hardcoded scheduler, not AI)
--    Time slots: morning-empty (empty stomach), with-meal (lunch/dinner),
--                after-lunch (post-meal absorption), before-bed (pre-sleep)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_schedule (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_id    INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    time_of_day     TEXT    NOT NULL CHECK(time_of_day IN ('morning-empty','with-meal','after-lunch','before-bed')),
    dosage          INTEGER NOT NULL DEFAULT 1,
    scheduled_date  TEXT    NOT NULL DEFAULT (date('now')),
    consumed        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, inventory_id, scheduled_date, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_schedule_user ON daily_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON daily_schedule(scheduled_date);

-- ============================================================
-- 6. Consumption Log (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS consumption_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_id    INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    time_of_day     TEXT    NOT NULL CHECK(time_of_day IN ('morning-empty','with-meal','after-lunch','before-bed')),
    dosage_taken    INTEGER NOT NULL DEFAULT 1,
    consumed_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consumption_user ON consumption_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consumption_date ON consumption_log(consumed_at);

-- ============================================================
-- 7. Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_id    INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    alert_type      TEXT    NOT NULL CHECK(alert_type IN (
                        'low_stock','critical_stock','expired','ul_warning'
                    )),
    message         TEXT,
    acknowledged    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
