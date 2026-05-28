export function normalizeEmail(raw) {
  let email = String(raw);
  email = email.trim();
  // Strip leading line-number prefixes e.g. "2 john@gmail.com" or "  42 john@gmail.com"
  email = email.replace(/^\d+\s+/, '');
  email = email.replace(/[​‌‍﻿­]/g, '');
  email = email.replace(/^["'<]|["'>]$/g, '');
  email = email.replace(/^mailto:/i, '');
  try { email = decodeURIComponent(email); } catch { /* leave as-is */ }
  email = email.normalize('NFC');
  email = email.toLowerCase();
  email = email.replace(/@@+/g, '@');
  email = email.replace(/\s*@\s*/, '@');

  // Collapse consecutive dots in local part  e.g. rohit..kapoor → rohit.kapoor
  const atIdx = email.indexOf('@');
  if (atIdx > 0) {
    const local = email.slice(0, atIdx).replace(/\.{2,}/g, '.');
    email = local + email.slice(atIdx);
  }

  return email;
}
