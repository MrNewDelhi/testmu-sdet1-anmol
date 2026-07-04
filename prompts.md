# Prompts

This file has two parts: (1) the **Task 2** test-generation prompts and per-module notes, and (2) a **Raw Prompts** log of every prompt across the whole assignment — Task 1 (setup), Task 2 (generation), and Task 3 (self-healing v1–v6 + failure-intelligence v7–v11), ending with the docs/visualizer/Pages work.

AI tools: the Task-2 generation prompts below were run with **ChatGpt 5.5 Light (Codex)**; the build then switched to **Claude Code** for the automation and Task 3 work (see the `switch to claude` marker in the Raw Prompts log).

Requirement: include every prompt exactly as written, plus a short note per module on what did not work first time and what was changed.

## Test-case generation

The 26 cases were generated **interactively in the coding agent** — first with ChatGpt 5.5 Light (Codex), then automated and refined in Claude Code — not through a separate system/user API call. The exact messages typed are in the **Raw Prompts** log below.

What made the prompting work was **grounding, not ceremony**. Before asking for cases, each module was explored live with **Playwright MCP**, and the agent was held to a simple brief — *act as an SDET, produce 6–8 high-value cases per module including negative and edge cases, and be specific to the real selectors, endpoints, routes, and error text.* Feeding the concrete context below (instead of "generate login tests") is what moved the output from generic to automatable.

Per-module context gathered via MCP and fed into generation:

### Login — module context

```json
{
  "module": "login",
  "context": "Login page of the LambdaTest eCommerce Playground (OpenCart). Fields: #input-email, #input-password. Submit button: input[type=\"submit\"][value=\"Login\"] inside form[action*=\"account/login\"]. Error shows in .alert-danger with text \"Warning: No match for E-Mail Address and/or Password.\" Success redirects to route=account/account. Also covers forgot-password link a[href*=\"account/forgotten\"]."
}
```

### Dashboard — module context

```json
{
  "module": "dashboard",
  "context": "Two surfaces on the LambdaTest eCommerce Playground. (1) Post-login \"My Account\" dashboard (route=account/account): sidebar #column-right with links Edit Account, Password, Address Book, Order History, Downloads, Logout; main tiles Edit your account information, Change your password; unauthenticated access redirects to route=account/login. (2) Product listing (route=product/category&path=20, Desktops) as the data/filter surface: cards .product-layout, price .price-new, a Sort-By select in .content-sort-by (options include 'Price (Low > High)', 'Name (A - Z)') that navigates via location=this.value, and a results banner 'Showing X to Y of Z'. Cover widget loading, permission-based visibility, responsive layout on the account page, and data accuracy + filter/sort on the listing."
}
```

### REST API — module context

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

## Raw Prompts

Every prompt used across the build, in order, exactly as written (no clean-up). A first-level `-` is a distinct prompt; nested items are part of the same prompt.

- In the current directory, there is a pdf file available where instructions are given with task for the interview, to scale up what to achieve. list out me all the tasks and provide me the list of tasks and put it in TODO.md
Strict instructions: Do not proceed with anything, no write operations need to be performed except TODO.md in the directory
- For task 1, do the following in sequence:
    1. Research about Playwright latest features
    2. Research about POM model
    3. Research about UI and API testing
    4. Accordingly find the target website for the assignment that we can do the testing on.
    5. Create the folder structure first before writing any test, strictly following the POM model architecture in Typescript and Playwright, keep the page objects in pages, the fixtures and shared setup in fixtures, split the specs by module in tests like login, dashboard, api and keep a generated and a demo folder too, put the framework, ai, config, reporters and utils under src, and docs and public for the documentation and the demo visualizer, and commit with the information asked in the assignment: Name yourself, and with every commit make sure you now will add the details of the usage and for the documentations, the interaction should be logged. Strictly restrict yourself to do anything on the Prompts.md file, it will be done by me.
    6. Create a github repo using the gh cli, and make sure we use the exact instructions for the naming scheme as mentioned in the website.
    - Prohibited: NO CODE/NO TEST should be written other than just a basic structure in the current working directory
- For the targeted website, use the Playwright MCP and explore the website to gather context with exploratory skills and gather the details around the modules as stated in the Assignment for the Task 2
- For task 2, write the test cases as mentioned in the provided format and keep updating gradually as we move forward with the enhancements in Test Case.md with Gherkin Format
- now for task 3, we will setup first a working demo with versions visualized in the Visualizer created as an html file, to heal locators in the runtime with the help of the xAI, please use the GITHUB format variables/secrets and use the environment variable: XAI_API_KEY and use GROK model: grok-4.3 and publish as we move forward with the appropriate comments as needed plus make sure, we have the docs always updated and visualizer too as we move forward and to demo this, we should have the automation done so we can demo that how when the locator fails (we gonna make it fail deliberately then with the DOM in context can provide the locator)
- for next version, to not clutter, we should put this as a centralized service, so it can be used by other tests like a framework as needed, and update the visualizer and docs.

- —— switch to claude —— (chatgpt is not giving good UI)

- check for the code, and tell me how many are automated?

- This is not right, we shoud have all the cases automated to showcase the tests, and make sure, all the tests are run and verified once, if there is any issues (do not write in the self healing tests demo) then use the playwright mcp, to figure out what's the problem, and fix that.

- Visualizer is way off, can you fix that too? It doesn't have a good UI, plus it feels very static, make it more interactive and demoable, so the client based user can understand this and serve and show it to me.

- v3: we will add the sqlite for the POC purpose to showcase the cache system, to make sure that, the use of cache can help in cost reduction of LLM API, with this make sure, we have a few things surely, the page-key (that helps to know that it's the different page even for the same button, just in case devs are keeping different names across different pages because of versioning or anything), locator, confidence by LLM (below 0.5 should not be considered at all in the cache system), hash of the DOM, just in case if we get the same page, then cache hits, not the LLM API, and few important stuffs which you can think of that can help enhance the system in the most brittle way possible

- V4: what if there is an issue with the targetting of the right thing, like on the login page, there is login button that serves as the submit button but then in the header/footer there is also a login button that navigates and can put the tests in loop even after healing. (It's an issue with the context, or surrounding elements that are not passed for the AI, that should be fixed)

- V5: Everytime I can't do the LLM call, it's expensive, we must think of something like a selector hub can do, like a deterministic system for generating locators for the simple queries or unique buttons/names on the page, it just helps to reduce cost even if that's 20% it does something.

- V6: What's the point of the cache system? if let's say the only change is one attribute and other attributes are totally same (like classes change very frequently, and maybe self healing, xAI gave only the class based locator then we must get the top 3 locators that can help in the swapping of the locators from the cache. system, this helps in reducing significant cost too

- v7: So, now we should act like a pipeline, if we are doing failure healig, then there should be failure analysis too, and that should happen at the playwright lifecycle when the test fails at every failure. So we can get the issue of why it was a failure, and why it was healed?

- V8: there should be some kind of logging mechanism that can provide the request and response of xAI calls, because this can be useful in debugging as we wanna tweak the harness/prompts during this build.
- I feel this is an issue of the context rather than the system itself, because if the model had the context then it would have been great, like a visual, maybe we should also send a screenshot for better context and see how it responds back with the screenshot analysis providing, proper analysis. (Keep it as a sepearate vision model, just in case if we think of changing so it's easily managed)

- V9: we can actually make use of the batch processing feature that xAI api provides with it, and also we should think of maybe the whole system may send duplicate errors so that can just help with it, doing less number of calls plus also after all we need at the end of the testing results/analysis not necessary to get always after every test. Batch processing does the proper cost reduction too.

- V10: we should think of all the api failures too, maybe we should send it to the LLM to get the analysis proper and see if it is the problem with the product or not.

- V11: Problem with this is, I am sending PII data to the llm, which I don't want, maybe we can have a local slm for a judge act as llm as a judge and also few deterministic regex like for email and pass fields, or tokens that can directly be removed rather than doing any heavy processing. so it helps.

- Finally check all the docs and visualizer is it all up to date, if not do that. and the visualizer is cluttered up, do the ground up change of it, and i expect you to create architecture diagram explaining this in readme.md and also, make sure you have the proper deployment inside the github pages if you can like static pages, of the demo and embedded in the repo so it's visible, plus add the link in the readme.md

- can you highlight features of this framework and also, mention what all specific concepts I have used, like llm-as-ajudge, mitm/hooks, PII redaction for security, and the cost reduction.

- Give a quick check and find if there is any issue/pending item for us, to do, do an integration check of the docs and everything they should be up to date.

- for the api failures we don't need to burn the llm on the obvious ones, the status already tells us most of it, 5xx is a server/product issue, 429 or 401/403 is environment/auth, 400/422 is a bad request so likely a test bug or contract drift, only the ambiguous ones should go to the llm. and think of the bigger picture, context is everything here, the model was never the bottleneck, the missing context is. if we feed the swagger/openapi the api analysis gets way more accurate because now it knows the actual contract, and the real bug vs feature call is always a team decision that lives in the prs, meeting notes, gdrive, slack/teams, not in the dom or a screenshot. teams have process gaps and those are legacy gaps, AI here isn't to fix them from a QA seat, it's to put the pen down and adapt to the processes that already exist. also we should think of a bug reproduction pipeline where a multimodal AI reproduces the bug and files a proper ticket in some tracking system, so a red run becomes an actionable reproduced ticket with no manual triage. and separately before doing anything let's discuss the flaky classifier, detection is deterministic anyway with retry and history, the llm should only do the root cause bucketing of the ambiguous middle. add A (the deterministic api buckets) and C (the roadmap with these points) in the docs.

### Prompt → delivered version

How each raw prompt above maps to what shipped — the same story the README, the visualizer, and `ai-usage-log.md` tell.

| Raw prompt | Delivered as |
| --- | --- |
| "setup first a working demo … heal locators … make it fail deliberately" | **v1** — naive xAI locator repair (deliberate broken locator → DOM → Grok → validate) |
| "put this as a centralized service … framework" | **v2** — `SelfHealingService` + shared `healing` fixture |
| switch to claude · "how many automated?" · "all cases automated … verify … use MCP to fix" | Task 2 fully automated (26 cases, POM) and the suite verified/fixed via Playwright MCP |
| "Visualizer is way off … interactive and demoable" | first interactive rebuild of the visualizer |
| "v3: sqlite cache … page-key, locator, confidence < 0.5, DOM hash" | **v3** — confidence gate + SQLite cache (page-key, confidence ≥ 0.5, dom-hash) |
| "V4: login submit vs header/footer login … context / surrounding elements" | **v4** — target contract + semantic post-heal validation (refuse the wrong element) |
| "V5: selector-hub-like deterministic locators … reduce cost even 20%" | **v5** — deterministic-first locator resolution |
| "V6: swap top-3 locators from cache when one attribute changes" | **v6** — multi-locator cache (top-3 attribute-diverse), fallback on single-attribute drift |
| "v7: pipeline — failure analysis at the Playwright lifecycle on every failure" | **v7** — Failure Explainer (auto-fixture, final-attempt-only), categorized, attached to the report |
| "V8: logging of xAI request/response for debugging" | xAI call log → `xai-calls.jsonl` (latency, status, tokens, cost) |
| "send a screenshot for better context … separate vision model" | **v8** — multimodal failure analysis (`XAI_VISION_MODEL`) |
| "V9: batch processing … dedup duplicate errors … analysis at end of run" | **v9** — post-run batched reporter: dedup by signature + end-of-run analysis (later enriched with run-history + git-diff) |
| "V10: send API failures to the LLM" | **v10** — raw API request/response for API failures (`RecordingApi`) |
| "V11: PII … local slm as llm-as-a-judge + deterministic regex (email/pass/token)" | **v11** — PII redaction (deterministic patterns + field-aware secrets + optional local judge) |
| "check docs/visualizer … ground-up visualizer … architecture diagram … GitHub Pages … link in readme" | README architecture (Mermaid) diagrams; visualizer rebuilt as a production site; GitHub Pages deploy + README link |
| "highlight features … llm-as-a-judge, mitm/hooks, PII redaction, cost reduction" | concept highlights in README + visualizer |
| "quick check … integration check of the docs" | integration/consistency pass across the docs |
| "api failures … status buckets … context is everything … swagger … bug vs feature is a team decision … bug-repro + ticket … flaky classifier" | **A** — deterministic API status buckets (`classifyApiFailure`, skip the LLM on obvious ones); **C** — README roadmap: Swagger/OpenAPI accuracy, org decision context for stale-vs-bug, adapt-to-processes philosophy, multimodal bug-repro + ticketing, flaky classifier (Option B) |

Two honest notes so the story stays accurate:

- The **v8** prompt bundled two asks — the xAI request/response **log** (shipped as `xai-calls.jsonl`) and the **screenshot/vision** step (shipped as v8). So "logging" lives inside the v8 prompt rather than as its own numbered version.
- **v9's "batch processing"** was realized as a **custom post-run batched reporter** (dedup + one analysis at the end of the run), not xAI's native batch endpoint. The run-history + git-diff **enrichment** was an added refinement that came out of the follow-up discussion about the classification "context gap" (product-bug vs test-bug), not the original v9 prompt.
