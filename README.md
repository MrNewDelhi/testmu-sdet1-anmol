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

Run every version plus the framework unit tests with `npm run test:self-healing`. Open the animated version tabs with `npm run serve:demo`.

### v7 — Failure Explainer (Task 3, Option A)

This is the assignment's core Task 3 deliverable: a real xAI call wired into the framework. When a test fails, an auto-fixture captures the page state (compacted DOM), URL, and assertion error, sends them to xAI, and attaches a plain-English explanation with a **category** (`product-bug` / `environment` / `flaky` / `test-bug`), root cause, and suggested fix to the report.

- Trigger discipline: only on a genuine failure, and only on the **final** retry (so a flake that passes on retry is never analyzed), with a per-run budget and error-signature dedup, and a graceful skip when `XAI_API_KEY` is unset.
- `npm run test:self-healing:v7` runs a deliberately-failing demo (expected to fail) with a custom `FailureAnalysisReporter` that writes `playwright-report/failure-analysis.html` + `.json`. A committed sample is at `sample-output/failure-analysis.json`.
- The always-green `tests/framework/failure-explainer.spec.ts` exercises the real xAI call on a simulated failure so CI covers the integration without a red test.
- Next (mode B): move the LLM call to a post-run reporter to batch and dedup failures across the whole run.

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
