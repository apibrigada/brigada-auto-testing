import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueEmail(): string {
  return `whitelist.${Date.now()}@brigada.com`;
}

test.describe("whitelist critical path", () => {
  test.skip(!adminCredential, "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.");

  test("creates a whitelist invitation and finds it in the list", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = uniqueEmail();
    const fullName = `Lista ${Date.now()}`;

    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/whitelist");
    await expect(page.getByRole("heading", { name: "Whitelist de usuarios" })).toBeVisible();

    await page.getByRole("button", { name: "Agregar usuario" }).click();
    await expect(page.getByRole("dialog", { name: "Crear Usuario y Generar Código" })).toBeVisible();

    const [nombre, apellido] = fullName.split(" ");
    await page.getByLabel("Nombre").fill(nombre);
    await page.getByLabel("Apellido").fill(apellido);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Crear y Generar Código" }).click();

    await expect(page.getByText("Usuario registrado exitosamente")).toBeVisible({ timeout: 30000 });

    await page.goto("/dashboard/whitelist");
    await page.getByPlaceholder("Buscar por email o nombre...").fill(email);
    await expect(page.getByText(email)).toBeVisible({ timeout: 30000 });

    const rows = page.getByRole("row");
    await expect(rows).toContainText(email);

    // Cleanup: remove the invitation so the test environment remains tidy.
    const entry = await page.request.get(`/api/backend/admin/whitelist?search=${encodeURIComponent(email)}`);
    if (entry.ok()) {
      const payload = (await entry.json()) as { items?: Array<{ id: number }> };
      const id = payload.items?.[0]?.id;
      if (id) {
        await page.request.delete(`/api/backend/admin/whitelist/${id}`);
      }
    }
  });
});
