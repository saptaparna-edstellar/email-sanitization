// Comprehensive invalid local-part detection covering all known fake/junk patterns

const KEYBOARD_MASH = [
  'qwerty','qwertyuiop','qwert','asdfgh','asdfghjkl','asdf','asd',
  'zxcvbn','zxcvbnm','zxcv','zxc','qaz','wsx','edc','rfv','tgb',
  'asdasd','qweqwe','zxczxc','qazwsx','wsxedc','qweasd','asdzxc',
  '1qaz2wsx','1q2w3e4r','abcdef','abcdefg','abcde',
];

const SEQUENTIAL_ALPHA = [
  'abcd','bcde','cdef','defg','efgh','fghi','ghij','hijk',
  'ijkl','jklm','klmn','lmno','mnop','nopq','opqr','pqrs',
  'qrst','rstu','stuv','tuvw','uvwx','vwxy','wxyz',
];

const FAKE_LOCALS = new Set([
  'test','test1','test2','test3','testing','testuser','testmail','testaccount',
  'demo','demouser','demo1','user','user1','user123','username',
  'email','emailaddress','name','firstname','lastname','fullname',
  'example','sample','dummy','placeholder','default',
  'noemail','noreply','no-reply','notprovided','noemailprovided',
  'none','na','null','nil','nul','void','empty','blank',
  'fake','fakeemail','notreal','donotcontact','do-not-contact',
  'seo','free','spam','nospam','trash','junk','throwaway','temporary','temp',
  'delete','unsubscribe','donotreply','do-not-reply','bounce',
  'yourname','youremail','enter','enterhere','xyz','aaa','bbb',
  'someone','nobody','person','abc123','xyz789','asd123',
]);

const ROLE_LOCALS = new Set([
  'admin','administrator','info','information','support','helpdesk',
  'webmaster','postmaster','hostmaster','abuse','security',
  'contact','help','sales','marketing','billing','accounts','accounting',
  'newsletter','notifications','notify','alerts','updates','news',
  'team','office','hello','hi','enquiry','enquiries','query','feedback',
  'press','media','legal','finance','ops','operations',
  'recruitment','jobs','careers','service','services','customer',
  'customerservice','customercare','customersupport',
  'mailer','daemon','root','system','it','dev',
  'manager','hr',
]);

function isAllSameChar(str) {
  return str.length >= 3 && /^(.)\1+$/.test(str);
}

function isSequentialNumbers(str) {
  if (!/^\d+$/.test(str) || str.length < 4) return false;
  let asc = true, desc = true;
  for (let i = 1; i < str.length; i++) {
    if (+str[i] !== +str[i - 1] + 1) asc  = false;
    if (+str[i] !== +str[i - 1] - 1) desc = false;
  }
  return asc || desc;
}

function isAlternatingPattern(str) {
  if (str.length < 6) return false;
  for (let len = 1; len <= Math.floor(str.length / 3); len++) {
    const pat = str.slice(0, len);
    if (/^(.)\1+$/.test(pat)) continue; // skip 'aaa' — caught by isAllSameChar
    const repeated = pat.repeat(Math.ceil(str.length / len)).slice(0, str.length);
    if (repeated === str) return true;
  }
  return false;
}

export function detectInvalidLocal(local) {
  const l = local.toLowerCase();

  if (!l || l.length === 0) return 'Empty local part';
  if (l.length < 3) return 'Local part too short (under 3 characters)';

  // All same character: aaaa, xxxx, 1111
  if (isAllSameChar(l)) return `Repeated character pattern`;

  // Alternating: ababab, xyxyxy
  if (isAlternatingPattern(l)) return 'Alternating character pattern';

  // Pure numbers
  if (/^\d+$/.test(l)) {
    if (l.length >= 10) return 'Phone number as email';
    if (isSequentialNumbers(l)) return 'Sequential number pattern (e.g. 1234, 9999)';
    return 'Local part is all numbers';
  }

  // Keyboard mash: qwerty, asdf, zxcvbn
  if (KEYBOARD_MASH.some(p => l.includes(p))) return 'Keyboard mash pattern';

  // Sequential alpha: abcd, efgh, wxyz
  if (SEQUENTIAL_ALPHA.some(p => l.includes(p))) return 'Sequential letter pattern';

  // Placeholder / fake locals
  if (FAKE_LOCALS.has(l)) return `Placeholder or fake local part (${l}@)`;

  // Role-based: admin, info, support
  if (ROLE_LOCALS.has(l)) return `Role-based address — not a personal email (${l}@)`;

  // Name + 4-digit birth year: john1990, name2001
  if (/^[a-z]{2,}(19\d{2}|20[0-2]\d)$/.test(l)) return 'Name + birth year pattern';

  // Name + 2-digit age: boy18, girl21, user25
  if (/^[a-z]{3,}(1[3-9]|[2-9]\d)$/.test(l)) return 'Name + age pattern';

  // Excessive numbers mixed in (abc1234567 etc.)
  const digitRatio = (l.match(/\d/g) || []).length / l.length;
  if (l.length >= 8 && digitRatio > 0.6) return 'Excessive numbers in local part';

  return null;
}

export function isCustomDomain(domain) {
  const FREE = new Set([
    'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
    'live.com','aol.com','protonmail.com','proton.me','mail.com',
    'yandex.com','zoho.com','msn.com','me.com','googlemail.com',
  ]);
  return !FREE.has(domain.toLowerCase());
}
