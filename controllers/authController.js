/**
 * Auth Controller — register, login, profile completion (onboarding).
 */

const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { deepseekChat } = require('../utils/apiReliable');
const { fallbackStructurize } = require('../utils/fallbackStructurize');
const { validateOnboardingOutput } = require('../utils/medicalValidator');

const SYSTEM_PROMPT = `You are a medical intake standardization engine. You accept health descriptions in English OR Chinese and output structured JSON with ATC codes.

For each symptom/condition, output standardized medical terms with ATC codes. Include Chinese names for conditions (name_cn field). Nutrient names must use EXACT English canonical names matching our database.

Mapping reference (English / Chinese):
- "can't sleep" / "trouble sleeping" / "睡不好" / "失眠" / "睡不着" -> ATC N05C -> Melatonin, Magnesium Glycinate, L-Theanine
- "can't poop" / "constipated" / "便秘" / "拉不出" -> ATC A06A -> Probiotics, Magnesium Citrate, Fiber
- "always tired" / "low energy" / "疲劳" / "乏力" / "没精神" -> ATC L03A -> Vitamin B12, Coenzyme Q10 (CoQ10), Iron
- "stressed" / "anxious" / "焦虑" / "压力大" / "紧张" -> ATC N05B -> Ashwagandha, L-Theanine, Magnesium Glycinate
- "joint pain" / "关节疼" / "膝盖痛" -> ATC M01A -> Glucosamine, Turmeric (Curcumin), Omega-3 (EPA+DHA)
- "weak immune" / "get sick often" / "免疫力差" / "经常感冒" -> ATC L03A -> Vitamin C, Vitamin D3, Zinc
- "brain fog" / "can't focus" / "健忘" / "注意力不集中" -> ATC N06D -> Omega-3 (EPA+DHA), Lion's Mane, Bacopa Monnieri
- "hair loss" / "脱发" / "掉头发" -> ATC D11A -> Biotin, Zinc, Saw Palmetto
- "muscle recovery" / "workout" / "健身" / "增肌" -> ATC M09A -> Creatine, BCAA, Magnesium
- "high blood pressure" / "hypertension" / "高血压" -> ATC C02A -> Potassium, Magnesium, Coenzyme Q10 (CoQ10)
- "allergies" / "过敏" / "鼻炎" -> ATC R06A -> Quercetin, Vitamin C, Bromelain
- "menopause" / "更年期" / "潮热" -> ATC G03C -> Black Cohosh, Vitamin D3, Calcium
- "diabetes" / "high blood sugar" / "糖尿病" / "血糖高" -> ATC A10B -> Chromium, Alpha-Lipoic Acid, Berberine
- "headaches" / "migraines" / "头痛" / "偏头痛" -> ATC N02C -> Magnesium, Riboflavin (B2), Coenzyme Q10 (CoQ10)
- "poor eyesight" / "vision" / "视力不好" / "老花" / "眼睛模糊" -> ATC S01X -> Lutein, Zeaxanthin, Vitamin A
- "depression" / "feeling down" / "抑郁" / "情绪低落" -> ATC N06A -> Omega-3 (EPA+DHA), Vitamin D3, 5-HTP
- "liver" / "detox" / "肝不好" / "排毒" -> ATC A05B -> Milk Thistle (Silymarin), NAC (N-Acetyl Cysteine)

Return ONLY a JSON object:
{
  "conditions": [
    {"name": "Type 2 Diabetes Mellitus", "name_cn": "2型糖尿病", "atc_code": "A10B", "description": "Chronic metabolic disorder characterized by elevated blood glucose", "description_cn": "以血糖升高为特征的慢性代谢性疾病"}
  ],
  "target_nutrients": ["Chromium", "Alpha-Lipoic Acid", "Berberine"]
}

IMPORTANT:
- Accept Chinese, English, or mixed input. Output always uses English canonical names for nutrients.
- Each condition object MUST include name, name_cn, atc_code, description, and description_cn.
- If you cannot determine the ATC code, set atc_code to null.
- Use EXACT nutrient names from the database (e.g., "Coenzyme Q10 (CoQ10)" not "CoQ10"; "NAC (N-Acetyl Cysteine)" not "NAC").`;

// ---- Register ----
async function register(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `).run(username, passwordHash);

    const token = generateToken(result.lastInsertRowid, username);

    res.status(201).json({
      user_id: result.lastInsertRowid,
      username,
      token,
      profile_complete: false,
      message: 'Registration successful. Complete your profile to get personalized recommendations.',
    });
  } catch (err) {
    next(err);
  }
}

// ---- Login ----
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user.id, user.username);

    res.json({
      user_id: user.id,
      username: user.username,
      token,
      profile_complete: !!(user.birth_date && user.gender),
      user: {
        birth_date: user.birth_date,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        conditions: JSON.parse(user.conditions || '[]'),
        goals: JSON.parse(user.goals || '[]'),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---- Complete Profile (Onboarding) ----
async function completeProfile(req, res, next) {
  try {
    const userId = req.user ? req.user.user_id : req.body.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { raw_text, birth_date, gender, height, weight } = req.body;

    // Validate required fields
    if (!birth_date || !gender) {
      return res.status(400).json({ error: 'birth_date and gender are required for RDA matching' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. AI structuring via DeepSeek
    let structured = { conditions: [], target_nutrients: [] };
    if (raw_text) {
      try {
        structured = await deepseekChat(SYSTEM_PROMPT, raw_text, { type: 'json_object' });
      } catch (err) {
        console.error('[onboard] DeepSeek failed, using fallback:', err.message);
        structured = fallbackStructurize(raw_text);
      }
    }

    // 2. Medical cross-validation against hardcoded standards
    const age = calculateAge(birth_date);
    structured._raw_text = raw_text || '';
    const validation = validateOnboardingOutput(structured, { age, gender });

    // 3. Calculate BMI
    const bmi = height && weight ? (weight / ((height / 100) ** 2)).toFixed(1) : null;

    // 4. Update user profile with ATC-coded conditions
    const atcConditions = (validation.conditions || []).filter(c => c.atc_code);
    db.prepare(`
      UPDATE users
      SET birth_date = ?, gender = ?, height = ?, weight = ?,
          conditions = ?, atc_conditions = ?, goals = ?, raw_profile = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      birth_date, gender, height || null, weight || null,
      JSON.stringify(validation.conditions || []),
      JSON.stringify(atcConditions),
      JSON.stringify(validation.target_nutrients || []),
      raw_text || null,
      userId
    );

    // 5. Query RDA targets for this user's demographic
    const targets = db.prepare(`
      SELECT DISTINCT element_name, rda, ul, unit, category
      FROM nutrient_standards
      WHERE region = 'US'
        AND (gender = ? OR gender = 'all')
        AND age_min <= ?
        AND age_max >= ?
      ORDER BY category, element_name
    `).all(gender, age, age);

    res.json({
      user_id: userId,
      bmi,
      age,
      conditions: validation.conditions || [],
      goals: validation.target_nutrients || [],
      validation_warnings: validation.validation_warnings,
      context_warnings: validation.context_warnings,
      flagged_nutrients: validation.flagged_nutrients,
      confidence: validation.confidence,
      rda_targets: targets,
      profile_complete: true,
      message: 'Profile complete. Medical cross-validation passed.',
    });
  } catch (err) {
    next(err);
  }
}

// ---- Helpers ----
function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

module.exports = { register, login, completeProfile };
