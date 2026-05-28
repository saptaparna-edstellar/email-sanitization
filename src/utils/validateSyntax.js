// Layer 2 — RFC 5322 structural validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function validateSyntax(email) {
  if (!email.includes('@'))
    return { valid: false, issue: 'Missing @ symbol' };

  const atCount = (email.match(/@/g) || []).length;
  if (atCount > 1)
    return { valid: false, issue: 'Multiple @ symbols' };

  const [local, domain] = email.split('@');

  if (!local || local.length === 0)
    return { valid: false, issue: 'Missing local part (before @)' };

  if (!domain || domain.length === 0)
    return { valid: false, issue: 'Missing domain (after @)' };

  if (local.length > 64)
    return { valid: false, issue: 'Local part too long — max 64 characters' };

  if (domain.length > 255)
    return { valid: false, issue: 'Domain too long — max 255 characters' };

  if (email.length > 254)
    return { valid: false, issue: 'Email too long — max 254 characters' };

  if (local.startsWith('.') || local.endsWith('.'))
    return { valid: false, issue: 'Local part cannot start or end with a dot' };

  if (local.includes('..'))
    return { valid: false, issue: 'Consecutive dots in local part' };

  if (domain.startsWith('.') || domain.endsWith('.'))
    return { valid: false, issue: 'Domain cannot start or end with a dot' };

  if (domain.includes('..'))
    return { valid: false, issue: 'Consecutive dots in domain' };

  if (!domain.includes('.'))
    return { valid: false, issue: 'Domain missing TLD (no dot found)' };

  if (/\s/.test(email))
    return { valid: false, issue: 'Space within email address' };

  if (!EMAIL_REGEX.test(email))
    return { valid: false, issue: 'Invalid characters in email' };

  return { valid: true, issue: null };
}
