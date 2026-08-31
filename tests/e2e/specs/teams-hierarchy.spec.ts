import { test, expect } from "@playwright/test";
import { getCmsAccessCredentials } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";
import { SidebarComponent } from "../components/sidebar.component.js";

const credentials = getCmsAccessCredentials();

test.describe("teams hierarchy", () => {
  if (credentials.length === 0) {
    test("requires configured credentials", async () => {
      test.skip(
        true,
        "Define E2E_LOGIN_EMAIL/E2E_LOGIN_PASSWORD or E2E_LOGIN_EMAIL_ROLE_N/E2E_LOGIN_PASSWORD_ROLE_N in .env.",
      );
    });
  }

  for (const credential of credentials) {
    test.describe(`as ${credential.label}`, () => {
      test("teams page loads via sidebar navigation", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const sidebar = new SidebarComponent(page);

        await loginPage.login(credential);
        await sidebar.goToTeams();

        await expect(page.getByRole("heading", { name: "Equipos" })).toBeVisible();
        await expect(page.getByLabel(/filtrar equipos/i)).toBeVisible();
      });

      test("teams page loads via direct navigation", async ({ page }) => {
        const loginPage = new LoginPage(page);

        await loginPage.login(credential);
        await page.goto("/dashboard/teams");

        await expect(page.getByRole("heading", { name: "Equipos" })).toBeVisible();
        await expect(page.getByLabel(/filtrar equipos/i)).toBeVisible();
      });

      test("search input filters teams", async ({ page }) => {
        const loginPage = new LoginPage(page);

        await loginPage.login(credential);
        await page.goto("/dashboard/teams");

        const searchInput = page.getByLabel(/filtrar equipos/i);
        await expect(searchInput).toBeVisible();

        await searchInput.fill("equipo-inexistente-xyz");
        await expect(page.getByText("Sin coincidencias")).toBeVisible({ timeout: 10000 });

        await searchInput.clear();
        // After clearing, teams should reappear — check for any team node
        await expect(page.getByText("Coordinación Nacional").first()).toBeVisible({ timeout: 10000 });
      });
    });
  }
});
