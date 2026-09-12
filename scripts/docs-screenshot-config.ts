export interface ScreenshotAction {
  type: "click" | "fill" | "select" | "wait" | "hover";
  selector: string;
  value?: string;
}

export interface ScreenshotSpec {
  id: string;
  articleId: string;
  step: number;
  url: string;
  viewport: "desktop" | "tablet" | "mobile";
  waitFor?: string;
  actions?: ScreenshotAction[];
  selector?: string;
  fullPage?: boolean;
  caption?: string;
}

export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const;

export const SCREENSHOTS: ScreenshotSpec[] = [
  // ═══════════════════════════════════════
  // PRIMEROS PASOS
  // ═══════════════════════════════════════
  {
    id: "welcome-1",
    articleId: "welcome",
    step: 1,
    url: "/dashboard",
    viewport: "desktop",
    caption: "Vista principal del Dashboard con métricas resumen",
  },
  {
    id: "welcome-2",
    articleId: "welcome",
    step: 2,
    url: "/dashboard",
    viewport: "mobile",
    caption: "Dashboard en vista móvil con bottom sheet",
  },
  {
    id: "roles-1",
    articleId: "roles-permisos",
    step: 1,
    url: "/dashboard/settings?tab=roles",
    viewport: "desktop",
    waitFor: "[data-tour='roles-list']",
    caption: "Lista de roles disponibles en Configuración",
  },
  {
    id: "atajos-1",
    articleId: "atajos-teclado",
    step: 1,
    url: "/dashboard",
    viewport: "desktop",
    actions: [
      { type: "click", selector: "[title='Atajos de teclado']" },
    ],
    caption: "Panel de atajos de teclado (Ctrl+K o ícono ⌨)",
  },

  // ═══════════════════════════════════════
  // USUARIOS Y EQUIPOS
  // ═══════════════════════════════════════
  {
    id: "crear-usuario-1",
    articleId: "crear-usuario",
    step: 1,
    url: "/dashboard/whitelist",
    viewport: "desktop",
    waitFor: "table",
    caption: "Página de invitaciones con lista de usuarios",
  },
  {
    id: "crear-usuario-2",
    articleId: "crear-usuario",
    step: 2,
    url: "/dashboard/whitelist",
    viewport: "desktop",
    caption: "Página de invitaciones con acciones disponibles",
  },
  {
    id: "crear-usuario-3",
    articleId: "crear-usuario",
    step: 3,
    url: "/dashboard/whitelist",
    viewport: "desktop",
    caption: "Lista de usuarios con estados (pendiente, activo, suspendido)",
  },
  {
    id: "gestion-equipos-1",
    articleId: "gestion-equipos",
    step: 1,
    url: "/dashboard/teams",
    viewport: "desktop",
    waitFor: "[data-tour='teams-list']",
    caption: "Lista de equipos con jerarquía visual",
  },
  {
    id: "gestion-equipos-2",
    articleId: "gestion-equipos",
    step: 2,
    url: "/dashboard/teams/new",
    viewport: "desktop",
    caption: "Formulario para crear nuevo equipo",
  },
  {
    id: "reasignacion-lider-1",
    articleId: "reasignacion-lider",
    step: 1,
    url: "/dashboard/teams",
    viewport: "desktop",
    waitFor: "[data-tour='teams-list']",
    caption: "Seleccionar equipo para reasignar líder",
  },
  {
    id: "reasignacion-lider-2",
    articleId: "reasignacion-lider",
    step: 2,
    url: "/dashboard/teams/1",
    viewport: "desktop",
    waitFor: "[data-tour='team-members']",
    caption: "Wizard de reasignación - paso 1: elegir nuevo líder",
  },
  {
    id: "reasignacion-lider-3",
    articleId: "reasignacion-lider",
    step: 3,
    url: "/dashboard/teams/1",
    viewport: "desktop",
    caption: "Detalle del equipo con miembros y opciones de gestión",
  },

  // ═══════════════════════════════════════
  // ENCUESTAS
  // ═══════════════════════════════════════
  {
    id: "ciclo-vida-1",
    articleId: "ciclo-vida-encuesta",
    step: 1,
    url: "/dashboard/surveys",
    viewport: "desktop",
    waitFor: "table",
    caption: "Lista de encuestas con estados: borrador, activa, pausada, cerrada",
  },
  {
    id: "survey-builder-1",
    articleId: "survey-builder-basico",
    step: 1,
    url: "/dashboard/surveys/builder",
    viewport: "desktop",
    waitFor: "[data-tour='builder-canvas']",
    caption: "Survey Builder vacío listo para crear preguntas",
  },
  {
    id: "survey-builder-2",
    articleId: "survey-builder-basico",
    step: 2,
    url: "/dashboard/surveys/builder",
    viewport: "desktop",
    caption: "Survey Builder con panel de tipos de pregunta visible",
  },
  {
    id: "survey-builder-3",
    articleId: "survey-builder-basico",
    step: 3,
    url: "/dashboard/surveys/builder",
    viewport: "desktop",
    caption: "Encuesta con 3 preguntas configuradas",
  },
  {
    id: "logica-avanzada-1",
    articleId: "logica-avanzada",
    step: 1,
    url: "/dashboard/surveys/builder",
    viewport: "desktop",
    waitFor: "[data-tour='builder-logic']",
    caption: "Sección de lógica de visibilidad en el builder",
  },
  {
    id: "logica-avanzada-2",
    articleId: "logica-avanzada",
    step: 2,
    url: "/dashboard/surveys/builder",
    viewport: "desktop",
    caption: "Editor de expresiones JSONLogic avanzado",
  },
  {
    id: "versiones-1",
    articleId: "versiones-plantillas",
    step: 1,
    url: "/dashboard/surveys",
    viewport: "desktop",
    caption: "Lista de encuestas con estados y acciones de versión",
  },

  // ═══════════════════════════════════════
  // CAMPAÑAS
  // ═══════════════════════════════════════
  {
    id: "campana-sidebar-1",
    articleId: "campana-sidebar-peek",
    step: 1,
    url: "/dashboard/campaigns",
    viewport: "desktop",
    waitFor: "[data-tour='campaigns-list']",
    caption: "Sidebar con árbol de campañas y búsqueda",
  },
  {
    id: "campana-sidebar-2",
    articleId: "campana-sidebar-peek",
    step: 2,
    url: "/dashboard/campaigns",
    viewport: "desktop",
    caption: "Panel de inspección con estadísticas de campaña",
  },
  {
    id: "campana-sidebar-3",
    articleId: "campana-sidebar-peek",
    step: 3,
    url: "/dashboard/campaigns",
    viewport: "mobile",
    caption: "Panel peek como bottom sheet en móvil",
  },
  {
    id: "audiencias-1",
    articleId: "audiencias-propagacion",
    step: 1,
    url: "/dashboard/campaigns/1",
    viewport: "desktop",
    waitFor: "[data-tour='campaign-audiences']",
    caption: "Configuración de audiencias con tipos de propagación",
  },
  {
    id: "areas-cobertura-1",
    articleId: "areas-cobertura",
    step: 1,
    url: "/dashboard/campaigns/1",
    viewport: "desktop",
    waitFor: "[data-tour='campaign-areas']",
    caption: "Mapa de áreas geográficas asignadas a la campaña",
  },

  // ═══════════════════════════════════════
  // ZONAS Y ÁREAS
  // ═══════════════════════════════════════
  {
    id: "zonas-vs-areas-1",
    articleId: "zonas-vs-areas",
    step: 1,
    url: "/dashboard/areas-v2",
    viewport: "desktop",
    waitFor: "[data-tour='areas-map']",
    caption: "Vista de mapa con áreas dibujadas y panel de zonas",
  },
  {
    id: "dibujo-1",
    articleId: "dibujo-edicion",
    step: 1,
    url: "/dashboard/areas-v2",
    viewport: "desktop",
    caption: "Mapa de áreas con herramientas de dibujo disponibles",
  },
  {
    id: "dibujo-2",
    articleId: "dibujo-edicion",
    step: 2,
    url: "/dashboard/areas-v2",
    viewport: "desktop",
    caption: "Polígono cerrado con nombre y descripción",
  },
  {
    id: "importar-1",
    articleId: "importacion-geojson",
    step: 1,
    url: "/dashboard/areas-v2",
    viewport: "desktop",
    caption: "Panel de áreas con opción de importación GeoJSON",
  },

  // ═══════════════════════════════════════
  // AYUDA Y DOCUMENTACIÓN
  // ═══════════════════════════════════════
  {
    id: "help-faq-1",
    articleId: "help-faq",
    step: 1,
    url: "/dashboard/help",
    viewport: "desktop",
    caption: "Pestaña de Preguntas Frecuentes con búsqueda y categorías",
  },
  {
    id: "help-docs-1",
    articleId: "help-docs",
    step: 1,
    url: "/dashboard/help?tab=docs",
    viewport: "desktop",
    caption: "Manual de uso con sidebar de navegación y artículo",
  },
  {
    id: "help-tours-1",
    articleId: "help-tours",
    step: 1,
    url: "/dashboard/help?tab=tours",
    viewport: "desktop",
    caption: "Tours guiados disponibles con botón iniciar",
  },
  {
    id: "help-report-1",
    articleId: "help-report",
    step: 1,
    url: "/dashboard/help?tab=report",
    viewport: "desktop",
    caption: "Formulario de reporte de problema",
  },
  {
    id: "command-palette-1",
    articleId: "command-palette",
    step: 1,
    url: "/dashboard",
    viewport: "desktop",
    actions: [
      { type: "click", selector: "body" },
      { type: "wait", selector: "body" },
    ],
    caption: "Paleta de comandos (Ctrl+K) con búsqueda de docs y tours",
  },
];

export function getScreenshotsByArticle(articleId: string): ScreenshotSpec[] {
  return SCREENSHOTS.filter((s) => s.articleId === articleId);
}
