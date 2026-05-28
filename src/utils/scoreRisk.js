// Layer 7 — risk scoring → decide: accept / send to AI / reject

export function scoreRisk({ syntaxValid, mxExists, notDisposable, typoFixed, roleBased }) {
  let score = 0;

  if (syntaxValid)    score += 35;
  if (mxExists)       score += 35;
  if (notDisposable)  score += 20;
  if (!typoFixed)     score += 10; // no typo = more confident
  if (!roleBased)     score +=  5; // not role-based = cleaner

  // Tier decision
  if (score >= 90) return { tier: 'high',   action: 'accept' }; // skip AI
  if (score >= 55) return { tier: 'medium', action: 'ai'     }; // send to AI
  return                  { tier: 'low',    action: 'reject' }; // skip AI, mark invalid
}
