# Generated Test Case Notes

The generated Task 2 cases are now stored as Playwright-style artifacts, not executable `fixme` tests. This keeps the default report clean while preserving case design evidence.

## Playwright Patterns Used

- Default executable tests stay in Playwright's normal `.spec.ts` collection.
- Generated cases live in `tests/generated/*.generated.ts` and are excluded through `testIgnore`.
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
