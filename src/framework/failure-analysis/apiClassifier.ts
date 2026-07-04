import type { FailureAnalysisResponse } from '../../ai/XaiClient.js';

/**
 * Deterministic-first classification for API failures.
 *
 * Most API failures mean something unambiguous from the status code alone, so
 * bucket them locally and skip the LLM entirely (the v5 principle applied to
 * failure analysis). Only the genuinely ambiguous cases — where the status
 * matched but the body/schema didn't, or the code doesn't decide it — escalate
 * to xAI.
 */
export interface DeterministicApiVerdict extends FailureAnalysisResponse {
  deterministic: true;
}

export function classifyApiFailure(status: number): DeterministicApiVerdict | null {
  const verdict = (
    category: FailureAnalysisResponse['category'],
    summary: string,
    suggestedFix: string,
  ): DeterministicApiVerdict => ({ category, summary, rootCause: summary, suggestedFix, deterministic: true });

  if (status >= 500) {
    return verdict(
      'product-bug',
      `The API returned a ${status} server error.`,
      'Investigate the server/handler — a 5xx is a backend failure, not a client-side test or environment issue.',
    );
  }
  if (status === 429) {
    return verdict(
      'environment',
      'The API rate-limited the request (429).',
      'Throttle the suite or use a dedicated test account; this is an environment limit, not a product or test defect.',
    );
  }
  if (status === 401 || status === 403) {
    return verdict(
      'environment',
      `The API rejected the request as unauthorized (${status}).`,
      'Check the token/credentials/setup — most likely an auth or fixture (environment) issue.',
    );
  }
  if (status === 400 || status === 422) {
    return verdict(
      'test-bug',
      `The API rejected the request as invalid (${status}).`,
      'Fix the request payload/params, or update the test to the current schema (possible contract drift).',
    );
  }

  // 2xx/3xx/404 and everything else: the status alone does not decide it
  // (e.g. "expected 500, got 200", or a 404 that may be ordering) -> ask xAI.
  return null;
}
