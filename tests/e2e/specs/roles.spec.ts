import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueRoleKey(): string {
  return `e2e_role_${Date.now()}`;
}

test.describe("roles critical path", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("creates a custom role and toggles its active state", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const roleKey = uniqueRoleKey();
    const roleName = `Rol E2E ${Date.now()}`;

    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/roles");
    await expect(
      page.getByRole("heading", { name: "Roles y Permisos" }),
    ).toBeVisible();

    await page.getByPlaceholder("key (ej. evaluacion_norte)").fill(roleKey);
    await page.getByPlaceholder("Nombre visible").fill(roleName);
    await page
      .getByPlaceholder("Descripción (opcional)")
      .fill("Rol creado por Playwright");

    await page.getByText("Ver usuarios").click();

    await page.getByRole("button", { name: "Crear rol" }).click();
    await expect(page.getByText(roleName)).toBeVisible({ timeout: 30000 });

    const row = page.locator("tr", { hasText: roleName }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /Desactivar|Activar/ }).click();

    await expect(page.getByText("Rol desactivado")).toBeVisible({
      timeout: 30000,
    });
  });
});
