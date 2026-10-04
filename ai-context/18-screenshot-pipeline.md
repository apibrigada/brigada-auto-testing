# 18 — Pipeline de Screenshots y Diapositivas

> **Estado:** Activo · **Creado:** 2026-10-03
> **Repositorio:** `brigada-auto-testing`

---

## 1. Resumen

Pipeline de generación de assets visuales (screenshots, GIFs, videos) y diapositivas para los repos del ecosistema Brigada. Usa Playwright para capturar estados de la UI y generar archivos consumibles por la documentación y presentaciones.

---

## 2. Estructura

```
brigada-auto-testing/
├── scripts/
│   ├── capture-docs-screenshots.ts      # Captura screenshots PNG
│   ├── capture-doc-gifs.ts              # Graba videos WebM
│   ├── webm-to-gif.ts                   # Convierte WebM → GIF optimizado
│   ├── capture-tour-videos.ts           # Graba tours guiados
│   ├── docs-screenshot-config.ts        # Configuración de specs
│   └── generate-slides.ts               # Genera slides.md desde screenshots
├── ai-context/
│   └── 18-screenshot-pipeline.md        # Este documento
└── videos/tours/                        # Output de tours (WebM)
```

---

## 3. Targets soportados

| Target | Base URL | Output | Scripts |
|---|---|---|---|
| CMS | `E2E_CMS_BASE_URL` (default `http://127.0.0.1:3000`) | `webCMS/public/docs/screenshots/` | `docs:screenshots` |
| App | `E2E_APP_BASE_URL` (default `http://127.0.0.1:8081`) | `brigadaApp/ai-context/slides/screenshots/` | `docs:screenshots:app` |
| PWA | `E2E_PWA_BASE_URL` (default `http://127.0.0.1:3001`) | `brigadaPWA/ai-context/slides/screenshots/` | `docs:screenshots:pwa` |

---

## 4. Comandos

### 4.1 Screenshots

```bash
# CMS (default)
npm run docs:screenshots

# App móvil
npm run docs:screenshots:app

# PWA
npm run docs:screenshots:pwa

# Artículo específico
npm run docs:screenshots -- <articleId>
```

### 4.2 GIFs

```bash
# Grabar videos WebM
npm run docs:gifs

# Convertir WebM → GIF (requiere ffmpeg + gifsicle)
npm run docs:gifs:convert
```

### 4.3 Tours

```bash
# Grabar todos los tours
npm run docs:tours

# Tour específico
npm run docs:tours -- --tour overview
```

### 4.4 Diapositivas

```bash
# Generar slides.md para la app
npm run docs:slides

# Generar slides.md para la PWA
npm run docs:slides -- --target=pwa

# Generar slides.md para el CMS
npm run docs:slides -- --target=cms
```

---

## 5. Configuración

### 5.1 Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `E2E_CMS_BASE_URL` | `http://127.0.0.1:3000` | URL del CMS |
| `E2E_APP_BASE_URL` | `http://127.0.0.1:8081` | URL de la app (Expo web) |
| `E2E_PWA_BASE_URL` | `http://127.0.0.1:3001` | URL de la PWA |
| `E2E_LOGIN_EMAIL_ROLE_1` | — | Email para autenticar |
| `E2E_LOGIN_PASSWORD_ROLE_1` | — | Password para autenticar |
| `E2E_APP_LOGIN_EMAIL` | — | Email específico para app/PWA |
| `E2E_APP_LOGIN_PASSWORD` | — | Password específico para app/PWA |

### 5.2 Viewports

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 | 800 |
| Tablet | 768 | 1024 |
| Mobile | 375 | 812 |

---

## 6. Cómo añadir un nuevo screenshot

1. Abrir `scripts/docs-screenshot-config.ts`
2. Añadir un objeto al array `SCREENSHOTS`:

```typescript
{
  id: "mi-screenshot-1",
  articleId: "mi-articulo",
  step: 1,
  url: "/dashboard/mi-pagina",
  viewport: "desktop",
  waitFor: "[data-tour='mi-elemento']",
  caption: "Descripción del screenshot",
},
```

3. Ejecutar `npm run docs:screenshots -- mi-articulo`
4. El archivo se guarda en `webCMS/public/docs/screenshots/mi-articulo/mi-screenshot-1.png`

---

## 7. Cómo añadir un nuevo GIF

1. Abrir `scripts/docs-screenshot-config.ts`
2. Añadir un objeto al array `GIFS`:

```typescript
{
  id: "mi-gif-demo",
  articleId: "mi-articulo",
  url: "/dashboard/mi-pagina",
  viewport: "desktop",
  durationMs: 5000,
  actions: [
    { type: "wait", selector: "main" },
    { type: "click", selector: "button" },
  ],
  caption: "Descripción del GIF",
},
```

3. Ejecutar `npm run docs:gifs`
4. Convertir: `npm run docs:gifs:convert`

---

## 8. Integración con Slidev

El script `generate-slides.ts` lee el `index.json` de screenshots y genera un archivo `slides.md` compatible con Slidev.

```bash
# 1. Capturar screenshots
npm run docs:screenshots:app

# 2. Generar diapositivas
npm run docs:slides

# 3. Presentar (desde el repo correspondiente)
cd ../brigadaApp
npx slidev ai-context/slides/slides.md
```

---

## 9. Troubleshooting

| Problema | Solución |
|---|---|
| `Selector not found` | Aumentar el `timeout` en `waitFor` o verificar el selector |
| `page closed, recovering...` | El script se recupera automáticamente; si falla, re-ejecutar |
| `ffmpeg not found` | Instalar ffmpeg: `brew install ffmpeg` o `apt install ffmpeg` |
| `gifsicle not found` | Instalar gifsicle: `brew install gifsicle` o `apt install gifsicle` |
| Screenshots vacíos | Verificar que el servidor esté corriendo y las credenciales sean correctas |

---

## 10. Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-10-03 | Creación del documento. Pipeline para CMS, app y PWA. Script de diapositivas. |
