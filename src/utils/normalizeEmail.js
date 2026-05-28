// Layer 1 — clean raw input before any validation
export function normalizeEmail(raw) {
  let email = String(raw);

  // Trim whitespace
  email = email.trim();

  // Remove zero-width / invisible characters
  email = email.replace(/[​‌‍﻿­]/g, '');

  // Strip surrounding quotes or angle brackets
  email = email.replace(/^["'<]|["'>]$/g, '');

  // Remove mailto: prefix
  email = email.replace(/^mailto:/i, '');

  // Decode URL-encoded characters (%40 → @, %2E → .)
  try { email = decodeURIComponent(email); } catch { /* leave as-is */ }

  // Normalize Unicode to NFC form
  email = email.normalize('NFC');

  // Lowercase (domains are case-insensitive; local part treated same by 99% of providers)
  email = email.toLowerCase();

  // Fix double @@ → single @  (normalization-level fix, not syntax layer)
  email = email.replace(/@@+/g, '@');

  // Remove internal spaces around @
  email = email.replace(/\s*@\s*/, '@');

  return email;
}
