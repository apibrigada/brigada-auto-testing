import { expect, test } from "@playwright/test";
import { getCmsAccessCredentials } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const credentials = getCmsAccessCredentials();

test.describe("auth critical path", () => {
  test("redirects root to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("shows login screen", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectLoaded();
  });

  if (credentials.length === 0) {
    test("login requires configured credentials", async () => {
      test.skip(
        true,
        "Define E2E_LOGIN_EMAIL/E2E_LOGIN_PASSWORD or E2E_LOGIN_EMAIL_ROLE_N/E2E_LOGIN_PASSWORD_ROLE_N in .env.",
      );
    });
  }

  for (const credential of credentials) {
    test(`logs in successfully as ${credential.label}`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.login(credential);
      await expect(page).toHaveURL(/\/dashboard(?:\/.*)?$/);
    });
  }
});
