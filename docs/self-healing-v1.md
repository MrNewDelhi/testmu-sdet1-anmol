# Self-Healing Framework v1

## Scenario

Task 3 starts with a deliberately naive self-healing approach. The demo test intentionally uses a broken login button locator:

```text
#submit-login-button-does-not-exist
```

The locator is wrapped in a try/catch flow. When the primary selector fails, the framework captures the current interactive DOM, sends the broken selector plus element intent to xAI, validates the suggested replacement selector against the page, logs the heal event, and continues the test.

## Why xAI

xAI was selected for this v1 integration because:

- It has strong raw API behavior for structured selector-repair prompts, which reduces hallucinated output when the DOM is supplied directly.
- It handles compact prompt payloads well at a fraction of the cost of many frontier-model workflows.
- Its OpenAI-compatible chat completions endpoint keeps the integration small and easy to run in CI.

## Environment

Local `.env`:

```text
XAI_API_KEY=...
XAI_MODEL=grok-4.3
BASE_URL=http://127.0.0.1:9323
```

GitHub Actions:

- `XAI_API_KEY` is stored as a repository secret.
- `XAI_MODEL` is set as a workflow environment variable.

## v1 Limitations

- It is intentionally naive: no cache, no confidence threshold, no scoped deterministic fallback, and no refusal policy beyond validating that the suggested selector matches the DOM.
- The next iteration should add guardrails so the system refuses to heal when the intended element is genuinely removed.
