# brigada-auto-testing

Repositorio para automatizar pruebas E2E del proyecto webCMS usando Playwright.

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

1. Instala dependencias:

```bash
npm install
```

1. Instala navegadores de Playwright:

```bash
npm run install:browsers
```

1. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

1. Para probar contra servidores desplegados, usa los valores remotos de `.env.example`.

## Ejecutar pruebas

Por defecto, este repo esta configurado para correr contra:

- Frontend: <https://web-cms-murex.vercel.app/>
- Backend: opcional via `API_BASE_URL` en `.env`.

Con esa configuracion (`E2E_DISABLE_WEBSERVER=true`), Playwright no levanta webCMS localmente.

`API_BASE_URL` es opcional. Si webCMS ya esta conectado internamente a su backend en el entorno objetivo, puedes no definirla.

La prueba de login usa credenciales opcionales en `.env`:

- `E2E_LOGIN_EMAIL`
- `E2E_LOGIN_PASSWORD`
- `E2E_LOGIN_EMAIL_ROLE_1` + `E2E_LOGIN_PASSWORD_ROLE_1`
- `E2E_LOGIN_EMAIL_ROLE_2` + `E2E_LOGIN_PASSWORD_ROLE_2`
- `E2E_LOGIN_EMAIL_ROLE_3` + `E2E_LOGIN_PASSWORD_ROLE_3`
- `E2E_NEW_IMG_URL_1` (opcional, cambia foto de perfil para rol 1)

Puedes definir tantos roles como necesites usando el patron `E2E_LOGIN_EMAIL_ROLE_N` / `E2E_LOGIN_PASSWORD_ROLE_N`.

Si no defines ningun par de credenciales valido, los tests de login se omiten automaticamente.

- Modo normal:

```bash
npm run test:e2e
```

- UI mode:

```bash
npm run test:e2e:ui
```

- Headed:

```bash
npm run test:e2e:headed
```

- Debug:

```bash
npm run test:e2e:debug
```

### Opcion local (si quieres levantar webCMS desde Playwright)

Si prefieres correr contra una instancia local, ajusta en `.env`:

- `E2E_BASE_URL=http://127.0.0.1:3100`
- `E2E_DISABLE_WEBSERVER=false`
- `E2E_WEB_SERVER_CWD=../webCMS`
- `E2E_WEB_SERVER_COMMAND=npm run dev -- --port 3100`

## CI con GitHub Actions

Se incluye el workflow [playwright.yml](.github/workflows/playwright.yml) para correr E2E en cada push/PR a `main` o `master`.

- Ejecuta pruebas contra servidores desplegados usando `E2E_BASE_URL` desde GitHub Variables (o fallback a murex).
- Toma credenciales de login desde GitHub Secrets:
- `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD` (opcional, formato legacy)
- `E2E_LOGIN_EMAIL_ROLE_1`, `E2E_LOGIN_PASSWORD_ROLE_1`
- `E2E_LOGIN_EMAIL_ROLE_2`, `E2E_LOGIN_PASSWORD_ROLE_2`
- `E2E_LOGIN_EMAIL_ROLE_3`, `E2E_LOGIN_PASSWORD_ROLE_3`
- Toma `E2E_NEW_IMG_URL_1` desde GitHub Variables para la prueba de cambio de foto del rol 1.
- Publica artefactos con reporte y resultados.

Ademas, el workflow despliega el reporte HTML de Playwright en GitHub Pages (eventos push/manual; no en pull_request).

Para habilitarlo en el repositorio:

1. Ve a Settings > Pages.
1. En Build and deployment, selecciona Source: GitHub Actions.
1. Ejecuta el workflow y abre la URL publicada del entorno `github-pages`.

## Estructura inicial

- `playwright.config.ts`: configuracion global del runner.
- `tests/e2e/smoke.spec.ts`: smoke tests de redireccion, login, dashboard, area de configuracion y cambio de foto de rol 1.
- `.env.example`: variables para ejecutar en remoto o local.

## Estructura POM recomendada (base incluida)

- `tests/e2e/pages/`: page objects por pantalla (`login`, `dashboard`, `settings`, `assignments`).
- `tests/e2e/components/`: componentes reutilizables (`sidebar`).
- `tests/e2e/fixtures/`: helpers de credenciales y fixtures compartidas.
- `tests/e2e/specs/`: suites por flujo critico.

Specs iniciales agregados:

- `tests/e2e/specs/auth.spec.ts`
- `tests/e2e/specs/dashboard-settings.spec.ts`
- `tests/e2e/specs/assignments-areas.spec.ts`
- `tests/e2e/specs/access-control.spec.ts`
- `tests/e2e/specs/areas-crud.spec.ts`
- `tests/e2e/specs/users-invite.spec.ts`
- `tests/e2e/specs/whitelist.spec.ts`
- `tests/e2e/specs/activation-codes-lifecycle.spec.ts`
- `tests/e2e/specs/roles.spec.ts`

Notas de cobertura:

- `admin` y `encargado` cubren dashboard, settings y asignaciones.
- `brigadista` se valida como rol restringido para dashboard y rutas del CMS.
- Los flujos de `areas`, `roles`, `whitelist` y `activation-codes` se ejecutan con el rol `admin`.

Puedes ejecutarlos todos con:

```bash
npm run test:e2e
```

O solo los nuevos specs:

```bash
npx playwright test tests/e2e/specs
```
