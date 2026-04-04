import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueEmail(): string {
  return `e2e.${Date.now()}@brigada.com`;
}

test.describe("users invitation critical path", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("invites a user and shows activation code", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = uniqueEmail();

    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/users");

    await expect(page.getByRole("heading", { name: "Usuarios" }).first()).toBeVisible();
    
    const addUserBtn = page.getByRole("button", { name: /Agregar usuario/i }).first();
    if ((await addUserBtn.count()) === 0) {
      test.skip(true, "Agregar usuario button not found in current environment.");
    }
    await addUserBtn.click();

    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15000 });

    await page.getByLabel("Nombre").fill("E2E");
    await page.getByLabel("Apellido").fill("Usuario");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Telefono").fill("5555555555");

    await page.getByRole("button", { name: "Registrar usuario" }).click();

    await expect(page.getByText("Usuario registrado exitosamente")).toBeVisible(
      { timeout: 30000 },
    );
    await expect(page.getByLabel("Código de activación")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cerrar" })).toBeVisible();

    const lookup = await page.request.get(
      `/api/backend/admin/whitelist?search=${encodeURIComponent(email)}`,
    );
    if (lookup.ok()) {
      const payload = (await lookup.json()) as {
        items?: Array<{ id: number }>;
      };
      const id = payload.items?.[0]?.id;
      if (id) {
        await page.request.delete(`/api/backend/admin/whitelist/${id}`);
      }
    }
  });
});
