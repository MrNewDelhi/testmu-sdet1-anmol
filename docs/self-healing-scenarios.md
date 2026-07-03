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

## Why Generated Cases Now Help

The generated Task 2 cases are not default executable tests anymore. They are structured design artifacts with Playwright-style drafts and self-healing notes. This keeps `npm test` clean while preserving the interview evidence for:

- Login selector drift
- Dashboard navigation and responsive drift
- API contract failures that are better suited to LLM failure explanation than locator healing
