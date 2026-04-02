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

    await expect(
      page.getByRole("button", { name: /Asignar usuarios y areas/i }).first(),
    ).toBeVisible();
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
    await assignmentsPage.openFirstSurveyAssignModal();

    if (await assignmentsPage.hasNoActiveAreasMessage()) {
      test.skip(true, "No active areas available in target environment.");
    }

    await assignmentsPage.selectFirstAvailableArea();
    await expect(assignmentsPage.areaOnlyActionButton()).toBeEnabled();
  });
});
