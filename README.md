# TestMu SDET-1 Assessment

This repository contains the scaffold for the TestMu AI SDET-1 assessment.

## Current Status

Task 2 is complete: the project now contains the initial scaffold plus generated test-case material for Login, Dashboard, and REST API coverage.

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

## Planned Structure

```text
testmu-sdet1-anmol/
  docs/
  sample-output/
  scripts/
  src/
    ai/
    config/
    fixtures/
    pages/
    pipeline/
    reporters/
    utils/
  tests/
    api/
    dashboard/
    generated/
    login/
  test-results/
```

## Next Steps

- Task 3: wire a real LLM call into the test framework and publish sample output.

## Task 2 Output

The generated test cases are stored as reviewed Playwright `test.fixme` specs:

- `tests/generated/login.generated.spec.ts`
- `tests/generated/dashboard.generated.spec.ts`
- `tests/generated/api.generated.spec.ts`

They are intentionally marked `fixme` at this stage because Task 2 asks for generated test cases. The next implementation pass will convert selected cases into executable automation.

## Run Checks

```bash
npm install
npx tsc --noEmit
npm test -- --list
```
