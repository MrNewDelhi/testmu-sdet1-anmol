# AI Usage Log

## 2026-07-03

| AI Tool | Used For | Output Produced |
| --- | --- | --- |
| ChatGpt 5.5 Light using Codex | Repository setup and assignment scaffold planning | Created the initial folder structure, copied the assignment PDF, prepared `README.md`, prepared `TODO.md`, added starter project configuration, and prepared the first commit. |
| ChatGpt 5.5 Light using Codex | Task 2 prompt engineering and generated test-case preparation | Created raw module prompts, generated Login/Dashboard/API test-case specs, added module prompt-iteration notes, and updated README/TODO for Task 2. |
| ChatGpt 5.5 Light using Codex | Task 3 v1 naive self-healing implementation | Added xAI selector-repair client, DOM snapshot capture, naive self-healing locator, demo page/test, GitHub Actions workflow, environment examples, documentation, and visualizer. |
| ChatGpt 5.5 Light using Codex | Task 3 v2 centralized self-healing framework | Added a framework-level self-healing service, Playwright fixture, centralized demo test, docs, workflow update, and visualizer updates. |
| ChatGpt 5.5 Light using Codex | Self-healing visualizer workflow improvement | Converted the visualizer from static explanation into animated Play/Step/Reset workflow playback for v1 and v2. |
| ChatGpt 5.5 Light using Codex | Generated-case cleanup and self-healing scenario analysis | Converted Task 2 generated cases from skipped Playwright tests into generated artifacts, added a summary command, excluded generated artifacts from default test collection, and documented self-healing usefulness/refusal scenarios. |
| ChatGpt 5.5 Light using Codex | Generated case automation with POM | Added page objects, fixtures, user factory, and split executable specs for 21 Login/Dashboard/API generated cases, then ran the full generated suite green. |
| Claude Code (Opus 4.8) | Task 2 coverage review and fixes | Diagnosed that the Dashboard module was missing the assignment's data-accuracy and filter/sort scenarios and that several assertions passed without testing (brute-force regex, rate-limit `[200,429]`, navigation-order filler). Used Playwright MCP to explore the live app for real selectors and the lockout message, then added `CatalogPage`/`EditAccountPage` POM classes, catalog data-accuracy + filter/sort tests, hardened the brute-force lockout and API CRUD/404 cases, removed POM leaks, and brought the suite to 26 executable cases (all green). |
| Claude Code (Opus 4.8) | Self-healing visualizer rewrite | Rewrote `public/self-healing-visualizer.html` as a theme-aware, data-driven page whose steps mirror the real `XaiClient`/`SelfHealingService` code, with a request/response packet animation and an honest roadmap tab; verified rendering via Playwright. |
