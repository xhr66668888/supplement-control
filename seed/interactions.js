/**
 * Interaction Rules — hardcoded supplement-drug and supplement-supplement
 * interaction pairs. Used by SchedulerCore and interactionChecker.
 */
module.exports = [
  // ---- Mineral Competition (absorption conflicts) ----
  {
    element_a: 'Calcium',
    element_b: 'Iron',
    effect: 'inhibit',
    advice: 'Calcium inhibits iron absorption. Separate by at least 2 hours. Schedule calcium in the morning and iron in the evening.',
  },
  {
    element_a: 'Zinc',
    element_b: 'Copper',
    effect: 'inhibit',
    advice: 'High-dose zinc depletes copper. If taking zinc > 30mg/day, ensure copper intake or separate dosing.',
  },
  {
    element_a: 'Calcium',
    element_b: 'Zinc',
    effect: 'inhibit',
    advice: 'Calcium can reduce zinc absorption. Separate by at least 2 hours.',
  },
  {
    element_a: 'Calcium',
    element_b: 'Magnesium',
    effect: 'inhibit',
    advice: 'High-dose calcium may reduce magnesium absorption. Consider taking at different times of day.',
  },
  {
    element_a: 'Iron',
    element_b: 'Zinc',
    effect: 'inhibit',
    advice: 'Iron and zinc compete for absorption. Separate by at least 2 hours.',
  },
  {
    element_a: 'Magnesium',
    element_b: 'Zinc',
    effect: 'inhibit',
    advice: 'High-dose magnesium (>400mg) can interfere with zinc absorption. Consider separating.',
  },

  // ---- Synergistic Pairs ----
  {
    element_a: 'Vitamin C',
    element_b: 'Iron',
    effect: 'synergy',
    advice: 'Vitamin C enhances non-heme iron absorption. Taking together with a meal is beneficial.',
  },
  {
    element_a: 'Vitamin D3',
    element_b: 'Calcium',
    effect: 'synergy',
    advice: 'Vitamin D enhances calcium absorption. Taking together with a meal is recommended.',
  },
  {
    element_a: 'Vitamin D3',
    element_b: 'Magnesium',
    effect: 'synergy',
    advice: 'Magnesium is required to convert vitamin D into its active form. Co-administration is beneficial.',
  },
  {
    element_a: 'Vitamin K2 (MK-7)',
    element_b: 'Vitamin D3',
    effect: 'synergy',
    advice: 'Vitamins D3 and K2 work synergistically for bone and cardiovascular health. Safe to take together.',
  },
  {
    element_a: 'Potassium',
    element_b: 'Magnesium',
    effect: 'synergy',
    advice: 'Magnesium helps regulate potassium levels. Co-administration is generally safe.',
  },
  {
    element_a: 'Omega-3 (EPA+DHA)',
    element_b: 'Vitamin E',
    effect: 'synergy',
    advice: 'Vitamin E helps protect omega-3 fatty acids from oxidation.',
  },

  // ---- Drug/Supplement Safety Warnings ----
  {
    element_a: 'Vitamin K1',
    element_b: 'Anticoagulants (Warfarin)',
    effect: 'caution',
    advice: 'Vitamin K can reduce the effectiveness of warfarin and other anticoagulants. Consult a doctor before supplementing.',
  },
  {
    element_a: 'Vitamin K2 (MK-7)',
    element_b: 'Anticoagulants (Warfarin)',
    effect: 'caution',
    advice: 'Vitamin K2 (MK-7) can reduce anticoagulant effectiveness. Consult a doctor before supplementing.',
  },
  {
    element_a: 'Vitamin E',
    element_b: 'Anticoagulants (Warfarin)',
    effect: 'caution',
    advice: 'High-dose vitamin E (>400 IU/day) may increase bleeding risk when combined with anticoagulants.',
  },
  {
    element_a: "St. John's Wort",
    element_b: 'SSRI Antidepressants',
    effect: 'toxic',
    advice: 'St. John\'s Wort combined with SSRIs can cause serotonin syndrome — a potentially life-threatening condition. Do NOT combine.',
  },
  {
    element_a: '5-HTP',
    element_b: 'SSRI Antidepressants',
    effect: 'toxic',
    advice: '5-HTP combined with SSRIs increases serotonin syndrome risk. Do NOT combine without medical supervision.',
  },
  {
    element_a: 'Melatonin',
    element_b: 'Alcohol',
    effect: 'caution',
    advice: 'Alcohol can reduce melatonin\'s effectiveness and increase drowsiness. Avoid combining.',
  },
  {
    element_a: 'GABA',
    element_b: 'Alcohol',
    effect: 'caution',
    advice: 'GABA supplements combined with alcohol may cause excessive sedation. Avoid combining.',
  },
  {
    element_a: "St. John's Wort",
    element_b: 'Oral Contraceptives',
    effect: 'inhibit',
    advice: 'St. John\'s Wort can reduce the effectiveness of oral contraceptives. Use additional birth control methods.',
  },
  {
    element_a: 'Vitamin A',
    element_b: 'Vitamin D3',
    effect: 'caution',
    advice: 'High doses of vitamins A and D together may compete for absorption. Monitor total intake from all sources.',
  },
  {
    element_a: 'Ginkgo Biloba',
    element_b: 'Anticoagulants (Warfarin)',
    effect: 'caution',
    advice: 'Ginkgo may increase bleeding risk when combined with anticoagulants. Consult a doctor.',
  },
  // ---- Drug-Nutrient Interactions ----
  {
    element_a: 'Corticosteroids (Prednisone, etc.)',
    element_b: 'Calcium',
    effect: 'inhibit',
    advice: 'Long-term corticosteroid use depletes calcium and increases osteoporosis risk. Calcium supplementation is recommended but must be monitored.',
  },
  {
    element_a: 'Corticosteroids (Prednisone, etc.)',
    element_b: 'Vitamin D3',
    effect: 'inhibit',
    advice: 'Corticosteroids impair vitamin D metabolism. Higher vitamin D intake may be needed but requires medical supervision.',
  },
  {
    element_a: 'Corticosteroids (Prednisone, etc.)',
    element_b: 'Potassium',
    effect: 'inhibit',
    advice: 'Corticosteroids can cause potassium depletion. Monitor potassium levels and consider supplementation.',
  },
  {
    element_a: 'Proton Pump Inhibitors (Omeprazole, etc.)',
    element_b: 'Magnesium',
    effect: 'inhibit',
    advice: 'Long-term PPI use can cause hypomagnesemia. Monitor magnesium levels. Separate dosing by at least 2 hours.',
  },
  {
    element_a: 'Proton Pump Inhibitors (Omeprazole, etc.)',
    element_b: 'Vitamin B12 (Cobalamin)',
    effect: 'inhibit',
    advice: 'PPIs reduce stomach acid needed for B12 absorption from food. B12 supplementation may be necessary with long-term use.',
  },
  {
    element_a: 'Proton Pump Inhibitors (Omeprazole, etc.)',
    element_b: 'Calcium',
    effect: 'inhibit',
    advice: 'Reduced stomach acid impairs calcium carbonate absorption. Consider calcium citrate instead, which does not require stomach acid.',
  },
  {
    element_a: 'Metformin',
    element_b: 'Vitamin B12 (Cobalamin)',
    effect: 'inhibit',
    advice: 'Long-term metformin use is associated with B12 deficiency. Regular B12 monitoring is recommended.',
  },
  {
    element_a: 'Levothyroxine (Thyroid hormone)',
    element_b: 'Calcium',
    effect: 'inhibit',
    advice: 'Calcium can reduce levothyroxine absorption by up to 40%. Take at least 4 hours apart.',
  },
  {
    element_a: 'Levothyroxine (Thyroid hormone)',
    element_b: 'Iron',
    effect: 'inhibit',
    advice: 'Iron reduces levothyroxine absorption. Separate dosing by at least 4 hours.',
  },
  {
    element_a: 'High-Dose Vitamin D3 (50,000 IU weekly)',
    element_b: 'Calcium',
    effect: 'synergy',
    advice: 'High-dose vitamin D significantly increases calcium absorption. Monitor serum calcium to avoid hypercalcemia. Do NOT take additional calcium without medical supervision.',
  },
  {
    element_a: 'High-Dose Vitamin D3 (50,000 IU weekly)',
    element_b: 'Vitamin K2 (MK-7)',
    effect: 'synergy',
    advice: 'Vitamin K2 helps direct calcium mobilized by high-dose vitamin D into bones rather than soft tissues. Consider co-administration.',
  },
  {
    element_a: 'Iodine',
    element_b: 'Thyroid Nodules',
    effect: 'caution',
    advice: 'Iodine supplementation may exacerbate certain thyroid conditions including nodules. Avoid high-dose iodine unless specifically prescribed.',
  },
  {
    element_a: 'Vitamin D3',
    element_b: 'Hypercalcemia Risk',
    effect: 'caution',
    advice: 'Doses above 4,000 IU daily (or equivalent weekly) require monitoring of serum calcium and 25(OH)D levels. Stop if hypercalcemia symptoms develop (nausea, confusion, kidney stones).',
  },
];
