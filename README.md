# TestMu SDET-1 Assessment

This repository contains the scaffold for the TestMu AI SDET-1 assessment.

## Current Status

Task 1 is complete: the project has been initialized with a clean TypeScript and Playwright-oriented folder structure before writing tests.

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

- Task 2: create raw prompts and generated test cases for Login, Dashboard, and REST API.
- Task 3: wire a real LLM call into the test framework and publish sample output.
