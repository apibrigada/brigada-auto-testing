import { test, expect, type Page } from "@playwright/test";

const dashboardStatsTimeoutMs = Number(
  process.env.E2E_DASHBOARD_STATS_TIMEOUT_MS ?? 30000,
);

type LoginCredential = {
  label: string;
  email: string;
  password: string;
  roleNumber?: number;
  newImageUrl?: string;
};

type LoginOutcome = "dashboard" | "restricted";

function getLoginCredentials(): LoginCredential[] {
  const credentials: LoginCredential[] = [];

  // Compatibilidad hacia atras: una sola credencial
  if (process.env.E2E_LOGIN_EMAIL && process.env.E2E_LOGIN_PASSWORD) {
    credentials.push({
      label: "default",
      email: process.env.E2E_LOGIN_EMAIL,
      password: process.env.E2E_LOGIN_PASSWORD,
    });
  }

  // Credenciales por rol: E2E_LOGIN_EMAIL_ROLE_1 + E2E_LOGIN_PASSWORD_ROLE_1
  const roleEmails = Object.keys(process.env)
    .map((key) => key.match(/^E2E_LOGIN_EMAIL_ROLE_(\d+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);

  for (const roleNumber of roleEmails) {
    const email = process.env[`E2E_LOGIN_EMAIL_ROLE_${roleNumber}`];
    const password = process.env[`E2E_LOGIN_PASSWORD_ROLE_${roleNumber}`];

    if (!email || !password) {
      continue;
    }

    credentials.push({
      label: `rol_${roleNumber}`,
      email,
      password,
      roleNumber,
      newImageUrl: process.env[`E2E_NEW_IMG_URL_${roleNumber}`],
    });
  }

  return credentials;
}

async function loginAndValidateDashboard(
  page: Page,
  credential: LoginCredential,
) {
  await loginWithCredential(page, credential);

  if (new URL(page.url()).pathname !== "/dashboard") {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
  }

  await expect(page.getByText("Total de Usuarios")).toBeVisible({
    timeout: dashboardStatsTimeoutMs,
  });
  await expect(page.getByText("Estado del Sistema")).toBeVisible({
    timeout: dashboardStatsTimeoutMs,
  });

  await expect(
    page.locator("p.text-3xl.font-bold span.animate-pulse"),
  ).toHaveCount(0, {
    timeout: dashboardStatsTimeoutMs,
  });
}

async function loginWithCredential(
  page: Page,
  credential: LoginCredential,
  options?: { expectedOutcome?: LoginOutcome },
) {
  const expectedOutcome = options?.expectedOutcome ?? "dashboard";

  await page.goto("/login");

  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();

  await page.locator("#email").fill(credential.email);
  await page.locator("#password").fill(credential.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  const loginError = page.locator("form div.bg-red-50");

  await Promise.race([
    page.waitForURL(
      (url: URL) =>
        expectedOutcome === "restricted"
          ? url.pathname === "/login" &&
            url.searchParams.get("error") === "admin_only"
          : !url.pathname.startsWith("/login"),
      { timeout: 15000 },
    ),
    loginError.waitFor({ state: "visible", timeout: 15000 }),
  ]);

  if (await loginError.isVisible()) {
    const errorText =
      (await loginError.textContent())?.trim() ||
      "Error de autenticación sin detalle";
    throw new Error(`Login fallido para ${credential.label}: ${errorText}`);
  }

  if (expectedOutcome === "restricted") {
    await expect(page).toHaveURL(/\/login\?error=admin_only$/);
    await page.waitForLoadState("domcontentloaded");
    return;
  }

  await expect(page).toHaveURL(/\/dashboard(?:\/.*)?$/);
  await page.waitForLoadState("domcontentloaded");
}

async function validateSettingsArea(page: Page) {
  await page.goto("/dashboard/settings");
  await expect(page).toHaveURL(/\/dashboard\/settings$/);

  await expect(
    page.getByRole("heading", { name: "Configuración" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Administra tu perfil, contraseña y preferencias del sistema",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Perfil" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Contraseña" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preferencias" }),
  ).toBeVisible();
}

function getImageFileName(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg"))
    return "avatar.jpg";
  if (contentType.includes("webp")) return "avatar.webp";
  if (contentType.includes("gif")) return "avatar.gif";
  return "avatar.png";
}

async function updateProfilePhotoFromUrl(page: Page, imageUrl: string) {
  const response = await page.request.get(imageUrl, { timeout: 30000 });
  expect(
    response.ok(),
    `No se pudo descargar la imagen: ${imageUrl}`,
  ).toBeTruthy();

  const contentTypeHeader = response.headers()["content-type"] || "image/png";
  const contentType = contentTypeHeader.split(";")[0].trim().toLowerCase();
  const body = await response.body();

  await page.goto("/dashboard/settings");
  await expect(page).toHaveURL(/\/dashboard\/settings$/);

  const avatarInput = page.locator('input[type="file"][accept*="image/jpeg"]');
  await expect(avatarInput).toBeAttached();

  await avatarInput.setInputFiles({
    name: getImageFileName(contentType),
    mimeType: contentType,
    buffer: body,
  });

  const avatarResponsePromise = page
    .waitForResponse(
      (resp) => resp.url().includes("/api/backend/users/me/avatar"),
      { timeout: 30000 },
    )
    .catch(() => null);
  const profileResponsePromise = page
    .waitForResponse(
      (resp) =>
        resp.url().includes("/api/backend/users/me") &&
        resp.request().method() === "PATCH",
      {
        timeout: 30000,
      },
    )
    .catch(() => null);

  await page.getByRole("button", { name: "Guardar cambios" }).click();

  const successMessage = page.getByText("Perfil actualizado exitosamente");
  const errorMessage = page.getByText("Error al actualizar el perfil");

  await Promise.race([
    successMessage.waitFor({ state: "visible", timeout: 30000 }),
    errorMessage.waitFor({ state: "visible", timeout: 30000 }),
  ]);

  if (await errorMessage.isVisible()) {
    const [avatarResponse, profileResponse] = await Promise.all([
      avatarResponsePromise,
      profileResponsePromise,
    ]);

    let apiDetail = "";
    if (avatarResponse) {
      const avatarBody = await avatarResponse.text();
      apiDetail += ` avatar(status=${avatarResponse.status()} body=${avatarBody.slice(0, 240)})`;
    }
    if (profileResponse) {
      const profileBody = await profileResponse.text();
      apiDetail += ` profile(status=${profileResponse.status()} body=${profileBody.slice(0, 240)})`;
    }

    throw new Error(
      `No se pudo actualizar la foto de perfil.${apiDetail || " Sin detalle de respuesta API."}`,
    );
  }

  await expect(successMessage).toBeVisible();
}

const loginCredentials = getLoginCredentials();
const cmsAccessCredentials = loginCredentials.filter(
  (credential) => credential.roleNumber !== 3,
);
const restrictedCredentials = loginCredentials.filter(
  (credential) => credential.roleNumber === 3,
);

test.describe("webCMS smoke", () => {
  test("debe redirigir de raiz a login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("debe mostrar pantalla de login", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Brigada CMS" }),
    ).toBeVisible();
    await expect(page.getByText("Panel Administrativo")).toBeVisible();
  });

  if (loginCredentials.length === 0) {
    test("debe intentar iniciar sesion con credenciales configuradas", async () => {
      test.skip(
        true,
        "Define E2E_LOGIN_EMAIL/E2E_LOGIN_PASSWORD o E2E_LOGIN_EMAIL_ROLE_N/E2E_LOGIN_PASSWORD_ROLE_N en .env.",
      );
    });
  }

  for (const credential of cmsAccessCredentials) {
    test(`debe iniciar sesion y cargar dashboard para ${credential.label}`, async ({
      page,
    }) => {
      await loginAndValidateDashboard(page, credential);
    });

    test(`debe revisar area de configuracion para ${credential.label}`, async ({
      page,
    }) => {
      await loginWithCredential(page, credential);
      await validateSettingsArea(page);
    });

    if (credential.roleNumber === 1) {
      test("debe cambiar foto de perfil para rol_1 desde E2E_NEW_IMG_URL_1", async ({
        page,
      }) => {
        test.skip(
          !credential.newImageUrl,
          "Define E2E_NEW_IMG_URL_1 en .env para ejecutar este test.",
        );

        await loginWithCredential(page, credential);
        await updateProfilePhotoFromUrl(page, credential.newImageUrl as string);
      });
    }
  }

  for (const credential of restrictedCredentials) {
    test(`debe rechazar acceso al dashboard para ${credential.label}`, async ({
      page,
    }) => {
      await loginWithCredential(page, credential, {
        expectedOutcome: "restricted",
      });
      await expect(page).toHaveURL(/\/login\?error=admin_only$/);
    });
  }
});
