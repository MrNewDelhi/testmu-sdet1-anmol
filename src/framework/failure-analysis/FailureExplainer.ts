import {
  XaiClient,
  type FailureAnalysisRequest,
  type FailureAnalysisResponse,
} from '../../ai/XaiClient.js';

/**
 * Task 3, Option A — the Failure Explainer.
 *
 * When a test fails, its page state / API response plus the error are sent to
 * xAI, which returns a plain-English explanation, a root cause, a suggested fix,
 * and a category (product-bug / environment / flaky / test-bug). The result is
 * attached to the Playwright report (see failureAnalysisFixtures + the custom
 * FailureAnalysisReporter).
 *
 * This is the assignment's core deliverable: a real LLM call wired into the test
 * framework, not a chatbot on the side.
 */
export interface FailureContext extends FailureAnalysisRequest {}

export class FailureExplainer {
  constructor(private readonly xai = new XaiClient()) {}

  async explain(context: FailureContext): Promise<FailureAnalysisResponse> {
    return this.xai.explainFailure({
      title: context.title,
      error: context.error.slice(0, 4000),
      url: context.url,
      domSnapshot: context.domSnapshot.slice(0, 4000),
      apiResponse: context.apiResponse?.slice(0, 2000),
    });
  }
}
