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

## Task 3: LLM Integration in Test Framework

- [ ] Pick one LLM integration option:
  - [ ] Option A: Failure Explainer
  - [ ] Option B: Flaky Test Classifier
- [ ] Implement working code with a real LLM API call.
- [ ] Add a code comment explaining why the chosen option was selected over the other.
- [ ] Attach or output the LLM response inside test results.
- [ ] Add a sample output showing the LLM response.

## Final Submission

- [ ] Ensure the repository is public.
- [ ] Ensure `prompts.md` contains raw prompts exactly as written.
- [ ] Ensure generated test cases are committed.
- [ ] Ensure LLM integration code and sample output are committed.
- [ ] Update `README.md` with how to run the project.
- [ ] Update `README.md` with what would be built next with more time.
- [ ] Keep `ai-usage-log.md` updated with every AI tool used, task helped with, and output produced.
- [ ] Share the GitHub repository link.
