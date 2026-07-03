import { test as base, expect } from '@playwright/test';
import { env } from '../config/env.js';
import { captureInteractiveDom } from '../agents/self-healing/DomSnapshot.js';
import { FailureExplainer } from '../framework/failure-analysis/FailureExplainer.js';

/**
 * Auto-fixture that runs the Failure Explainer (v7).
 *
 * Trigger discipline (the decisions that matter):
 * - Only on a genuine failure, and only on the FINAL retry — analyzing an
 *   earlier failed attempt of a test that later passes would spend tokens
 *   explaining a non-failure and produce a misleading report.
 * - Deduped by error signature and capped by a per-run budget, so one root
 *   cause failing many tests does not fan out into many identical LLM calls.
 * - Skipped gracefully when XAI_API_KEY is absent (a note is still attached).
 */

// Shared across tests in a worker process.
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

      if (!env.xaiApiKey) {
        await testInfo.attach('failure-analysis', {
          body: 'Skipped: XAI_API_KEY not set.',
          contentType: 'text/plain',
        });
        return;
      }

      const signature = `${testInfo.titlePath.join(' > ')}::${(testInfo.error?.message ?? '').slice(0, 120)}`;
      if (analyzedSignatures.has(signature) || analysisBudget <= 0) return;
      analyzedSignatures.add(signature);
      analysisBudget -= 1;

      let domSnapshot = '';
      try {
        domSnapshot = await captureInteractiveDom(page);
      } catch {
        // Page may be closed/navigated; analysis still runs on the error alone.
      }

      const context = {
        title: testInfo.titlePath.join(' > '),
        error: [testInfo.error?.message, testInfo.error?.stack].filter(Boolean).join('\n'),
        url: (() => {
          try {
            return page.url();
          } catch {
            return '';
          }
        })(),
        domSnapshot,
      };

      try {
        const analysis = await new FailureExplainer().explain(context);
        await testInfo.attach('failure-analysis', {
          body: JSON.stringify(
            {
              test: context.title,
              url: context.url,
              error: context.error.slice(0, 600),
              analysis,
            },
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
