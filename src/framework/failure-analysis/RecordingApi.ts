import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Thin wrapper over Playwright's APIRequestContext that records the last HTTP
 * exchange, so an API-test failure can send the raw request + response to the
 * failure explainer (v10). For an API failure the DOM/screenshot are useless —
 * the HTTP exchange is the whole story.
 *
 * Playwright buffers response bodies, so reading `text()` here does not stop the
 * test from calling `json()`/`text()` again on the same response.
 */
export interface RecordedExchange {
  method: string;
  url: string;
  requestBody?: string;
  status: number;
  ok: boolean;
  responseBody: string;
}

type Options = Parameters<APIRequestContext['fetch']>[1];

export class RecordingApi {
  last: RecordedExchange | undefined;

  constructor(private readonly request: APIRequestContext) {}

  get(url: string, options?: Options): Promise<APIResponse> { return this.run('GET', url, options); }
  post(url: string, options?: Options): Promise<APIResponse> { return this.run('POST', url, options); }
  put(url: string, options?: Options): Promise<APIResponse> { return this.run('PUT', url, options); }
  patch(url: string, options?: Options): Promise<APIResponse> { return this.run('PATCH', url, options); }
  delete(url: string, options?: Options): Promise<APIResponse> { return this.run('DELETE', url, options); }
  fetch(url: string, options?: Options): Promise<APIResponse> { return this.run(options?.method ?? 'GET', url, options); }

  private async run(method: string, url: string, options?: Options): Promise<APIResponse> {
    const response = await this.request.fetch(url, { ...options, method });
    let responseBody = '';
    try {
      responseBody = await response.text();
    } catch {
      // Non-text body.
    }
    const data = (options as { data?: unknown } | undefined)?.data;
    this.last = {
      method,
      url,
      requestBody: data === undefined ? undefined : (typeof data === 'string' ? data : JSON.stringify(data)),
      status: response.status(),
      ok: response.ok(),
      responseBody,
    };
    return response;
  }
}
