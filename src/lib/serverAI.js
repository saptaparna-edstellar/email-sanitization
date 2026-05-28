const BATCH_SIZE  = 20;
const CONCURRENCY = 5;

function buildPrompt(items) {
  return `You are an expert email validation assistant. These emails passed basic syntax and DNS checks. Do a deeper review.

For each email check:
- Subtle domain typos not caught by basic checks
- Invalid formatting in the local part
- Anything that would make this email undeliverable

Return ONLY a valid JSON array. Each element must have:
- "original": exact string provided
- "cleaned": corrected email (same if already fine)
- "status": exactly "valid", "fixed", or "invalid"
- "issue": brief problem description, or "None" if valid

Emails:
${items.map((item, i) => `${i + 1}. ${item.preCleaned}`).join('\n')}`;
}

async function processBatch(items, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: buildPrompt(items) }] }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  const json = data.content[0].text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error('Claude returned non-JSON'); }
  return items.map((item, i) => {
    const r = Array.isArray(parsed) ? parsed[i] : null;
    if (!r) return { original: item.original, cleaned: item.preCleaned, status: 'error', issue: 'No result' };
    return { original: item.original, cleaned: (r.cleaned || item.preCleaned).trim(), status: ['valid','fixed','invalid'].includes(r.status) ? r.status : 'error', issue: r.issue || 'Unknown' };
  });
}

export async function runAIBatches(items, apiKey, onProgress) {
  if (items.length === 0) return [];
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));
  const results = new Array(batches.length);
  let completed = 0;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.allSettled(chunk.map((batch, j) => processBatch(batch, apiKey).then(r => ({ idx: i + j, r }))));
    for (const outcome of chunkResults) {
      if (outcome.status === 'fulfilled') { results[outcome.value.idx] = outcome.value.r; }
      else {
        const idx = i + chunkResults.indexOf(outcome);
        results[idx] = (batches[idx] || []).map(item => ({ original: item.original, cleaned: item.preCleaned, status: 'error', issue: `AI error: ${outcome.reason?.message || 'Unknown'}` }));
      }
    }
    completed += chunk.reduce((s, b) => s + b.length, 0);
    onProgress(completed, items.length);
  }
  return results.flat();
}
