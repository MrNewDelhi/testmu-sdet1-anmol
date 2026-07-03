import { env, requireXaiApiKey } from '../config/env.js';

export interface SelectorRepairRequest {
  brokenSelector: string;
  intent: string;
  domSnapshot: string;
  url: string;
}

export interface SelectorRepairResponse {
  selector: string;
  confidence: number;
  reason: string;
}

const selectorRepairSchema = {
  type: 'object',
  properties: {
    selector: { type: 'string' },
    confidence: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['selector', 'confidence', 'reason'],
  additionalProperties: false,
} as const;

export type FailureCategory = 'product-bug' | 'environment' | 'flaky' | 'test-bug';

export interface FailureAnalysisRequest {
  /** Full test title path, e.g. "Login > shows dashboard". */
  title: string;
  /** Assertion error message + stack. */
  error: string;
  /** Page URL at the moment of failure. */
  url: string;
  /** Compacted interactive DOM snapshot (page state). */
  domSnapshot: string;
  /** Optional API status/body for API-level failures. */
  apiResponse?: string;
}

export interface FailureAnalysisResponse {
  summary: string;
  category: FailureCategory;
  rootCause: string;
  suggestedFix: string;
}

const failureAnalysisSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    category: { type: 'string', enum: ['product-bug', 'environment', 'flaky', 'test-bug'] },
    rootCause: { type: 'string' },
    suggestedFix: { type: 'string' },
  },
  required: ['summary', 'category', 'rootCause', 'suggestedFix'],
  additionalProperties: false,
} as const;

export class XaiClient {
  async repairSelector(input: SelectorRepairRequest): Promise<SelectorRepairResponse> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireXaiApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.xaiModel,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a Playwright self-healing locator assistant. Return only a selector for the intended element. Prefer stable CSS selectors with ids, names, data attributes, accessible roles, text, or form context. Do not invent elements that are not present in the DOM snapshot.',
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'selector_repair',
            strict: true,
            schema: selectorRepairSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI selector repair failed: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('xAI selector repair returned no message content.');
    }

    const parsed = JSON.parse(content) as SelectorRepairResponse;
    if (!parsed.selector || typeof parsed.confidence !== 'number' || !parsed.reason) {
      throw new Error(`xAI selector repair returned invalid JSON: ${content}`);
    }

    return parsed;
  }

  /**
   * Explain a test failure in plain English and bucket it into a category.
   * Real chat-completion call under a strict JSON schema.
   */
  async explainFailure(input: FailureAnalysisRequest): Promise<FailureAnalysisResponse> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireXaiApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.xaiModel,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a senior SDET triaging an automated test failure. Given the error, the '
              + 'page state, and any API response, explain in plain English what broke and suggest a '
              + 'concrete fix. Classify the failure as exactly one of: product-bug (a real defect in '
              + 'the app), environment (infra/network/config), flaky (timing/nondeterminism), or '
              + 'test-bug (the test/assertion is wrong). Be specific and concise.',
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'failure_analysis',
            strict: true,
            schema: failureAnalysisSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI failure analysis failed: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('xAI failure analysis returned no message content.');
    }

    const parsed = JSON.parse(content) as FailureAnalysisResponse;
    if (!parsed.summary || !parsed.category || !parsed.rootCause || !parsed.suggestedFix) {
      throw new Error(`xAI failure analysis returned invalid JSON: ${content}`);
    }

    return parsed;
  }
}
