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

## Branching Strategy

### Branch Naming Convention

```
feat/<short-description>       # New features
fix/<short-description>        # Bug fixes
refactor/<short-description>   # Code refactoring
docs/<short-description>       # Documentation only
test/<short-description>       # Test additions/fixes
```

### Branch Lifecycle

Every feature follows this lifecycle:

1. **Create** — Branch from `dev` (always up-to-date):
   ```bash
   git checkout dev && git pull origin dev
   git checkout -b feat/my-feature
   ```

2. **Develop** — Commit often, push regularly:
   ```bash
   git add -A && git commit -m "feat(scope): description"
   git push origin feat/my-feature
   ```

3. **Verify** — Before merge, always run:
   ```bash
   npm run lint && npx playwright test --project=chromium
   ```

4. **Merge** — Integrate to `dev` via merge commit:
   ```bash
   git checkout dev
   git merge feat/my-feature --no-ff -m "Merge feat/my-feature into dev"
   git push origin dev
   ```

5. **Clean up** — Delete merged branch locally, keep remote for traceability:
   ```bash
   git branch -d feat/my-feature
   # Remote stays: teammates can browse history via GitHub PRs
   # Periodically clean stale remote branches (>2 weeks merged)
   ```

### Rules

- **Always branch from `dev`** — never from `main` or other feature branches.
- **One feature per branch** — keep branches focused and small.
- **Rebase before merge** if branch is stale:
  ```bash
  git checkout feat/my-feature
  git rebase dev
  git push -f origin feat/my-feature
  ```
- **Never force-push to `dev`** — only to feature branches.
- **PR descriptions** should reference issue numbers and list changed files.
- **`dev` is always deployable** — never merge broken code.
- **⚠️ Always ask before deleting a branch** — the user may want to review changes locally or add more commits before cleanup. Never auto-delete branches.
- **Remote branches preserved** — after merge, keep remote branch for traceability (PR history visible). Delete only local with `git branch -d`. Periodically clean merged remote branches >2 weeks old.
- **Use `gh auth login`** — enables full PR/CI/Deploy workflow from terminal.
- **PRs recommended, not mandatory** — team must not block without approval; merge directly from GitHub UI if needed to keep history clean.

## GitHub CLI & Autenticación

### Instalación y login
```bash
# Instalar gh (si no está)
brew install gh        # macOS
sudo apt install gh    # Ubuntu/Debian
winget install GitHub.cli  # Windows

# Autenticarse con la organización
gh auth login
# → GitHub.com → HTTPS → Login with browser
# → Permite: create PRs, approve reviews, trigger deployments
```

### Por qué usar `gh`
- **PRs sin salir de terminal**: `gh pr create`, `gh pr view`, `gh pr merge`
- **Reviews y approvals**: `gh pr review --approve`
- **Ver checks CI**: `gh run list`, `gh run view`
- **Deployments**: `gh deployment list` (ver estado Vercel)

### Merge & Deployments (Vercel)

> **Importante**: Los despliegues en Vercel están configurados para que solo la cuenta **propietaria del repositorio** pueda publicar a `dev` (staging) y `main` (prod). Si haces merge directo sin PR, el deployment falla silenciosamente — el último commit válido sigue desplegado.

**Flujo recomendado (no obligatorio):**
```bash
# 1. Trabajo normal en tu rama
git checkout -b feat/mi-feature dev
# ... commits ...

# 2. Push y crear PR
git push origin feat/mi-feature
gh pr create --base dev --title "feat(scope): descripción" --body "Cambios: ..."

# 3. Owner aprueba (desde navegador o gh)
gh pr review --approve  # si tienes permisos
# O: owner entra a GitHub UI → Approve

# 4. Merge (crea merge commit, dispara deploy)
gh pr merge --merge --delete-branch
```

**Si no puedes crear PR (sin sesión gh/owner):**
- Sigue trabajando normal en tu rama
- Haz `git push origin feat/mi-feature` cuando quieras
- El owner creará/mergerá la PR cuando esté disponible
- **No te bloquees** esperando approvals
