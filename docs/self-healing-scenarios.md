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

## Why Generated Cases Now Help

The generated Task 2 cases are not default executable tests anymore. They are structured design artifacts with Playwright-style drafts and self-healing notes. This keeps `npm test` clean while preserving the interview evidence for:

- Login selector drift
- Dashboard navigation and responsive drift
- API contract failures that are better suited to LLM failure explanation than locator healing
