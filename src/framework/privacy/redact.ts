/**
 * PII redaction applied to failure context BEFORE it is sent to the remote LLM.
 *
 * Two tiers, cheapest-first (the design principle: don't ask a model to do what
 * a regex can do deterministically):
 *
 * 1. Deterministic regex for the high-confidence, well-shaped PII — emails,
 *    credit cards (Luhn-checked), SSNs, JWTs, bearer tokens, API keys, phones,
 *    public IPs. Fast, offline, no false-negative risk on these shapes.
 * 2. An optional LLM-as-judge using a small LOCAL model for the fuzzy residue a
 *    regex cannot catch (person names, street addresses). Gated on
 *    LOCAL_LLM_URL / PII_JUDGE_MODEL and best-effort — if it is unavailable we
 *    fall back to deterministic-only, never blocking the run and never sending
 *    unredacted PII to a remote model.
 */

export type PiiType =
  | 'secret' | 'email' | 'credit-card' | 'ssn' | 'jwt' | 'token' | 'api-key' | 'phone' | 'ip';

// Field names whose VALUE is sensitive regardless of the value's shape — a
// password ("hunter2") matches no generic pattern, so it must be caught by its
// field. Covers JSON ("password":"x"), query (password=x), and label (pwd: x).
const SENSITIVE_KEYS =
  'password|passwd|pwd|secret|token|api[_-]?key|authorization|auth|access[_-]?token'
  + '|refresh[_-]?token|client[_-]?secret|cvv|cvc|pin|otp|session';

interface Rule {
  type: PiiType;
  re: RegExp;
  replace?: (match: string, ...groups: string[]) => string;
  validate?: (match: string) => boolean;
}

function luhnValid(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function isRedactableIp(match: string): boolean {
  const octets = match.split('.').map(Number);
  if (octets.some((o) => o > 255)) return false; // not a real IP (e.g. a version)
  const [a, b] = octets;
  if (a === 127 || a === 0 || a === 10) return false; // loopback / private
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  return true;
}

const RULES: Rule[] = [
  // Token-shaped secrets first, so "Authorization: Bearer <jwt>" is caught as a
  // token before the field rule would grab only "Bearer" as the value.
  { type: 'jwt', re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  { type: 'token', re: /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, replace: () => 'Bearer [REDACTED_TOKEN]' },
  { type: 'api-key', re: /\b(?:xai|sk|pk|ghp|gho)-[A-Za-z0-9]{16,}/g },
  // Field-aware secrets: redact the value after a sensitive key, whatever its
  // shape (a password like "hunter2" matches no generic pattern). Quoted then unquoted.
  {
    type: 'secret',
    re: new RegExp(`("?(?:${SENSITIVE_KEYS})"?\\s*[:=]\\s*)(")([^"]*)(")`, 'gi'),
    replace: (_m, p1: string, _q: string, _v: string, p4: string) => `${p1}"[REDACTED_SECRET]${p4}`,
  },
  {
    type: 'secret',
    re: new RegExp(`("?(?:${SENSITIVE_KEYS})"?\\s*[:=]\\s*)([^"'\\s,&}\\n]+)`, 'gi'),
    replace: (_m, p1: string) => `${p1}[REDACTED_SECRET]`,
  },
  { type: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: 'credit-card', re: /\b(?:\d[ -]?){13,19}\b/g, validate: luhnValid },
  { type: 'phone', re: /\b(?:\+\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { type: 'ip', re: /\b\d{1,3}(?:\.\d{1,3}){3}\b/g, validate: isRedactableIp },
];

export interface DeterministicRedaction {
  text: string;
  hits: Partial<Record<PiiType, number>>;
}

export function redactDeterministic(input: string): DeterministicRedaction {
  const hits: Partial<Record<PiiType, number>> = {};
  let text = input;
  for (const rule of RULES) {
    text = text.replace(rule.re, (match, ...args) => {
      if (rule.validate && !rule.validate(match)) return match;
      hits[rule.type] = (hits[rule.type] ?? 0) + 1;
      return rule.replace
        ? rule.replace(match, ...(args as string[]))
        : `[REDACTED_${rule.type.replace('-', '_').toUpperCase()}]`;
    });
  }
  return { text, hits };
}

/** Optional LLM-as-judge pass with a small local model for fuzzy PII. */
export async function redactWithJudge(input: string): Promise<{ text: string; used: boolean }> {
  const url = process.env.LOCAL_LLM_URL;
  const model = process.env.PII_JUDGE_MODEL;
  if (!url || !model || !input.trim()) return { text: input, used: false };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a PII redactor. Return the input text unchanged EXCEPT replace any remaining '
              + 'personal data a regex would miss — person names with [REDACTED_NAME], street '
              + 'addresses / precise locations with [REDACTED_ADDRESS]. Do not touch code, selectors, '
              + 'or existing [REDACTED_*] tokens. Output only the resulting text, no commentary.',
          },
          { role: 'user', content: input },
        ],
      }),
    });
    if (!response.ok) return { text: input, used: false };
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const out = data.choices?.[0]?.message?.content;
    return out ? { text: out, used: true } : { text: input, used: false };
  } catch {
    return { text: input, used: false };
  }
}

export interface Redaction {
  text: string;
  hits: Partial<Record<PiiType, number>>;
  judged: boolean;
}

export async function redact(input: string | undefined): Promise<Redaction> {
  if (!input) return { text: input ?? '', hits: {}, judged: false };
  const deterministic = redactDeterministic(input);
  const judged = await redactWithJudge(deterministic.text);
  return { text: judged.text, hits: deterministic.hits, judged: judged.used };
}
