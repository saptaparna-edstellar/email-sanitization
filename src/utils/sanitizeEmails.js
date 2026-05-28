const BATCH_SIZE = 20;

function buildPrompt(emails) {
  return `You are an email validation and correction assistant. Analyze the following email addresses and fix any issues you find.

For each email, check for and fix:
- Common domain typos (gmial→gmail, yahooo→yahoo, hotmial→hotmail, gmal→gmail, outlok→outlook, yaho→yahoo, etc.)
- Extra leading/trailing spaces (trim them)
- Double @@ symbols (fix to single @)
- Missing @ symbol (mark as invalid if the correct address cannot be clearly inferred)
- Missing or incomplete domain (mark as invalid)
- Double dots anywhere in the address (e.g. user@example..com → user@example.com)
- Uppercase letters (convert entire address to lowercase)
- Spaces within the email address (mark as invalid — spaces inside an email are never valid)
- Any other obvious formatting violations

Return ONLY a valid JSON array — no markdown fences, no explanations, nothing else. Each element must have exactly these fields:
- "original": the exact original string as provided
- "cleaned": the corrected email (identical to original when already valid)
- "status": exactly one of "valid", "fixed", or "invalid"
- "issue": one short phrase describing the problem found, or "None" when the email is already valid

Emails to analyze:
${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}

export async function sanitizeEmails(emails, apiKey, onProgress) {
  const batches = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    batches.push(emails.slice(i, i + BATCH_SIZE));
  }

  const allResults = [];
  let processed = 0;

  for (const batch of batches) {
    onProgress(processed, emails.length);

    let batchResults;
    try {
      batchResults = await processBatch(batch, apiKey);
    } catch (err) {
      batchResults = batch.map((email) => ({
        original: email,
        cleaned: email,
        status: 'error',
        issue: `API error: ${err.message}`,
      }));
    }

    allResults.push(...batchResults);
    processed += batch.length;
    onProgress(processed, emails.length);
  }

  return allResults;
}

async function processBatch(emails, apiKey) {
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
      messages: [{ role: 'user', content: buildPrompt(emails) }],
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const rawText = data.content[0].text;

  // Strip markdown code fences if Claude wraps the JSON
  const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Claude returned non-JSON output. Try again.');
  }

  // Map back to original order, guarding against partial responses
  return emails.map((original, i) => {
    const result = Array.isArray(parsed) ? parsed[i] : null;
    if (!result || typeof result !== 'object') {
      return { original, cleaned: original, status: 'error', issue: 'No result returned' };
    }
    return {
      original: result.original || original,
      cleaned: (result.cleaned || original).toString().trim(),
      status: ['valid', 'fixed', 'invalid'].includes(result.status) ? result.status : 'error',
      issue: result.issue || 'Unknown',
    };
  });
}
