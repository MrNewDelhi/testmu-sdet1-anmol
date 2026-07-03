import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, requireXaiApiKey } from '../config/env.js';

// Append-only audit log of every xAI call (gitignored via *.jsonl).
const xaiLogDir = resolve(process.cwd(), 'src/agents/self-healing');
const xaiLogFile = resolve(xaiLogDir, 'xai-calls.jsonl');

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
    const content = await this.chatCompletion('repair', {
      messages: [
        {
          role: 'system',
          content:
            'You are a Playwright self-healing locator assistant. Return only a selector for the intended element. Prefer stable CSS selectors with ids, names, data attributes, accessible roles, text, or form context. Do not invent elements that are not present in the DOM snapshot.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      schemaName: 'selector_repair',
      schema: selectorRepairSchema,
    });

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
    const content = await this.chatCompletion('failure-analysis', {
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
        { role: 'user', content: JSON.stringify(input) },
      ],
      schemaName: 'failure_analysis',
      schema: failureAnalysisSchema,
    });

    const parsed = JSON.parse(content) as FailureAnalysisResponse;
    if (!parsed.summary || !parsed.category || !parsed.rootCause || !parsed.suggestedFix) {
      throw new Error(`xAI failure analysis returned invalid JSON: ${content}`);
    }
    return parsed;
  }

  /**
   * Single place every xAI call goes through. Times the request and appends one
   * JSONL line per call (kind, model, latency, status, token usage, error) to
   * an audit log, so calls are traceable for debugging and cost tracking.
   * Set XAI_DEBUG=1 to also echo each call to stderr.
   */
  private async chatCompletion(
    kind: 'repair' | 'failure-analysis',
    options: { messages: unknown[]; schemaName: string; schema: unknown },
  ): Promise<string> {
    const body = JSON.stringify({
      model: env.xaiModel,
      temperature: 0,
      messages: options.messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: options.schemaName, strict: true, schema: options.schema },
      },
    });
    const started = Date.now();
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${requireXaiApiKey()}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        const text = await response.text();
        this.logCall({ kind, latencyMs: Date.now() - started, ok: false, status: response.status, requestBytes: body.length, error: text.slice(0, 300) });
        throw new Error(`xAI ${kind} failed: ${response.status} ${text}`);
      }

      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = payload.choices?.[0]?.message?.content;
      this.logCall({
        kind,
        latencyMs: Date.now() - started,
        ok: true,
        status: response.status,
        requestBytes: body.length,
        responseChars: content?.length ?? 0,
        usage: payload.usage,
      });
      if (!content) {
        throw new Error(`xAI ${kind} returned no message content.`);
      }
      return content;
    } catch (error) {
      // Network/throw before a response was logged.
      if (error instanceof Error && !error.message.startsWith(`xAI ${kind}`)) {
        this.logCall({ kind, latencyMs: Date.now() - started, ok: false, status: 0, requestBytes: body.length, error: error.message.slice(0, 300) });
      }
      throw error;
    }
  }

  private logCall(entry: Record<string, unknown>): void {
    const line = { timestamp: new Date().toISOString(), model: env.xaiModel, ...entry };
    try {
      mkdirSync(xaiLogDir, { recursive: true });
      appendFileSync(xaiLogFile, `${JSON.stringify(line)}\n`);
    } catch {
      // Logging must never break a call.
    }
    if (process.env.XAI_DEBUG) {
      // eslint-disable-next-line no-console
      console.error(`[xai] ${JSON.stringify(line)}`);
    }
  }
}
