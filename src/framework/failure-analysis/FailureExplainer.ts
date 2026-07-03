import {
  XaiClient,
  type FailureAnalysisRequest,
  type FailureAnalysisResponse,
} from '../../ai/XaiClient.js';
import { redact } from '../privacy/redact.js';

/**
 * Task 3, Option A — the Failure Explainer.
 *
 * When a test fails, its page state / API request+response plus the error are
 * sent to xAI, which returns a plain-English explanation, a root cause, a
 * suggested fix, and a category (product-bug / environment / flaky / test-bug).
 * The result is attached to the Playwright report.
 *
 * v11: every text field is PII-redacted before it leaves for the remote model.
 */
export interface FailureContext extends FailureAnalysisRequest {}

export class FailureExplainer {
  constructor(private readonly xai = new XaiClient()) {}

  async explain(context: FailureContext): Promise<FailureAnalysisResponse> {
    // Redact PII from every free-text field before sending to the remote LLM.
    const [title, error, url, domSnapshot, apiRequest, apiResponse] = await Promise.all([
      redact(context.title),
      redact(context.error),
      redact(context.url),
      redact(context.domSnapshot),
      redact(context.apiRequest),
      redact(context.apiResponse),
    ]);

    // Redaction runs on the COMPLETE text above (pattern-based, never slicing).
    // The caps below are only a post-redaction token guard against pathological
    // payloads; the error (the key context) is kept whole, and the DOM snapshot
    // is already bounded to 80 controls at capture time.
    const cap = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…[truncated]` : s);
    return this.xai.explainFailure({
      title: title.text,
      error: error.text,
      url: url.text,
      domSnapshot: cap(domSnapshot.text, 8000),
      apiRequest: apiRequest.text ? cap(apiRequest.text, 4000) : undefined,
      apiResponse: apiResponse.text ? cap(apiResponse.text, 8000) : undefined,
      // The screenshot is not redacted; callers that may render PII should gate it.
      screenshotBase64: context.screenshotBase64,
      priorStatus: context.priorStatus,
      testFileChanged: context.testFileChanged,
      changedFiles: context.changedFiles,
      cascadeCount: context.cascadeCount,
    });
  }
}
