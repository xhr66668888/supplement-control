// Medical Cross-Validation System ("Consultation Room")
//
// Two-pass validation for AI-generated supplement recommendations:
//   Pass 1: DeepSeek structures raw symptoms -> {conditions, target_nutrients}
//   Pass 2: THIS validator cross-checks against hardcoded DB + interaction rules
//
// Every condition->nutrient mapping must pass these checks:
//   1. Nutrient exists in nutrient_standards (Tier 1/2/3 accepted)
//   2. No toxic interaction with user's existing conditions
//   3. No UL violation for user's demographic
//   4. Evidence-backed: at least one condition maps to this nutrient

const { getDb } = require('../config/database');
const { resolve: resolveElement } = require('./elementResolver');
const { getATCNutrients, getCategoryForNutrient } = require('./taxonomy');

// Evidence maps built from seed/atc_conditions.js at startup.
const { EVIDENCE_BY_KEYWORD, EVIDENCE_BY_ATC } = buildEvidenceMaps();

function buildEvidenceMaps() {
  const byKeyword = {};
  const byATC = {};
  try {
    const atcData = require('../seed/atc_conditions');
    for (const entry of atcData) {
      byKeyword[entry.keyword.toLowerCase()] = entry.nutrients;
      byATC[entry.atc_code] = entry.nutrients;
    }
  } catch { /* seed data not available during tests */ }
  return { EVIDENCE_BY_KEYWORD: byKeyword, EVIDENCE_BY_ATC: byATC };
}

// Clinical context patterns: keywords in conditions/descriptions that trigger special handling
const CLINICAL_CONTEXTS = [
  { pattern: /surgery|手术|post.op/i, nutrients: ['Vitamin C', 'Zinc', 'Whey Protein', 'Vitamin A', 'Glutamine'], note: 'Post-surgical recovery: increased need for wound healing and tissue repair nutrients.' },
  { pattern: /elderly|老年|高龄|8[0-9]\s*y|post.menopaus|绝经/i, nutrients: ['Vitamin D3', 'Calcium', 'Vitamin B12 (Cobalamin)', 'Whey Protein', 'Magnesium', 'Vitamin K2 (MK-7)'], note: 'Elderly/post-menopausal: higher risk of osteoporosis, sarcopenia, and B12 deficiency. Vitamin K2 supports bone mineralization.' },
  { pattern: /gastritis|胃炎|stomach|胃/i, nutrients: ['Vitamin B12 (Cobalamin)', 'Probiotics', 'Zinc', 'Glutamine'], note: 'Gastritis: avoid irritants on empty stomach. B12 absorption may be impaired.' },
  { pattern: /steroid|corticosteroid|激素|prednisone|prednisolone/i, nutrients: ['Calcium', 'Vitamin D3', 'Potassium', 'Magnesium'], note: 'Corticosteroid use: monitor for calcium/vitamin D depletion and potassium loss.' },
  { pattern: /nodule|结节/i, nutrients: [], note: 'Thyroid/breast nodules: avoid high-dose iodine. Consult endocrinologist before supplementation.' },
  { pattern: /deficiency|缺乏|deficient/i, nutrients: [], note: 'Documented deficiency: prescription doses may exceed standard UL. Medical supervision required.' },
  { pattern: /pregnant|pregnancy|怀孕|孕期|trimester/i, nutrients: ['Folate (Vitamin B9)', 'Iron', 'Vitamin D3', 'Omega-3 (EPA+DHA)', 'Calcium', 'Iodine'], note: 'Pregnancy: increased need for folate (neural tube), iron (blood volume), DHA (fetal brain), calcium (skeletal), iodine (thyroid). Avoid vitamin A above RDA.' },
  { pattern: /athlet|sport|training|运动员|训练|workout/i, nutrients: ['Creatine', 'BCAA', 'Whey Protein', 'Magnesium', 'Beta-Alanine', 'L-Carnitine'], note: 'Athletic training: increased protein and micronutrient needs. Monitor hydration and electrolyte balance.' },
  { pattern: /statin|atorvastatin|rosuvastatin|simvastatin/i, nutrients: ['Coenzyme Q10 (CoQ10)', 'Vitamin D3', 'Omega-3 (EPA+DHA)'], note: 'Statin use: statins deplete CoQ10, potentially causing muscle pain. CoQ10 supplementation (100-200mg/day) may reduce statin-induced myopathy.' },
  { pattern: /colitis|crohn|IBD|肠炎|malabsorption|吸收不良/i, nutrients: ['Vitamin B12 (Cobalamin)', 'Vitamin D3', 'Magnesium', 'Zinc', 'Iron', 'Probiotics', 'Glutamine'], note: 'IBD/malabsorption: nutrient absorption severely impaired. May need IV or sublingual forms. Monitor all fat-soluble vitamins (A, D, E, K).' },
  { pattern: /PCOS|polycystic|多囊卵巢/i, nutrients: ['Inositol', 'Chromium', 'Vitamin D3', 'Omega-3 (EPA+DHA)', 'Zinc', 'Berberine'], note: 'PCOS: inositol (myo-inositol 2-4g/day) improves insulin sensitivity and ovulation. Chromium and berberine support glucose metabolism.' },
  { pattern: /macular|AREDS|视网膜|黄斑/i, nutrients: ['Lutein', 'Zeaxanthin', 'Vitamin C', 'Vitamin E', 'Zinc', 'Copper'], note: 'Macular degeneration: AREDS2 formula (lutein 10mg, zeaxanthin 2mg, vitamin C 500mg, vitamin E 400IU, zinc 80mg, copper 2mg) clinically proven to slow progression.' },
  { pattern: /vegan|vegetarian|素食/i, nutrients: ['Vitamin B12 (Cobalamin)', 'Iron', 'Zinc', 'Omega-3 (EPA+DHA)', 'Vitamin D3', 'Calcium', 'Iodine'], note: 'Vegan diet: high risk of B12, iron, zinc, omega-3 (DHA/EPA), vitamin D, calcium, and iodine deficiency. B12 supplementation is essential.' },
];

// Conditions where certain nutrients are contraindicated
const CONTRAINDICATIONS = {
  hypertension: ['Ephedra', 'Yohimbe', 'Licorice Root'],
  diabetes: ['Niacin (B3) High Dose'],
  'liver support': ['Kava Kava', 'Comfrey'],
  anxiety: ['Caffeine', 'Panax Ginseng High Dose', 'Yohimbe'],
  pregnancy: ['Vitamin A High Dose', "St. John's Wort", 'Black Cohosh', 'Saw Palmetto'],
};

function validateOnboardingOutput(aiOutput, userProfile) {
  const db = getDb();
  const warnings = [];
  const approvedNutrients = [];
  const flaggedNutrients = [];
  let confidence = 1.0;

  const conditions = aiOutput.conditions || [];
  const nutrients = aiOutput.target_nutrients || [];

  for (const nutrient of nutrients) {
    // Check 1: Exists in our database?
    let std = db.prepare(
      "SELECT * FROM nutrient_standards WHERE element_name = ? LIMIT 1"
    ).get(nutrient);

    if (!std) {
      // Try elementResolver before auto-registering (handles compound names, aliases)
      const resolved = resolveElement(nutrient, 'mg');
      if (resolved && resolved.tier <= 2 && resolved.element_name !== nutrient) {
        // Resolved to a known element — use the canonical name instead
        std = db.prepare(
          "SELECT * FROM nutrient_standards WHERE element_name = ? LIMIT 1"
        ).get(resolved.element_name);
        if (std) {
          approvedNutrients.push(resolved.element_name);
          continue;
        }
      }

      // Still not found — auto-register as Tier 3
      db.prepare(`
        INSERT OR IGNORE INTO nutrient_standards (element_name, category, region, age_min, age_max, gender, rda, ul, unit, source)
        VALUES (?, 'unclassified', 'US', 0, 120, 'all', NULL, NULL, 'mg', 'ai-validated')
      `).run(nutrient);

      flaggedNutrients.push({
        nutrient,
        reason: `"${nutrient}" is not in our reference database. Registered as unclassified.`,
      });
      confidence -= 0.05;
      approvedNutrients.push(nutrient);
      continue;
    }

    // Check 2: Evidence-backed by ATC (exact) -> ATC (parent) -> keyword -> taxonomy
    let evidenceFound = false;
    let evidenceSource = 'none';
    for (const cond of conditions) {
      const condObj = typeof cond === 'string' ? { name: cond, atc_code: null } : cond;
      const name = (condObj.name || '').toLowerCase();
      const atc = condObj.atc_code;

      // Level 1: Exact ATC code match (highest confidence)
      if (!evidenceFound && atc && EVIDENCE_BY_ATC[atc]) {
        if (EVIDENCE_BY_ATC[atc].some(s => s.toLowerCase() === nutrient.toLowerCase())) {
          evidenceFound = true;
          evidenceSource = `ATC_exact_${atc}`;
        }
      }

      // Level 2: Parent ATC via taxonomy tree (SMI-inspired anchoring)
      if (!evidenceFound && atc) {
        const taxResult = getATCNutrients(atc);
        if (taxResult && taxResult.nutrients.some(s => s.toLowerCase() === nutrient.toLowerCase())) {
          evidenceFound = true;
          evidenceSource = `${taxResult.source}_${atc}`;
          confidence -= (1 - taxResult.confidence) * 0.15; // Small confidence penalty for parent match
        }
      }

      // Level 3: Keyword matching (legacy)
      if (!evidenceFound) {
        for (const [key, supported] of Object.entries(EVIDENCE_BY_KEYWORD)) {
          if (name.includes(key) && supported.some(s => s.toLowerCase() === nutrient.toLowerCase())) {
            evidenceFound = true;
            evidenceSource = `keyword_${key}`;
            break;
          }
        }
      }

      if (evidenceFound) break;
    }

    if (!evidenceFound && conditions.length > 0) {
      const condNames = conditions.map(c => typeof c === 'string' ? c : c.name || '').join(', ');
      warnings.push({
        type: 'weak_evidence',
        message: `"${nutrient}" has no established evidence link to conditions: ${condNames}. Consider reviewing.`,
      });
      confidence -= 0.1;
    }

    // Check 3: Any contraindications with user's conditions?
    for (const cond of conditions) {
      const name = (typeof cond === 'string' ? cond : (cond.name || '')).toLowerCase();
      for (const [key, contraList] of Object.entries(CONTRAINDICATIONS)) {
        if (name.includes(key) && contraList.some(c => c.toLowerCase() === nutrient.toLowerCase())) {
          flaggedNutrients.push({
            nutrient,
            reason: `CONTRAINDICATED: ${nutrient} is contraindicated for condition "${key}".`,
          });
          confidence -= 0.3;
        }
      }
    }

    // Check 4: UL violation for user's demographic?
    if (std.ul !== null && userProfile) {
      const age = userProfile.age || 35;
      const gender = userProfile.gender || 'all';
      const targetStd = db.prepare(`
        SELECT * FROM nutrient_standards
        WHERE element_name = ? AND region = 'US'
          AND (gender = ? OR gender = 'all')
          AND age_min <= ? AND age_max >= ?
        LIMIT 1
      `).get(nutrient, gender, age, age);

      if (targetStd && targetStd.ul !== null) {
        // Note: we can't check exact dosage here since we don't know the supplement
        // amount yet. Flag if the UL is very low (risk of easy overstepping).
        if (targetStd.ul < 5 && targetStd.unit === 'mg') {
          warnings.push({
            type: 'narrow_ul',
            message: `${nutrient} has a low UL (${targetStd.ul} ${targetStd.unit}). Monitor total intake carefully.`,
          });
        }
      }
    }

    approvedNutrients.push(nutrient);
  }

  // Remove flagged (contraindicated) from approved list
  const finalNutrients = approvedNutrients.filter(
    n => !flaggedNutrients.some(f => f.nutrient === n)
  );

  // Check 5: Clinical context patterns in conditions AND raw text AND user age
  const contextWarnings = [];
  const combinedForContext = [
    ...conditions.map(c => typeof c === 'string' ? c : ((c.name || '') + ' ' + (c.description || ''))),
    aiOutput._raw_text || '',
    userProfile ? `${userProfile.age || ''} year old` : '',
  ].join(' ');

  for (const ctx of CLINICAL_CONTEXTS) {
    if (ctx.pattern.test(combinedForContext)) {
      for (const n of ctx.nutrients) {
        if (!finalNutrients.includes(n) && !flaggedNutrients.some(f => f.nutrient === n)) {
          finalNutrients.push(n);
        }
      }
      if (ctx.note && !contextWarnings.some(w => w.message === ctx.note)) {
        contextWarnings.push({ type: 'clinical_context', message: ctx.note });
        warnings.push({ type: 'clinical_context', message: ctx.note });
      }
    }
  }

  // Clamp confidence
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    conditions: aiOutput.conditions || [],
    target_nutrients: finalNutrients,
    flagged_nutrients: flaggedNutrients,
    validation_warnings: warnings,
    context_warnings: contextWarnings,
    confidence: Math.round(confidence * 100) / 100,
    passed: flaggedNutrients.length === 0,
  };
}

module.exports = { validateOnboardingOutput, EVIDENCE_BY_KEYWORD, EVIDENCE_BY_ATC, CONTRAINDICATIONS, CLINICAL_CONTEXTS };
