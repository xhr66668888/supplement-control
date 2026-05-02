// Shared safety bands for dashboard progress and persisted alerts.
//
// UL remains the official upper intake level. We present modest exceedances as
// caution instead of critical so users can distinguish "review this" from
// "stop and fix this now".

const UL_CAUTION_RATIO = 1.0;
const UL_CRITICAL_RATIO = 1.5;

function classifyUL(amount, ul) {
  if (!Number.isFinite(amount) || !Number.isFinite(ul) || ul <= 0) {
    return { status: 'unknown', ratio: null, percent: null };
  }

  const ratio = amount / ul;
  if (ratio >= UL_CRITICAL_RATIO) {
    return { status: 'critical', ratio, percent: Math.round(ratio * 100) };
  }
  if (ratio > UL_CAUTION_RATIO) {
    return { status: 'caution', ratio, percent: Math.round(ratio * 100) };
  }
  return { status: 'ok', ratio, percent: Math.round(ratio * 100) };
}

module.exports = { classifyUL, UL_CAUTION_RATIO, UL_CRITICAL_RATIO };
