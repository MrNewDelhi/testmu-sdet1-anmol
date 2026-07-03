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
  "context": "Two surfaces on the LambdaTest eCommerce Playground. (1) Post-login \"My Account\" dashboard (route=account/account): sidebar #column-right with links Edit Account, Password, Address Book, Order History, Downloads, Logout; main tiles Edit your account information, Change your password; unauthenticated access redirects to route=account/login. (2) Product listing (route=product/category&path=20, Desktops) as the data/filter surface: cards .product-layout, price .price-new, a Sort-By select in .content-sort-by (options include 'Price (Low > High)', 'Name (A - Z)') that navigates via location=this.value, and a results banner 'Showing X to Y of Z'. Cover widget loading, permission-based visibility, responsive layout on the account page, and data accuracy + filter/sort on the listing."
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

The first raw output listed generic cases such as "verify the login page loads" and "check the logo is visible". After adding the exact selectors (`#input-email`, `#input-password`, `.alert-danger`) and the exact error text from live exploration, the output became concrete enough to automate. A weak point in the first pass was the brute-force case: it asserted a loose `warning|locked|attempt` regex that also matched the ordinary invalid-credentials warning, so it never actually proved lockout. Live MCP exploration confirmed OpenCart locks on the 6th failed attempt with "exceeded allowed number of login attempts", so the final case loops six attempts on a unique throwaway email and asserts that specific text. Final Login cases: valid login, invalid password, empty input, invalid email format, forgot-password navigation, session expiry, and brute-force lockout.

### Dashboard

The initial prompt only said "e-commerce dashboard," which produced cases about revenue charts and KPIs that do not exist on the OpenCart My Account page. Two of the assignment's required scenarios — data accuracy and filter/sort — genuinely have no home on the account page, so rather than fake them the prompt was pointed at a second surface: the product-listing page, which is the app's real data/filter grid. Account-page cases now cover widget loading, permission-based visibility, responsive layout, and logout; listing cases cover data accuracy (the "Showing X to Y of Z" banner must equal the rendered product count) and filter/sort (sorting by price must yield ascending prices). The earlier `navigation-order` filler (which asserted a link list equals itself and could never fail) was removed.

### REST API

The first draft omitted the auth error shape and the 500 behavior for missing fields, so the output leaned too heavily toward happy-path create. It also called "CRUD" complete while only exercising create, and its rate-limit case asserted `[200, 429]` — which always passes on restful-booker (no limiter) and so tested nothing. The prompt was updated with explicit endpoint contracts, token-cookie auth, and expected status codes. Final cases cover health, auth (valid + bad credentials), full CRUD (create, read-by-id, authorized update, authorized delete → 404), schema validation, missing fields, unauthorized update (403), non-existent resource (404), and a burst probe that asserts all-200 (documenting that a throttled API would surface 429s here).
