import dns from 'dns/promises';

const cache = new Map();
const TTL   = 24 * 60 * 60 * 1000;

// Pre-seed known providers — skip DNS for these entirely
const KNOWN_GOOD = [
  'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','live.com',
  'aol.com','protonmail.com','proton.me','mail.com','yandex.com','zoho.com',
  'msn.com','me.com','googlemail.com','yahoo.co.in','yahoo.co.uk','hotmail.co.uk',
  'hotmail.in','rediffmail.com','inbox.com','fastmail.com','tutanota.com','tuta.io','mac.com',
];
for (const d of KNOWN_GOOD) cache.set(d, { hasMX: true, ts: Date.now() });

async function checkMXServer(domain) {
  const cached = cache.get(domain);
  if (cached && Date.now() - cached.ts < TTL) return cached.hasMX;

  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })), 5000));
    const records = await Promise.race([dns.resolveMx(domain), timeout]);
    const hasMX   = Array.isArray(records) && records.length > 0;
    cache.set(domain, { hasMX, ts: Date.now() });
    return hasMX;
  } catch (err) {
    // ENOTFOUND = domain does not exist → no MX
    // ETIMEOUT / other errors → give benefit of the doubt
    const hasMX = err.code !== 'ENOTFOUND';
    cache.set(domain, { hasMX, ts: Date.now() });
    return hasMX;
  }
}

export async function checkAllDomains(emails) {
  const domains = [...new Set(emails.map(e => e.split('@')[1]).filter(Boolean))];
  const result  = new Map();
  for (let i = 0; i < domains.length; i += 50) {
    const chunk   = domains.slice(i, i + 50);
    const checked = await Promise.all(chunk.map(d => checkMXServer(d).then(ok => [d, ok])));
    for (const [d, ok] of checked) result.set(d, ok);
  }
  return result;
}
