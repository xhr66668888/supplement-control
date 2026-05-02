// Reliable API Client: timeout, retry with exponential backoff, circuit breaker.
//
// Production-grade wrapper around DeepSeek and MIMO API calls.
// Handles: network timeouts, transient failures, rate limiting, API downtime.

const { deepseekChat: _deepseek, mimoVision: _mimo } = require('./aiClient');

// ---- Configuration ----
const CONFIG = {
  // DeepSeek: text processing, typical latency 3-15s
  deepseek: { timeoutMs: 30000, maxRetries: 2, baseDelayMs: 1000, circuitThreshold: 5, circuitResetMs: 60000 },
  // MIMO: vision/OCR, typical latency 10-30s for image processing
  mimo: { timeoutMs: 45000, maxRetries: 1, baseDelayMs: 2000, circuitThreshold: 3, circuitResetMs: 120000 },
};

// ---- Circuit Breaker State ----
const circuits = {
  deepseek: { failures: 0, lastFailure: 0, open: false },
  mimo: { failures: 0, lastFailure: 0, open: false },
};

// ---- Simple In-Memory Cache (repeated queries within session) ----
const cache = { deepseek: new Map(), mimo: new Map() };
const CACHE_TTL_MS = 300000; // 5 minutes

function cacheKey(model, prompt, input) {
  return `${model}::${prompt.slice(0, 100)}::${(input || '').slice(0, 200)}`;
}

function cacheGet(service, key) {
  const entry = cache[service].get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache[service].delete(key); return null; }
  return entry.value;
}

function cacheSet(service, key, value) {
  cache[service].set(key, { value, ts: Date.now() });
  // Limit cache size
  if (cache[service].size > 100) {
    const oldest = [...cache[service].entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache[service].delete(oldest[0]);
  }
}

// ---- Timeout Wrapper ----
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

// ---- Retry with Exponential Backoff ----
async function withRetry(fn, { maxRetries, baseDelayMs, timeoutMs }, service) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(fn(), timeoutMs, service);
      // Success: reset circuit breaker
      circuits[service].failures = 0;
      return result;
    } catch (err) {
      lastError = err;
      circuits[service].failures++;
      circuits[service].lastFailure = Date.now();

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000; // jitter
        console.warn(`[api] ${service} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${err.message.slice(0, 100)}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ---- Circuit Breaker ----
function checkCircuit(service) {
  const c = circuits[service];
  const cfg = CONFIG[service];
  if (!c.open) return;

  // Check if reset time has passed
  if (Date.now() - c.lastFailure > cfg.circuitResetMs) {
    c.open = false;
    c.failures = 0;
    console.log(`[api] ${service} circuit breaker reset`);
    return;
  }
  throw new Error(`${service} circuit breaker OPEN — too many failures. Skipping API call.`);
}

function updateCircuit(service) {
  const c = circuits[service];
  const cfg = CONFIG[service];
  if (c.failures >= cfg.circuitThreshold) {
    c.open = true;
    c.lastFailure = Date.now();
    console.error(`[api] ${service} circuit breaker OPEN after ${c.failures} consecutive failures`);
  }
}

// ---- Public API ----
async function deepseekChat(systemPrompt, userMessage, responseFormat) {
  checkCircuit('deepseek');
  const key = cacheKey('deepseek', systemPrompt, userMessage);
  const cached = cacheGet('deepseek', key);
  if (cached) return cached;

  try {
    const result = await withRetry(
      () => _deepseek(systemPrompt, userMessage, responseFormat),
      CONFIG.deepseek,
      'deepseek'
    );
    cacheSet('deepseek', key, result);
    return result;
  } catch (err) {
    updateCircuit('deepseek');
    throw err;
  }
}

async function mimoVision(systemPrompt, base64Image, mimeType, responseFormat) {
  checkCircuit('mimo');
  const key = cacheKey('mimo', systemPrompt, base64Image.slice(0, 500));
  const cached = cacheGet('mimo', key);
  if (cached) return cached;

  try {
    const result = await withRetry(
      () => _mimo(systemPrompt, base64Image, mimeType, responseFormat),
      CONFIG.mimo,
      'mimo'
    );
    cacheSet('mimo', key, result);
    return result;
  } catch (err) {
    updateCircuit('mimo');
    throw err;
  }
}

// Export both: reliable wrappers AND config for monitoring
module.exports = { deepseekChat, mimoVision, circuits, CONFIG };
