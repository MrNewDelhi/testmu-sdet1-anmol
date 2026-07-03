# Prompts Used for Task 2

Requirement: include every prompt exactly as written, plus a short note per module on what did not work first time and what was changed.

AI tool used for prompting: ChatGpt 5.5 Light using Codex.

## LLM Test-Case Generation

The prompts below were used to generate high-value test cases for Login, Dashboard, and REST API coverage.

### System Prompt

```text
You are an SDET generating end-to-end test cases. Return { "cases": [...] }
where each case has title, steps (string[]), assertion (string), and type
(positive|negative|edge). Produce 6-8 high-value cases including negative
and edge cases. Be specific to the provided module context and selectors/endpoints.
```

### User Prompt - Login Module

```json
{
  "module": "login",
  "context": "Login page of the LambdaTest eCommerce Playground (OpenCart). Fields: #input-email, #input-password. Submit button: input[type=\"submit\"][value=\"Login\"] inside form[action*=\"account/login\"]. Error shows in .alert-danger with text \"Warning: No match for E-Mail Address and/or Password.\" Success redirects to route=account/account. Also covers forgot-password link a[href*=\"account/forgotten\"]."
}
```

### User Prompt - Dashboard Module

```json
{
  "module": "dashboard",
  "context": "Post-login \"My Account\" dashboard (route=account/account) on the LambdaTest eCommerce Playground. Sidebar container: #column-right / .list-group. Links: Edit Account, Password, Address Book, Order History, Downloads, Recurring payments, Reward Points, Returns, Transactions, Newsletter, Logout. Main tiles: Edit your account information, Change your password, Modify your address book entries, Modify your wish list, Subscribe/unsubscribe to newsletter. Unauthenticated access redirects to route=account/login."
}
```

### User Prompt - REST API Module

```json
{
  "module": "api",
  "context": "REST API - restful-booker (https://restful-booker.herokuapp.com). Endpoints: GET /ping (health, 201); POST /auth {username,password} -> {token} or {reason:\"Bad credentials\"}; GET /booking (list of {bookingid}); POST /booking (create, returns {bookingid, booking}); GET /booking/{id}; PUT/PATCH /booking/{id} (auth via Cookie: token=...); DELETE /booking/{id} (auth). Missing fields on POST return 500; unauthorised PUT/DELETE return 403; non-existent ID returns 404."
}
```

## Notes Per Module

### Login

The first raw output listed generic cases such as "verify the login page loads" and "check the logo is visible". After adding the exact selectors (`#input-email`, `#input-password`, `.alert-danger`) and the exact error text from live exploration, the output became concrete enough to automate. The final cases include valid login, credential failures, empty input, invalid email format, forgot password navigation, and long password edge coverage.

### Dashboard

The initial prompt only said "e-commerce dashboard," which produced cases about revenue charts and KPIs that do not exist on the OpenCart My Account page. The context was changed to name the exact sidebar links and main account tiles. This made the generated cases focus on permission-based visibility, link navigation, unauthenticated access, logout behavior, and account page routing that are actually testable.

### REST API

The first draft omitted the auth error shape and the 500 behavior for missing fields, so the output leaned too heavily toward happy-path CRUD. The prompt was updated with explicit endpoint contracts and expected status codes. The final cases cover health, auth, create/read/update/delete boundaries, bad credentials, missing fields, unauthorized access, and non-existent resource handling.
