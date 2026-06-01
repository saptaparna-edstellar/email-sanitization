const DISPOSABLE = new Set([
  'mailinator.com','mailinator.net','mailinator.org','mailinator2.com',
  'guerrillamail.com','guerrillamail.info','guerrillamail.net','guerrillamail.org',
  'guerrillamail.de','guerrillamail.biz','sharklasers.com','spam4.me',
  'spamgourmet.com','spamgourmet.net','grr.la',
  '10minutemail.com','10minutemail.net','10minutemail.org','10minutemail.de',
  '10minutemail.cf','10minutemail.ga','10minutemail.gq','10minutemail.ml',
  'temp-mail.org','temp-mail.com','temp-mail.io','tempmail.com','tempmail.net',
  'tempmail.org','tempmail.de','tempmail.ninja','tempmail.us','tempmail.co',
  'tempemail.net','tempemail.com','tempr.email','tempinbox.com','tempinbox.net',
  'temporaryemail.net','temporaryemail.com','temporarymail.com',
  'yopmail.com','yopmail.fr','yopmail.net',
  'throwaway.email','throwam.com','trashmail.com','trashmail.net','trashmail.io',
  'trashmail.me','trashmail.at','trashmail.org','trashmail.xyz','trash-mail.com',
  'discard.email','discardmail.com','discardmail.de','dispostable.com',
  'fakeinbox.com','fakemail.fr','fake-email.pro','fakemailgenerator.com',
  'junkmail.com','mailforspam.com','garbagemail.org',
  'maildrop.cc','mailnull.com','mailnesia.com','mailtemp.info','mailtemp.net',
  'mailtothis.com','mailtrash.net','mail4trash.com','mailcatch.com',
  'mailexpire.com','mailzilla.com','mailsiphon.com',
  'getairmail.com','filzmail.com','spamspot.com','tempomail.fr',
  'spamfree24.org','mohmal.com','getnada.com','inboxkitten.com','mailsac.com',
  'throwbin.io','burnermail.io','tmail.io','tmail.gg','emailtemp.org',
  'dropmail.me','mintemail.com','mytrashmail.com','deadaddress.com',
  'despam.it','dontreg.com','dumpmail.de','givmail.com',
  'ieatspam.eu','ieatspam.info','jetable.com','jetable.net','jetable.org',
  'neverbox.com','nobulk.com','one-time.email','oneoffmail.com',
  'opentrash.com','pokemail.net','rcpt.at','rejectmail.com',
  'safetymail.info','sendspamhere.com','skeefmail.com','snkmail.com',
  'spamavert.com','spambob.net','spambob.org','spambog.com','spambog.de',
  'spambox.info','spambox.us','spamcannon.com','spamcannon.net',
  'spamex.com','spamgoes.in','spamherelots.com','spamhole.com',
  'spaml.com','spaml.de','spammotel.com','spamoff.de',
  'spamthis.co.uk','spamtroll.net','spoofmail.de',
  'hitzcart.com','wshu.net','mmaily.com','priyo.email','tempail.com',
  'mailwave.dev','meltmail.com','mt2009.com','mytempemail.com',
  'nice-4u.com','no-spam.ws','nomail.pw','nomorespamemails.com',
  'binkmail.com','chacuo.net','crapmail.org',
  'devnullmail.com','dontsendmespam.de','harakirimail.com',
  'hulapla.de','inoutmail.de','inoutmail.eu','inoutmail.info','inoutmail.net',
  'kurzepost.de','ovpn.to',
]);

const RESERVED_DOMAINS = new Set([
  'localhost','example.com','test.com','invalid.com',
  'example.org','example.net','test.org','test.net',
]);

const INVALID_TLDS = ['.test', '.invalid', '.localhost', '.example', '.local'];

export function checkBlocklist(email) {
  if (!email.includes('@')) return { invalid: false, reason: null };

  const [, domain] = email.split('@');

  if (DISPOSABLE.has(domain))
    return { invalid: true, reason: 'Disposable/temporary email domain' };

  if (RESERVED_DOMAINS.has(domain))
    return { invalid: true, reason: 'Reserved or test domain' };

  for (const tld of INVALID_TLDS)
    if (domain.endsWith(tld))
      return { invalid: true, reason: `Invalid TLD (${tld})` };

  return { invalid: false, reason: null };
}
