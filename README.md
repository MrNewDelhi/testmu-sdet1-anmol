# TestMu SDET-1 Assessment

This repository contains the scaffold for the TestMu AI SDET-1 assessment.

## Current Status

Task 3 v2 is in progress: the project now contains the initial scaffold, generated Task 2 test-case material, a naive xAI-powered self-healing locator demo, and a centralized self-healing framework fixture.

## AI Model Used

ChatGpt 5.5 Light using Codex

## What Has Been Done

- Created the main repository folder: `testmu-sdet1-anmol`.
- Copied the original assignment PDF into the repository.
- Chose TypeScript with Playwright as the automation stack.
- Created a maintainable folder structure for:
  - Page objects
  - Test fixtures
  - AI integration code
  - Test reporting
  - Login tests
  - Dashboard tests
  - API tests
  - Generated tests
  - Documentation and sample outputs
- Added `TODO.md` with the complete assignment task breakdown.
- Added initial project configuration files for the planned framework.
- Added `ai-usage-log.md` to track AI usage during the assessment.
- Added Task 2 raw prompts in `prompts.md`.
- Added generated Playwright test-case specs in `tests/generated/`.
- Added module notes explaining what changed after the first prompt attempt.
- Added naive Task 3 v1 self-healing locator code.
- Added a demo test that deliberately uses a wrong locator, sends DOM context to xAI, validates the returned selector, and continues.
- Added an interactive HTML visualizer for the self-healing approach.
- Added sample v1 xAI selector-repair output in `sample-output/self-healing-v1.json`.
- Added centralized Task 3 v2 framework layer with `SelfHealingService` and a shared Playwright `healing` fixture.
- Upgraded the visualizer from static tabs to animated workflow playback for naive v1 and centralized v2.
- Automated all 26 generated Task 2 cases using POM-based module specs, including catalog data-accuracy and filter/sort coverage.

## Planned Structure

```text
testmu-sdet1-anmol/
  docs/
  public/
  sample-output/
  scripts/
  src/
    ai/
    config/
    fixtures/
    framework/
    pages/
    pipeline/
    reporters/
    utils/
  tests/
    api/
    dashboard/
    generated/
    login/
    demo/
  test-results/
```

## Next Steps

The self-healing framework evolves across six versions, each with a visualizer tab and a demo script:

| Version | Idea | Demo |
| --- | --- | --- |
| v1 | Naive xAI locator repair | `npm run test:self-healing:v1` |
| v2 | Centralized service + fixture | `npm run test:self-healing:v2` |
| v3 | Confidence gate + SQLite cache | `npm run test:self-healing:v3` |
| v4 | Target-contract disambiguation (refuse wrong element) | `npm run test:self-healing:v4` |
| v5 | Deterministic-first (skip the LLM on easy breaks) | `npm run test:self-healing:v5` |
| v6 | Multi-locator cache (survive single-attribute drift) | `npm run test:self-healing:v6` |
| v7 | Failure Explainer (Task 3 Option A) — analyze failures, attach to report | `npm run test:self-healing:v7` |
| v8 | Screenshot attached to the failure request (multimodal) | `npm run test:self-healing:v7` (now sends a screenshot) |
| v9 | Mode B — batched post-run analysis, deduped + enriched with history/git | `npm run test:self-healing:v9` |
| v10 | API failures — send the raw HTTP request + response (no DOM) | `npm run test:self-healing:v7` / `:v9` |
| v11 | Redact PII before sending to the remote LLM (patterns + local judge) | `npx playwright test tests/framework/redact.spec.ts` |

Run every version plus the framework unit tests with `npm run test:self-healing`. Open the animated version tabs with `npm run serve:demo`.

**xAI call log:** every real xAI call (selector repair and failure analysis) is routed through one method in `XaiClient` that appends a JSONL line to `src/agents/self-healing/xai-calls.jsonl` — timestamp, kind, model, latency, HTTP status, request size, token usage, and any error — for debugging and cost tracking (gitignored). Set `XAI_DEBUG=1` to also echo each call to stderr.

### v7 — Failure Explainer (Task 3, Option A)

This is the assignment's core Task 3 deliverable: a real xAI call wired into the framework. When a test fails, an auto-fixture captures the page state (compacted DOM), URL, and assertion error, sends them to xAI, and attaches a plain-English explanation with a **category** (`product-bug` / `environment` / `flaky` / `test-bug`), root cause, and suggested fix to the report.

- Trigger discipline: only on a genuine failure, and only on the **final** retry (so a flake that passes on retry is never analyzed), with a per-run budget and error-signature dedup, and a graceful skip when `XAI_API_KEY` is unset.
- `npm run test:self-healing:v7` runs a deliberately-failing demo (expected to fail) with a custom `FailureAnalysisReporter` that writes `playwright-report/failure-analysis.html` + `.json`. A committed sample is at `sample-output/failure-analysis.json`.
- The always-green `tests/framework/failure-explainer.spec.ts` exercises the real xAI call on a simulated failure so CI covers the integration without a red test.
- **v8 (multimodal):** the fixture also captures a page screenshot and sends it as an `image_url` content part, so the model sees the actual render (overlays, spinners, layout breakage), not just the DOM text. Uses `XAI_VISION_MODEL` (defaults to `XAI_MODEL`); the live call is covered by `tests/framework/failure-explainer-vision.spec.ts`. Note: a screenshot sharpens the *description* but cannot resolve product-intent ambiguity (whether a missing feature is supposed to exist) — that needs run history / spec, which is mode B's job.
**v9 (mode B)** moves the LLM call out of the fixture and into a post-run reporter (`BatchedFailureAnalysisReporter`). The fixture only stashes the raw failure context; after the run the reporter:
- **dedups** failures by error signature (a cascade of N tests with one root cause becomes one call, and the cascade size becomes a signal);
- **enriches** each group with the test's **previous-run status** (persisted across runs), whether its **file was recently changed** (git), and the run's changed files;
- feeds those as priors so the classification is grounded, not guessed.

Run `npm run test:self-healing:v9` (mode B; `FAILURE_ANALYSIS_MODE=b`). In the demo this is visible: a newly-added test file is classified **test-bug** (git shows it just changed), while an unchanged committed test failing the same way stays **product-bug** — the exact `product-bug`/`test-bug` gap from v7/v8, now resolved by context.

**v10 (API failures):** for API-level tests the DOM/screenshot are useless, so use the `api` fixture (a recording `APIRequestContext` wrapper) — on failure the raw request (method/url/body) and response (status/body) are sent instead. In the demo, a test asserting `POST /booking` returns 500 (it returns 200) is correctly called **test-bug** because xAI can see the request succeeded.

**v11 (PII redaction):** every free-text field is redacted before it leaves for the remote LLM. It is **pattern-based over the full text** (not truncation): deterministic regex for the well-shaped PII (email, card/Luhn, SSN, JWT, token, API key, phone, public IP) plus **field-aware** rules that redact the value of sensitive fields (`password`, `token`, `cvv`, …) whatever its shape — a password like `hunter2` has no pattern, so it's caught by its field, and password-field values are also dropped at DOM-capture time. An optional small **local model** (`LOCAL_LLM_URL` / `PII_JUDGE_MODEL`, e.g. Ollama) acts as an LLM-judge for the fuzzy residue (names, addresses); unset = deterministic-only. See `src/framework/privacy/redact.ts`.

- Task 3 remaining: v7 mode B (batched post-run reporter), destructive-action refusal allow-list, and heal-trend reporting.
- Task 3 final: publish sample output and reporting artifacts.

## Task 2 Output

The generated test cases are stored as reviewed Playwright-style artifacts:

- `tests/generated/login.generated.ts`
- `tests/generated/dashboard.generated.ts`
- `tests/generated/api.generated.ts`

The design artifacts are intentionally excluded from Playwright collection, while the executable module specs are included in `npm test`. Use `npm run test:generated:list` to review the generated case inventory.

Generation and Playwright MCP exploration notes are documented in `docs/generated-test-cases.md`.

Executable generated test specs:

- `tests/login/generated-login.spec.ts`
- `tests/dashboard/generated-dashboard.spec.ts`
- `tests/api/generated-api.spec.ts`

Run all 26 generated executable cases (Login 7, Dashboard 8, REST API 11):

```bash
npm run test:generated:run
```

The Dashboard module spans two surfaces: the post-login **My Account** page (widget loading, permission-based visibility, responsive layout, logout) and the **product listing** page (data accuracy via the results banner, and filter/sort via the price sort control), because the account page has no data grid or sort control of its own.

Sample xAI repair output:

```json
{
  "selector": "#actual-login-submit",
  "confidence": 0.95,
  "reason": "Stable id present on the only submit button inside the login form per DOM snapshot"
}
```

## Run Checks

```bash
npm install
npx tsc --noEmit
npm test -- --list
npm run test:generated:list
npm run test:generated:run
```

`npm test` runs the 26 executable generated module specs plus the self-healing framework demos. The non-executable generated design artifacts stay excluded through `testIgnore` so planned-case artifacts do not appear as skipped tests.

## Self-Healing v1 Demo

Environment:

```bash
cp .env.example .env
# Fill XAI_API_KEY in .env
```

Run the naive v1 demo:

```bash
npm run test:self-healing:v1
```

## Centralized Self-Healing v2 Demo

The v2 demo uses the shared framework fixture instead of creating a healer inside the test:

```bash
npm run test:self-healing:v2
```

Framework entry points:

- `src/framework/self-healing/SelfHealingService.ts`
- `src/fixtures/healingFixtures.ts`
- `tests/demo/self-healing-v2-centralized.spec.ts`

Self-healing scenario notes are documented in `docs/self-healing-scenarios.md`.

Open the visualizer locally:

```bash
npm run serve:demo
```

Then visit `http://127.0.0.1:9323/self-healing-visualizer.html`.

The visualizer includes Play, Step, and Reset controls to show the locator failure, DOM capture, xAI request, selector repair, validation, and evidence logging sequence.
