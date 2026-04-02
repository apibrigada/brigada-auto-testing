import { expect, test } from "@playwright/test";
import { getRestrictedCredentials } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const restrictedCredentials = getRestrictedCredentials();

test.describe("access control critical path", () => {
  if (restrictedCredentials.length === 0) {
    test("requires brigadista credentials", async () => {
      test.skip(
        true,
        "Define E2E_LOGIN_EMAIL_ROLE_3/E2E_LOGIN_PASSWORD_ROLE_3 in .env to validate brigadista access control.",
      );
    });
  }

  for (const credential of restrictedCredentials) {
    test(`blocks dashboard for ${credential.label}`, async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.login(credential, { expectedOutcome: "restricted" });
      await expect(page).toHaveURL(/\/login\?error=admin_only$/);
      await expect(
        page.getByRole("heading", { name: "Brigada CMS" }),
      ).toBeVisible();
    });
  }
});
