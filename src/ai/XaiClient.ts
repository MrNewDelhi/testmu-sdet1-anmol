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
}
