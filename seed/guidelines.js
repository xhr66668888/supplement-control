/**
 * Nutrient Standards Seed Data — 80+ elements across 8 categories.
 *
 * RDA = Recommended Daily Allowance
 * UL  = Tolerable Upper Intake Level
 * null RDA/UL means "no established standard" (Tier 2).
 *
 * Sources: US NIH/FDA, Japan MHLW (厚生労働省).
 */

// Shorthand helpers
const ALL = 'all'; const M = 'male'; const F = 'female';
const US = 'US'; const JP = 'JP';
const ADULT = [18, 120];
const ELDER = [70, 120];

const elements = [
  // =========================================================================
  // VITAMINS (18)
  // =========================================================================
  { el:'Vitamin A',         cat:'vitamin', rgn:US, min:19, max:120, g:M,   rda:900,   ul:3000,  unit:'mcg' },
  { el:'Vitamin A',         cat:'vitamin', rgn:US, min:19, max:120, g:F,   rda:700,   ul:3000,  unit:'mcg' },
  { el:'Vitamin A',         cat:'vitamin', rgn:JP, min:18, max:120, g:M,   rda:850,   ul:2700,  unit:'mcg' },
  { el:'Vitamin A',         cat:'vitamin', rgn:JP, min:18, max:120, g:F,   rda:650,   ul:2700,  unit:'mcg' },

  { el:'Vitamin B1 (Thiamin)',  cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:1.2,  ul:null,  unit:'mg' },
  { el:'Vitamin B1 (Thiamin)',  cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:1.4,  ul:null,  unit:'mg' },

  { el:'Vitamin B2 (Riboflavin)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:1.3, ul:null, unit:'mg' },
  { el:'Vitamin B2 (Riboflavin)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:1.6, ul:null, unit:'mg' },

  { el:'Vitamin B3 (Niacin)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:16,   ul:35,    unit:'mg' },
  { el:'Vitamin B3 (Niacin)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:15,   ul:30,    unit:'mg' },

  { el:'Vitamin B5 (Pantothenic Acid)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:5,   ul:null,  unit:'mg' },
  { el:'Vitamin B5 (Pantothenic Acid)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:5,   ul:null,  unit:'mg' },

  { el:'Vitamin B6',        cat:'vitamin', rgn:US, min:19, max:50,  g:ALL, rda:1.3,  ul:100,   unit:'mg' },
  { el:'Vitamin B6',        cat:'vitamin', rgn:US, min:51, max:120, g:M,   rda:1.7,  ul:100,   unit:'mg' },
  { el:'Vitamin B6',        cat:'vitamin', rgn:US, min:51, max:120, g:F,   rda:1.5,  ul:100,   unit:'mg' },
  { el:'Vitamin B6',        cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:1.4,  ul:60,    unit:'mg' },

  { el:'Vitamin B7 (Biotin)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:30,   ul:null, unit:'mcg' },
  { el:'Vitamin B7 (Biotin)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:50,   ul:null, unit:'mcg' },

  { el:'Vitamin B9 (Folate)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:400,  ul:1000,  unit:'mcg' },
  { el:'Vitamin B9 (Folate)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:240,  ul:900,   unit:'mcg' },

  { el:'Vitamin B12 (Cobalamin)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:2.4, ul:null, unit:'mcg' },
  { el:'Vitamin B12 (Cobalamin)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:2.4, ul:null, unit:'mcg' },

  { el:'Vitamin C',         cat:'vitamin', rgn:US, min:19, max:120, g:M,   rda:90,    ul:2000,  unit:'mg' },
  { el:'Vitamin C',         cat:'vitamin', rgn:US, min:19, max:120, g:F,   rda:75,    ul:2000,  unit:'mg' },
  { el:'Vitamin C',         cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:100,   ul:2000,  unit:'mg' },

  { el:'Vitamin D3',        cat:'vitamin', rgn:US, min:19, max:70,  g:ALL, rda:15,    ul:100,   unit:'mcg' },
  { el:'Vitamin D3',        cat:'vitamin', rgn:US, min:71, max:120, g:ALL, rda:20,    ul:100,   unit:'mcg' },
  { el:'Vitamin D3',        cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:8.5,   ul:100,   unit:'mcg' },

  { el:'Vitamin E',         cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:15,    ul:1000,  unit:'mg' },
  { el:'Vitamin E',         cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:6.5,   ul:800,   unit:'mg' },

  { el:'Vitamin K1',        cat:'vitamin', rgn:US, min:19, max:120, g:M,   rda:120,   ul:null,  unit:'mcg' },
  { el:'Vitamin K1',        cat:'vitamin', rgn:US, min:19, max:120, g:F,   rda:90,    ul:null,  unit:'mcg' },
  { el:'Vitamin K1',        cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:150,   ul:null,  unit:'mcg' },

  { el:'Vitamin K2 (MK-7)', cat:'vitamin', rgn:US, min:19, max:120, g:ALL, rda:null,  ul:null,  unit:'mcg' },
  { el:'Vitamin K2 (MK-7)', cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:null,  ul:null,  unit:'mcg' },

  { el:'Choline',           cat:'vitamin', rgn:US, min:19, max:120, g:M,   rda:550,   ul:3500,  unit:'mg' },
  { el:'Choline',           cat:'vitamin', rgn:US, min:19, max:120, g:F,   rda:425,   ul:3500,  unit:'mg' },
  { el:'Choline',           cat:'vitamin', rgn:JP, min:18, max:120, g:ALL, rda:450,   ul:3000,  unit:'mg' },

  // =========================================================================
  // MINERALS (16)
  // =========================================================================
  { el:'Calcium',     cat:'mineral', rgn:US, min:19, max:50,  g:ALL, rda:1000,  ul:2500, unit:'mg' },
  { el:'Calcium',     cat:'mineral', rgn:US, min:51, max:120, g:M,   rda:1000,  ul:2000, unit:'mg' },
  { el:'Calcium',     cat:'mineral', rgn:US, min:51, max:120, g:F,   rda:1200,  ul:2000, unit:'mg' },
  { el:'Calcium',     cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:650,   ul:2500, unit:'mg' },

  { el:'Magnesium',   cat:'mineral', rgn:US, min:19, max:30,  g:M,   rda:400,   ul:350,  unit:'mg' },
  { el:'Magnesium',   cat:'mineral', rgn:US, min:31, max:120, g:M,   rda:420,   ul:350,  unit:'mg' },
  { el:'Magnesium',   cat:'mineral', rgn:US, min:19, max:30,  g:F,   rda:310,   ul:350,  unit:'mg' },
  { el:'Magnesium',   cat:'mineral', rgn:US, min:31, max:120, g:F,   rda:320,   ul:350,  unit:'mg' },
  { el:'Magnesium',   cat:'mineral', rgn:JP, min:18, max:120, g:M,   rda:370,   ul:350,  unit:'mg' },
  { el:'Magnesium',   cat:'mineral', rgn:JP, min:18, max:120, g:F,   rda:290,   ul:350,  unit:'mg' },

  { el:'Zinc',        cat:'mineral', rgn:US, min:19, max:120, g:M,   rda:11,    ul:40,   unit:'mg' },
  { el:'Zinc',        cat:'mineral', rgn:US, min:19, max:120, g:F,   rda:8,     ul:40,   unit:'mg' },
  { el:'Zinc',        cat:'mineral', rgn:JP, min:18, max:120, g:M,   rda:11,    ul:35,   unit:'mg' },
  { el:'Zinc',        cat:'mineral', rgn:JP, min:18, max:120, g:F,   rda:8,     ul:35,   unit:'mg' },

  { el:'Iron',        cat:'mineral', rgn:US, min:19, max:50,  g:M,   rda:8,     ul:45,   unit:'mg' },
  { el:'Iron',        cat:'mineral', rgn:US, min:19, max:50,  g:F,   rda:18,    ul:45,   unit:'mg' },
  { el:'Iron',        cat:'mineral', rgn:US, min:51, max:120, g:ALL, rda:8,     ul:45,   unit:'mg' },
  { el:'Iron',        cat:'mineral', rgn:JP, min:18, max:120, g:M,   rda:7.5,   ul:40,   unit:'mg' },
  { el:'Iron',        cat:'mineral', rgn:JP, min:18, max:49,  g:F,   rda:10.5,  ul:40,   unit:'mg' },

  { el:'Selenium',    cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:55,    ul:400,  unit:'mcg' },
  { el:'Selenium',    cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:30,    ul:350,  unit:'mcg' },

  { el:'Copper',      cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:0.9,   ul:10,   unit:'mg' },
  { el:'Copper',      cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:0.9,   ul:7,    unit:'mg' },

  { el:'Iodine',      cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:150,   ul:1100, unit:'mcg' },
  { el:'Iodine',      cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:130,   ul:1000, unit:'mcg' },

  { el:'Potassium',   cat:'mineral', rgn:US, min:19, max:120, g:M,   rda:3400,  ul:null, unit:'mg' },
  { el:'Potassium',   cat:'mineral', rgn:US, min:19, max:120, g:F,   rda:2600,  ul:null, unit:'mg' },
  { el:'Potassium',   cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:2500,  ul:null, unit:'mg' },

  { el:'Sodium',      cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:null,  ul:2300,  unit:'mg' },
  { el:'Sodium',      cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:null,  ul:2600,  unit:'mg' },

  { el:'Manganese',   cat:'mineral', rgn:US, min:19, max:120, g:M,   rda:2.3,   ul:11,   unit:'mg' },
  { el:'Manganese',   cat:'mineral', rgn:US, min:19, max:120, g:F,   rda:1.8,   ul:11,   unit:'mg' },
  { el:'Manganese',   cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:4.0,   ul:11,   unit:'mg' },

  { el:'Chromium',    cat:'mineral', rgn:US, min:19, max:50,  g:M,   rda:35,    ul:null, unit:'mcg' },
  { el:'Chromium',    cat:'mineral', rgn:US, min:19, max:50,  g:F,   rda:25,    ul:null, unit:'mcg' },
  { el:'Chromium',    cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:35,    ul:500,  unit:'mcg' },

  { el:'Molybdenum',  cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:45,    ul:2000, unit:'mcg' },
  { el:'Molybdenum',  cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:25,    ul:600,  unit:'mcg' },

  { el:'Phosphorus',  cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:700,   ul:4000, unit:'mg' },
  { el:'Phosphorus',  cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:1000,  ul:3000, unit:'mg' },

  { el:'Boron',       cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:null,  ul:20,   unit:'mg' },
  { el:'Boron',       cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:null,  ul:null, unit:'mg' },

  { el:'Silicon',     cat:'mineral', rgn:US, min:19, max:120, g:ALL, rda:null,  ul:null, unit:'mg' },
  { el:'Silicon',     cat:'mineral', rgn:JP, min:18, max:120, g:ALL, rda:null,  ul:null, unit:'mg' },

  // =========================================================================
  // AMINO ACIDS (12) — most have no established RDA/UL
  // =========================================================================
  { el:'L-Theanine',      cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'L-Theanine',      cat:'amino-acid', rgn:JP, min:18, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'L-Arginine',      cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'L-Lysine',        cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'L-Tryptophan',    cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'L-Tyrosine',      cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'L-Carnitine',     cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Taurine',         cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Glycine',         cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'NAC (N-Acetyl Cysteine)', cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Glutamine',       cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Creatine',        cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'BCAA',            cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Beta-Alanine',    cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Citrulline',      cat:'amino-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },

  // =========================================================================
  // FATTY ACIDS (6)
  // =========================================================================
  { el:'Omega-3 (EPA+DHA)', cat:'fatty-acid', rgn:US, min:19, max:120, g:ALL, rda:250,  ul:3000, unit:'mg' },
  { el:'Omega-3 (EPA+DHA)', cat:'fatty-acid', rgn:JP, min:18, max:120, g:ALL, rda:1000, ul:3000, unit:'mg' },
  { el:'Omega-6 (LA)',     cat:'fatty-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Omega-7',          cat:'fatty-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Omega-9',          cat:'fatty-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'ALA (Alpha-Linolenic Acid)', cat:'fatty-acid', rgn:US, min:19, max:120, g:M, rda:1.6, ul:null, unit:'g' },
  { el:'ALA (Alpha-Linolenic Acid)', cat:'fatty-acid', rgn:US, min:19, max:120, g:F, rda:1.1, ul:null, unit:'g' },
  { el:'GLA (Gamma-Linolenic Acid)', cat:'fatty-acid', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },

  // =========================================================================
  // HERBALS / ADAPTOGENS (18) — almost all Tier 2 (no RDA/UL)
  // =========================================================================
  { el:'Ashwagandha',      cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Maca Root',        cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Rhodiola Rosea',   cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Panax Ginseng',    cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Ginkgo Biloba',    cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Turmeric (Curcumin)', cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Milk Thistle (Silymarin)', cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Echinacea',        cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Valerian Root',    cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:"St. John's Wort",  cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Saw Palmetto',     cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Black Cohosh',     cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Astragalus',       cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Holy Basil (Tulsi)', cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Reishi Mushroom',  cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:"Lion's Mane",      cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Cordyceps',        cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Bacopa Monnieri',  cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Fenugreek',        cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Tribulus Terrestris', cat:'herbal', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },

  // =========================================================================
  // ENZYMES (5) — all Tier 2
  // =========================================================================
  { el:'Bromelain',   cat:'enzyme', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Papain',      cat:'enzyme', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Lactase',     cat:'enzyme', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'FCC' },
  { el:'Amylase',     cat:'enzyme', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'DU' },
  { el:'Protease',    cat:'enzyme', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'HUT' },

  // =========================================================================
  // PROBIOTICS (1) — CFU-based, no RDA
  // =========================================================================
  { el:'Probiotics',  cat:'probiotic', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'CFU' },
  { el:'Probiotics',  cat:'probiotic', rgn:JP, min:18, max:120, g:ALL, rda:null, ul:null, unit:'CFU' },

  // =========================================================================
  // OTHER (12)
  // =========================================================================
  { el:'Coenzyme Q10 (CoQ10)', cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Coenzyme Q10 (CoQ10)', cat:'other', rgn:JP, min:18, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Melatonin',         cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:10,    unit:'mg' },
  { el:'Melatonin',         cat:'other', rgn:JP, min:18, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Glucosamine',       cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Chondroitin',       cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'MSM (Methylsulfonylmethane)', cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Collagen',          cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'5-HTP',             cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Alpha-Lipoic Acid', cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Resveratrol',       cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Quercetin',         cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Hyaluronic Acid',   cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Lutein',            cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Zeaxanthin',        cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Astaxanthin',       cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Beta-Carotene',     cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mcg' },
  { el:'Spirulina',         cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Chlorella',         cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Wheatgrass',        cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Apple Cider Vinegar', cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'GABA',              cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Inositol',          cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'PQQ (Pyrroloquinoline Quinone)', cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'D-Mannose',         cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Berberine',         cat:'other', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Whey Protein',      cat:'protein', rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'g' },
  { el:'Green Tea Extract', cat:'herbal',  rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Inositol',          cat:'other',   rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
  { el:'Phosphatidylserine',cat:'other',   rgn:US, min:19, max:120, g:ALL, rda:null, ul:null, unit:'mg' },
];

// Expand each element record into a flat insert row
const rows = elements.map(e => ({
  element_name: e.el,
  category:     e.cat,
  region:       e.rgn,
  age_min:      e.min,
  age_max:      e.max,
  gender:       e.g,
  rda:          e.rda !== undefined ? e.rda : null,
  ul:           e.ul !== undefined ? e.ul : null,
  unit:         e.unit,
  source:       'manual',
}));

module.exports = rows;
