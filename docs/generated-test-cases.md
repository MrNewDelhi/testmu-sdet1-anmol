# Generated Test Case Notes

The generated Task 2 cases are stored as Playwright-style artifacts and are also implemented as executable module specs.

## Playwright Patterns Used

- Generated design artifacts live in `tests/generated/*.generated.ts` and are excluded through `testIgnore`.
- Executable generated cases live in proper module specs:
  - `tests/login/generated-login.spec.ts`
  - `tests/dashboard/generated-dashboard.spec.ts`
  - `tests/api/generated-api.spec.ts`
- Web tests use POM classes from `src/pages/` (`LoginPage`, `AccountPage`, `EditAccountPage`, `CatalogPage`, `RegisterPage`) and fixtures from `src/fixtures/testFixtures.ts`. Tests do not build URLs or reach into other pages' raw locators — navigation and assertions go through page-object methods (`goto`, `submit`, `expectOnLoginPage`, `expectLockedOut`, `openEditAccount`, `sortBy`, `resultsSummary`).
- Case drafts prefer resilient Playwright locators:
  - role and accessible-name locators where the target exposes a stable user-facing contract
  - label/placeholder-aware form targeting where available
  - scoped CSS only when the real page exposes stable ids or form actions
- Drafts use `test.step` where it clarifies setup versus assertion phases.
- API drafts use `request` fixtures, explicit status checks, and JSON body assertions.

## Playwright MCP Exploration Evidence

Playwright MCP was used against the LambdaTest eCommerce Playground login/account routes:

- `route=account/login` exposes `#input-email`, `#input-password`, and `form[action*="account/login"] input[type="submit"][value="Login"]`.
- Invalid credentials keep the user on `route=account/login` and show `Warning: No match for E-Mail Address and/or Password.`
- `route=account/forgotten` shows heading `Forgot Your Password?` and an `E-Mail Address` field.
- Direct guest navigation to `route=account/account` redirects to `route=account/login`.
- The 6th consecutive failed login returns `Warning: Your account has exceeded allowed number of login attempts. Please try again in 1 hour.` (lockout is keyed per email).
- Product listing `route=product/category&path=20` (Desktops) renders 15 `.product-layout` cards with banner `Showing 1 to 15 of 75`; the Sort-By `select` in `.content-sort-by` navigates via `location = this.value` and `Price (Low > High)` yields ascending `.price-new` values.

These observations are reflected in the generated Login and Dashboard case artifacts.

## Latest Execution Status

`npm run test:generated:run` executes 26 tests across Login (7), Dashboard (8), and REST API (11).

Latest local result:

```text
26 passed
```

Beyond these 26 generated cases, the default suite (`npm test`) also runs the self-healing v1–v6 demos and the framework unit tests (confidence, cache, contract, deterministic API classifier, and PII redaction); the demos that make a live xAI call need `XAI_API_KEY`. The deliberately-failing v7–v10 demos stay out of the default run via `testIgnore` and are exercised through `npm run test:self-healing:v7` / `:v9`.
