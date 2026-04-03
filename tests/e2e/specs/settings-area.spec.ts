import { expect, test } from "@playwright/test";
import { getCmsAccessCredentials } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";
import { SettingsPage } from "../pages/settings.page.js";

const credentials = getCmsAccessCredentials();

test.describe("settings area standards", () => {
  if (credentials.length === 0) {
    test("requires configured credentials", async () => {
      test.skip(
        true,
        "Define credentials in .env to validate settings area flows.",
      );
    });
  }

  for (const credential of credentials) {
    test(`validates settings tabs and form UX for ${credential.label}`, async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      const settingsPage = new SettingsPage(page);

      await test.step("Login and open settings", async () => {
        await loginPage.login(credential);
        await settingsPage.goto();
        await settingsPage.expectLoaded();
      });

      await test.step("Switching tabs renders expected sections", async () => {
        await settingsPage.openProfileTab();
        await settingsPage.openPasswordTab();
        await settingsPage.openSystemTab();
        await settingsPage.openProfileTab();
      });

      await test.step("Password tab supports show/hide and mismatch validation", async () => {
        await settingsPage.openPasswordTab();

        await expect(settingsPage.currentPasswordInput()).toHaveAttribute(
          "type",
          "password",
        );
        await settingsPage.currentPasswordToggleButton().click();
        await expect(settingsPage.currentPasswordInput()).toHaveAttribute(
          "type",
          "text",
        );

        await settingsPage.newPasswordInput().fill("Password123");
        await settingsPage.confirmPasswordInput().fill("Password456");
        await settingsPage.clickVisibleButtonByText(
          /cambiar contrase|cambiar contras/i,
        );

        await expect(page.getByText(/no coinciden/i).first()).toBeVisible();
      });

      await test.step("Profile tab validates required fields", async () => {
        await settingsPage.openProfileTab();

        const originalFirstName = await settingsPage
          .profileFirstNameInput()
          .inputValue();
        const originalLastName = await settingsPage
          .profileLastNameInput()
          .inputValue();

        await settingsPage.profileFirstNameInput().fill("");
        await settingsPage.profileLastNameInput().fill("");
        await settingsPage.clickVisibleButtonByText(/guardar cambios/i);

        await expect(page.getByText(/obligatorios/i).first()).toBeVisible();

        await settingsPage.profileFirstNameInput().fill(originalFirstName);
        await settingsPage.profileLastNameInput().fill(originalLastName);
      });

      await test.step("System tab shows preferences and optional app config", async () => {
        await settingsPage.openSystemTab();

        await expect(settingsPage.emailNotificationsCheckbox()).toBeVisible();
        await expect(settingsPage.emailNotificationsCheckbox()).toBeEnabled();

        const hasAppConfig = (await settingsPage.appConfigHeader().count()) > 0;
        if (hasAppConfig) {
          await expect(settingsPage.appConfigHeader()).toBeVisible();
          await settingsPage
            .appConfigSectionButton(/2\.\s*apariencia/i)
            .click();
          await expect(page.getByText(/apariencia y tema/i)).toBeVisible();

          await settingsPage.appConfigSectionButton(/6\.\s*splash/i).click();
          await expect(
            page.getByText(/personalizaci[oó]n del splash/i),
          ).toBeVisible();
        }
      });
    });
  }
});
