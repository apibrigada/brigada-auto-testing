import { expect, test } from "@playwright/test";
import { getCmsAccessCredentials } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";
import { AssignmentsPage } from "../pages/assignments.page.js";
import { SidebarComponent } from "../components/sidebar.component.js";

const credentials = getCmsAccessCredentials();

test.describe("assignments users and areas flow", () => {
  test("shows assign users and areas entry point", async ({ page }) => {
    test.skip(
      credentials.length === 0,
      "Define credentials in .env to validate assignments flow.",
    );

    const loginPage = new LoginPage(page);
    const sidebar = new SidebarComponent(page);
    const credential = credentials[0];

    await loginPage.login(credential);
    await sidebar.goToAssignments();

    const createGroupLink = page
      .getByRole("link", { name: /Crear primer grupo|Nuevo grupo/i })
      .first();
    const groupCardButton = page
      .getByRole("button", { name: /Agregar/i })
      .first();

    const hasCreateGroupLink = (await createGroupLink.count()) > 0;
    const hasGroupCard = (await groupCardButton.count()) > 0;

    expect(
      hasCreateGroupLink || hasGroupCard,
      "No se encontró entrada para crear grupo ni opción de agregar a encuesta.",
    ).toBeTruthy();

    if (hasCreateGroupLink) {
      await expect(createGroupLink).toBeVisible();
    } else {
      await expect(groupCardButton).toBeVisible();
    }
  });

  test("supports area-only action path in modal", async ({ page }) => {
    test.skip(
      credentials.length === 0,
      "Define credentials in .env to validate assignments flow.",
    );

    const loginPage = new LoginPage(page);
    const assignmentsPage = new AssignmentsPage(page);
    const credential = credentials[0];

    await loginPage.login(credential);
    await assignmentsPage.goto();
    await assignmentsPage.expectLoaded();

    const groupCardButton = page
      .getByRole("button", { name: /Agregar/i })
      .first();

    if ((await groupCardButton.count()) === 0) {
      test.skip(
        true,
        "No hay grupos de asignación con encuestas disponibles en este entorno para abrir el modal.",
      );
    }

    await assignmentsPage.openFirstSurveyAssignModal();

    if (await assignmentsPage.hasNoActiveAreasMessage()) {
      test.skip(true, "No active areas available in target environment.");
    }

    await assignmentsPage.selectFirstAvailableArea();
    await expect(assignmentsPage.areaOnlyActionButton()).toBeEnabled();
  });
});
