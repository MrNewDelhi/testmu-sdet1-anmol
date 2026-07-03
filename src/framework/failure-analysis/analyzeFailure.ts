import type { TestInfo } from '@playwright/test';
import { env } from '../../config/env.js';
import { FailureExplainer } from './FailureExplainer.js';

/**
 * Shared failure-analysis handling for the web and API fixtures.
 *
 * - mode A (default): analyze now and attach the explanation.
 * - mode B ('b'): only stash the raw context; BatchedFailureAnalysisReporter
 *   analyzes (batched + enriched) after the run.
 */
export interface FailureContextData {
  title: string;
  file: string;
  error: string;
  url: string;
  domSnapshot: string;
  screenshotBase64?: string;
  apiRequest?: string;
  apiResponse?: string;
}

// Mode-A budget/dedup, shared across tests in a worker process.
const analyzedSignatures = new Set<string>();
let analysisBudget = Number(process.env.FAILURE_ANALYSIS_BUDGET ?? 5);

export function isFinalFailure(testInfo: TestInfo): boolean {
  return (
    testInfo.status === 'failed'
    && testInfo.status !== testInfo.expectedStatus
    && testInfo.retry === testInfo.project.retries
  );
}

export async function analyzeFailure(testInfo: TestInfo, context: FailureContextData): Promise<void> {
  // Mode B: defer to the post-run reporter.
  if (process.env.FAILURE_ANALYSIS_MODE === 'b') {
    await testInfo.attach('failure-context', {
      body: JSON.stringify(context),
      contentType: 'application/json',
    });
    return;
  }

  // Mode A: analyze at failure time.
  if (!env.xaiApiKey) {
    await testInfo.attach('failure-analysis', {
      body: 'Skipped: XAI_API_KEY not set.',
      contentType: 'text/plain',
    });
    return;
  }

  const signature = `${context.title}::${context.error.slice(0, 120)}`;
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
}
