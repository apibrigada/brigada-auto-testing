import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  getCmsAccessCredentials,
  getCredentialByRoleNumber,
} from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";
import { DashboardPage } from "../pages/dashboard.page.js";

type RouteCheck = {
  name: string;
  path: string;
  url: RegExp;
  markers: Array<(page: Page) => Locator>;
};

type CreatedSurvey = {
  id: number;
  title: string;
};

type AssignmentTeamResult = {
  group_id?: number;
  created_count: number;
  errors?: string[];
};

type BackendUser = {
  id: number;
  role_key?: string;
  is_active?: boolean;
  activo?: boolean;
};

const cmsCredentials = getCmsAccessCredentials();
const adminCredential = getCredentialByRoleNumber(1);
const routeMarkerTimeoutMs = Number(
  process.env.E2E_ROUTE_MARKER_TIMEOUT_MS ?? 10000,
);
const backendMutationTimeoutMs = Number(
  process.env.E2E_BACKEND_MUTATION_TIMEOUT_MS ?? 45000,
);
const backendUiFeedbackTimeoutMs = Number(
  process.env.E2E_BACKEND_UI_FEEDBACK_TIMEOUT_MS ?? 45000,
);

const commonDashboardRoutes: RouteCheck[] = [
  {
    name: "Dashboard principal",
    path: "/dashboard",
    url: /\/dashboard$/,
    markers: [
      (page) => page.getByText("Total de Usuarios"),
      (page) => page.getByText("Estado del Sistema"),
    ],
  },
  {
    name: "Configuracion",
    path: "/dashboard/settings",
    url: /\/dashboard\/settings$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Configuraci[oó]n/i }),
      (page) => page.getByRole("button", { name: /Perfil/i }),
    ],
  },
  {
    name: "Asignaciones",
    path: "/dashboard/assignment-groups",
    url: /\/dashboard\/(assignment-groups|assignments)(?:\/.*)?$/,
    markers: [
      (page) =>
        page.getByRole("heading", { name: /Grupos de asignaci[oó]n/i }),
      (page) =>
        page.getByRole("link", { name: /Crear primer grupo|Nuevo grupo/i }),
    ],
  },
  {
    name: "Encuestas",
    path: "/dashboard/surveys",
    url: /\/dashboard\/surveys$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Encuestas/i }),
      (page) => page.getByRole("button", { name: /Nueva Encuesta/i }),
    ],
  },
];

const adminDashboardRoutes: RouteCheck[] = [
  {
    name: "Zonas",
    path: "/dashboard/areas",
    url: /\/dashboard\/areas$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Zonas y [AÁ]reas/i }),
      (page) => page.getByRole("button", { name: /Nueva [AÁ]rea/i }),
    ],
  },
  {
    name: "Usuarios",
    path: "/dashboard/users",
    url: /\/dashboard\/users$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Usuarios/i }),
      (page) => page.getByRole("button", { name: /Agregar usuario/i }),
    ],
  },
  {
    name: "Roles",
    path: "/dashboard/roles",
    url: /\/dashboard\/roles$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Roles y Permisos/i }),
      (page) => page.getByRole("button", { name: /Crear rol/i }),
    ],
  },
  {
    name: "Whitelist",
    path: "/dashboard/whitelist",
    url: /\/dashboard\/whitelist$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Whitelist de usuarios/i }),
      (page) => page.getByRole("button", { name: /Agregar usuario/i }),
    ],
  },
  {
    name: "Codigos de activacion",
    path: "/dashboard/activation-codes",
    url: /\/dashboard\/activation-codes$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Codigos de activaci[oó]n/i }),
      (page) =>
        page.getByPlaceholder(/Buscar por nombre, email o identificador/i),
    ],
  },
  {
    name: "Grupos de asignacion",
    path: "/dashboard/assignment-groups",
    url: /\/dashboard\/assignment-groups(?:\/.*)?$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Grupos de asignaci[oó]n/i }),
      (page) => page.getByRole("link", { name: /Nuevo grupo|Crear primer grupo/i }),
    ],
  },
  ...commonDashboardRoutes,
];

const adminRoundTripRoutes: RouteCheck[] = [
  {
    name: "Dashboard principal",
    path: "/dashboard",
    url: /\/dashboard$/,
    markers: [
      (page) => page.getByText("Total de Usuarios"),
      (page) => page.getByText("Estado del Sistema"),
    ],
  },
  {
    name: "Zonas",
    path: "/dashboard/areas",
    url: /\/dashboard\/areas$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Zonas y [AÁ]reas/i }),
      (page) => page.getByRole("button", { name: /Nueva [AÁ]rea/i }),
    ],
  },
  {
    name: "Dashboard principal",
    path: "/dashboard",
    url: /\/dashboard$/,
    markers: [
      (page) => page.getByText("Total de Usuarios"),
      (page) => page.getByText("Estado del Sistema"),
    ],
  },
  {
    name: "Usuarios",
    path: "/dashboard/users",
    url: /\/dashboard\/users$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Usuarios/i }),
      (page) => page.getByRole("button", { name: /Agregar usuario/i }),
    ],
  },
  {
    name: "Dashboard principal",
    path: "/dashboard",
    url: /\/dashboard$/,
    markers: [
      (page) => page.getByText("Total de Usuarios"),
      (page) => page.getByText("Estado del Sistema"),
    ],
  },
  {
    name: "Encuestas",
    path: "/dashboard/surveys",
    url: /\/dashboard\/surveys$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Encuestas/i }),
      (page) => page.getByRole("button", { name: /Nueva Encuesta/i }),
    ],
  },
  {
    name: "Dashboard principal",
    path: "/dashboard",
    url: /\/dashboard$/,
    markers: [
      (page) => page.getByText("Total de Usuarios"),
      (page) => page.getByText("Estado del Sistema"),
    ],
  },
  {
    name: "Grupos de asignacion",
    path: "/dashboard/assignment-groups",
    url: /\/dashboard\/assignment-groups(?:\/.*)?$/,
    markers: [
      (page) => page.getByRole("heading", { name: /Grupos de asignaci[oó]n/i }),
      (page) => page.getByRole("link", { name: /Nuevo grupo|Crear primer grupo/i }),
    ],
  },
  {
    name: "Dashboard principal",
    path: "/dashboard",
    url: /\/dashboard$/,
    markers: [
      (page) => page.getByText("Total de Usuarios"),
      (page) => page.getByText("Estado del Sistema"),
    ],
  },
];

function uniqueText(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

async function getFirstActiveBrigadistaId(page: Page): Promise<number | null> {
  const response = await page.request.get(
    "/api/backend/users?limit=50&is_active=true&role_key=brigadista",
  );

  if (!response.ok()) {
    return null;
  }

  const users = (await response.json()) as BackendUser[];
  const candidate = users.find((user) => user.id > 0);
  return candidate?.id ?? null;
}

async function createSurveyViaApi(
  page: Page,
  title: string,
): Promise<CreatedSurvey> {
  const response = await page.request.post("/api/backend/admin/surveys", {
    timeout: backendMutationTimeoutMs,
    data: {
      title,
      description: "Encuesta creada por E2E admin journey",
      survey_type: "normal",
      questions: [
        {
          question_text: "Pregunta E2E de validacion",
          question_type: "text",
          is_required: true,
          order: 1,
        },
      ],
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as CreatedSurvey;
  expect(payload.id).toBeGreaterThan(0);
  return payload;
}

async function expectAnyMarkerVisible(
  page: Page,
  markers: Array<(page: Page) => Locator>,
  routeName: string,
): Promise<void> {
  for (const getMarker of markers) {
    const marker = getMarker(page).first();

    try {
      await expect(marker).toBeVisible({ timeout: routeMarkerTimeoutMs });
      return;
    } catch {
      // Try next marker.
    }
  }

  throw new Error(
    `No marker was visible for route \"${routeName}\". UI may have changed.`,
  );
}

async function runJourney(page: Page, routes: RouteCheck[]): Promise<void> {
  for (const route of routes) {
    await test.step(`Abrir ${route.name} (${route.path})`, async () => {
      await page.goto(route.path);
      await expect(page).toHaveURL(route.url);
      await page.waitForLoadState("domcontentloaded");
      await expectAnyMarkerVisible(page, route.markers, route.name);
    });
  }
}

test.describe("dashboard journeys across zones and key screens", () => {
  if (cmsCredentials.length === 0) {
    test("requires configured credentials", async () => {
      test.skip(
        true,
        "Define credentials in .env to validate dashboard journeys.",
      );
    });
  }

  for (const credential of cmsCredentials) {
    test(`runs common dashboard journey for ${credential.label}`, async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      await loginPage.login(credential);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await runJourney(page, commonDashboardRoutes);
    });
  }

  test("runs extended admin journey with zones and management screens", async ({
    page,
  }) => {
    test.setTimeout(60000); // 60s timeout for 11+ routes
    test.skip(
      !adminCredential,
      "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
    );

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login(adminCredential!);
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    await runJourney(page, adminDashboardRoutes);
  });

  test("runs admin round-trip journey between dashboard and modules", async ({
    page,
  }) => {
    test.setTimeout(60000); // 60s timeout for round-trip admin routes
    test.skip(
      !adminCredential,
      "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
    );

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.login(adminCredential!);
    await dashboardPage.goto();
    await dashboardPage.expectLoaded();

    await runJourney(page, adminRoundTripRoutes);
  });

  test("admin creates a user invitation from users screen", async ({ page }) => {
    test.setTimeout(60000); // 60s timeout for user invitation creation
    test.skip(
      !adminCredential,
      "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
    );

    const loginPage = new LoginPage(page);
    const email = `journey.user.${Date.now()}@brigada.com`;

    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/users");
    await expect(page).toHaveURL(/\/dashboard\/users$/);
    await expect(
      page.getByRole("heading", { name: /Usuarios/i }).first(),
    ).toBeVisible();

    const addUserButton = page
      .getByRole("button", { name: /Agregar usuario/i })
      .first();
    if ((await addUserButton.count()) === 0) {
      test.skip(true, "Agregar usuario button not found in current environment.");
    }

    await addUserButton.click();
    await expect(page.getByRole("dialog").first()).toBeVisible({
      timeout: backendUiFeedbackTimeoutMs,
    });

    await page.getByLabel("Nombre").fill("Journey");
    await page.getByLabel("Apellido").fill("Admin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Telefono").fill("5555555555");
    await page.getByRole("button", { name: "Registrar usuario" }).click();

    await expect(page.getByText("Usuario registrado exitosamente")).toBeVisible({
      timeout: backendUiFeedbackTimeoutMs,
    });
    await expect(page.getByLabel("Código de activación")).toBeVisible();

    const lookup = await page.request.get(
      `/api/backend/admin/whitelist?search=${encodeURIComponent(email)}`,
    );
    if (lookup.ok()) {
      const payload = (await lookup.json()) as { items?: Array<{ id: number }> };
      const id = payload.items?.[0]?.id;
      if (id) {
        await page.request.delete(`/api/backend/admin/whitelist/${id}`);
      }
    }
  });

  test("admin creates survey and team assignment", async ({ page }) => {
    test.setTimeout(60000); // 60s timeout for survey creation and cleanup
    test.skip(
      !adminCredential,
      "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
    );

    const loginPage = new LoginPage(page);
    let createdSurveyId: number | null = null;
    let createdGroupId: number | null = null;

    await loginPage.login(adminCredential!);

    try {
      const surveyTitle = uniqueText("Encuesta Journey E2E");
      const createdSurvey = await createSurveyViaApi(page, surveyTitle);
      createdSurveyId = createdSurvey.id;

      await page.goto("/dashboard/surveys");
      await expect(page).toHaveURL(/\/dashboard\/surveys$/);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /Encuestas/i })).toBeVisible();
      await expect(page.getByText(surveyTitle).first()).toBeVisible({
        timeout: backendUiFeedbackTimeoutMs,
      });

      const brigadistaId = await getFirstActiveBrigadistaId(page);
      if (!brigadistaId) {
        test.skip(true, "No active brigadista found to create assignment.");
      }

      const groupName = uniqueText("Grupo Journey E2E");
      const assignmentResponse = await page.request.post(
        "/api/backend/assignments/team",
        {
          timeout: backendMutationTimeoutMs,
          data: {
            survey_ids: [createdSurvey.id],
            user_ids: [brigadistaId],
            target_role: "brigadista",
            group_name: groupName,
            group_description: "Grupo de prueba creado por E2E",
          },
        },
      );
      expect(assignmentResponse.ok()).toBeTruthy();

      const assignmentResult =
        (await assignmentResponse.json()) as AssignmentTeamResult;
      createdGroupId = assignmentResult.group_id ?? null;

      expect(assignmentResult.created_count).toBeGreaterThan(0);

      await page.goto("/dashboard/assignment-groups");
      await expect(page).toHaveURL(/\/dashboard\/assignment-groups(?:\/.*)?$/);
      await expect(
        page.getByRole("heading", { name: /Grupos de asignaci[oó]n/i }),
      ).toBeVisible();
      await expect(page.getByText(groupName).first()).toBeVisible({
        timeout: backendUiFeedbackTimeoutMs,
      });
    } finally {
      if (createdGroupId) {
        await page.request.delete(`/api/backend/assignments/groups/${createdGroupId}`);
      }
      if (createdSurveyId) {
        await page.request.delete(`/api/backend/admin/surveys/${createdSurveyId}`);
      }
    }
  });
});
