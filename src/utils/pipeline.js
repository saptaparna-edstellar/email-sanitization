// Orchestrates Layers 1–7 before any AI call
import { normalizeEmail }      from './normalizeEmail';
import { validateSyntax }      from './validateSyntax';
import { deduplicateEmails }   from './deduplicateEmails';
import { correctDomainTypo }   from './correctTypos';
import { checkBlocklist }      from './checkBlocklist';
import { checkMX }             from './checkMX';
import { scoreRisk }           from './scoreRisk';

export async function runPipeline(emails, onProgress) {
  // Layer 3 — deduplicate first so we don't waste checks on exact copies
  const normalized = emails.map(normalizeEmail);
  const { unique, dupeMap } = deduplicateEmails(normalized);

  const decided  = new Map(); // original normalized → result object
  const needsAI  = [];        // emails that passed pre-checks but need AI confirmation

  for (let i = 0; i < unique.length; i++) {
    const email = unique[i];
    onProgress(i + 1, unique.length, 'Pre-check');

    // Layer 2 — syntax
    const syntax = validateSyntax(email);
    if (!syntax.valid) {
      decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: syntax.issue, layer: 2 });
      continue;
    }

    // Layer 4 — typo correction
    const typo = correctDomainTypo(email);
    const working = typo.corrected;

    // Layer 5 — blocklist
    const block = checkBlocklist(working);
    if (block.blocked) {
      decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: block.reason, layer: 5 });
      continue;
    }

    // Layer 6 — MX / DNS check
    const domain = working.split('@')[1];
    const hasMX  = await checkMX(domain);
    if (!hasMX) {
      decided.set(email, {
        original: email, cleaned: working, status: 'invalid',
        issue: 'Domain has no mail server (MX record missing)', layer: 6,
      });
      continue;
    }

    // Layer 7 — risk score
    const risk = scoreRisk({
      syntaxValid:   true,
      mxExists:      hasMX,
      notDisposable: !block.blocked,
      typoFixed:     typo.fixed,
      roleBased:     block.flag,
    });

    if (risk.action === 'accept' && !typo.fixed && !block.flag) {
      // High confidence valid — skip AI entirely
      decided.set(email, { original: email, cleaned: working, status: 'valid', issue: 'None', layer: 7 });
    } else if (risk.action === 'reject') {
      decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: 'Low confidence score', layer: 7 });
    } else {
      // Medium risk or has a typo — pass to AI for deeper analysis
      needsAI.push({ original: email, preCleaned: working, typoFixed: typo.fixed, typoNote: typo.correction });
    }
  }

  // Re-attach duplicates using the decision made for the canonical email
  const dupeResults = [];
  for (const [dupe, canonical] of dupeMap.entries()) {
    const base = decided.get(canonical);
    if (base) {
      dupeResults.push({
        ...base,
        original: dupe,
        issue: `Duplicate of ${canonical}${base.issue !== 'None' ? ` — ${base.issue}` : ''}`,
      });
    }
  }

  return { decided, needsAI, dupeResults };
}
