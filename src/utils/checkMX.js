// Layer 6 — DNS/MX record check via Google DNS-over-HTTPS
// Works in browser with no backend. Results cached 24h per domain.

const cache = new Map(); // domain → { hasMX, ts }
const TTL   = 24 * 60 * 60 * 1000; // 24 hours

async function dnsQuery(domain, type) {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
    { headers: { Accept: 'application/dns-json' } }
  );
  return res.json();
}

export async function checkMX(domain) {
  const cached = cache.get(domain);
  if (cached && Date.now() - cached.ts < TTL) return cached.hasMX;

  try {
    // Check MX records
    const mx = await dnsQuery(domain, 'MX');
    if (mx.Status === 0 && Array.isArray(mx.Answer) && mx.Answer.length > 0) {
      cache.set(domain, { hasMX: true, ts: Date.now() });
      return true;
    }

    // Fallback: check A record (some domains accept mail without an explicit MX)
    const a = await dnsQuery(domain, 'A');
    const hasMX = a.Status === 0 && Array.isArray(a.Answer) && a.Answer.length > 0;
    cache.set(domain, { hasMX, ts: Date.now() });
    return hasMX;
  } catch {
    // Network failure — assume valid so we don't block on flaky DNS
    return true;
  }
}
