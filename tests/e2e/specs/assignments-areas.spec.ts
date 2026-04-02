import { expect, test } from "@playwright/test";
import { getFirstCredential } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";
import { AssignmentsPage } from "../pages/assignments.page.js";
import { SidebarComponent } from "../components/sidebar.component.js";

const credential = getFirstCredential();

test.describe("assignments users and areas flow", () => {
  test("shows assign users and areas entry point", async ({ page }) => {
    test.skip(
      !credential,
      "Define credentials in .env to validate assignments flow.",
    );

    const loginPage = new LoginPage(page);
    const sidebar = new SidebarComponent(page);

    await loginPage.login(credential!);
    await sidebar.goToAssignments();

    await expect(
      page.getByRole("button", { name: /Asignar usuarios y areas/i }).first(),
    ).toBeVisible();
  });

  test("supports area-only action path in modal", async ({ page }) => {
    test.skip(
      !credential,
      "Define credentials in .env to validate assignments flow.",
    );

    const loginPage = new LoginPage(page);
    const assignmentsPage = new AssignmentsPage(page);

    await loginPage.login(credential!);
    await assignmentsPage.goto();
    await assignmentsPage.expectLoaded();
    await assignmentsPage.openFirstSurveyAssignModal();

    if (await assignmentsPage.hasNoActiveAreasMessage()) {
      test.skip(true, "No active areas available in target environment.");
    }

    await assignmentsPage.selectFirstAvailableArea();
    await expect(assignmentsPage.areaOnlyActionButton()).toBeEnabled();
  });
});
