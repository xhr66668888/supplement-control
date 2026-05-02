// Unit Converter: normalize supplement amounts into canonical units.
// Uses hardcoded conversion factors. Unknown units are kept as-is.

const IU_TO_MASS = {
  'Vitamin A':     { unit: 'mcg', factor: 0.3 },
  'Vitamin D':     { unit: 'mcg', factor: 0.025 },
  'Vitamin D3':    { unit: 'mcg', factor: 0.025 },
  'Vitamin E':     { unit: 'mg',  factor: 0.67 },
  'Beta-Carotene': { unit: 'mcg', factor: 0.6 },
};

const MASS_FACTORS = {
  g:   { mg: 1000,   mcg: 1000000 },
  mg:  { g: 0.001,   mcg: 1000 },
  mcg: { g: 0.000001, mg: 0.001 },
};

const UNIT_ALIASES = {
  ug: 'mcg',
  microgram: 'mcg',
  micrograms: 'mcg',
  '\u00b5g': 'mcg',
  mcg: 'mcg',
  mg: 'mg',
  milligram: 'mg',
  milligrams: 'mg',
  g: 'g',
  gram: 'g',
  grams: 'g',
  iu: 'IU',
  ui: 'IU',
  cfu: 'CFU',
  billion_cfu: 'CFU',
  fcc: 'FCC',
  du: 'DU',
  hut: 'HUT',
  alu: 'ALU',
  gdu: 'GDU',
};

const UNCONVERTABLE = new Set(['CFU', 'FCC', 'DU', 'HUT', 'ALU', 'GDU']);

function normalizeUnit(unit) {
  if (!unit) return 'mg';
  const key = String(unit).trim().replace(/[./]/g, '').replace(/\s+/g, '_').toLowerCase();
  return UNIT_ALIASES[key] || String(unit).trim();
}

function convert(value, fromUnit, toUnit, elementName) {
  fromUnit = normalizeUnit(fromUnit);
  toUnit = normalizeUnit(toUnit);
  if (fromUnit === toUnit) return { value, unit: toUnit };

  if (fromUnit === 'IU' && toUnit !== 'IU') {
    const m = findIUFactor(elementName);
    if (!m) return { value, unit: fromUnit };
    const massValue = value * m.factor;
    if (m.unit === toUnit) return { value: massValue, unit: m.unit };
    return convert(massValue, m.unit, toUnit, elementName);
  }

  if (fromUnit !== 'IU' && toUnit === 'IU') {
    const m = findIUFactor(elementName);
    return (m && m.unit === fromUnit)
      ? { value: value / m.factor, unit: 'IU' }
      : { value, unit: fromUnit };
  }

  const factor = MASS_FACTORS[fromUnit]?.[toUnit];
  if (factor) return { value: value * factor, unit: toUnit };

  console.warn(`[unitConverter] No conversion for ${fromUnit} -> ${toUnit}`);
  return { value, unit: fromUnit };
}

function toCanonical(value, fromUnit, elementName) {
  fromUnit = normalizeUnit(fromUnit);
  if (UNCONVERTABLE.has(fromUnit)) return { value, unit: fromUnit };
  if (fromUnit === 'IU') {
    const m = findIUFactor(elementName);
    if (!m) return { value, unit: fromUnit };
    return toCanonical(value * m.factor, m.unit, elementName);
  }
  const target = fromUnit === 'mcg' ? 'mg' : fromUnit === 'g' ? 'mg' : fromUnit;
  return convert(value, fromUnit, target, elementName);
}

function findIUFactor(elementName) {
  if (!elementName) return null;
  for (const [key, val] of Object.entries(IU_TO_MASS)) {
    if (elementName.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return null;
}

module.exports = { convert, toCanonical, normalizeUnit };
