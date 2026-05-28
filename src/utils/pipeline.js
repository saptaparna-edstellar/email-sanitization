import { normalizeEmail }                    from './normalizeEmail';
import { validateSyntax }                    from './validateSyntax';
import { deduplicateEmails }                 from './deduplicateEmails';
import { correctDomainTypo }                 from './correctTypos';
import { checkBlocklist }                    from './checkBlocklist';
import { checkMX }                           from './checkMX';
import { scoreRisk }                         from './scoreRisk';
import { detectSuspiciousLocal, isCustomDomain } from './detectSuspicious';

export async function runPipeline(emails, onProgress) {
  const normalized = emails.map(normalizeEmail);
  const { unique, dupeMap } = deduplicateEmails(normalized);

  const decided = new Map();
  const needsAI = [];

  for (let i = 0; i < unique.length; i++) {
    const email = unique[i];
    onProgress(i + 1, unique.length, 'Pre-check');

    // ── Layer 2: Syntax ───────────────────────────────────────────────────
    const syntax = validateSyntax(email);
    if (!syntax.valid) {
      decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: syntax.issue });
      continue;
    }

    const [local, domain] = email.split('@');

    // ── Layer 4: Typo correction ──────────────────────────────────────────
    const typo    = correctDomainTypo(email);
    const working = typo.corrected;

    // ── Layer 5: Blocklist ────────────────────────────────────────────────
    const block = checkBlocklist(working);
    if (block.blocked) {
      decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: block.reason });
      continue;
    }

    // ── Layer 5b: Suspicious blocklist (disposable / role-based) ─────────
    if (block.suspicious) {
      decided.set(email, { original: email, cleaned: working, status: 'suspicious', issue: block.reason });
      continue;
    }

    // ── Layer 6: MX / DNS ─────────────────────────────────────────────────
    const workingDomain = working.split('@')[1];
    const hasMX = await checkMX(workingDomain);
    if (!hasMX) {
      decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: 'Domain has no mail server (MX record missing)' });
      continue;
    }

    // ── Suspicious: random / junk local part ─────────────────────────────
    const pattern = detectSuspiciousLocal(local);
    if (pattern.suspicious) {
      decided.set(email, { original: email, cleaned: working, status: 'suspicious', issue: pattern.reason });
      continue;
    }

    // ── Suspicious: custom company domain ────────────────────────────────
    if (isCustomDomain(workingDomain)) {
      decided.set(email, {
        original: email,
        cleaned:  working,
        status:   'suspicious',
        issue:    `Custom company domain — verify mailbox manually`,
      });
      continue;
    }

    // ── Layer 7: Risk score ───────────────────────────────────────────────
    const risk = scoreRisk({
      syntaxValid:   true,
      mxExists:      hasMX,
      notDisposable: !block.suspicious,
      typoFixed:     typo.fixed,
      roleBased:     block.flag,
    });

    if (risk.action === 'accept' && !typo.fixed) {
      decided.set(email, { original: email, cleaned: working, status: 'valid', issue: 'None' });
    } else if (risk.action === 'reject') {
      decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: 'Low confidence score' });
    } else {
      // Medium risk or typo fixed — let AI confirm
      needsAI.push({ original: email, preCleaned: working, typoFixed: typo.fixed, typoNote: typo.correction });
    }
  }

  // ── Duplicates ────────────────────────────────────────────────────────
  const dupeResults = [];
  for (const [dupe, canonical] of dupeMap.entries()) {
    const base = decided.get(canonical);
    dupeResults.push({
      original: dupe,
      cleaned:  base ? base.cleaned : dupe,
      status:   'duplicate',
      issue:    `Duplicate of ${canonical}`,
    });
  }

  return { decided, needsAI, dupeResults };
}
