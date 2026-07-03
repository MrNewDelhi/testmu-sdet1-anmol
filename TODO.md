# TODO

## Task 1: Setup and Scaffold

- [x] Create public GitHub repository named `testmu-sdet1-anmol`.
- [x] Copy the assignment PDF into the repository.
- [x] Select the automation stack.
- [x] Create the folder structure before writing tests.
- [x] Add a first commit mentioning the AI tool used to get started and what it helped with.

## Task 2: Prompt Engineering for Test Generation

- [x] Create `prompts.md` with every raw prompt exactly as written.
- [x] Generate Login test cases covering:
  - [x] Valid login
  - [x] Invalid credentials
  - [x] Forgot password
  - [x] Session expiry
  - [x] Brute-force lockout
- [x] Generate Dashboard test cases covering:
  - [x] Widget loading
  - [x] Data accuracy
  - [x] Filter and sort behavior
  - [x] Responsive layout
  - [x] Permission-based visibility
- [x] Generate REST API test cases covering:
  - [x] Auth token validation
  - [x] CRUD operations
  - [x] Error handling for 4xx and 5xx responses
  - [x] Rate limiting
  - [x] Schema validation
- [x] Add generated test cases in the selected framework format.
- [x] Add a short 3 to 5 line note per module explaining what did not work first time and what changed.
- [x] Keep generated Task 2 design artifacts out of the default executable Playwright run.
- [x] Add generated-case summary command.
- [x] Automate all 26 generated cases in proper Login, Dashboard, and API module specs.
- [x] Use POM model for web Login and Dashboard tests.

## Task 3: LLM Integration in Test Framework

- [x] Pick an LLM integration direction:
  - [x] Naive v1 self-healing locator demo using xAI.
  - [ ] Finalize whether this becomes the submitted Task 3 option or supports the failure-explainer path.
- [x] Create a deliberately wrong locator scenario.
- [x] Capture DOM context and send it to xAI in a try/catch healing flow.
- [x] Validate the returned selector against the page before continuing.
- [x] Store `XAI_API_KEY` as a GitHub repository secret.
- [x] Add GitHub workflow env variables for `XAI_MODEL` and `BASE_URL`.
- [x] Add documentation explaining why xAI was selected.
- [x] Add an interactive HTML visualizer with version tabs.
- [x] Add animated visualizer playback for the self-healing workflow.
- [x] Centralize self-healing behavior into a shared framework service.
- [x] Add a Playwright `healing` fixture so tests do not instantiate the healer directly.
- [x] Document scenarios where self-healing helps and where it should refuse.
- [x] Add programmatic confidence scoring (uniqueness + selector stability) with a refusal threshold.
- [x] Add a SQLite locator cache keyed on (page, broken selector, intent) so xAI is called once per break.
- [x] Prove the cache end-to-end: heal via xAI once, then serve from cache with no second call.
- [x] Add target-contract disambiguation so a confident-but-wrong heal (header link vs form submit) is refused.
- [x] Add a v4 demo: decoy header link refused, real submit accepted, and a live xAI run steered by the contract.
- [x] Add v5 deterministic-first resolution (rebuild the locator locally; escalate to xAI only when ambiguous) to cut token cost.
- [x] Add a v5 demo: local keyword/contract resolution with zero xAI calls, plus an escalation case.
- [x] Add v6 multi-locator cache (store the target's top-3 attribute-diverse locators) so single-attribute drift heals from a fallback.
- [x] Add a v6 demo: rename the primary id and heal from the data-testid locator with no xAI call.
- [x] Give each of the six versions its own visualizer tab and demo script.
- [x] Add v7 Failure Explainer (Task 3 Option A): on failure, send page state + error to xAI and attach a categorized explanation to the report.
- [x] Trigger the explainer only on the final failed attempt, with a per-run budget, dedup, and a no-key skip.
- [x] Add a custom FailureAnalysisReporter writing playwright-report/failure-analysis.html + .json, a v7 demo/script, a v7 visualizer tab, and a sample output.
- [ ] v7 mode B: move the LLM call to a post-run reporter (batch all final failures, dedup by error signature, one grouped report).
- [ ] Add a destructive-action refusal allow-list (delete/pay/submit-order) on top of the contract.
- [ ] Add a code comment explaining why the final Task 3 option was selected over the other assignment option.
- [x] Attach or output the LLM response inside v1 test results.
- [x] Add a sample output showing the LLM response.

## Final Submission

- [ ] Ensure the repository is public.
- [ ] Ensure `prompts.md` contains raw prompts exactly as written.
- [ ] Ensure generated test cases are committed.
- [ ] Ensure LLM integration code and sample output are committed.
- [ ] Update `README.md` with how to run the project.
- [ ] Update `README.md` with what would be built next with more time.
- [ ] Keep `ai-usage-log.md` updated with every AI tool used, task helped with, and output produced.
- [ ] Share the GitHub repository link.
