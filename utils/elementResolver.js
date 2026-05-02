/**
 * Element Resolver — Three-Tier lookup system.
 *
 * Tier 1: Found in nutrient_standards WITH RDA/UL → full tracking
 * Tier 2: Found in nutrient_standards WITHOUT RDA/UL → track intake, no thresholds
 * Tier 3: Not found → auto-register as 'unclassified', RDA=UL=null
 *
 * No element is ever rejected. Every substance gets tracked.
 */

const { getDb } = require('../config/database');

/**
 * Resolve an element name against the standards database.
 * @param {string} elementName — raw name from MIMO OCR (e.g. "Maca Root Extract")
 * @param {string} [unit] — unit from OCR, used if we need to auto-register
 * @returns {{ id: number|null, element_name: string, category: string, rda: number|null, ul: number|null, unit: string, source: string, tier: 1|2|3 }}
 */
function resolve(elementName, unit) {
  const db = getDb();
  const cleanName = elementName.trim();

  // 1. Exact match
  let row = db.prepare(
    'SELECT * FROM nutrient_standards WHERE element_name = ? LIMIT 1'
  ).get(cleanName);

  // Compound name parsing: extract known tokens from brand+substance names
  // e.g., "Altavita D3 50,000 IU" -> "D3" -> "Vitamin D3"
  // e.g., "Calcium Citrate Malate" -> "Calcium"
  if (!row) {
    const compounds = [
      { pattern: /\bD3\b/i, target: 'Vitamin D3' },
      { pattern: /\bVitamin D\b/i, target: 'Vitamin D3' },
      { pattern: /\bCalcium\b/i, target: 'Calcium' },
      { pattern: /\bMagnesium\b/i, target: 'Magnesium' },
      { pattern: /\bZinc\b/i, target: 'Zinc' },
      { pattern: /\bIron\b/i, target: 'Iron' },
      { pattern: /\bPotassium\b/i, target: 'Potassium' },
      { pattern: /\bSelenium\b/i, target: 'Selenium' },
      { pattern: /\bOmega.3\b/i, target: 'Omega-3 (EPA+DHA)' },
      { pattern: /\bCoQ10\b/i, target: 'Coenzyme Q10 (CoQ10)' },
      { pattern: /\bMelatonin\b/i, target: 'Melatonin' },
      { pattern: /\bProbiotic/i, target: 'Probiotics' },
      { pattern: /\bCurcumin\b/i, target: 'Turmeric (Curcumin)' },
      { pattern: /\bCreatine\b/i, target: 'Creatine' },
      { pattern: /\bCollagen\b/i, target: 'Collagen' },
      { pattern: /\bGlucosamine\b/i, target: 'Glucosamine' },
      { pattern: /\bWhey\b/i, target: 'Whey Protein' },
      { pattern: /\bProtein\b/i, target: 'Whey Protein' },
      { pattern: /\bBerberine\b/i, target: 'Berberine' },
      { pattern: /\bLutein\b/i, target: 'Lutein' },
    ];
    for (const { pattern, target } of compounds) {
      if (pattern.test(cleanName)) {
        row = db.prepare(
          'SELECT * FROM nutrient_standards WHERE element_name = ? LIMIT 1'
        ).get(target);
        if (row) break;
      }
    }
  }

  // Handle common aliases (English + Chinese + multi-language)
  const ALIASES = {
    // English aliases
    'vitamin d': 'Vitamin D3', 'magnesium glycinate': 'Magnesium Glycinate',
    'magnesium citrate': 'Magnesium', 'omega 3': 'Omega-3 (EPA+DHA)',
    'omega-3': 'Omega-3 (EPA+DHA)', 'coq10': 'Coenzyme Q10 (CoQ10)',
    'coq 10': 'Coenzyme Q10 (CoQ10)', 'nac': 'NAC (N-Acetyl Cysteine)',
    'ala': 'Alpha-Lipoic Acid', 'b12': 'Vitamin B12 (Cobalamin)',
    'b6': 'Vitamin B6', 'folate': 'Vitamin B9 (Folate)',
    'folic acid': 'Vitamin B9 (Folate)',
    // Chinese aliases
    '维生素d': 'Vitamin D3', '维生素d3': 'Vitamin D3', '维d': 'Vitamin D3',
    '维生素c': 'Vitamin C', '维c': 'Vitamin C',
    '维生素e': 'Vitamin E', '维e': 'Vitamin E',
    '维生素b12': 'Vitamin B12 (Cobalamin)', 'b族': 'Vitamin B12 (Cobalamin)',
    '钙': 'Calcium', '镁': 'Magnesium', '锌': 'Zinc', '铁': 'Iron',
    '硒': 'Selenium', '钾': 'Potassium', '碘': 'Iodine',
    '褪黑素': 'Melatonin', '辅酶q10': 'Coenzyme Q10 (CoQ10)',
    '益生菌': 'Probiotics', '叶酸': 'Vitamin B9 (Folate)',
    '鱼油': 'Omega-3 (EPA+DHA)', 'omega3': 'Omega-3 (EPA+DHA)',
    '葡萄糖胺': 'Glucosamine', '软骨素': 'Chondroitin',
    '姜黄': 'Turmeric (Curcumin)', '姜黄素': 'Turmeric (Curcumin)',
    '胶原蛋白': 'Collagen', '南非醉茄': 'Ashwagandha',
    '印度人参': 'Ashwagandha', '玛卡': 'Maca Root',
    '红景天': 'Rhodiola Rosea', '人参': 'Panax Ginseng',
    '银杏': 'Ginkgo Biloba', '奶蓟': 'Milk Thistle (Silymarin)',
    '水飞蓟': 'Milk Thistle (Silymarin)', '缬草': 'Valerian Root',
    '灵芝': 'Reishi Mushroom', '虫草': 'Cordyceps',
    '猴头菇': "Lion's Mane", '绿茶': 'Green Tea Extract',
    '茶氨酸': 'L-Theanine', '精氨酸': 'L-Arginine',
    '赖氨酸': 'L-Lysine', '色氨酸': 'L-Tryptophan',
    '酪氨酸': 'L-Tyrosine', '牛磺酸': 'Taurine',
    '肌酸': 'Creatine', '谷氨酰胺': 'Glutamine',
    // Multi-language drug names
    'lactoserum': 'Whey Protein', 'proteine de lactoserum': 'Whey Protein',
    'molkenprotein': 'Whey Protein', 'proteina del suero': 'Whey Protein',
    'calcium citrate': 'Calcium', 'citrate de calcium': 'Calcium',
    'calciumcarbonat': 'Calcium', 'carbonato de calcio': 'Calcium',
    'vitamine d3': 'Vitamin D3', 'vitamina d3': 'Vitamin D3',
    'colecalciferol': 'Vitamin D3', 'cholecalciferol': 'Vitamin D3',
    'magnesio': 'Magnesium', 'magnesium': 'Magnesium',
    'zink': 'Zinc', 'cinc': 'Zinc',
    'eisen': 'Iron', 'ferro': 'Iron', 'hierro': 'Iron',
    'selen': 'Selenium', 'selenio': 'Selenium',
    'kalium': 'Potassium', 'potasio': 'Potassium',
    'jod': 'Iodine', 'yodo': 'Iodine', 'iode': 'Iodine',
  };
  const aliasKey = cleanName.toLowerCase().trim();
  if (ALIASES[aliasKey] && !row) {
    row = db.prepare(
      'SELECT * FROM nutrient_standards WHERE element_name = ? LIMIT 1'
    ).get(ALIASES[aliasKey]);
  }

  // 1b. Search Chinese column
  if (!row) {
    row = db.prepare(
      'SELECT * FROM nutrient_standards WHERE element_name_cn = ? LIMIT 1'
    ).get(cleanName);
  }

  // 2. Fuzzy match on English AND Chinese columns
  if (!row) {
    row = db.prepare(`
      SELECT * FROM nutrient_standards
      WHERE LOWER(element_name) LIKE LOWER(?)
         OR LOWER(COALESCE(element_name_cn,'')) LIKE LOWER(?)
      LIMIT 1
    `).get(`%${cleanName}%`, `%${cleanName}%`);
  }

  // 3. Stripped parenthetical variants
  if (!row && cleanName.includes('(')) {
    const stripped = cleanName.replace(/\(.*?\)/g, '').trim();
    row = db.prepare(`
      SELECT * FROM nutrient_standards
      WHERE LOWER(element_name) LIKE LOWER(?)
         OR LOWER(COALESCE(element_name_cn,'')) LIKE LOWER(?)
      LIMIT 1
    `).get(`%${stripped}%`, `%${stripped}%`);
  }

  if (row) {
    const hasStandards = row.rda !== null || row.ul !== null;
    return {
      id: row.id,
      element_name: row.element_name,
      category: row.category,
      rda: row.rda,
      ul: row.ul,
      unit: row.unit,
      source: row.source,
      tier: hasStandards ? 1 : 2,
    };
  }

  // 4. Auto-register as Tier 3
  const insert = db.prepare(`
    INSERT INTO nutrient_standards (element_name, category, region, age_min, age_max, gender, rda, ul, unit, source)
    VALUES (?, 'unclassified', 'US', 0, 120, 'all', NULL, NULL, ?, 'unknown')
  `);
  const result = insert.run(cleanName, unit || 'mg');

  console.log(`[elementResolver] Auto-registered Tier 3 element: "${cleanName}"`);

  return {
    id: result.lastInsertRowid,
    element_name: cleanName,
    category: 'unclassified',
    rda: null,
    ul: null,
    unit: unit || 'mg',
    source: 'unknown',
    tier: 3,
  };
}

/**
 * Get all element names (for frontend autocomplete, etc.)
 */
function listAll() {
  const db = getDb();
  return db.prepare(
    'SELECT DISTINCT element_name, category, source FROM nutrient_standards ORDER BY category, element_name'
  ).all();
}

/**
 * Get all "unknown" (Tier 3) elements that could benefit from AI backfill.
 */
function listUnknowns() {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM nutrient_standards WHERE source = 'unknown' OR category = 'unclassified'"
  ).all();
}

module.exports = { resolve, listAll, listUnknowns };
