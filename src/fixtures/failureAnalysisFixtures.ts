import { test as base, expect } from '@playwright/test';
import { captureInteractiveDom } from '../agents/self-healing/DomSnapshot.js';
import { analyzeFailure, isFinalFailure } from '../framework/failure-analysis/analyzeFailure.js';

/**
 * Web auto-fixture for the Failure Explainer.
 *
 * On a genuine failure and only on the FINAL retry, capture the page state
 * (compacted DOM + screenshot) and hand it to the shared analyzer, which either
 * analyzes now (mode A) or stashes the context for the batched reporter (mode B).
 * For API tests use apiFailureAnalysisFixtures instead.
 */
export const test = base.extend<{ failureAnalysis: void }>({
  failureAnalysis: [
    async ({ page }, use, testInfo) => {
      await use();
      if (!isFinalFailure(testInfo)) return;

      let domSnapshot = '';
      try {
        domSnapshot = await captureInteractiveDom(page);
      } catch {
        // Page may be closed/navigated.
      }
      let screenshotBase64: string | undefined;
      try {
        screenshotBase64 = (await page.screenshot()).toString('base64');
      } catch {
        // No live page.
      }

      await analyzeFailure(testInfo, {
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
      });
    },
    { auto: true },
  ],
});

export { expect };
