// Legacy onboard controller. New onboarding goes through authController.completeProfile.
// Kept for /api/users/onboard backward compatibility.

const { getDb } = require('../config/database');
const { deepseekChat } = require('../utils/aiClient');
const { fallbackStructurize } = require('../utils/fallbackStructurize');

const SYSTEM_PROMPT = `You are a medical intake standardization engine. Convert the user's free-text health description into a structured JSON object.

Rules:
- "conditions": list any mentioned health conditions or symptoms (e.g., "insomnia", "constipation", "hypertension").
- "target_nutrients": suggest specific nutrients or supplement categories that address their complaints. Map colloquial language:
  - "can't sleep" / "trouble sleeping" -> "Melatonin", "Magnesium Glycinate", "L-Theanine"
  - "can't poop" / "constipated" -> "Fiber", "Probiotics", "Magnesium Citrate"
  - "always tired" / "low energy" -> "Vitamin B12", "Coenzyme Q10 (CoQ10)", "Iron"
  - "stressed" / "anxious" -> "Ashwagandha", "L-Theanine", "Magnesium Glycinate"
  - "joint pain" -> "Glucosamine", "Chondroitin", "Turmeric (Curcumin)", "Omega-3 (EPA+DHA)"
  - "weak immune system" -> "Vitamin C", "Vitamin D3", "Zinc", "Echinacea"
  - "brain fog" / "can't focus" -> "Omega-3 (EPA+DHA)", "Lion's Mane", "Bacopa Monnieri"
  - "hair loss" -> "Biotin", "Zinc", "Iron", "Saw Palmetto"
  - "muscle recovery" / "workout" -> "Creatine", "BCAA", "Magnesium", "Glutamine"
  - "high blood pressure" / "hypertension" -> "Potassium", "Magnesium", "Coenzyme Q10 (CoQ10)", "Omega-3 (EPA+DHA)"
  - "allergies" -> "Quercetin", "Vitamin C", "Bromelain"
  - "menopause symptoms" -> "Black Cohosh", "Vitamin D3", "Calcium"
  - "liver health" / "detox" -> "Milk Thistle (Silymarin)", "NAC (N-Acetyl Cysteine)"

Return ONLY a JSON object with this exact structure:
{
  "conditions": ["condition1", "condition2"],
  "target_nutrients": ["Nutrient Name 1", "Nutrient Name 2"]
}`;

async function onboard(req, res, next) {
  try {
    const { raw_text, birth_date, gender, height, weight, username, password } = req.body;
    if (!raw_text || !username || !password) {
      return res.status(400).json({ error: 'raw_text, username, and password are required' });
    }

    let structured;
    try {
      structured = await deepseekChat(SYSTEM_PROMPT, raw_text, { type: 'json_object' });
    } catch (err) {
      console.error('[onboard] DeepSeek failed, using fallback:', err.message);
      structured = fallbackStructurize(raw_text);
    }

    const bmi = height && weight ? (weight / ((height / 100) ** 2)).toFixed(1) : null;

    let age = null;
    if (birth_date) {
      const birth = new Date(birth_date);
      const today = new Date();
      age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() ||
          (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    const db = getDb();
    const crypto = require('crypto');
    const password_hash = crypto.createHash('sha256').update(password + 'supplement-control-salt').digest('hex');

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, birth_date, gender, height, weight, conditions, goals, raw_profile)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username, password_hash, birth_date || null, gender || null,
      height || null, weight || null,
      JSON.stringify(structured.conditions || []),
      JSON.stringify(structured.target_nutrients || []),
      raw_text
    );

    const targets = db.prepare(`
      SELECT DISTINCT element_name, rda, ul, unit, category
      FROM nutrient_standards
      WHERE region = 'US' AND (gender = ? OR gender = 'all') AND age_min <= ? AND age_max >= ?
      ORDER BY category, element_name
    `).all(gender || 'all', age || 35, age || 35);

    res.json({
      user_id: result.lastInsertRowid, username, bmi, age,
      conditions: structured.conditions || [],
      goals: structured.target_nutrients || [],
      rda_targets: targets,
      message: 'Onboarding complete. AI-structured profile saved.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { onboard };
