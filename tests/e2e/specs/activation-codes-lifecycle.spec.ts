import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueEmail(): string {
  return `activation.${Date.now()}@brigada.com`;
}

test.describe("activation codes lifecycle", () => {
  test.skip(!adminCredential, "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.");

  test("creates a code, locates it and revokes it", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = uniqueEmail();
    const fullName = `Activa ${Date.now()}`;

    await loginPage.login(adminCredential!);

    const whitelistResponse = await page.request.post("/api/backend/admin/whitelist", {
      data: {
        identifier: email,
        identifier_type: "email",
        full_name: fullName,
        assigned_role: "brigadista",
      },
    });
    expect(whitelistResponse.ok()).toBeTruthy();
    const whitelist = (await whitelistResponse.json()) as { id: number };

    const codeResponse = await page.request.post("/api/backend/admin/activation-codes/generate", {
      data: {
        whitelist_id: whitelist.id,
        expires_in_hours: 72,
        send_email: false,
        email_template: "default",
      },
    });
    expect(codeResponse.ok()).toBeTruthy();

    await page.goto("/dashboard/activation-codes");
    await expect(page.getByRole("heading", { name: "Codigos de activacion" })).toBeVisible();
    await page.getByPlaceholder("Buscar por nombre, email o identificador...").fill(email);

    await expect(page.getByText(fullName)).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Revocar código" }).first().click();
    await expect(page.getByRole("heading", { name: "Revocar código de activación" })).toBeVisible();

    await page.getByPlaceholder("Ej. solicitud del usuario, seguridad, información incorrecta...").fill("E2E cleanup");
    await page.getByRole("button", { name: "Revocar código" }).last().click();

    await expect(page.getByText("Revocado")).toBeVisible({ timeout: 30000 });

    await page.request.delete(`/api/backend/admin/whitelist/${whitelist.id}`);
  });
});
