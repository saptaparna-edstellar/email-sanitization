// AI Layer — only called for emails that passed layers 1-7 but need deeper analysis
const BATCH_SIZE = 20;

function buildPrompt(items) {
  const list = items.map((item, i) => `${i + 1}. ${item.preCleaned}`).join('\n');

  return `You are an expert email validation assistant. These emails have already passed basic syntax and DNS checks. Your job is to do a deeper review.

For each email, check for:
- Subtle domain typos not caught by basic checks
- Uncommon but invalid formatting patterns
- Any remaining issues with the local part (before @)
- Role-based addresses like info@, admin@, noreply@ (flag but don't invalidate unless truly broken)
- Anything else that would make this email undeliverable

Return ONLY a valid JSON array with no extra text. Each element must have:
- "original": the exact string provided
- "cleaned": the corrected email (same as original if already fine)
- "status": exactly one of "valid", "fixed", or "invalid"
- "issue": brief description of problem found, or "None" if valid

Emails to analyze:
${list}`;
}

export async function sanitizeWithAI(items, apiKey, onProgress, startOffset = 0) {
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  const allResults = [];
  let processed = 0;

  for (const batch of batches) {
    onProgress(startOffset + processed, startOffset + items.length, 'AI verification');

    let batchResults;
    try {
      batchResults = await processBatch(batch, apiKey);
    } catch (err) {
      batchResults = batch.map((item) => ({
        original: item.original,
        cleaned:  item.preCleaned,
        status:   'error',
        issue:    `AI error: ${err.message}`,
      }));
    }

    allResults.push(...batchResults);
    processed += batch.length;
    onProgress(startOffset + processed, startOffset + items.length, 'AI verification');
  }

  return allResults;
}

async function processBatch(items, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(items) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data    = await response.json();
  const rawText = data.content[0].text;
  const json    = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try { parsed = JSON.parse(json); }
  catch { throw new Error('Claude returned non-JSON. Try again.'); }

  return items.map((item, i) => {
    const r = Array.isArray(parsed) ? parsed[i] : null;
    if (!r) return { original: item.original, cleaned: item.preCleaned, status: 'error', issue: 'No result' };
    return {
      original: item.original,
      cleaned:  (r.cleaned || item.preCleaned).toString().trim(),
      status:   ['valid','fixed','invalid'].includes(r.status) ? r.status : 'error',
      issue:    r.issue || 'Unknown',
    };
  });
}
