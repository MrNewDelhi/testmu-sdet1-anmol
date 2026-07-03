# Task 2 — Generated Test Cases (Gherkin)

The assignment accepts test cases in **Gherkin, JSON, or the framework's format**. This file is the **Gherkin view** of all 26 generated cases. The same cases also exist as:

- **Executable Playwright specs** — `tests/login/`, `tests/dashboard/`, `tests/api/` (run with `npm run test:generated:run`)
- **Structured design artifacts** — `tests/generated/*.generated.ts` (intent, assertions, self-healing notes; `npm run test:generated:list`)
- **Raw prompts** that produced them — `prompts.md`

**Systems under test**

- Web: LambdaTest eCommerce Playground (OpenCart) — `https://ecommerce-playground.lambdatest.io`
- API: restful-booker — `https://restful-booker.herokuapp.com`

Coverage: **Login (7) · Dashboard (8) · REST API (11) = 26**.

---

## Feature: Login

```gherkin
Feature: Login
  As a registered shopper
  I want to authenticate on the storefront
  So that I can reach my account

  Background:
    Given the login page at route "account/login" is open

  # login-valid-credentials
  Scenario: Successful login with valid credentials
    Given a freshly registered user
    When they submit their correct email and password
    Then they are redirected to route "account/account"
    And the "My Account" heading is visible

  # login-invalid-password
  Scenario: Login fails with an incorrect password
    Given a freshly registered user
    When they submit their email with a wrong password
    Then a ".alert-danger" warning is shown
    And it reads "No match for E-Mail Address and/or Password."

  # login-empty-credentials
  Scenario: Login fails with empty credentials
    When they submit the login form with empty email and password
    Then the credential warning is shown

  # login-invalid-email-format
  Scenario: Invalid email format is rejected before authentication
    When they enter "not-an-email" as the email and submit
    Then they remain on route "account/login"

  # login-forgot-password
  Scenario: Forgot-password link opens password recovery
    When they click the "Forgotten Password" link
    Then they land on route "account/forgotten"
    And the "Forgot Your Password?" heading is visible

  # login-session-expiry
  Scenario: Expired session redirects a protected page to login
    Given the user is logged in and on the account page
    When their session cookies are cleared
    And they navigate to route "account/account"
    Then they are redirected to route "account/login"
    And the login submit button is visible

  # login-brute-force-lockout
  Scenario: Repeated failed attempts trigger account lockout
    Given a unique throwaway email
    When 6 failed login attempts are made in a row
    Then the ".alert-danger" warning reads
      "Your account has exceeded allowed number of login attempts. Please try again in 1 hour."
```

---

## Feature: Dashboard — My Account

```gherkin
Feature: Dashboard - My Account
  As a logged-in shopper
  I want a working account dashboard
  So that I can manage my account and access is properly gated

  Background:
    Given a registered user is logged in and on route "account/account"

  # dashboard-widgets-load
  Scenario: Account widgets load after login
    Then the "My Account" heading is visible
    And the "Edit your account information" tile is visible
    And the "Change your password" tile is visible

  # dashboard-sidebar-links
  Scenario: Sidebar account links are available and enabled
    Then the "Edit Account", "Password" and "Address Book" links are visible
    And the "Logout" link is enabled

  # dashboard-edit-account-navigation
  Scenario: Edit Account link navigates to the edit form
    When the user opens "Edit Account"
    Then they land on route "account/edit"
    And the first-name field is visible

  # dashboard-guest-redirect (permission-based visibility)
  Scenario: A guest is redirected away from the dashboard
    When the session cookies are cleared
    And a guest navigates to route "account/account"
    Then they are redirected to route "account/login"

  # dashboard-logout-clears-session
  Scenario: Logout clears the authenticated session
    When the user logs out
    Then route "account/logout" is shown
    And navigating back to the account page redirects to login

  # dashboard-responsive-layout
  Scenario: Dashboard remains usable on a mobile viewport
    When the viewport is set to 390 x 780
    And the account page is reopened
    Then the heading, the change-password tile and the logout link remain visible
```

---

## Feature: Dashboard — Catalog data & sorting

```gherkin
Feature: Dashboard - Catalog data and sorting
  # The My Account page has no data grid or sort control, so the assignment's
  # "data accuracy" and "filter/sort" scenarios run against the store's real
  # data surface: the product listing.

  Background:
    Given the "Desktops" product listing (route "product/category", path 20) is open

  # dashboard-data-accuracy
  Scenario: Results banner matches the rendered product count
    When the listing has loaded
    Then the number of rendered product cards equals the "Showing X to Y of Z" range (Y - X + 1)
    And the total Z is at least the rendered count

  # dashboard-filter-sort
  Scenario: Sorting by price orders the products ascending
    When the shopper sorts by "Price (Low > High)"
    Then the listing reloads sorted
    And the displayed prices are in non-decreasing order
```

---

## Feature: REST API — Booking (restful-booker)

```gherkin
Feature: REST API - Booking
  As an API consumer
  I want the booking API to behave to contract
  So that CRUD, auth, errors and limits are trustworthy

  # api-health-check
  Scenario: Health check is reachable
    When I GET "/ping"
    Then the response status is 201

  # api-auth-token (auth token validation)
  Scenario: Valid credentials return an auth token
    When I POST "/auth" with a valid username and password
    Then the response status is 200
    And the body contains a "token" string

  # api-auth-bad-credentials
  Scenario: Bad credentials are rejected with a reason
    When I POST "/auth" with a wrong password
    Then the response status is 200
    And the body is { "reason": "Bad credentials" }

  # api-create-booking-schema (Create + schema validation)
  Scenario: Create a booking returns an id and a schema-valid body
    When I POST "/booking" with a valid payload
    Then the response status is 200
    And the body has a numeric "bookingid"
    And "booking" echoes firstname, lastname, totalprice and depositpaid

  # api-read-booking-by-id (Read)
  Scenario: Read a created booking by id
    Given a booking has been created
    When I GET "/booking/{id}"
    Then the response status is 200
    And the body matches the created booking

  # api-update-booking-authorized (Update)
  Scenario: An authorized update mutates the booking
    Given an auth token and a created booking
    When I PUT "/booking/{id}" with the token cookie and updated fields
    Then the response status is 200
    And the updated fields are reflected in the response

  # api-delete-booking-authorized (Delete)
  Scenario: An authorized delete removes the booking
    Given an auth token and a created booking
    When I DELETE "/booking/{id}" with the token cookie
    Then the response status is 201
    And a subsequent GET "/booking/{id}" returns 404

  # api-unauthorized-update (4xx error handling)
  Scenario: An unauthorized update is forbidden
    Given a created booking
    When I PUT "/booking/{id}" without authentication
    Then the response status is 403

  # api-missing-fields (5xx / client-error handling)
  Scenario: Missing required fields are rejected
    When I POST "/booking" with only a firstname
    Then the response status is 400, 422 or 500

  # api-not-found (4xx error handling)
  Scenario: A non-existent booking returns 404
    When I GET "/booking/99999999"
    Then the response status is 404

  # api-rate-limiting-burst (rate limiting)
  Scenario: A burst of requests is not rate-limited on this SUT
    When I send 15 concurrent GET "/booking" requests
    Then every response status is 200
    # A rate-limited API would return 429 for some, and this assertion would fail.
```

---

### Traceability

| Module | Gherkin scenarios | Executable spec | Design artifact |
| --- | --- | --- | --- |
| Login | 7 | `tests/login/generated-login.spec.ts` | `tests/generated/login.generated.ts` |
| Dashboard | 6 + 2 | `tests/dashboard/generated-dashboard.spec.ts` | `tests/generated/dashboard.generated.ts` |
| REST API | 11 | `tests/api/generated-api.spec.ts` | `tests/generated/api.generated.ts` |

Run the executable versions: `npm run test:generated:run` · list the inventory: `npm run test:generated:list`.
