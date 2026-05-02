// ATC Condition Mappings: standardized medical conditions with ATC codes
// and evidence-based supplement recommendations.
//
// ATC = Anatomical Therapeutic Chemical Classification System (WHO).
// Each entry maps a condition keyword -> {atc_code, name, related_nutrients}

module.exports = [
  // ---- Metabolic / Endocrine ----
  { keyword: 'diabetes', atc_code: 'A10B', name: 'Type 2 Diabetes Mellitus',
    nutrients: ['Chromium', 'Alpha-Lipoic Acid', 'Berberine', 'Magnesium', 'Vitamin D3'] },
  { keyword: 'obesity', atc_code: 'A08A', name: 'Obesity',
    nutrients: ['Green Tea Extract', 'Garcinia Cambogia', 'Chromium', 'Fiber'] },
  { keyword: 'thyroid', atc_code: 'H03A', name: 'Hypothyroidism',
    nutrients: ['Iodine', 'Selenium', 'Zinc', 'Vitamin D3', 'L-Tyrosine'] },
  { keyword: 'cholesterol', atc_code: 'C10A', name: 'Hyperlipidemia',
    nutrients: ['Omega-3 (EPA+DHA)', 'Niacin (B3)', 'Red Yeast Rice', 'Coenzyme Q10 (CoQ10)', 'Fiber'] },

  // ---- Cardiovascular ----
  { keyword: 'hypertension', atc_code: 'C02A', name: 'Essential Hypertension',
    nutrients: ['Potassium', 'Magnesium', 'Coenzyme Q10 (CoQ10)', 'Omega-3 (EPA+DHA)', 'L-Arginine'] },
  { keyword: 'heart', atc_code: 'C01E', name: 'Cardiovascular Support',
    nutrients: ['Coenzyme Q10 (CoQ10)', 'Omega-3 (EPA+DHA)', 'Magnesium', 'L-Carnitine', 'Vitamin D3'] },

  // ---- Musculoskeletal ----
  { keyword: 'arthritis', atc_code: 'M01A', name: 'Osteoarthritis',
    nutrients: ['Glucosamine', 'Chondroitin', 'Turmeric (Curcumin)', 'Omega-3 (EPA+DHA)', 'MSM (Methylsulfonylmethane)', 'Collagen'] },
  { keyword: 'osteoporosis', atc_code: 'M05B', name: 'Osteoporosis',
    nutrients: ['Calcium', 'Vitamin D3', 'Vitamin K2 (MK-7)', 'Magnesium', 'Boron'] },
  { keyword: 'joint pain', atc_code: 'M01A', name: 'Arthralgia',
    nutrients: ['Glucosamine', 'Chondroitin', 'Turmeric (Curcumin)', 'Omega-3 (EPA+DHA)', 'MSM (Methylsulfonylmethane)'] },
  { keyword: 'muscle', atc_code: 'M09A', name: 'Muscle Recovery / Sarcopenia',
    nutrients: ['Creatine', 'BCAA', 'Magnesium', 'Glutamine', 'Beta-Alanine', 'Vitamin D3', 'L-Carnitine'] },

  // ---- Nervous System ----
  { keyword: 'insomnia', atc_code: 'N05C', name: 'Primary Insomnia',
    nutrients: ['Melatonin', 'Magnesium Glycinate', 'L-Theanine', 'Valerian Root', 'GABA', '5-HTP', 'L-Tryptophan', 'Glycine'] },
  { keyword: 'anxiety', atc_code: 'N05B', name: 'Generalized Anxiety Disorder',
    nutrients: ['Ashwagandha', 'L-Theanine', 'Magnesium Glycinate', 'GABA', 'Rhodiola Rosea', 'Holy Basil (Tulsi)'] },
  { keyword: 'depression', atc_code: 'N06A', name: 'Major Depressive Disorder',
    nutrients: ['Omega-3 (EPA+DHA)', 'Vitamin D3', 'L-Tryptophan', '5-HTP', "St. John's Wort", 'SAM-e'] },
  { keyword: 'headache', atc_code: 'N02C', name: 'Migraine / Tension Headache',
    nutrients: ['Magnesium', 'Riboflavin (B2)', 'Coenzyme Q10 (CoQ10)', 'Feverfew'] },
  { keyword: 'cognitive', atc_code: 'N06D', name: 'Age-Related Cognitive Decline',
    nutrients: ['Omega-3 (EPA+DHA)', "Lion's Mane", 'Bacopa Monnieri', 'Ginkgo Biloba', 'L-Theanine', 'Phosphatidylserine'] },
  { keyword: 'adhd', atc_code: 'N06B', name: 'Attention Deficit Hyperactivity Disorder',
    nutrients: ['Omega-3 (EPA+DHA)', 'Zinc', 'Iron', 'Magnesium', 'L-Theanine'] },
  { keyword: 'neuropathy', atc_code: 'N07X', name: 'Peripheral Neuropathy',
    nutrients: ['Alpha-Lipoic Acid', 'Vitamin B12', 'Acetyl-L-Carnitine', 'Magnesium'] },

  // ---- Gastrointestinal ----
  { keyword: 'constipation', atc_code: 'A06A', name: 'Chronic Constipation',
    nutrients: ['Probiotics', 'Magnesium Citrate', 'Fiber', 'Psyllium Husk', 'Triphala'] },
  { keyword: 'ibs', atc_code: 'A03A', name: 'Irritable Bowel Syndrome',
    nutrients: ['Probiotics', 'Peppermint Oil', 'Fiber', 'L-Glutamine'] },
  { keyword: 'gerd', atc_code: 'A02B', name: 'Gastroesophageal Reflux Disease',
    nutrients: ['Melatonin', 'DGL Licorice', 'Slippery Elm', 'Magnesium', 'Probiotics'] },
  { keyword: 'liver', atc_code: 'A05B', name: 'Hepatic Support / Detoxification',
    nutrients: ['Milk Thistle (Silymarin)', 'NAC (N-Acetyl Cysteine)', 'Alpha-Lipoic Acid', 'Turmeric (Curcumin)'] },

  // ---- Respiratory ----
  { keyword: 'allergy', atc_code: 'R06A', name: 'Allergic Rhinitis',
    nutrients: ['Quercetin', 'Vitamin C', 'Bromelain', 'NAC (N-Acetyl Cysteine)', 'Probiotics'] },
  { keyword: 'asthma', atc_code: 'R03A', name: 'Bronchial Asthma',
    nutrients: ['Magnesium', 'Vitamin C', 'Omega-3 (EPA+DHA)', 'Quercetin', 'Vitamin D3'] },

  // ---- Dermatological ----
  { keyword: 'acne', atc_code: 'D10A', name: 'Acne Vulgaris',
    nutrients: ['Zinc', 'Vitamin A', 'Probiotics', 'Omega-3 (EPA+DHA)', 'Vitamin D3'] },
  { keyword: 'eczema', atc_code: 'D11A', name: 'Atopic Dermatitis / Eczema',
    nutrients: ['Probiotics', 'Omega-3 (EPA+DHA)', 'Vitamin D3', 'Zinc', 'Quercetin'] },
  { keyword: 'psoriasis', atc_code: 'D05A', name: 'Psoriasis',
    nutrients: ['Vitamin D3', 'Omega-3 (EPA+DHA)', 'Turmeric (Curcumin)', 'Milk Thistle (Silymarin)'] },
  { keyword: 'hair loss', atc_code: 'D11A', name: 'Androgenetic Alopecia',
    nutrients: ['Biotin', 'Zinc', 'Iron', 'Saw Palmetto', 'Collagen', 'Vitamin D3', 'Pumpkin Seed Oil'] },

  // ---- Ophthalmological ----
  { keyword: 'vision', atc_code: 'S01X', name: 'Age-Related Macular Degeneration',
    nutrients: ['Lutein', 'Zeaxanthin', 'Vitamin A', 'Omega-3 (EPA+DHA)', 'Astaxanthin', 'Bilberry'] },
  { keyword: 'dry eye', atc_code: 'S01X', name: 'Dry Eye Syndrome',
    nutrients: ['Omega-3 (EPA+DHA)', 'Vitamin A', 'Lutein', 'Astaxanthin'] },

  // ---- Genitourinary ----
  { keyword: 'menopause', atc_code: 'G03C', name: 'Menopausal Symptoms',
    nutrients: ['Black Cohosh', 'Vitamin D3', 'Calcium', 'Vitamin E', 'Omega-3 (EPA+DHA)', 'Soy Isoflavones'] },
  { keyword: 'pms', atc_code: 'G03C', name: 'Premenstrual Syndrome',
    nutrients: ['Magnesium', 'Calcium', 'Vitamin B6', 'Chasteberry', 'Evening Primrose Oil'] },
  { keyword: 'bph', atc_code: 'G04C', name: 'Benign Prostatic Hyperplasia',
    nutrients: ['Saw Palmetto', 'Beta-Sitosterol', 'Zinc', 'Pygeum', 'Pumpkin Seed Oil'] },

  // ---- Immune ----
  { keyword: 'immune', atc_code: 'L03A', name: 'Immune Support',
    nutrients: ['Vitamin C', 'Vitamin D3', 'Zinc', 'Echinacea', 'Astragalus', 'Selenium', 'Probiotics'] },
  { keyword: 'fatigue', atc_code: 'L03A', name: 'Chronic Fatigue',
    nutrients: ['Vitamin B12', 'Coenzyme Q10 (CoQ10)', 'Iron', 'Vitamin D3', 'Creatine', 'Rhodiola Rosea', 'Magnesium'] },
  { keyword: 'autoimmune', atc_code: 'L04A', name: 'Autoimmune Condition Support',
    nutrients: ['Vitamin D3', 'Omega-3 (EPA+DHA)', 'Turmeric (Curcumin)', 'Probiotics', 'Glutathione'] },
];
