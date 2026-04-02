import { test } from "@playwright/test";
import { getCmsAccessCredentials } from "../fixtures/credentials.js";
import { DashboardPage } from "../pages/dashboard.page.js";
import { LoginPage } from "../pages/login.page.js";
import { SettingsPage } from "../pages/settings.page.js";

const credentials = getCmsAccessCredentials();

test.describe("dashboard and settings critical path", () => {
  if (credentials.length === 0) {
    test("requires configured credentials", async () => {
      test.skip(
        true,
        "Define credentials in .env to validate dashboard and settings flow.",
      );
    });
  }

  for (const credential of credentials) {
    test(`loads dashboard and settings for ${credential.label}`, async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      const settingsPage = new SettingsPage(page);

      await loginPage.login(credential);
      await dashboardPage.goto();
      await dashboardPage.expectLoaded();

      await settingsPage.goto();
      await settingsPage.expectLoaded();
    });
  }
});
