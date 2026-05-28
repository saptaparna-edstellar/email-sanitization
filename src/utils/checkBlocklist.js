// Layer 5 — disposable domains, role-based, reserved, invalid TLDs

const DISPOSABLE = new Set([
  // Mailinator family
  'mailinator.com','mailinator.net','mailinator.org','mailinator2.com',
  // Guerrilla Mail family
  'guerrillamail.com','guerrillamail.info','guerrillamail.net','guerrillamail.org',
  'guerrillamail.de','guerrillamail.biz','guerrillamailblock.com',
  'grr.la','sharklasers.com','spam4.me','spamgourmet.com','spamgourmet.net',
  // 10 Minute Mail family
  '10minutemail.com','10minutemail.net','10minutemail.org','10minutemail.de',
  '10minutemail.cf','10minutemail.ga','10minutemail.gq','10minutemail.ml',
  // Temp-Mail family
  'temp-mail.org','temp-mail.com','temp-mail.io','tempmail.com','tempmail.net',
  'tempmail.org','tempmail.de','tempmail.ninja','tempmail.us','tempmail.co',
  'tempemail.net','tempemail.com','tempr.email','tempinbox.com','tempinbox.net',
  'temporaryemail.net','temporaryemail.com','temporarymail.com',
  // Yopmail family
  'yopmail.com','yopmail.fr','yopmail.net','cool.fr.nf','jetable.fr.nf',
  'nospam.ze.tc','nomail.xl.cx','speed.1s.fr','courriel.fr.nf',
  // Throwaway / Trash
  'throwaway.email','throwam.com','trashmail.com','trashmail.net','trashmail.io',
  'trashmail.me','trashmail.at','trashmail.org','trashmail.xyz','trash-mail.com',
  'discard.email','discardmail.com','discardmail.de','dispostable.com',
  // Fake / Junk
  'fakeinbox.com','fakemail.fr','fake-email.pro','fakemailgenerator.com',
  'junkmail.com','junk1.tk','mailforspam.com','garbagemail.org',
  // Maildrop / Mailnull / Misc
  'maildrop.cc','mailnull.com','mailnesia.com','mailnew.com','mailnew.de',
  'mailtemp.info','mailtemp.net','mailtothis.com','mailtrash.net',
  'mail4trash.com','mailbidon.com','mailbucket.org','mailcatch.com',
  'mailexpire.com','mailismagic.com','mailsiphon.com','mailzilla.com',
  // Getairmail / Filzmail
  'getairmail.com','filzmail.com','spamspot.com','tempomail.fr',
  'spamhereplease.com','spamfree24.org',
  // Mohmal / Getnada / Others
  'mohmal.com','getnada.com','inboxkitten.com','mailsac.com',
  'throwbin.io','burnermail.io','tmail.io','tmail.gg','emailtemp.org',
  'dropmail.me','mintemail.com','mytrashmail.com','deadaddress.com',
  'despam.it','dontreg.com','dumpmail.de','givmail.com','herp.in',
  'ieatspam.eu','ieatspam.info','jetable.com','jetable.net','jetable.org',
  'neverbox.com','nobulk.com','noclickemail.com','noref.in',
  'one-time.email','oneoffmail.com','onewaymail.com','opentrash.com',
  'owlpic.com','pokemail.net','privacy.net','punkass.com',
  'rcpt.at','rejectmail.com','rtrtr.com',
  'safetymail.info','safetypost.de','sendspamhere.com','sharedmailbox.org',
  'skeefmail.com','slopsbox.com','smellfear.com','snkmail.com',
  'sofimail.com','sogetthis.com','spamavert.com','spambob.net',
  'spambob.org','spambog.com','spambog.de','spambog.ru',
  'spambox.info','spambox.irishspringrealty.com','spambox.us',
  'spamcannon.com','spamcannon.net','spamcon.org','spamcorptastic.com',
  'spamcowboy.com','spamcowboy.net','spamcowboy.org','spamday.com',
  'spamex.com','spamfighter.net','spamgoes.in','spamgourmet.org',
  'spamherelots.com','spamhole.com','spamify.com','spaminmotion.com',
  'spamkill.info','spaml.com','spaml.de','spammotel.com','spamoff.de',
  'spamthis.co.uk','spamtroll.net','spamwc.de','spoofmail.de',
  'stuffmail.de','suremail.info','suremail.ml',
  // User-reported domains
  'hitzcart.com','wshu.net','mmaily.com','priyo.email','tempail.com',
  'mailwave.dev','toolpix.pythonanywhere.com',
  // More known disposable
  'meltmail.com','moncourrier.fr.nf','monumentmail.com','mt2009.com',
  'mypartyclip.de','mytempemail.com','nabuma.com','netzidiot.de',
  'nice-4u.com','nincsmail.com','no-spam.ws','nomail.pw','nomail2me.com',
  'nonspam.eu','nonspammer.de','nomorespamemails.com',
  'odnorazovoe.ru','oopi.org','opayq.com','outlawspam.com',
  'ovpn.to','kurzepost.de','lol.ovpn.to',
  'binkmail.com','chacuo.net','crapmail.org',
  'devnullmail.com','dontsendmespam.de',
  'harakirimail.com','hartbot.de','hatespam.org',
  'hulapla.de','imails.info',
  'inoutmail.de','inoutmail.eu','inoutmail.info','inoutmail.net',
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

  // Disposable → blocked (intentionally fake, no human review needed)
  if (DISPOSABLE.has(domain))
    return { blocked: true, suspicious: false, flag: false, reason: 'Disposable/temporary email domain' };

  if (RESERVED_DOMAINS.has(domain))
    return { blocked: true, suspicious: false, flag: false, reason: 'Reserved or internal domain' };

  for (const tld of INVALID_TLDS)
    if (domain.endsWith(tld))
      return { blocked: true, suspicious: false, flag: false, reason: `Invalid TLD (${tld})` };

  if (ROLE_BASED.has(local))
    return { blocked: false, suspicious: true, flag: true, reason: 'Role-based address (e.g. info@, admin@)' };

  return { blocked: false, suspicious: false, flag: false, reason: null };
}
