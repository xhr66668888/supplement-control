// Fallback keyword-based structurization when DeepSeek API is unavailable.
// Shared by onboardController and authController.

const RULES = [
  // English
  { kw: ['sleep', 'insomnia', "can't sleep", '睡不好', '睡不着', '失眠', '入睡困难', '睡眠'], name: 'Insomnia', name_cn: '失眠', atc: 'N05C', n: ['Melatonin', 'Magnesium Glycinate', 'L-Theanine'] },
  { kw: ['constipat', "can't poop", 'poop', 'bowel', '便秘', '拉不出', '排便', '大便'], name: 'Chronic Constipation', name_cn: '慢性便秘', atc: 'A06A', n: ['Probiotics', 'Magnesium Citrate', 'Fiber'] },
  { kw: ['tired', 'fatigue', 'low energy', '疲劳', '乏力', '没精神', '累', '困倦', '精力'], name: 'Fatigue', name_cn: '疲劳', atc: 'L03A', n: ['Vitamin B12 (Cobalamin)', 'Coenzyme Q10 (CoQ10)', 'Iron'] },
  { kw: ['stress', 'anxi', 'nervous', '焦虑', '紧张', '压力', '心烦', '烦躁'], name: 'Anxiety', name_cn: '焦虑', atc: 'N05B', n: ['Ashwagandha', 'L-Theanine', 'Magnesium Glycinate'] },
  { kw: ['joint', 'arthrit', 'pain', 'ache', '关节', '膝盖', '疼痛', '酸痛', '骨关节'], name: 'Arthralgia/Osteoarthritis', name_cn: '关节疼痛/骨关节炎', atc: 'M01A', n: ['Glucosamine', 'Turmeric (Curcumin)', 'Omega-3 (EPA+DHA)'] },
  { kw: ['immune', 'sick', 'cold', 'flu', '免疫', '感冒', '生病', '抵抗力', '易感'], name: 'Weak Immunity', name_cn: '免疫力偏弱', atc: 'L03A', n: ['Vitamin C', 'Vitamin D3', 'Zinc'] },
  { kw: ['brain fog', 'focus', 'concentrat', 'memory', '健忘', '注意力', '记忆', '脑雾', '不集中'], name: 'Cognitive Decline/Brain Fog', name_cn: '认知下降/脑雾', atc: 'N06D', n: ['Omega-3 (EPA+DHA)', "Lion's Mane", 'Bacopa Monnieri'] },
  { kw: ['hair loss', 'thinning hair', 'bald', '脱发', '掉头发', '秃', '发量'], name: 'Alopecia/Hair Loss', name_cn: '脱发', atc: 'D11A', n: ['Biotin', 'Zinc', 'Iron'] },
  { kw: ['workout', 'muscle', 'gym', 'recovery', '健身', '增肌', '肌肉', '运动', '训练'], name: 'Muscle Recovery', name_cn: '运动恢复', atc: 'M09A', n: ['Creatine', 'BCAA', 'Magnesium'] },
  { kw: ['blood pressure', 'hypertension', '血压', '高血压'], name: 'Essential Hypertension', name_cn: '原发性高血压', atc: 'C02A', n: ['Potassium', 'Magnesium', 'Coenzyme Q10 (CoQ10)'] },
  { kw: ['allerg', 'hay fever', '过敏', '鼻炎', '打喷嚏', '流鼻涕'], name: 'Allergic Rhinitis/Allergies', name_cn: '过敏/鼻炎', atc: 'R06A', n: ['Quercetin', 'Vitamin C', 'Bromelain'] },
  { kw: ['menopause', 'hot flash', '更年期', '潮热', '绝经'], name: 'Menopausal Symptoms', name_cn: '更年期症状', atc: 'G03C', n: ['Black Cohosh', 'Vitamin D3', 'Calcium'] },
  { kw: ['liver', 'detox', '肝', '解毒', '排毒', '护肝'], name: 'Hepatic Support', name_cn: '肝脏支持', atc: 'A05B', n: ['Milk Thistle (Silymarin)', 'NAC (N-Acetyl Cysteine)'] },
  { kw: ['diabetes', 'sugar', '血糖', '糖尿病'], name: 'Type 2 Diabetes Mellitus', name_cn: '2型糖尿病', atc: 'A10B', n: ['Chromium', 'Alpha-Lipoic Acid', 'Berberine'] },
  { kw: ['vision', 'eye', 'sight', '视力', '眼睛', '老花', '模糊', '眼'], name: 'Vision Decline', name_cn: '视力下降', atc: 'S01X', n: ['Lutein', 'Zeaxanthin', 'Vitamin A'] },
  { kw: ['headache', 'migraine', '头疼', '偏头痛', '头痛'], name: 'Migraine/Headache', name_cn: '偏头痛/头痛', atc: 'N02C', n: ['Magnesium', 'Riboflavin (B2)', 'Coenzyme Q10 (CoQ10)'] },
];

function fallbackStructurize(rawText) {
  const text = rawText.toLowerCase();
  const conditions = [];
  const targetNutrients = [];

  for (const rule of RULES) {
    for (const kw of rule.kw) {
      if (text.includes(kw)) {
        conditions.push({
          name: rule.name,
          name_cn: rule.name_cn,
          atc_code: rule.atc,
          description: `Matched by offline keyword rule: ${kw}`,
          description_cn: `离线关键词规则匹配：${kw}`,
        });
        for (const n of rule.n) {
          if (!targetNutrients.includes(n)) targetNutrients.push(n);
        }
        break;
      }
    }
  }

  return {
    conditions: uniqueConditions(conditions),
    target_nutrients: targetNutrients,
    _fallback: true,
  };
}

function uniqueConditions(conditions) {
  const seen = new Set();
  const out = [];
  for (const condition of conditions) {
    const key = condition.atc_code || condition.name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(condition);
  }
  return out;
}

module.exports = { fallbackStructurize };
