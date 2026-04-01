# brigada-auto-testing

Repositorio para automatizar pruebas E2E del proyecto `webCMS` usando Playwright.

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

1. Instala dependencias:

```bash
npm install
```

2. Instala navegadores de Playwright:

```bash
npm run install:browsers
```

3. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

4. Verifica que `.env` apunte a la carpeta de `webCMS` correcta en `E2E_WEB_SERVER_CWD`.

## Ejecutar pruebas

Playwright levantara automaticamente `webCMS` con el comando configurado en `.env`.

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

## CI con GitHub Actions

Se incluye el workflow [playwright.yml](.github/workflows/playwright.yml) para correr E2E en cada push/PR a `main` o `master`.

- Hace checkout de este repo y de `brigadadigitalmorena/webCMS`.
- Instala dependencias en ambos proyectos.
- Levanta `webCMS` y ejecuta Playwright.
- Publica artefactos con reporte y resultados.

Si el repositorio `webCMS` es privado, agrega el secret `WEBCMS_REPO_TOKEN` con un token que tenga permisos de lectura.

## Estructura inicial

- `playwright.config.ts`: configuracion global del runner.
- `tests/e2e/smoke.spec.ts`: smoke tests de redireccion y login de `webCMS`.
- `.env.example`: variables para levantar y probar `webCMS` desde este repo.
