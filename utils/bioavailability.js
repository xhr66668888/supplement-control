// Form-aware relative bioavailability hints.
//
// This is a deterministic product-quality layer, not a medical dosing engine.
// Factors are intentionally conservative and are used to estimate effective
// intake for dashboard guidance while safety checks still use the labeled dose.

const RULES = [
  {
    canonical: /magnesium/i,
    forms: [
      { pattern: /oxide/i, form: 'oxide', factor: 0.2, note: 'Magnesium oxide is often less bioavailable.' },
      { pattern: /citrate/i, form: 'citrate', factor: 0.65, note: 'Magnesium citrate is generally more bioavailable than oxide.' },
      { pattern: /glycinate|bisglycinate/i, form: 'glycinate', factor: 0.85, note: 'Magnesium glycinate is usually well tolerated.' },
      { pattern: /malate/i, form: 'malate', factor: 0.8, note: 'Magnesium malate is typically well absorbed.' },
      { pattern: /threonate/i, form: 'threonate', factor: 0.75, note: 'Magnesium threonate has distinct positioning from plain magnesium salts.' },
      { pattern: /taurate/i, form: 'taurate', factor: 0.8, note: 'Magnesium taurate is typically well tolerated.' },
    ],
  },
  {
    canonical: /calcium/i,
    forms: [
      { pattern: /carbonate/i, form: 'carbonate', factor: 0.6, note: 'Calcium carbonate depends more on stomach acid and is better with food.' },
      { pattern: /citrate(?!\s*malate)/i, form: 'citrate', factor: 0.85, note: 'Calcium citrate is less dependent on stomach acid.' },
      { pattern: /citrate\s+malate|malate/i, form: 'citrate malate', factor: 0.9, note: 'Calcium citrate malate is a more soluble calcium form.' },
    ],
  },
  {
    canonical: /iron/i,
    forms: [
      { pattern: /bisglycinate|glycinate/i, form: 'bisglycinate', factor: 0.85, note: 'Iron bisglycinate is often better tolerated.' },
      { pattern: /sulfate/i, form: 'sulfate', factor: 0.7, note: 'Ferrous sulfate is common but can be harder on the stomach.' },
      { pattern: /fumarate/i, form: 'fumarate', factor: 0.65, note: 'Ferrous fumarate is a common iron salt.' },
    ],
  },
  {
    canonical: /zinc/i,
    forms: [
      { pattern: /oxide/i, form: 'oxide', factor: 0.5, note: 'Zinc oxide is usually less bioavailable.' },
      { pattern: /picolinate/i, form: 'picolinate', factor: 0.8, note: 'Zinc picolinate is a better-absorbed zinc form.' },
      { pattern: /citrate/i, form: 'citrate', factor: 0.75, note: 'Zinc citrate is a better-absorbed zinc form.' },
      { pattern: /gluconate/i, form: 'gluconate', factor: 0.7, note: 'Zinc gluconate is a common moderate-absorption form.' },
    ],
  },
  {
    canonical: /turmeric|curcumin/i,
    forms: [
      { pattern: /phytosome|meriva/i, form: 'phytosome', factor: 1.8, note: 'Curcumin phytosome products are designed for higher absorption.' },
      { pattern: /piperine|black pepper|bioperine/i, form: 'piperine-enhanced', factor: 1.5, note: 'Piperine can improve curcumin absorption and may affect medication metabolism.' },
      { pattern: /liposomal/i, form: 'liposomal', factor: 1.6, note: 'Liposomal curcumin is designed for improved absorption.' },
      { pattern: /extract|standardized/i, form: 'standardized extract', factor: 1.1, note: 'Standardized curcumin extract detected.' },
    ],
  },
  {
    canonical: /coenzyme q10|coq10/i,
    forms: [
      { pattern: /ubiquinol/i, form: 'ubiquinol', factor: 1.25, note: 'Ubiquinol is the reduced form of CoQ10.' },
      { pattern: /ubiquinone/i, form: 'ubiquinone', factor: 1.0, note: 'Ubiquinone is the common CoQ10 form.' },
    ],
  },
  {
    canonical: /vitamin b12|cobalamin/i,
    forms: [
      { pattern: /methylcobalamin/i, form: 'methylcobalamin', factor: 1.1, note: 'Methylcobalamin form detected.' },
      { pattern: /cyanocobalamin/i, form: 'cyanocobalamin', factor: 1.0, note: 'Cyanocobalamin form detected.' },
      { pattern: /sublingual|lozenge/i, form: 'sublingual', factor: 1.2, note: 'Sublingual B12 may help when GI absorption is limited.' },
    ],
  },
  {
    canonical: /folate|vitamin b9/i,
    forms: [
      { pattern: /methylfolate|5-mthf|l-5-mthf/i, form: 'methylfolate', factor: 1.15, note: 'Methylfolate form detected.' },
      { pattern: /folic acid/i, form: 'folic acid', factor: 1.0, note: 'Folic acid form detected.' },
    ],
  },
  {
    canonical: /omega-?3|epa|dha/i,
    forms: [
      { pattern: /triglyceride|re-esterified|rTG/i, form: 'triglyceride', factor: 1.15, note: 'Triglyceride omega-3 form detected.' },
      { pattern: /ethyl ester/i, form: 'ethyl ester', factor: 0.85, note: 'Ethyl ester omega-3 is best taken with a fat-containing meal.' },
      { pattern: /phospholipid|krill/i, form: 'phospholipid', factor: 1.15, note: 'Phospholipid omega-3 form detected.' },
    ],
  },
];

function detectBioavailability(rawName, canonicalName) {
  const raw = String(rawName || '').toLowerCase();
  const canonical = String(canonicalName || rawName || '').toLowerCase();

  for (const group of RULES) {
    if (!group.canonical.test(canonical) && !group.canonical.test(raw)) continue;
    for (const form of group.forms) {
      if (form.pattern.test(raw)) {
        return {
          form: form.form,
          bioavailability_factor: form.factor,
          bioavailability_note: form.note,
        };
      }
    }
  }

  return {
    form: null,
    bioavailability_factor: 1,
    bioavailability_note: null,
  };
}

module.exports = { detectBioavailability };
