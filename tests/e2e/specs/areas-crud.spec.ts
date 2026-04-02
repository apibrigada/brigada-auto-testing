import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueAreaName(): string {
  return `Zona E2E ${Date.now()}`;
}

function samplePolygon() {
  const base = Date.now() % 1000;
  return [
    { lat: 19.4 + base / 100000, lng: -99.1 },
    { lat: 19.4005 + base / 100000, lng: -99.1005 },
    { lat: 19.401 + base / 100000, lng: -99.0995 },
  ];
}

test.describe("areas critical path", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("creates, updates and deletes an area", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const areaName = uniqueAreaName();
    const updatedName = `${areaName} Actualizada`;

    await loginPage.login(adminCredential!);

    const createResponse = await page.request.post("/api/backend/admin/areas", {
      data: {
        name: areaName,
        polygon: samplePolygon(),
        is_active: true,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createdArea = (await createResponse.json()) as { id: number };

    await page.goto("/dashboard/areas");
    await expect(
      page.getByRole("heading", { name: "Mapa de Áreas" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: areaName })).toBeVisible();

    await page.getByRole("button", { name: areaName }).click();
    const nameInput = page.getByLabel("Nombre del área");
    await expect(nameInput).toHaveValue(areaName);
    await nameInput.fill(updatedName);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: updatedName })).toBeVisible();

    const deletePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/backend/admin/areas/${createdArea.id}`) &&
        resp.request().method() === "DELETE",
    );
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "Eliminar área" }).click();
    await deletePromise;

    await expect(page.getByRole("button", { name: updatedName })).toHaveCount(
      0,
    );
  });
});
