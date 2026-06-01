import { normalizeEmail }     from '../utils/normalizeEmail';
import { validateSyntax }     from '../utils/validateSyntax';
import { deduplicateEmails }  from '../utils/deduplicateEmails';
import { correctDomainTypo }  from '../utils/correctTypos';
import { checkBlocklist }     from '../utils/checkBlocklist';
import { detectInvalidLocal } from '../utils/detectSuspicious';
import { checkAllDomains }    from './serverMX';

export async function runServerPipeline(rawEmails, learned = {}) {
  const total         = rawEmails.length;
  const trustedEmails = new Set(learned.trustedEmails || []);
  const blockedEmails = new Set(learned.blockedEmails || []);
  const fixedFrom     = learned.fixedFrom || {};
  const fixedTo       = learned.fixedTo   || {};

  // Step 1: Normalize
  const normalized = rawEmails.map(normalizeEmail);

  // Step 2: Learned + syntax check
  const decided     = new Map();
  const syntaxValid = [];

  for (const email of normalized) {
    if (blockedEmails.has(email)) {
      decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: 'Previously rejected' });
      continue;
    }
    if (trustedEmails.has(email)) {
      const issue   = fixedFrom[email] ? `Previously fixed from ${fixedFrom[email]}`
                    : fixedTo[email]   ? `Previously fixed to ${fixedTo[email]}`
                    : 'Previously approved';
      const cleaned = fixedTo[email] || email;
      decided.set(email, { original: email, cleaned, status: 'valid', issue });
      continue;
    }
    const syntax = validateSyntax(email);
    if (!syntax.valid) decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: syntax.issue });
    else syntaxValid.push(email);
  }

  // Step 3: Deduplicate
  const { unique, dupeMap } = deduplicateEmails(syntaxValid);

  // Step 4: Pattern + blocklist + typo checks
  const needsMX = [];

  for (let i = 0; i < unique.length; i++) {
    const email   = unique[i];
    const [local] = email.split('@');

    const localIssue = detectInvalidLocal(local);
    if (localIssue) {
      decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: localIssue });
      continue;
    }

    const block = checkBlocklist(email);
    if (block.invalid) {
      decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: block.reason });
      continue;
    }

    const typo = correctDomainTypo(email);
    if (typo.fixed) {
      decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: `Domain typo — did you mean ${typo.corrected.split('@')[1]}?` });
      continue;
    }

    needsMX.push(email);
  }

  // Step 5: MX check
  const mxResults = await checkAllDomains(needsMX);

  for (const email of needsMX) {
    const domain = email.split('@')[1];
    const hasMX  = mxResults.get(domain) ?? false;
    if (!hasMX) decided.set(email, { original: email, cleaned: email, status: 'invalid', issue: 'Domain has no mail server (MX not found)' });
    else         decided.set(email, { original: email, cleaned: email, status: 'valid',   issue: '' });
  }

  // Merge in original upload order
  const seenInMerge = new Map();
  const merged = rawEmails.map(raw => {
    const norm     = normalizeEmail(raw);
    const timeSeen = seenInMerge.get(norm) ?? 0;
    seenInMerge.set(norm, timeSeen + 1);

    if (timeSeen === 0 && dupeMap.has(norm) && dupeMap.get(norm) !== norm) {
      const canonical = dupeMap.get(norm);
      return { original: norm, cleaned: norm, status: 'duplicate', issue: `Duplicate of ${canonical}` };
    }
    if (timeSeen > 0) {
      return { original: norm, cleaned: norm, status: 'duplicate', issue: `Duplicate of ${norm}` };
    }

    const result = decided.get(norm) || { original: norm, cleaned: norm, status: 'invalid', issue: 'Not processed' };
    const displayOriginal = raw.trim().replace(/^\d+\s+/, '');
    return { ...result, original: displayOriginal };
  });

  return merged;
}
