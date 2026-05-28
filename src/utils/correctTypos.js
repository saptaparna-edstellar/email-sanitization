// Layer 4 — domain typo correction via lookup table + Levenshtein distance

const TYPO_MAP = {
  // Gmail
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmal.com': 'gmail.com',  'gamil.com': 'gmail.com', 'gimail.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.cm': 'gmail.com',  'gmail.cmo': 'gmail.com',
  'gmail.con': 'gmail.com', 'gemail.com': 'gmail.com','gmails.com': 'gmail.com',
  // Yahoo
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',  'yahooo.com': 'yahoo.com','yahho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  // Hotmail
  'hotnail.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmal.com': 'hotmail.com',  'hotmai.com': 'hotmail.com',  'hotmaill.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  // Outlook
  'outlok.com': 'outlook.com',  'outllok.com': 'outlook.com', 'outook.com': 'outlook.com',
  'outlookk.com': 'outlook.com','outloook.com': 'outlook.com',
  // iCloud
  'iclould.com': 'icloud.com', 'icluod.com': 'icloud.com', 'icloud.co': 'icloud.com',
  // AOL
  'aoll.com': 'aol.com', 'aol.co': 'aol.com',
  // Protonmail
  'protonmai.com': 'protonmail.com', 'protonmial.com': 'protonmail.com',
};

const KNOWN_DOMAINS = [
  'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
  'live.com','aol.com','protonmail.com','mail.com','yandex.com',
  'zoho.com','msn.com','me.com','googlemail.com',
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

export function correctDomainTypo(email) {
  if (!email.includes('@')) return { corrected: email, fixed: false, correction: null };

  const [local, domain] = email.split('@');

  // Fast lookup first
  if (TYPO_MAP[domain]) {
    return {
      corrected: `${local}@${TYPO_MAP[domain]}`,
      fixed: true,
      correction: `${domain} → ${TYPO_MAP[domain]}`,
    };
  }

  // Already a known domain — no correction needed
  if (KNOWN_DOMAINS.includes(domain)) {
    return { corrected: email, fixed: false, correction: null };
  }

  // Levenshtein ≤ 2 against known domains
  for (const known of KNOWN_DOMAINS) {
    if (levenshtein(domain, known) <= 2 && domain !== known) {
      return {
        corrected: `${local}@${known}`,
        fixed: true,
        correction: `${domain} → ${known} (typo)`,
      };
    }
  }

  return { corrected: email, fixed: false, correction: null };
}
