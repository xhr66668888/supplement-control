// Hierarchical Medical Taxonomy with Parent-Node Anchoring.
//
// Inspired by SMI (Semantic Meaning Inference): rare leaf concepts inherit
// semantic meaning from their parent nodes in the ATC/nutrient category tree.
//
// Key insight: SNR(child) = SNR(parent) * (n_parent / (n_parent + n_child))
//   where n = frequency of occurrence. Rare children borrow parent's signal.
//
// When a condition/nutrient is unknown:
//   1. Walk up the taxonomy tree to find nearest known ancestor
//   2. Inherit that ancestor's nutrient mappings
//   3. Confidence decays with tree distance: conf = base_conf / (1 + depth_delta)

const { getDb } = require('../config/database');

// ============================================================
// ATC CONDITION TAXONOMY (WHO ATC classification tree)
// Each node: { code, name, parent, children[], nutrients[] }
// ============================================================
const ATC_TREE = {
  A: {
    name: 'Alimentary Tract and Metabolism', parent: null,
    nutrients: ['Probiotics', 'Fiber'],
    children: {
      A02: {
        name: 'Drugs for Acid Related Disorders', nutrients: ['Melatonin', 'DGL Licorice', 'Magnesium'],
        children: {
          A02B: { name: 'Drugs for Peptic Ulcer and GERD', nutrients: ['Melatonin', 'Magnesium', 'Probiotics', 'Zinc', 'Glutamine'] },
        },
      },
      A05: {
        name: 'Bile and Liver Therapy', nutrients: ['Milk Thistle (Silymarin)', 'NAC (N-Acetyl Cysteine)', 'Alpha-Lipoic Acid'],
        children: {
          A05B: { name: 'Hepatic Support', nutrients: ['Milk Thistle (Silymarin)', 'NAC (N-Acetyl Cysteine)', 'Alpha-Lipoic Acid', 'Turmeric (Curcumin)'] },
        },
      },
      A06: {
        name: 'Drugs for Constipation', nutrients: ['Probiotics', 'Magnesium Citrate', 'Fiber'],
        children: {
          A06A: { name: 'Chronic Constipation', nutrients: ['Probiotics', 'Magnesium Citrate', 'Fiber', 'Psyllium Husk'] },
        },
      },
      A08: { name: 'Antiobesity Preparations', nutrients: ['Green Tea Extract', 'Chromium', 'Fiber'] },
      A10: {
        name: 'Drugs Used in Diabetes', nutrients: ['Chromium', 'Alpha-Lipoic Acid', 'Magnesium', 'Berberine', 'Vitamin D3'],
        children: {
          A10B: { name: 'Type 2 Diabetes Mellitus', nutrients: ['Chromium', 'Alpha-Lipoic Acid', 'Berberine', 'Magnesium', 'Vitamin D3'] },
        },
      },
      A11: {
        name: 'Vitamins', nutrients: ['Vitamin D3', 'Vitamin B12 (Cobalamin)', 'Vitamin C', 'Vitamin A'],
        children: {
          A11C: { name: 'Vitamin Deficiency', nutrients: ['Vitamin D3', 'Vitamin B12 (Cobalamin)', 'Iron'] },
          A11CC: { name: 'Vitamin D Deficiency', nutrients: ['Vitamin D3', 'Calcium', 'Vitamin K2 (MK-7)', 'Magnesium'] },
        },
      },
    },
  },
  C: {
    name: 'Cardiovascular System', parent: null,
    nutrients: ['Omega-3 (EPA+DHA)', 'Coenzyme Q10 (CoQ10)', 'Magnesium', 'Potassium'],
    children: {
      C01: { name: 'Cardiac Therapy', nutrients: ['Coenzyme Q10 (CoQ10)', 'Omega-3 (EPA+DHA)', 'L-Carnitine', 'Magnesium'] },
      C02: {
        name: 'Antihypertensives', nutrients: ['Potassium', 'Magnesium', 'Coenzyme Q10 (CoQ10)', 'Omega-3 (EPA+DHA)', 'L-Arginine'],
        children: {
          C02A: { name: 'Essential Hypertension', nutrients: ['Potassium', 'Magnesium', 'Coenzyme Q10 (CoQ10)', 'Omega-3 (EPA+DHA)', 'L-Arginine'] },
        },
      },
      C07: { name: 'Beta Blocking Agents', nutrients: ['Coenzyme Q10 (CoQ10)', 'Magnesium'] },
      C10: {
        name: 'Lipid Modifying Agents', nutrients: ['Omega-3 (EPA+DHA)', 'Coenzyme Q10 (CoQ10)', 'Niacin (B3)', 'Red Yeast Rice'],
        children: {
          C10A: { name: 'Hyperlipidemia', nutrients: ['Omega-3 (EPA+DHA)', 'Coenzyme Q10 (CoQ10)', 'Niacin (B3)', 'Red Yeast Rice'] },
          C10AA: { name: 'Statin Therapy', nutrients: ['Coenzyme Q10 (CoQ10)', 'Vitamin D3', 'Omega-3 (EPA+DHA)'] },
        },
      },
    },
  },
  D: {
    name: 'Dermatologicals', parent: null,
    nutrients: ['Vitamin A', 'Zinc', 'Vitamin D3', 'Biotin'],
    children: {
      D05: { name: 'Antipsoriatics', nutrients: ['Vitamin D3', 'Omega-3 (EPA+DHA)', 'Turmeric (Curcumin)'] },
      D10: { name: 'Anti-Acne Preparations', nutrients: ['Zinc', 'Vitamin A', 'Probiotics'] },
      D11: { name: 'Other Dermatologicals', nutrients: ['Biotin', 'Zinc', 'Iron', 'Collagen', 'Vitamin D3'],
        children: {
          D11A: { name: 'Alopecia/Hair Loss', nutrients: ['Biotin', 'Zinc', 'Iron', 'Saw Palmetto', 'Collagen', 'Vitamin D3'] },
        },
      },
    },
  },
  G: {
    name: 'Genitourinary System and Sex Hormones', parent: null,
    nutrients: ['Vitamin D3', 'Calcium', 'Magnesium'],
    children: {
      G03: {
        name: 'Sex Hormones', nutrients: ['Vitamin D3', 'Calcium', 'Vitamin E', 'Omega-3 (EPA+DHA)', 'Black Cohosh'],
        children: {
          G03C: { name: 'Menopausal Symptoms', nutrients: ['Black Cohosh', 'Vitamin D3', 'Calcium', 'Vitamin E', 'Omega-3 (EPA+DHA)', 'Soy Isoflavones'] },
        },
      },
      G04: {
        name: 'Urologicals', nutrients: ['Saw Palmetto', 'Zinc', 'Beta-Sitosterol'],
        children: {
          G04C: { name: 'BPH', nutrients: ['Saw Palmetto', 'Beta-Sitosterol', 'Zinc', 'Pygeum', 'Pumpkin Seed Oil'] },
        },
      },
    },
  },
  H: {
    name: 'Systemic Hormonal Preparations', parent: null,
    nutrients: ['Vitamin D3', 'Calcium', 'Magnesium', 'Iodine'],
    children: {
      H02: { name: 'Corticosteroids for Systemic Use', nutrients: ['Calcium', 'Vitamin D3', 'Potassium', 'Magnesium'] },
      H03: { name: 'Thyroid Therapy', nutrients: ['Iodine', 'Selenium', 'Zinc', 'Vitamin D3', 'L-Tyrosine'] },
    },
  },
  L: {
    name: 'Antineoplastic and Immunomodulating Agents', parent: null,
    nutrients: ['Vitamin D3', 'Vitamin C', 'Zinc', 'Probiotics', 'Omega-3 (EPA+DHA)'],
    children: {
      L03: { name: 'Immunostimulants', nutrients: ['Vitamin C', 'Vitamin D3', 'Zinc', 'Echinacea', 'Selenium', 'Probiotics'] },
      L04: { name: 'Immunosuppressants', nutrients: ['Vitamin D3', 'Omega-3 (EPA+DHA)', 'Turmeric (Curcumin)', 'Probiotics'] },
    },
  },
  M: {
    name: 'Musculoskeletal System', parent: null,
    nutrients: ['Glucosamine', 'Chondroitin', 'Vitamin D3', 'Calcium', 'Magnesium', 'Omega-3 (EPA+DHA)'],
    children: {
      M01: {
        name: 'Anti-inflammatory and Antirheumatic', nutrients: ['Glucosamine', 'Chondroitin', 'Turmeric (Curcumin)', 'Omega-3 (EPA+DHA)', 'MSM (Methylsulfonylmethane)', 'Collagen'],
        children: {
          M01A: { name: 'Arthralgia/Osteoarthritis', nutrients: ['Glucosamine', 'Chondroitin', 'Turmeric (Curcumin)', 'Omega-3 (EPA+DHA)', 'MSM (Methylsulfonylmethane)', 'Collagen'] },
        },
      },
      M05: { name: 'Drugs for Bone Diseases', nutrients: ['Calcium', 'Vitamin D3', 'Vitamin K2 (MK-7)', 'Magnesium', 'Boron'] },
      M09: { name: 'Muscle Recovery / Sarcopenia', nutrients: ['Creatine', 'BCAA', 'Magnesium', 'Glutamine', 'Beta-Alanine', 'Vitamin D3', 'Whey Protein', 'L-Carnitine'] },
    },
  },
  N: {
    name: 'Nervous System', parent: null,
    nutrients: ['Magnesium', 'Omega-3 (EPA+DHA)', 'L-Theanine', 'Vitamin B12 (Cobalamin)'],
    children: {
      N02: {
        name: 'Analgesics', nutrients: ['Magnesium', 'Riboflavin (B2)', 'Coenzyme Q10 (CoQ10)', 'Feverfew'],
        children: {
          N02C: { name: 'Migraine/Headache', nutrients: ['Magnesium', 'Riboflavin (B2)', 'Coenzyme Q10 (CoQ10)', 'Feverfew'] },
        },
      },
      N05: {
        name: 'Psycholeptics', nutrients: ['Melatonin', 'Magnesium Glycinate', 'L-Theanine', 'Ashwagandha', 'GABA'],
        children: {
          N05B: { name: 'Anxiety', nutrients: ['Ashwagandha', 'L-Theanine', 'Magnesium Glycinate', 'GABA', 'Rhodiola Rosea', 'Holy Basil (Tulsi)'] },
          N05C: { name: 'Insomnia', nutrients: ['Melatonin', 'Magnesium Glycinate', 'L-Theanine', 'Valerian Root', 'GABA', '5-HTP', 'L-Tryptophan', 'Glycine'] },
        },
      },
      N06: {
        name: 'Psychoanaleptics', nutrients: ['Omega-3 (EPA+DHA)', 'Vitamin D3', 'L-Tryptophan', '5-HTP', "St. John's Wort", 'SAM-e'],
        children: {
          N06A: { name: 'Depression', nutrients: ['Omega-3 (EPA+DHA)', 'Vitamin D3', 'L-Tryptophan', '5-HTP', "St. John's Wort", 'SAM-e'] },
          N06B: { name: 'ADHD', nutrients: ['Omega-3 (EPA+DHA)', 'Zinc', 'Iron', 'Magnesium', 'L-Theanine'] },
          N06D: { name: 'Cognitive Decline/Dementia', nutrients: ['Omega-3 (EPA+DHA)', "Lion's Mane", 'Bacopa Monnieri', 'Ginkgo Biloba', 'L-Theanine', 'Phosphatidylserine'] },
        },
      },
    },
  },
  R: {
    name: 'Respiratory System', parent: null,
    nutrients: ['Vitamin C', 'Quercetin', 'Magnesium'],
    children: {
      R03: { name: 'Drugs for Obstructive Airway Diseases', nutrients: ['Magnesium', 'Vitamin C', 'Omega-3 (EPA+DHA)', 'Quercetin', 'Vitamin D3'] },
      R06: { name: 'Antihistamines for Systemic Use', nutrients: ['Quercetin', 'Vitamin C', 'Bromelain', 'NAC (N-Acetyl Cysteine)', 'Probiotics'] },
    },
  },
  S: {
    name: 'Sensory Organs', parent: null,
    nutrients: ['Lutein', 'Zeaxanthin', 'Vitamin A', 'Omega-3 (EPA+DHA)'],
    children: {
      S01: { name: 'Ophthalmologicals', nutrients: ['Lutein', 'Zeaxanthin', 'Vitamin A', 'Omega-3 (EPA+DHA)', 'Astaxanthin', 'Bilberry'] },
    },
  },
};

// ============================================================
// NUTRIENT CATEGORY TAXONOMY
// ============================================================
const NUTRIENT_TREE = {
  vitamin: {
    name: 'Vitamin', parent: null,
    'fat-soluble': {
      name: 'Fat-Soluble Vitamin',
      'Vitamin A': null,
      'Vitamin D3': null,
      'Vitamin E': null,
      'Vitamin K1': null,
      'Vitamin K2 (MK-7)': null,
    },
    'water-soluble': {
      name: 'Water-Soluble Vitamin',
      'Vitamin C': null,
      'Vitamin B1 (Thiamin)': null,
      'Vitamin B2 (Riboflavin)': null,
      'Vitamin B3 (Niacin)': null,
      'Vitamin B5 (Pantothenic Acid)': null,
      'Vitamin B6': null,
      'Vitamin B7 (Biotin)': null,
      'Vitamin B9 (Folate)': null,
      'Vitamin B12 (Cobalamin)': null,
    },
  },
  mineral: {
    name: 'Mineral', parent: null,
    'Calcium': null, 'Magnesium': null, 'Zinc': null, 'Iron': null,
    'Selenium': null, 'Copper': null, 'Iodine': null, 'Potassium': null,
    'Sodium': null, 'Manganese': null, 'Chromium': null, 'Molybdenum': null,
    'Phosphorus': null, 'Boron': null, 'Silicon': null,
  },
  'amino-acid': { name: 'Amino Acid', parent: null,
    'L-Theanine': null, 'L-Arginine': null, 'L-Lysine': null, 'L-Tryptophan': null,
    'L-Tyrosine': null, 'L-Carnitine': null, 'Taurine': null, 'Glycine': null,
    'NAC (N-Acetyl Cysteine)': null, 'Glutamine': null, 'Creatine': null,
    'BCAA': null, 'Beta-Alanine': null, 'Citrulline': null,
  },
  'fatty-acid': { name: 'Fatty Acid', parent: null,
    'Omega-3 (EPA+DHA)': null, 'Omega-6 (LA)': null, 'Omega-7': null,
    'Omega-9': null, 'ALA (Alpha-Linolenic Acid)': null,
    'GLA (Gamma-Linolenic Acid)': null,
  },
  herbal: { name: 'Herbal/Adaptogen', parent: null,
    'Ashwagandha': null, 'Maca Root': null, 'Rhodiola Rosea': null,
    'Panax Ginseng': null, 'Ginkgo Biloba': null, 'Turmeric (Curcumin)': null,
    'Milk Thistle (Silymarin)': null, 'Echinacea': null, 'Valerian Root': null,
    "St. John's Wort": null, 'Saw Palmetto': null, 'Black Cohosh': null,
    'Astragalus': null, 'Holy Basil (Tulsi)': null, 'Reishi Mushroom': null,
    "Lion's Mane": null, 'Cordyceps': null, 'Bacopa Monnieri': null,
  },
  enzyme: { name: 'Enzyme', parent: null,
    'Bromelain': null, 'Papain': null, 'Lactase': null, 'Amylase': null, 'Protease': null,
  },
  probiotic: { name: 'Probiotic', parent: null, 'Probiotics': null },
  protein: { name: 'Protein', parent: null, 'Whey Protein': null },
  other: { name: 'Other/Miscellaneous', parent: null,
    'Coenzyme Q10 (CoQ10)': null, 'Melatonin': null, 'Glucosamine': null,
    'Chondroitin': null, 'MSM (Methylsulfonylmethane)': null, 'Collagen': null,
    '5-HTP': null, 'Alpha-Lipoic Acid': null, 'Resveratrol': null, 'Quercetin': null,
    'Hyaluronic Acid': null, 'Lutein': null, 'Zeaxanthin': null, 'Astaxanthin': null,
    'Beta-Carotene': null, 'Spirulina': null, 'Chlorella': null, 'Berberine': null,
    'Inositol': null, 'Phosphatidylserine': null, 'GABA': null,
  },
};

// ============================================================
// ANCESTOR LOOKUP: find nearest known ATC ancestor
// ============================================================
function findATCTree(node) {
  if (!node) return null;
  for (const [code, tree] of Object.entries(ATC_TREE)) {
    if (code === node) return tree;
    if (tree.children) {
      const found = _findInChildren(tree.children, node);
      if (found) return found;
    }
  }
  return null;
}

function _findInChildren(children, target) {
  for (const [code, tree] of Object.entries(children)) {
    if (code === target) return tree;
    if (tree.children) {
      const found = _findInChildren(tree.children, target);
      if (found) return found;
    }
  }
  return null;
}

function findNearestATCParent(atcCode) {
  if (!atcCode) return null;
  // Walk up the ATC hierarchy: A10B -> A10 -> A
  let code = atcCode;
  let depth = 0;
  while (code && code.length > 1) {
    const node = findATCTree(code);
    if (node && node.nutrients && node.nutrients.length > 0 && depth > 0) {
      return { ...node, depth, code };
    }
    // Move up one level: A10B -> A10 -> A
    code = code.length >= 3 ? code.slice(0, code.length - 1) : code.slice(0, 1);
    depth++;
  }
  // Fallback: return top-level category
  const rootCode = atcCode.slice(0, 1);
  const root = findATCTree(rootCode);
  return root ? { ...root, depth: depth + 1, code: rootCode } : null;
}

function getATCNutrients(atcCode) {
  const exact = findATCTree(atcCode);
  if (exact && exact.nutrients && exact.nutrients.length > 0) {
    return { nutrients: exact.nutrients, confidence: 1.0, source: 'exact_ATC_match' };
  }
  const parent = findNearestATCParent(atcCode);
  if (parent && parent.nutrients) {
    // Hyperbolic-inspired confidence decay.
    // In Poincare ball model, volume grows exponentially with radius:
    //   Vol(B(r)) ~ exp((d-1) * r)  where d = dimension
    // Semantic distance between concepts increases nonlinearly with tree depth.
    // We model this as: conf(depth) = sech(depth / L) where L is curvature scale.
    // sech(x) = 2 / (e^x + e^-x) — smooth decay from 1.0 to 0.0
    const L = 3.0; // Curvature scale: lower = faster decay (more hyperbolic curvature)
    const x = parent.depth / L;
    const conf = Math.round((2 / (Math.exp(x) + Math.exp(-x))) * 100) / 100;
    return { nutrients: parent.nutrients, confidence: Math.max(0.1, conf), source: `parent_ATC_${parent.code}_depth_${parent.depth}` };
  }
  return null;
}

function getCategoryForNutrient(elementName) {
  const db = getDb();
  try {
    const row = db.prepare('SELECT category FROM nutrient_standards WHERE element_name = ? LIMIT 1').get(elementName);
    return row ? row.category : 'unclassified';
  } catch {
    // Walk the nutrient tree
    for (const [cat, tree] of Object.entries(NUTRIENT_TREE)) {
      if (elementName in (tree || {})) return cat;
    }
    return 'unclassified';
  }
}

function getSiblingNutrients(elementName) {
  const cat = getCategoryForNutrient(elementName);
  const tree = NUTRIENT_TREE[cat];
  if (!tree) return [];
  return Object.keys(tree).filter(k => k !== 'name' && k !== 'parent' && k !== elementName);
}

// Hyperbolic semantic distance between two ATC codes.
// Uses the tree depth of their lowest common ancestor (LCA).
// In Poincare ball: dist(u,v) ~ arccosh(1 + 2 * ||u-v||^2 / ((1-||u||^2)(1-||v||^2)))
// We approximate with tree distance weighted by exponential depth penalty.
function hyperbolicDistance(codeA, codeB) {
  if (!codeA || !codeB) return Infinity;
  // Find common prefix length
  let common = 0;
  const len = Math.min(codeA.length, codeB.length);
  for (let i = 0; i < len; i++) {
    if (codeA[i] === codeB[i]) common++; else break;
  }
  const depthA = codeA.length;
  const depthB = codeB.length;
  // Distance = sum of remaining depths after LCA, scaled by hyperbolic curvature
  const rawDist = (depthA - common) + (depthB - common);
  // Exponential penalty for depth (mimics Poincare ball metric)
  const r = Math.max(depthA, depthB) / 7.0; // Normalize to ~[0,1]
  const hyperbolicFactor = 1 + (Math.exp(r) - 1) / (Math.E - 1); // Smooth 1 -> 2
  return rawDist * hyperbolicFactor;
}

// Compute confidence for transferring knowledge from source ATC to target ATC.
function transferConfidence(sourceATC, targetATC) {
  const dist = hyperbolicDistance(sourceATC, targetATC);
  if (dist === Infinity) return 0;
  // sech-based decay: conf(dist) = sech(dist / scale)
  const scale = 4.0;
  const x = dist / scale;
  return Math.round((2 / (Math.exp(x) + Math.exp(-x))) * 100) / 100;
}

module.exports = {
  ATC_TREE, NUTRIENT_TREE,
  findATCTree, findNearestATCParent, getATCNutrients,
  getCategoryForNutrient, getSiblingNutrients,
  hyperbolicDistance, transferConfidence,
};
