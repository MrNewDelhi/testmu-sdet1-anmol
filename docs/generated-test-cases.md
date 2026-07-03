# Generated Test Case Notes

The generated Task 2 cases are stored as Playwright-style artifacts and are also implemented as executable module specs.

## Playwright Patterns Used

- Generated design artifacts live in `tests/generated/*.generated.ts` and are excluded through `testIgnore`.
- Executable generated cases live in proper module specs:
  - `tests/login/generated-login.spec.ts`
  - `tests/dashboard/generated-dashboard.spec.ts`
  - `tests/api/generated-api.spec.ts`
- Web tests use POM classes from `src/pages/` and fixtures from `src/fixtures/testFixtures.ts`.
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

These observations are reflected in the generated Login and Dashboard case artifacts.

## Latest Execution Status

`npm run test:generated:run` executes 21 tests across Login, Dashboard, and REST API.

Latest local result:

```text
21 passed
```

The full default suite now includes these 21 generated cases plus the two self-healing demos:

```text
23 passed
```
