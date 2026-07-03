# Self-Healing Scenario Coverage

Self-healing is valuable when the user intent is still valid but the locator contract moved. It should not hide real product bugs.

## Good Self-Healing Candidates

- A button keeps the same accessible name but its CSS class or id changes.
- A form field keeps its label but moves inside a new wrapper.
- A dashboard link moves from a tile to a sidebar, while the visible destination is unchanged.
- A responsive layout reorders account navigation but keeps stable role/text semantics.
- A `data-testid` is renamed but the DOM still contains a single element matching the same user intent.
- Error banners or validation messages move to a new container but keep the same user-facing meaning.

## Conditions Where the Framework Should Refuse

- The intended element is genuinely removed from the page.
- The user is on the wrong page because auth, redirect, or navigation failed.
- Multiple candidate elements match the same intent with no reliable discriminator.
- The LLM response points to an element that does not exist in the current DOM.
- The suggested locator matches more than one element for a destructive action.
- The page state indicates a real backend, permission, or validation failure rather than selector drift.

## Disambiguation: refusing a confident-but-wrong heal (v4)

Existence checks (`count > 0`) and confidence scoring do not catch a repair that
points at the *wrong* element. On a login page two controls both read like
"login": a header nav link (an `<a>` that navigates) and the form submit button.
When the submit selector breaks, xAI can confidently return the header link — a
unique, stable `<a>` that scores high — and the test would then click it and
navigate away.

The fix is to verify the model's answer against a checkable **target contract**
instead of trusting it:

```ts
await healing.locator(brokenSelector, intent, {
  role: 'button', type: 'submit', withinForm: '#login-form', textLike: 'sign ?in|login',
});
```

- The contract description is appended to the intent sent to xAI (better recall).
- After the model answers, `SelfHealingService` checks that exactly one matched
  element satisfies the contract. The header link fails (`role=link`, outside the
  form) and is refused; zero or more than one match also refuses (ambiguous).

The key point: the problem was not too little input context — the DOM snapshot
already carries `type` and the `form#login-form` ancestor — but too little output
verification. Contract validation is the guardrail; see
`src/framework/self-healing/contract.ts` and the
`tests/demo/self-healing-v4-contract.spec.ts` demo (decoy refused, real target
accepted, and a live end-to-end run steered by the contract).

## Token cost: deterministic-first, then multi-locator cache (v5, v6)

The LLM is the expensive part, so it should be the fallback, not the default.

- **v5 deterministic-first** (`DeterministicLocator`): before any xAI call, narrow
  the page's interactive elements by the contract or the unique keywords in the
  intent. If exactly one element survives, rebuild a stable, verified locator
  locally (id > data-testid > name > aria-label > form+type). Only when the
  narrowing is ambiguous (0 or >1 candidates) do we escalate to the model — so
  easy breaks cost zero tokens. See `tests/demo/self-healing-v5-deterministic.spec.ts`.
- **v6 multi-locator cache**: store the target's top-3 attribute-diverse locators
  instead of one. On a repeat break the cache tries them in rank order, so if a
  single attribute changes (say the id is renamed) the heal still succeeds from
  the data-testid or form+type locator — no re-heal, no LLM call. See
  `tests/demo/self-healing-v6-multi-locator.spec.ts`.

## Failure Explainer (v7, Task 3 Option A)

Distinct from healing: when a test fails, its page state and error are sent to
xAI for a plain-English explanation, a category (product-bug / environment /
flaky / test-bug), a root cause, and a suggested fix, attached to the report.

Trigger discipline is the whole game here:

- **On failure only** — green tests are never analyzed.
- **Final attempt only** — with retries on, analyzing an earlier failed attempt
  of a test that then passes would spend tokens explaining a non-failure and
  produce a misleading report. Gate on
  `status === 'failed' && retry === project.retries`.
- **Budget + dedup** — one root cause failing many tests must not fan out into
  many identical LLM calls; cap per run and dedup by error signature.
- **Graceful skip** when `XAI_API_KEY` is absent.

Mode A (shipped) analyzes at failure time in an auto-fixture with live page
state. Mode B (next) captures context at failure time but defers the LLM calls
to a post-run reporter, so failures across the whole run can be batched and
deduped. See `src/framework/failure-analysis/FailureExplainer.ts`,
`src/fixtures/failureAnalysisFixtures.ts`,
`src/reporters/FailureAnalysisReporter.ts`, and
`tests/framework/failure-explainer.spec.ts`.

### v8: send the screenshot too (multimodal)

The fixture also captures a page screenshot at failure time and sends it as an
`image_url` content part, so the model sees the actual render (overlays,
spinners, layout breakage) rather than only the DOM text. It uses a configurable
`XAI_VISION_MODEL`.

What it does and does not fix: a screenshot makes the *description* more
concrete, but it cannot resolve the fundamental product-intent ambiguity. In the
demo, "the page never shows a dashboard" is visible in the image, yet whether a
dashboard is *supposed* to exist is a spec question — so xAI still leans
product-bug where the honest label is test-bug. Closing that gap needs run
history / the diff / the spec, which is mode B's job, not the image's.

Every xAI call (repair and analysis, text or multimodal) is recorded in
`src/agents/self-healing/xai-calls.jsonl` with latency, status, token usage, and
a `hasScreenshot` flag for debugging and cost tracking.

### v9: mode B — batched, deduped, enriched (closing the context gap)

Mode A analyzes per test at failure time. Mode B (`FAILURE_ANALYSIS_MODE=b`)
moves the LLM call to `BatchedFailureAnalysisReporter`, which runs after the
whole suite. The fixture only stashes the raw failure context; the reporter:

- **dedups** failures by error signature — a cascade of N tests sharing one root
  cause becomes a single LLM call, and the cascade size is itself a signal;
- **enriches** each group with the context the model was missing: the test's
  **prior-run status** (persisted in `src/agents/self-healing/failure-history.json`,
  which lives outside the `test-results` dir Playwright wipes each run), whether
  the failing **test file was recently changed** (git), and the run's changed files;
- feeds these as **priors** ("recently-changed test + stable page → lean
  test-bug"; "passed recently, now fails → lean product-bug/environment"; "many
  identical failures → environment/setup").

Demonstrated live: the same failure that xAI called `product-bug` in v7/v8 is
correctly reclassified `test-bug` in mode B once it learns the test file was just
added — the git signal supplies the product-intent context an image never could.
See `src/reporters/BatchedFailureAnalysisReporter.ts` and the cascade demo
(`npm run test:self-healing:v9`).

### v10: raw API request/response for API failures

For an API-level failure the DOM and screenshot are useless; the HTTP exchange is
the whole story. `RecordingApi` wraps Playwright's `APIRequestContext` and records
the last request/response; the `apiFailureAnalysis` fixture sends the raw request
(method, URL, body) and response (status, body) instead of page state. Demonstrated
live: a test asserting `POST /booking` returns 500 (it returns 200) is correctly
called `test-bug` because xAI can see the request succeeded — high-signal context
that needs no git enrichment. See `src/fixtures/apiFailureAnalysisFixtures.ts`.

## Why Generated Cases Now Help

The generated Task 2 cases are not default executable tests anymore. They are structured design artifacts with Playwright-style drafts and self-healing notes. This keeps `npm test` clean while preserving the interview evidence for:

- Login selector drift
- Dashboard navigation and responsive drift
- API contract failures that are better suited to LLM failure explanation than locator healing
