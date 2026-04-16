# Brigada Auto Testing — Agent Guidelines

## System Overview

Playwright E2E test suite covering the Web CMS and (experimentally) the mobile frontend. Uses Page Object Model pattern with per-role authenticated sessions.

## Run Tests

```bash
npm run test:e2e                     # CMS tests (Chromium)
npm run test:e2e:frontend            # Frontend app tests
npm run test:e2e:headed              # With visible browser
npm run test:e2e:ui                  # Interactive Playwright UI
npm run test:e2e:debug               # Debugger mode
npm run test:e2e:report              # Open HTML report
npm run install:browsers             # Install Chromium
```

## Tech Stack

- **Playwright ~1.53** / TypeScript / Chromium only
- **Dual configs:** `playwright.config.ts` (CMS @ port 3100) + `playwright.frontend.config.ts` (frontend @ 8081)
- **dotenv** for credentials and base URLs

## Architecture

```text
tests/e2e/
  global.setup.ts      # Auth: logs in per role, saves state to .auth/rol_N.json
  specs/               # Test files (*.spec.ts)
  pages/               # Page Objects (login, dashboard, assignments, settings)
  components/          # Reusable component objects (sidebar)
  fixtures/            # Credentials helpers
```

## Conventions

- **Page Object pattern.** New pages → `tests/e2e/pages/name.page.ts`. Components → `tests/e2e/components/`.
- **Spec naming:** `domain-action.spec.ts` (e.g., `access-control.spec.ts`, `areas-crud.spec.ts`).
- **Auth header:** All requests include `x-e2e-suite: brigada-auto-testing`.
- **Per-role sessions:** `getLoginCredentials()` reads `E2E_LOGIN_EMAIL_ROLE_N` from env.
- **CI:** 2 retries, 1 worker, `forbidOnly: true`. **Local:** 0 retries, parallel workers.
- **Web server auto-start** unless `E2E_DISABLE_WEBSERVER=true`.
