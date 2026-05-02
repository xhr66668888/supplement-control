// Personalized absorption profile.
//
// Uses deterministic signals from onboarding text/conditions to estimate where
// labeled intake may overstate effective intake. This is a product guidance
// layer; UL safety checks still use the labeled amount.

function buildAbsorptionProfile(user) {
  const age = calculateAge(user.birth_date);
  const conditions = [
    ...safeJson(user.conditions),
    ...safeJson(user.atc_conditions),
  ];
  const text = [
    user.raw_profile || '',
    user.gender || '',
    Number.isFinite(age) ? `${age} years old` : '',
    ...conditions.map(c => typeof c === 'string'
      ? c
      : `${c.name || ''} ${c.name_cn || ''} ${c.description || ''} ${c.description_cn || ''}`),
  ].join(' ').toLowerCase();

  const flags = [];
  const notes = [];
  let score = 1;

  function addFlag(key, label, note, impact) {
    if (flags.some(f => f.key === key)) return;
    flags.push({ key, label, impact });
    notes.push(note);
    score += impact;
  }

  if (Number.isFinite(age) && age >= 70) {
    addFlag('age_70', '70+', 'Older age can reduce absorption of B12, vitamin D, calcium, and protein.', -0.1);
  } else if (Number.isFinite(age) && age >= 50) {
    addFlag('age_50', '50+', 'Absorption efficiency often declines gradually with age.', -0.05);
  }

  if (/ibd|crohn|colitis|celiac|malabsorption|bariatric|gastrectomy|胃切除|吸收不良|肠炎|克罗恩|乳糜泻/.test(text)) {
    addFlag('malabsorption', 'GI malabsorption', 'GI disease or surgery can reduce absorption across minerals and fat-soluble vitamins.', -0.18);
  }

  if (/gastritis|gerd|reflux|ppi|omeprazole|pantoprazole|胃炎|胃酸|反流|奥美拉唑|质子泵/.test(text)) {
    addFlag('low_acid', 'Low stomach acid risk', 'Low stomach acid can affect B12, iron, magnesium, and calcium carbonate absorption.', -0.08);
  }

  if (/metformin|二甲双胍/.test(text)) {
    addFlag('metformin', 'Metformin', 'Metformin use is associated with lower B12 status over time.', -0.04);
  }

  if (/vegan|vegetarian|素食/.test(text)) {
    addFlag('plant_based', 'Plant-based diet', 'Plant-based diets need closer tracking for B12, iron, zinc, calcium, and omega-3.', -0.04);
  }

  if (/mthfr|c677t|甲基化/.test(text)) {
    addFlag('mthfr', 'MTHFR signal', 'MTHFR-related notes favor methylfolate over plain folic acid when folate is used.', 0);
  }

  score = clamp(score, 0.45, 1.05);
  return {
    score: Math.round(score * 100) / 100,
    level: score >= 0.9 ? 'normal' : score >= 0.72 ? 'watch' : 'reduced',
    flags,
    notes,
  };
}

function absorptionMultiplierFor(element, category, nutrient, profile) {
  if (!profile) return { multiplier: 1, notes: [] };
  const name = String(element || '').toLowerCase();
  const form = String(nutrient?.form || '').toLowerCase();
  const flagKeys = new Set((profile.flags || []).map(f => f.key));
  const notes = [];
  let multiplier = profile.score || 1;

  function apply(flag, factor, note) {
    if (!flagKeys.has(flag)) return;
    multiplier *= factor;
    if (note) notes.push(note);
  }

  if (/vitamin a|vitamin d|vitamin e|vitamin k|omega-3|epa|dha/.test(name) || category === 'fatty-acid') {
    apply('malabsorption', 0.82, 'Fat-soluble nutrient absorption may be lower with malabsorption signals.');
  }

  if (/vitamin b12|cobalamin/.test(name)) {
    apply('age_70', 0.9, 'B12 absorption may decline with age.');
    apply('low_acid', 0.78, 'B12 absorption can be reduced when stomach acid is low.');
    apply('metformin', 0.78, 'Metformin can lower B12 status.');
    apply('plant_based', 0.82, 'Plant-based diets need careful B12 tracking.');
  }

  if (/iron/.test(name)) {
    apply('malabsorption', 0.78, 'Iron absorption may be lower with GI inflammation or malabsorption.');
    apply('low_acid', 0.88, 'Lower stomach acid can reduce non-heme iron absorption.');
    apply('plant_based', 0.88, 'Plant-based iron is less readily absorbed than heme iron.');
  }

  if (/calcium/.test(name)) {
    apply('age_70', 0.92, 'Calcium absorption may decline with age.');
    if (flagKeys.has('low_acid')) {
      const factor = /citrate|malate/.test(form) ? 0.98 : 0.82;
      multiplier *= factor;
      notes.push(/citrate|malate/.test(form)
        ? 'Calcium citrate/malate is less dependent on stomach acid.'
        : 'Calcium carbonate is more dependent on stomach acid; taking with food helps.');
    }
  }

  if (/zinc|magnesium/.test(name)) {
    apply('malabsorption', 0.88, 'Mineral absorption may be lower with GI malabsorption signals.');
  }

  if (/folate|vitamin b9/.test(name) && flagKeys.has('mthfr')) {
    notes.push('MTHFR signal detected: methylfolate is usually preferable to plain folic acid.');
  }

  return {
    multiplier: Math.round(clamp(multiplier, 0.3, 1.15) * 100) / 100,
    notes: [...new Set(notes)],
  };
}

function safeJson(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function calculateAge(birthDate) {
  if (!birthDate) return NaN;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return NaN;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { buildAbsorptionProfile, absorptionMultiplierFor };
