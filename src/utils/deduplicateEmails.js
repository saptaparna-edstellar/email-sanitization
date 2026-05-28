// Layer 3 — exact duplicates + provider alias collapsing
function getCanonical(email) {
  if (!email.includes('@')) return email;
  const [local, domain] = email.split('@');

  // Gmail: ignores all dots and everything after +
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const clean = local.replace(/\./g, '').split('+')[0];
    return `${clean}@gmail.com`;
  }

  // Outlook / Hotmail / Live: keeps dots but strips + tags
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
    return `${local.split('+')[0]}@${domain}`;
  }

  // Yahoo: strips everything after -
  if (domain === 'yahoo.com') {
    return `${local.split('-')[0]}@yahoo.com`;
  }

  return email;
}

export function deduplicateEmails(emails) {
  const seen     = new Map(); // canonical → first-seen original
  const dupeMap  = new Map(); // duplicate original → canonical original

  const unique = [];

  for (const email of emails) {
    const canonical = getCanonical(email);
    if (seen.has(canonical)) {
      dupeMap.set(email, seen.get(canonical));
    } else {
      seen.set(canonical, email);
      unique.push(email);
    }
  }

  return { unique, dupeMap };
}
