# Self-Healing Framework v2: Centralized Fixture

## Why v2 Exists

The naive v1 demo proved the core idea: a broken locator can send DOM context to xAI, receive a repaired selector, validate it, and continue the test.

The issue with v1 is ownership. Each test had to create the healer, call it directly, and attach output manually. That works for a demo, but it does not scale like a framework.

## Centralized Design

v2 introduces a shared Playwright fixture:

```ts
import { expect, test } from '../../src/fixtures/healingFixtures.js';

const button = await healing.locator(
  '#submit-login-button-does-not-exist',
  'The primary submit button for the login form',
);
```

The test now only states intent. The framework layer owns:

- DOM snapshot capture
- xAI selector repair
- selector validation
- heal event recording
- Playwright test attachment
- JSONL audit logging

## Framework Files

- `src/framework/self-healing/SelfHealingService.ts` centralizes healing behavior.
- `src/fixtures/healingFixtures.ts` exposes the `healing` fixture to tests.
- `tests/demo/self-healing-v2-centralized.spec.ts` demonstrates the framework-style usage.

## Current v2 Scope

This is intentionally still an early centralized version. It centralizes control, but it does not yet add advanced guardrails such as cache validation, confidence thresholds, or refusal behavior. Those belong in the next iteration.
