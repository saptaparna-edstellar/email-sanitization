import { normalizeEmail }                       from '../utils/normalizeEmail';
import { validateSyntax }                        from '../utils/validateSyntax';
import { deduplicateEmails }                     from '../utils/deduplicateEmails';
import { correctDomainTypo }                     from '../utils/correctTypos';
import { checkBlocklist }                        from '../utils/checkBlocklist';
import { scoreRisk }                             from '../utils/scoreRisk';
import { detectSuspiciousLocal, isCustomDomain } from '../utils/detectSuspicious';
import { checkAllDomains }                       from './serverMX';
import { runAIBatches }                          from './serverAI';
import { updateJob }                             from './jobStore';

export async function runServerPipeline(rawEmails, jobId, learned = {}) {
  const update = (patch) => updateJob(jobId, patch);
  const total  = rawEmails.length;
  const trustedDomains = new Set(learned.trustedDomains || []);
  const trustedEmails  = new Set(learned.trustedEmails  || []);
  const blockedEmails  = new Set(learned.blockedEmails  || []);

  // Layer 1: Normalize
  update({ phase: 'Normalizing…', current: 0, total });
  const normalized = rawEmails.map(normalizeEmail);

  // Layer 2: Syntax check FIRST — so invalid emails never become the dedup canonical
  update({ phase: 'Checking syntax…' });
  const decided     = new Map();
  const syntaxValid = [];
  for (const email of normalized) {
    if (blockedEmails.has(email)) { decided.set(email, { original: email, cleaned: email, status: 'blocked',  issue: 'Previously rejected by user' }); continue; }
    if (trustedEmails.has(email)) { decided.set(email, { original: email, cleaned: email, status: 'valid',    issue: 'Previously approved by user' }); syntaxValid.push(email); continue; }
    const syntax = validateSyntax(email);
    if (!syntax.valid) decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: syntax.issue });
    else syntaxValid.push(email);
  }

  // Layer 3: Deduplicate only syntax-valid emails
  update({ phase: 'Removing duplicates…' });
  const { unique, dupeMap } = deduplicateEmails(syntaxValid);

  const needsAI  = [];
  const afterBasic = [];

  // Layers 4 + 5: Typo correction + blocklist
  update({ phase: 'Checking blocklists…', current: 0, total: unique.length });
  for (let i = 0; i < unique.length; i++) {
    const email   = unique[i];
    const [local] = email.split('@');
    // Check original domain against blocklist BEFORE typo correction
    // so disposable domains like mmaily.com aren't corrected to mail.com first
    const origBlock = checkBlocklist(email);
    if (origBlock.blocked)    { decided.set(email, { original: email, cleaned: email,    status: 'blocked',    issue: origBlock.reason }); continue; }
    if (origBlock.suspicious) { decided.set(email, { original: email, cleaned: email,    status: 'suspicious', issue: origBlock.reason }); continue; }

    const typo    = correctDomainTypo(email);
    const working = typo.corrected;
    const block   = checkBlocklist(working);

    if (block.blocked)    { decided.set(email, { original: email, cleaned: working, status: 'blocked',    issue: block.reason }); continue; }
    if (block.suspicious) { decided.set(email, { original: email, cleaned: working, status: 'suspicious', issue: block.reason }); continue; }

    const pattern = detectSuspiciousLocal(local);
    if (pattern.suspicious) { decided.set(email, { original: email, cleaned: working, status: 'suspicious', issue: pattern.reason }); continue; }

    afterBasic.push({ email, working, typo, block });
    if (i % 500 === 0) update({ current: i, total: unique.length });
  }
  update({ current: unique.length, total: unique.length });

  // Layer 6: MX — 50 domains in parallel, known providers pre-seeded (no DNS needed)
  update({ phase: 'Checking mail servers…', current: 0, total: afterBasic.length });
  const mxResults = await checkAllDomains(afterBasic.map(e => e.working));
  update({ current: afterBasic.length, total: afterBasic.length });

  // Layer 7: Risk scoring
  update({ phase: 'Scoring & routing…' });
  for (const { email, working, typo, block } of afterBasic) {
    const domain = working.split('@')[1];
    const hasMX  = mxResults.get(domain) ?? false;

    if (!hasMX) { decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: 'Domain has no mail server (MX not found)' }); continue; }

    // Trusted domain (user approved previously) → skip custom domain check
    if (isCustomDomain(domain) && !trustedDomains.has(domain)) { decided.set(email, { original: email, cleaned: working, status: 'suspicious', issue: 'Custom company domain — verify mailbox manually' }); continue; }

    const risk = scoreRisk({ syntaxValid: true, mxExists: hasMX, notDisposable: !block.suspicious, typoFixed: typo.fixed, roleBased: block.flag });

    if (risk.action === 'accept')      decided.set(email, { original: email, cleaned: working, status: 'valid',   issue: 'None' });
    else if (risk.action === 'reject') decided.set(email, { original: email, cleaned: working, status: 'invalid', issue: 'Low confidence score' });
    else needsAI.push({ original: email, preCleaned: working, typoFixed: typo.fixed });
  }

  // AI layer
  let aiResults = [];
  if (needsAI.length > 0) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    update({ phase: 'AI verification…', current: 0, total: needsAI.length });
    aiResults = await runAIBatches(needsAI, apiKey, (current, total) => update({ phase: 'AI verification…', current, total }));
  }

  // Merge everything in original upload order
  const aiMap = new Map(aiResults.map(r => [r.original, r]));

  const seenInMerge = new Map();
  const merged = rawEmails.map(raw => {
    const norm = normalizeEmail(raw);
    const timeSeen = seenInMerge.get(norm) ?? 0;
    seenInMerge.set(norm, timeSeen + 1);

    // Alias duplicate (canonically different emails that map to same inbox)
    if (timeSeen === 0 && dupeMap.has(norm) && dupeMap.get(norm) !== norm) {
      const canonical = dupeMap.get(norm);
      const base = decided.get(canonical) || aiMap.get(canonical);
      return { original: norm, cleaned: base?.cleaned || norm, status: 'duplicate', issue: `Duplicate of ${canonical}` };
    }

    // Second+ exact occurrence of the same email
    if (timeSeen > 0) {
      const base = decided.get(norm) || aiMap.get(norm);
      return { original: norm, cleaned: base?.cleaned || norm, status: 'duplicate', issue: `Duplicate of ${norm}` };
    }

    let result;
    if (decided.has(norm)) result = decided.get(norm);
    else if (aiMap.has(norm)) result = aiMap.get(norm);
    else result = { original: norm, cleaned: norm, status: 'error', issue: 'Not processed' };

    // Strip line-number artifacts for display (e.g. "2 john@gmail.com" → "john@gmail.com")
    const displayOriginal = raw.trim().replace(/^\d+\s+/, '');
    result = { ...result, original: displayOriginal };

    // Promote valid→fixed only when the actual email content was changed (ignore case, line-number prefix)
    if (result.status === 'valid' && displayOriginal.toLowerCase() !== result.cleaned) {
      result = { ...result, status: 'fixed', issue: `Cleaned from: ${displayOriginal}` };
    }

    return result;
  });

  update({ status: 'done', phase: 'Complete', current: total, total, results: merged });
}
