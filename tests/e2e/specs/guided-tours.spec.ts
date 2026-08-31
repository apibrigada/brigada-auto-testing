import { test, expect } from "@playwright/test";
import { getCmsAccessCredentials } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";
import { DashboardPage } from "../pages/dashboard.page.js";
import { HelpMenuComponent } from "../components/help-menu.component.js";

const credentials = getCmsAccessCredentials();

test.describe("guided tours", () => {
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
      test("help menu opens and shows available tours", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const helpMenu = new HelpMenuComponent(page);

        await loginPage.login(credential);
        await dashboardPage.goto();
        await dashboardPage.expectLoaded();

        await helpMenu.open();
        await expect(page.getByText("Recorridos disponibles")).toBeVisible();
        await expect(page.getByText("En esta página")).toBeVisible();
        await expect(page.getByText("Bienvenida a Brigada").first()).toBeVisible();
      });

      test("overview tour starts and shows step 1", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const helpMenu = new HelpMenuComponent(page);

        await loginPage.login(credential);
        await dashboardPage.goto();
        await dashboardPage.expectLoaded();

        await helpMenu.open();
        await helpMenu.startTour("Bienvenida a Brigada");

        await helpMenu.expectTourTooltipVisible("Bienvenido a Brigada", 0, 7);
        await helpMenu.expectStepContent(
          "Este recorrido te mostrará las secciones principales del panel",
        );
      });

      test("overview tour advances through steps", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const helpMenu = new HelpMenuComponent(page);

        await loginPage.login(credential);
        await dashboardPage.goto();
        await dashboardPage.expectLoaded();

        await helpMenu.open();
        await helpMenu.startTour("Bienvenida a Brigada");

        // Step 1: Bienvenido
        await helpMenu.expectTourTooltipVisible("Bienvenido a Brigada", 0, 7);

        // Advance to step 2: Barra lateral
        await helpMenu.clickNext();
        await helpMenu.expectTourTooltipVisible("Barra lateral", 1, 7);

        // Advance to step 3: Equipos
        await helpMenu.clickNext();
        await helpMenu.expectTourTooltipVisible("Equipos", 2, 7);
      });

      test("overview tour can be skipped", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const helpMenu = new HelpMenuComponent(page);

        await loginPage.login(credential);
        await dashboardPage.goto();
        await dashboardPage.expectLoaded();

        await helpMenu.open();
        await helpMenu.startTour("Bienvenida a Brigada");

        await helpMenu.expectTourTooltipVisible("Bienvenido a Brigada", 0, 7);

        await helpMenu.clickSkip();
        await helpMenu.expectTourClosed();
      });

      test("overview tour can be completed", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);
        const helpMenu = new HelpMenuComponent(page);

        await loginPage.login(credential);
        await dashboardPage.goto();
        await dashboardPage.expectLoaded();

        await helpMenu.open();
        await helpMenu.startTour("Bienvenida a Brigada");

        // Click through all 7 steps
        for (let i = 0; i < 6; i++) {
          await helpMenu.clickNext();
        }

        // Step 7: Ayuda — last step shows "Finalizar"
        await helpMenu.expectTourTooltipVisible("Ayuda", 6, 7);

        const finishBtn = page.locator("[data-action='primary']");
        await expect(finishBtn).toBeVisible();
        await finishBtn.click();

        await helpMenu.expectTourClosed();
      });

      test("help menu shows context tours based on route", async ({ page }) => {
        const loginPage = new LoginPage(page);
        const helpMenu = new HelpMenuComponent(page);

        await loginPage.login(credential);

        // Navigate to teams — should show "Estructura de Equipos" context tour
        await page.goto("/dashboard/teams");
        await helpMenu.open();

        await expect(page.getByText("Estructura de Equipos").first()).toBeVisible();
      });
    });
  }
});
