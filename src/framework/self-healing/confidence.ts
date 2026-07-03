/**
 * Programmatic confidence scoring for a healed selector.
 *
 * The `confidence` value that xAI returns is the model's own self-assessment;
 * it is uncalibrated and can be high while wrong. Instead of trusting it
 * directly we derive a score from signals we can actually measure on the page,
 * and only ever use the model's number as an upper bound:
 *
 *   computedConfidence = min(modelConfidence, uniqueness) * stability
 *
 * - uniqueness: a selector that resolves to exactly one element is a strong
 *   signal; one that matches many is ambiguous regardless of what the model says.
 * - stability: id / data-testid / name selectors survive refactors far better
 *   than nth-child or brittle class chains.
 */

export interface ConfidenceScore {
  /** 0..1 score used to accept/reject and to gate caching. */
  computedConfidence: number;
  /** Raw value the model reported, clamped to 0..1. */
  modelConfidence: number;
  /** How many elements the healed selector matched on the live page. */
  matchCount: number;
  uniqueness: number;
  stability: number;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Exactly one match is ideal; multiple matches are ambiguous; zero is invalid. */
function uniquenessFactor(matchCount: number): number {
  if (matchCount === 1) return 1;
  if (matchCount > 1) return 0.3;
  return 0;
}

/** Reward stable, semantic selectors over positional / class-only ones. */
function stabilityFactor(selector: string): number {
  const s = selector.toLowerCase();
  if (/#[\w-]+|\[data-testid|\[data-test|\[name=|\[id=/.test(s)) return 1;
  if (/\[role=|\[aria-|:text|>>|getbyrole|getbytext|\[href|\[placeholder/.test(s)) return 0.75;
  if (/:nth-|:first-|:last-|:eq\(/.test(s)) return 0.4;
  return 0.5;
}

export function scoreConfidence(
  selector: string,
  modelConfidence: number,
  matchCount: number,
): ConfidenceScore {
  const model = clamp01(modelConfidence);
  const uniqueness = uniquenessFactor(matchCount);
  const stability = stabilityFactor(selector);
  const computedConfidence = Math.round(Math.min(model, uniqueness) * stability * 100) / 100;
  return { computedConfidence, modelConfidence: model, matchCount, uniqueness, stability };
}

/** Repairs below this computed score are refused rather than clicked blindly. */
export const CONFIDENCE_THRESHOLD = 0.5;
