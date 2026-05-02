/**
 * Elements Controller — POST /api/elements/lookup
 *
 * AI backfill: when an unknown (Tier 3) element is discovered during OCR,
 * this endpoint uses DeepSeek to research its safety profile and populate
 * RDA/UL values in nutrient_standards.
 *
 * This is a one-time-per-element operation. On subsequent OCR imports,
 * the element will be found as Tier 2 (or Tier 1 if RDA/UL were populated).
 */

const { getDb } = require('../config/database');
const { deepseekChat } = require('../utils/apiReliable');

const SYSTEM_PROMPT = `You are a pharmacology and nutrition research assistant. You will be given the name of a supplement ingredient. Research it and return a JSON object with safety and dosing information.

Use ONLY established medical sources (NIH, FDA, EFSA, MHLW Japan, PubMed). If no reliable RDA or UL exists, set those fields to null.

Return ONLY a JSON object:
{
  "element_name": "string",
  "category": "vitamin|mineral|amino-acid|fatty-acid|herbal|enzyme|probiotic|other",
  "has_rda": true/false,
  "rda": number|null,
  "rda_unit": "mg|mcg|IU|g|null",
  "has_ul": true/false,
  "ul": number|null,
  "ul_unit": "mg|mcg|IU|g|null",
  "typical_dosage_range": "string describing typical daily dose",
  "safety_notes": "string with safety warnings or null",
  "timing_recommendation": "with meal|empty stomach|before bed|morning|any time|null"
}`;

async function lookupElement(req, res, next) {
  try {
    const { element_name } = req.body;
    if (!element_name) {
      return res.status(400).json({ error: 'element_name is required' });
    }

    const db = getDb();

    // Check if already researched (non-unknown source)
    const existing = db.prepare(
      "SELECT * FROM nutrient_standards WHERE element_name = ? AND source != 'unknown' LIMIT 1"
    ).get(element_name.trim());

    if (existing) {
      return res.json({
        already_known: true,
        element: existing,
      });
    }

    // Call DeepSeek to research the element
    let research;
    try {
      research = await deepseekChat(
        SYSTEM_PROMPT,
        `Research this supplement ingredient: "${element_name}". Provide RDA, UL, and safety information from US and Japan dietary standards if available.`,
        { type: 'json_object' }
      );
    } catch (err) {
      console.error('[elements] DeepSeek lookup failed:', err.message);
      return res.status(502).json({
        error: 'AI research failed. Try again later.',
        detail: err.message,
      });
    }

    // Update nutrient_standards with the research result
    const category = research.category || 'other';
    const unit = research.rda_unit || 'mg';

    // Update existing rows or insert new ones
    const existingRows = db.prepare(
      'SELECT * FROM nutrient_standards WHERE element_name = ?'
    ).all(element_name.trim());

    if (existingRows.length > 0) {
      db.prepare(`
        UPDATE nutrient_standards
        SET rda = ?, ul = ?, unit = ?, category = ?, source = 'ai-estimated',
            notes = ?
        WHERE element_name = ?
      `).run(
        research.rda || null,
        research.ul || null,
        unit,
        category,
        `Typical dosage: ${research.typical_dosage_range || 'unknown'}. ${research.safety_notes || ''} Timing: ${research.timing_recommendation || 'any time'}`,
        element_name.trim()
      );
    } else {
      // Insert if somehow not auto-registered
      db.prepare(`
        INSERT INTO nutrient_standards (element_name, category, region, age_min, age_max, gender, rda, ul, unit, source, notes)
        VALUES (?, ?, 'US', 0, 120, 'all', ?, ?, ?, 'ai-estimated', ?)
      `).run(
        element_name.trim(),
        category,
        research.rda || null,
        research.ul || null,
        unit,
        `Typical dosage: ${research.typical_dosage_range || 'unknown'}. ${research.safety_notes || ''}`
      );
    }

    const updated = db.prepare(
      'SELECT * FROM nutrient_standards WHERE element_name = ?'
    ).get(element_name.trim());

    res.json({
      success: true,
      element: updated,
      research_raw: research,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { lookupElement };
