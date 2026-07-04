import { test as base, expect } from '@playwright/test';
import { RecordingApi } from '../framework/failure-analysis/RecordingApi.js';
import { analyzeFailure, isFinalFailure } from '../framework/failure-analysis/analyzeFailure.js';

/**
 * API-test fixtures for the Failure Explainer (v10).
 *
 * Use `api` instead of `request` in API tests; it records the last HTTP
 * exchange. On a final failure the auto-fixture sends the raw request +
 * response (not a DOM/screenshot) to the analysis.
 */
export const test = base.extend<{ api: RecordingApi; apiFailureAnalysis: void }>({
  api: async ({ request }, use) => {
    await use(new RecordingApi(request));
  },
  apiFailureAnalysis: [
    async ({ api }, use, testInfo) => {
      await use();
      if (!isFinalFailure(testInfo)) return;

      const exchange = api.last;
      await analyzeFailure(testInfo, {
        title: testInfo.titlePath.join(' > '),
        file: testInfo.file,
        error: [testInfo.error?.message, testInfo.error?.stack].filter(Boolean).join('\n'),
        url: exchange?.url ?? '',
        domSnapshot: '',
        apiRequest: exchange
          ? `${exchange.method} ${exchange.url}${exchange.requestBody ? `\n\n${exchange.requestBody}` : ''}`
          : undefined,
        apiResponse: exchange
          ? `HTTP ${exchange.status}${exchange.ok ? ' OK' : ''}\n\n${exchange.responseBody.slice(0, 3000)}`
          : undefined,
        apiStatus: exchange?.status,
      });
    },
    { auto: true },
  ],
});

export { expect };
