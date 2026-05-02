// Fallback keyword-based structurization when DeepSeek API is unavailable.
// Shared by onboardController and authController.

const RULES = [
  // English
  { kw: ['sleep', 'insomnia', "can't sleep", '睡不好', '睡不着', '失眠', '入睡困难', '睡眠'], c: 'insomnia', n: ['Melatonin', 'Magnesium Glycinate', 'L-Theanine'] },
  { kw: ['constipat', "can't poop", 'poop', 'bowel', '便秘', '拉不出', '排便', '大便'], c: 'constipation', n: ['Probiotics', 'Magnesium Citrate'] },
  { kw: ['tired', 'fatigue', 'low energy', '疲劳', '乏力', '没精神', '累', '困倦', '精力'], c: 'fatigue', n: ['Vitamin B12', 'Coenzyme Q10 (CoQ10)', 'Iron'] },
  { kw: ['stress', 'anxi', 'nervous', '焦虑', '紧张', '压力', '心烦', '烦躁'], c: 'anxiety', n: ['Ashwagandha', 'L-Theanine', 'Magnesium Glycinate'] },
  { kw: ['joint', 'arthrit', 'pain', 'ache', '关节', '膝盖', '疼痛', '酸痛', '骨关节'], c: 'joint pain', n: ['Glucosamine', 'Turmeric (Curcumin)', 'Omega-3 (EPA+DHA)'] },
  { kw: ['immune', 'sick', 'cold', 'flu', '免疫', '感冒', '生病', '抵抗力', '易感'], c: 'weak immunity', n: ['Vitamin C', 'Vitamin D3', 'Zinc'] },
  { kw: ['brain fog', 'focus', 'concentrat', 'memory', '健忘', '注意力', '记忆', '脑雾', '不集中'], c: 'cognitive decline', n: ['Omega-3 (EPA+DHA)', "Lion's Mane", 'Bacopa Monnieri'] },
  { kw: ['hair loss', 'thinning hair', 'bald', '脱发', '掉头发', '秃', '发量'], c: 'hair loss', n: ['Biotin', 'Zinc', 'Iron'] },
  { kw: ['workout', 'muscle', 'gym', 'recovery', '健身', '增肌', '肌肉', '运动', '训练'], c: 'athletic recovery', n: ['Creatine', 'BCAA', 'Magnesium'] },
  { kw: ['blood pressure', 'hypertension', '血压', '高血压'], c: 'hypertension', n: ['Potassium', 'Magnesium', 'Coenzyme Q10 (CoQ10)'] },
  { kw: ['allerg', 'hay fever', '过敏', '鼻炎', '打喷嚏', '流鼻涕'], c: 'allergies', n: ['Quercetin', 'Vitamin C', 'Bromelain'] },
  { kw: ['menopause', 'hot flash', '更年期', '潮热', '绝经'], c: 'menopause', n: ['Black Cohosh', 'Vitamin D3', 'Calcium'] },
  { kw: ['liver', 'detox', '肝', '解毒', '排毒', '护肝'], c: 'liver support', n: ['Milk Thistle (Silymarin)', 'NAC (N-Acetyl Cysteine)'] },
  { kw: ['diabetes', 'sugar', '血糖', '糖尿病'], c: 'diabetes', n: ['Chromium', 'Alpha-Lipoic Acid', 'Berberine'] },
  { kw: ['vision', 'eye', 'sight', '视力', '眼睛', '老花', '模糊', '眼'], c: 'vision decline', n: ['Lutein', 'Zeaxanthin', 'Vitamin A'] },
  { kw: ['headache', 'migraine', '头疼', '偏头痛', '头痛'], c: 'headache', n: ['Magnesium', 'Riboflavin (B2)', 'Coenzyme Q10 (CoQ10)'] },
];

function fallbackStructurize(rawText) {
  const text = rawText.toLowerCase();
  const conditions = [];
  const targetNutrients = [];

  for (const rule of RULES) {
    for (const kw of rule.kw) {
      if (text.includes(kw)) {
        conditions.push(rule.c);
        for (const n of rule.n) {
          if (!targetNutrients.includes(n)) targetNutrients.push(n);
        }
        break;
      }
    }
  }

  return {
    conditions: [...new Set(conditions)],
    target_nutrients: targetNutrients,
    _fallback: true,
  };
}

module.exports = { fallbackStructurize };
