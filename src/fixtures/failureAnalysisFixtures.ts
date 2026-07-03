import { test as base, expect } from '@playwright/test';
import { env } from '../config/env.js';
import { captureInteractiveDom } from '../agents/self-healing/DomSnapshot.js';
import { FailureExplainer } from '../framework/failure-analysis/FailureExplainer.js';

/**
 * Auto-fixture for the Failure Explainer.
 *
 * Two modes (FAILURE_ANALYSIS_MODE):
 * - mode A (default): analyze at failure time and attach the explanation. Live
 *   page state, simplest, per-test.
 * - mode B ('b'): only capture and attach the raw failure context; the LLM call
 *   is deferred to BatchedFailureAnalysisReporter, which batches + dedups all
 *   final failures across the run and enriches them with history + git diff.
 *
 * Trigger discipline (both modes): only on a genuine failure, only on the FINAL
 * retry — analyzing an earlier failed attempt of a test that later passes would
 * spend tokens explaining a non-failure.
 */

// Shared across tests in a worker process (mode A budget/dedup).
const analyzedSignatures = new Set<string>();
let analysisBudget = Number(process.env.FAILURE_ANALYSIS_BUDGET ?? 5);

export const test = base.extend<{ failureAnalysis: void }>({
  failureAnalysis: [
    async ({ page }, use, testInfo) => {
      await use();

      const isFinalFailure =
        testInfo.status === 'failed'
        && testInfo.status !== testInfo.expectedStatus
        && testInfo.retry === testInfo.project.retries;
      if (!isFinalFailure) return;

      // Context capture (both modes need it).
      let domSnapshot = '';
      try {
        domSnapshot = await captureInteractiveDom(page);
      } catch {
        // Page may be closed/navigated; analysis still runs on the error alone.
      }
      let screenshotBase64: string | undefined;
      try {
        screenshotBase64 = (await page.screenshot()).toString('base64');
      } catch {
        // No live page (e.g. API test) — analysis proceeds without an image.
      }
      const context = {
        title: testInfo.titlePath.join(' > '),
        file: testInfo.file,
        error: [testInfo.error?.message, testInfo.error?.stack].filter(Boolean).join('\n'),
        url: (() => {
          try {
            return page.url();
          } catch {
            return '';
          }
        })(),
        domSnapshot,
        screenshotBase64,
      };

      // Mode B: defer the LLM call to the post-run reporter.
      if (process.env.FAILURE_ANALYSIS_MODE === 'b') {
        await testInfo.attach('failure-context', {
          body: JSON.stringify(context),
          contentType: 'application/json',
        });
        return;
      }

      // Mode A: analyze now.
      if (!env.xaiApiKey) {
        await testInfo.attach('failure-analysis', {
          body: 'Skipped: XAI_API_KEY not set.',
          contentType: 'text/plain',
        });
        return;
      }

      const signature = `${context.title}::${(testInfo.error?.message ?? '').slice(0, 120)}`;
      if (analyzedSignatures.has(signature) || analysisBudget <= 0) return;
      analyzedSignatures.add(signature);
      analysisBudget -= 1;

      try {
        const analysis = await new FailureExplainer().explain(context);
        await testInfo.attach('failure-analysis', {
          body: JSON.stringify(
            { test: context.title, url: context.url, error: context.error.slice(0, 600), analysis },
            null,
            2,
          ),
          contentType: 'application/json',
        });
      } catch (error) {
        await testInfo.attach('failure-analysis-error', {
          body: String(error),
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],
});

export { expect };
