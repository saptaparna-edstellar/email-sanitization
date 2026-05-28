// Layer 5 — disposable domains, role-based, reserved, invalid TLDs

const DISPOSABLE = new Set([
  'mailinator.com','tempmail.com','guerrillamail.com','10minutemail.com',
  'throwaway.email','fakeinbox.com','trashmail.com','yopmail.com',
  'maildrop.cc','dispostable.com','sharklasers.com','spam4.me',
  'tempr.email','discard.email','spamgourmet.com','trashmail.net',
  'mailnull.com','temporaryemail.net','throwam.com','getairmail.com',
  'filzmail.com','tempemail.net','spamhereplease.com','tempinbox.com',
  'mailnew.com','spamspot.com','tempomail.fr','guerrillamailblock.com',
  'grr.la','guerrillamail.info','spamfree24.org','trashmail.io',
  'temp-mail.org','fakemailgenerator.com','mailnesia.com','spamgourmet.net',
]);

const ROLE_BASED = new Set([
  'admin','info','support','noreply','no-reply','postmaster','webmaster',
  'hostmaster','abuse','security','contact','help','sales','marketing',
  'billing','newsletter','enquiries','enquiry','hello','careers','hr',
]);

const RESERVED_DOMAINS = new Set([
  'localhost','example.com','test.com','invalid.com',
  'example.org','example.net','test.org','test.net',
]);

const INVALID_TLDS = ['.test','.invalid','.localhost','.example','.local'];

export function checkBlocklist(email) {
  if (!email.includes('@')) return { blocked: false, flag: false, reason: null };

  const [local, domain] = email.split('@');

  if (DISPOSABLE.has(domain))
    return { blocked: true, flag: false, reason: 'Disposable/temporary email domain' };

  if (RESERVED_DOMAINS.has(domain))
    return { blocked: true, flag: false, reason: 'Reserved or internal domain' };

  for (const tld of INVALID_TLDS)
    if (domain.endsWith(tld))
      return { blocked: true, flag: false, reason: `Invalid TLD (${tld})` };

  if (ROLE_BASED.has(local))
    return { blocked: false, flag: true, reason: 'Role-based address (e.g. info@, admin@)' };

  return { blocked: false, flag: false, reason: null };
}
