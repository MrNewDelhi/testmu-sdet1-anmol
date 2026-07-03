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
- [x] Automate all 21 generated cases in proper Login, Dashboard, and API module specs.
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
