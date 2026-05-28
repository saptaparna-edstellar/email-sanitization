const KEYBOARD_WALKS = [
  'qwerty','qwertyuiop','asdfgh','asdfghjkl','zxcvbn','zxcvbnm',
  'qweasd','wasdqe','1qaz2wsx','1q2w3e4r',
];

const FREE_PROVIDERS = new Set([
  'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
  'live.com','aol.com','protonmail.com','proton.me','mail.com','yandex.com',
  'zoho.com','msn.com','me.com','googlemail.com','yahoo.co.in',
  'yahoo.co.uk','hotmail.co.uk','hotmail.in','rediffmail.com',
  'inbox.com','fastmail.com','tutanota.com','tuta.io','mac.com',
]);

function isRepeatingPattern(str) {
  if (/^(.)\1{2,}$/.test(str)) return true;
  for (let unit = 1; unit <= Math.floor(str.length / 2); unit++) {
    const chunk = str.slice(0, unit);
    if (str === chunk.repeat(str.length / unit)) return true;
  }
  return false;
}

function isSequentialNumbers(str) {
  if (!/^\d+$/.test(str) || str.length < 4) return false;
  let asc = true, desc = true;
  for (let i = 1; i < str.length; i++) {
    if (parseInt(str[i]) !== parseInt(str[i-1]) + 1) asc = false;
    if (parseInt(str[i]) !== parseInt(str[i-1]) - 1) desc = false;
  }
  return asc || desc;
}

function isHighEntropy(str) {
  if (str.length < 6) return false;
  const unique = new Set(str.replace(/[0-9]/g, '')).size;
  return (unique / str.length) > 0.85 && str.length <= 8 && /[^aeiou]{4,}/.test(str);
}

export function detectSuspiciousLocal(local) {
  const l = local.toLowerCase();
  if (isRepeatingPattern(l))     return { suspicious: true, reason: 'Repeating character pattern in local part' };
  if (isSequentialNumbers(l))    return { suspicious: true, reason: 'Sequential numbers in local part' };
  for (const walk of KEYBOARD_WALKS)
    if (l.includes(walk))        return { suspicious: true, reason: `Keyboard walk pattern detected (${walk})` };
  if (/^\d+$/.test(l) && l.length >= 4) return { suspicious: true, reason: 'Local part is numbers only' };
  if (isHighEntropy(l))          return { suspicious: true, reason: 'Local part appears randomly generated' };
  return { suspicious: false, reason: null };
}

export function isCustomDomain(domain) {
  return !FREE_PROVIDERS.has(domain.toLowerCase());
}
