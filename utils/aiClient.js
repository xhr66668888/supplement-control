// AI Client: DeepSeek (text/JSON structuring) and MIMO (vision/OCR).
// DeepSeek: OpenAI-compatible API at https://api.deepseek.com
// MIMO: OpenAI-compatible API at https://api.xiaomimimo.com/v1, auth via api-key header
// IMPORTANT: OCR/supplement label extraction MUST use MIMO. DeepSeek is text-only.

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

const MIMO_KEY = process.env.MIMO_API_KEY;
const MIMO_URL = (process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1').replace(/\/$/, '');
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';

async function deepseekChat(systemPrompt, userMessage, responseFormat) {
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    thinking: { type: 'disabled' },
  };

  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_KEY}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`DeepSeek API error ${res.status}: ${err}`); }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from DeepSeek');

  if (responseFormat?.type === 'json_object') {
    try { return JSON.parse(content); } catch { return content; }
  }
  return content;
}

// MIMO v2.5 Pro -- vision model for supplement label OCR ONLY.
// MIMO uses api-key header, not Authorization: Bearer.
async function mimoVision(systemPrompt, base64Image, mimeType, responseFormat) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fullSystemPrompt = systemPrompt + `\n\nToday's date: ${today}. Your knowledge cutoff date is December 2024.`;

  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const body = {
    model: MIMO_MODEL,
    messages: [
      { role: 'system', content: fullSystemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUri } },
          { type: 'text', text: 'Extract the supplement facts from this label image.' },
        ],
      },
    ],
    temperature: 0.1,
    max_completion_tokens: 4096,
  };

  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(`${MIMO_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': MIMO_KEY },
    body: JSON.stringify(body),
  });

  if (!res.ok) { const err = await res.text(); throw new Error(`MIMO API error ${res.status}: ${err}`); }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from MIMO');

  try { return typeof content === 'string' ? JSON.parse(content) : content; } catch { return content; }
}

module.exports = { deepseekChat, mimoVision };
