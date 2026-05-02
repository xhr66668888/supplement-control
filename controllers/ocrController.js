/**
 * OCR Controller — POST /api/ocr
 *
 * MIMO is used ONLY here: to extract structured nutrient data from
 * a supplement label photo.
 *
 * Flow:
 *   1. Receive image via multer
 *   2. Send to MIMO v2.5 Pro for OCR + JSON structuring
 *   3. Validate each nutrient against known safety thresholds
 *   4. If any anomaly detected → FORCE INTERCEPT, return for review, NO DB INSERT
 *   5. If all clean → resolve elements, convert units, insert into inventory
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');
const { mimoVision } = require('../utils/apiReliable');
const { resolve: resolveElement } = require('../utils/elementResolver');
const { convert, toCanonical, normalizeUnit } = require('../utils/unitConverter');
const { detectBioavailability } = require('../utils/bioavailability');

const SYSTEM_PROMPT = `You are a supplement label OCR engine. Extract the nutrition facts from the image and return a strict JSON object.

Rules:
- "product_name": the name of the supplement product.
- "brand": the brand name.
- "serving_size": the number of units per serving (e.g., 2 pills).
- "serving_unit": the unit type (e.g., "pills", "gummies", "capsules", "tablets").
- "total_units_in_bottle": total number of pills/capsules in the container.
- "nutrients": array of nutrient objects. Extract EVERY listed ingredient with its amount per serving:
  - "element": the nutrient/ingredient name (e.g., "Vitamin D3", "Magnesium", "Ashwagandha Root").
  - "amount_per_serving": the numeric amount.
  - "unit": the unit (mg, mcg, IU, g, CFU, etc.).
- "recommended_time_of_day": if the label suggests a specific time (e.g., "with meal", "before bed"), put it here. Otherwise null.

IMPORTANT: Double-check all numeric values. If a value seems abnormally large (e.g. 5000mg of Zinc per pill), re-read the label carefully — it might be mcg not mg, or the total bottle amount rather than per-serving.

Return ONLY the JSON object. No markdown, no explanations.`;

function mockMimoResponse() {
  return {
    product_name: 'Sample Multi-Vitamin',
    brand: 'DemoBrand',
    serving_size: 2,
    serving_unit: 'capsules',
    total_units_in_bottle: 120,
    nutrients: [
      { element: 'Vitamin C', amount_per_serving: 500, unit: 'mg' },
      { element: 'Vitamin D3', amount_per_serving: 50, unit: 'mcg' },
      { element: 'Zinc', amount_per_serving: 15, unit: 'mg' },
      { element: 'Magnesium', amount_per_serving: 200, unit: 'mg' },
    ],
    recommended_time_of_day: 'with meal',
  };
}

/**
 * Validate a single nutrient against known safety thresholds.
 * Returns { valid: boolean, reason: string|null, severity: 'ok'|'warn'|'critical' }
 */
function validateNutrient(elementName, amount, unit, db) {
  const resolved = resolveElement(elementName, unit);
  const canonicalName = resolved.element_name;

  // Find the element in standards
  const std = db.prepare(
    "SELECT * FROM nutrient_standards WHERE element_name = ? AND region = 'US' LIMIT 1"
  ).get(canonicalName);

  // Convert to mg for absolute comparison
  const normalizedUnit = normalizeUnit(unit);
  const asMg = convert(amount, normalizedUnit, 'mg', canonicalName);
  const amountMg = asMg.unit === 'mg' ? asMg.value : null;

  // ABSURD CHECK: > 50g per pill is physically impossible
  if (amountMg !== null && amountMg > 50000) {
    return {
      valid: false,
      reason: `${canonicalName}: ${amount}${unit} per serving is physically impossible (>50g per serving). MIMO may have misread the label.`,
      severity: 'critical',
    };
  }

  // ABSURD CHECK: > 10g per pill is extremely suspicious
  if (amountMg !== null && amountMg > 10000) {
    return {
      valid: false,
      reason: `${canonicalName}: ${amount}${unit} per serving is abnormally high (>10g per serving). Please verify the label.`,
      severity: 'critical',
    };
  }

  if (std) {
    // Has standards — check against UL
    if (std.ul !== null) {
      const amountForStd = convert(amount, normalizedUnit, std.unit, canonicalName);

      if (amountForStd.unit === std.unit && amountForStd.value > std.ul * 3) {
        return {
          valid: false,
          reason: `${canonicalName}: ${amount}${unit} per serving exceeds 3x the safe upper limit (UL=${std.ul}${std.unit}). MIMO may have misread the unit.`,
          severity: 'critical',
        };
      }

      if (amountForStd.unit === std.unit && amountForStd.value > std.ul) {
        return {
          valid: true, // still valid but warn
          reason: `${canonicalName}: ${amount}${unit} per serving exceeds the daily upper limit (UL=${std.ul}${std.unit}).`,
          severity: 'warn',
        };
      }
    }

    // Check against RDA: if one pill has > 20× RDA, suspicious
    if (std.rda !== null) {
      const amountForStd = convert(amount, normalizedUnit, std.unit, canonicalName);

      if (amountForStd.unit === std.unit && std.rda > 0 && amountForStd.value > std.rda * 20) {
        return {
          valid: false,
          reason: `${canonicalName}: ${amount}${unit} per serving is ${Math.round(amountForStd.value / std.rda)}x the RDA (${std.rda}${std.unit}). Possible unit confusion.`,
          severity: 'critical',
        };
      }
    }
  } else {
    // No standards — just check absolute reasonableness
    if (amountMg !== null && amountMg > 5000) {
      return {
        valid: false,
        reason: `${canonicalName}: ${amount}${unit} per serving is unusually high for an unclassified substance. Please verify.`,
        severity: 'warn',
      };
    }
  }

  return { valid: true, reason: null, severity: 'ok' };
}

async function importSupplement(req, res, next) {
  try {
    const user_id = req.user ? req.user.user_id : req.body.user_id;
    const { dosage_per_day } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const db = getDb();

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ error: `User ${user_id} not found` });
    }

    // Read image
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    // Call MIMO for OCR
    let ocrResult;
    try {
      ocrResult = await mimoVision(SYSTEM_PROMPT, base64Image, mimeType, {
        type: 'json_object',
      });
    } catch (err) {
      if (process.env.ALLOW_MOCK_OCR === 'true') {
        console.error('[ocr] MIMO failed, using mock because ALLOW_MOCK_OCR=true:', err.message);
        ocrResult = mockMimoResponse();
      } else {
        console.error('[ocr] MIMO failed:', err.message);
        fs.unlink(req.file.path, () => {});
        return res.status(502).json({
          error: 'OCR service unavailable. No supplement was imported.',
          detail: err.message,
        });
      }
    }

    // ---- VALIDATION: Check every nutrient for anomalies ----
    const validationResults = [];
    const criticalIssues = [];
    const warnings = [];

    for (const n of (ocrResult.nutrients || [])) {
      const elementName = n.element || n.name || 'Unknown';
      const rawAmount = n.amount_per_serving || n.amount || 0;
      const rawUnit = n.unit || 'mg';

      const check = validateNutrient(elementName, rawAmount, rawUnit, db);
      validationResults.push({ element: elementName, amount: rawAmount, unit: rawUnit, ...check });

      if (check.severity === 'critical') criticalIssues.push(check);
      if (check.severity === 'warn') warnings.push(check);
    }

    // If any critical issues → FORCE INTERCEPT, return for review, NO DB INSERT
    if (criticalIssues.length > 0) {
      fs.unlink(req.file.path, () => {});
      return res.json({
        review_required: true,
        product_name: ocrResult.product_name || 'Unknown',
        brand: ocrResult.brand || null,
        critical_issues: criticalIssues.map(c => c.reason),
        warnings: warnings.map(w => w.reason),
        nutrients: validationResults,
        message: 'MIMO OCR data contains anomalies. Please review and correct the values before importing.',
      });
    }

    // ---- ALL CLEAN: Process and normalize nutrients ----
    const servingSize = ocrResult.serving_size || 1;
    const processedNutrients = [];
    for (const n of (ocrResult.nutrients || [])) {
      const elementName = n.element || n.name || 'Unknown';
      const rawAmount = n.amount_per_serving || n.amount || 0;
      const rawUnit = n.unit || 'mg';

      const resolved = resolveElement(elementName, rawUnit);
      // Normalize: nutrients are listed per SERVING, we store per SINGLE UNIT (pill/capsule)
      const perUnitAmount = rawAmount / Math.max(1, servingSize);
      const canonical = toCanonical(perUnitAmount, rawUnit, resolved.element_name);
      const bioavailability = detectBioavailability(elementName, resolved.element_name);

      processedNutrients.push({
        raw_element: elementName,
        element: resolved.element_name,
        category: resolved.category,
        amount_per_serving: canonical.value,
        unit: canonical.unit,
        tier: resolved.tier,
        source: resolved.source,
        form: bioavailability.form,
        bioavailability_factor: bioavailability.bioavailability_factor,
        bioavailability_note: bioavailability.bioavailability_note,
      });
    }

    // Insert or update shared supplements catalog
    const productName = ocrResult.product_name || 'Unknown Supplement';
    const brand = ocrResult.brand || null;
    const catalogEntry = db.prepare(
      'SELECT id, image_count FROM supplements_catalog WHERE product_name = ? AND (brand = ? OR (brand IS NULL AND ? IS NULL))'
    ).get(productName, brand, brand);

    let catalogId;
    if (catalogEntry) {
      catalogId = catalogEntry.id;
      db.prepare('UPDATE supplements_catalog SET image_count = image_count + 1 WHERE id = ?').run(catalogId);
    } else {
      const catResult = db.prepare(`
        INSERT INTO supplements_catalog (product_name, brand, serving_size, serving_unit, total_units, nutrients_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(productName, brand, ocrResult.serving_size || null, ocrResult.serving_unit || null, ocrResult.total_units_in_bottle || null, JSON.stringify(processedNutrients));
      catalogId = catResult.lastInsertRowid;
    }

    // Insert into user inventory
    const dosage = Math.max(1, Math.min(20, parseInt(dosage_per_day) || 1));
    const parsedTotalUnits = parseInt(ocrResult.total_units_in_bottle);
    const countEstimated = !Number.isFinite(parsedTotalUnits) || parsedTotalUnits <= 0;
    const totalUnits = countEstimated ? dosage * 30 : parsedTotalUnits;

    const result = db.prepare(`
      INSERT INTO inventory (user_id, product_name, brand, total_count, current_count, dosage_per_day, nutrients_json, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user_id, productName, brand,
      totalUnits, totalUnits, dosage,
      JSON.stringify(processedNutrients),
      req.file.path
    );

    // Stock alerts
    const remainingDays = totalUnits / dosage;
    if (remainingDays <= 7) {
      db.prepare(`
        INSERT INTO alerts (user_id, inventory_id, alert_type, message)
        VALUES (?, ?, 'critical_stock', ?)
      `).run(user_id, result.lastInsertRowid, `${ocrResult.product_name}: only ${totalUnits} units left (${Math.floor(remainingDays)} days)`);
    } else if (remainingDays <= 30) {
      db.prepare(`
        INSERT INTO alerts (user_id, inventory_id, alert_type, message)
        VALUES (?, ?, 'low_stock', ?)
      `).run(user_id, result.lastInsertRowid, `${ocrResult.product_name}: ${totalUnits} units remaining (${Math.floor(remainingDays)} days)`);
    }

    res.json({
      review_required: false,
      inventory_id: result.lastInsertRowid,
      catalog_id: catalogId,
      catalog_entry_count: (catalogEntry ? catalogEntry.image_count + 1 : 1),
      product_name: ocrResult.product_name,
      brand: ocrResult.brand,
      serving_size: ocrResult.serving_size || 1,
      serving_unit: ocrResult.serving_unit,
      total_units_in_bottle: totalUnits,
      count_estimated: countEstimated,
      dosage_per_day: dosage,
      nutrients: processedNutrients,
      warnings: warnings.length > 0 ? warnings.map(w => w.reason) : [],
      recommended_time_of_day: ocrResult.recommended_time_of_day || null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { importSupplement };
