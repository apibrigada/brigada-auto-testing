import { expect, type Page } from "@playwright/test";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/dashboard/settings");
    await expect(this.page).toHaveURL(/\/dashboard\/settings$/);
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: /configuraci[oó]n/i }),
    ).toBeVisible();
    await expect(this.page.getByText(/administra tu perfil/i)).toBeVisible();
    await this.expectTabButtons();
  }

  async expectTabButtons(): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: /^perfil$/i }).first(),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /contras|contrase/i }).first(),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /preferencias/i }).first(),
    ).toBeVisible();
  }

  async openProfileTab(): Promise<void> {
    await this.page.getByRole("button", { name: /^perfil$/i }).first().click();
    await this.expectProfileContent();
  }

  async openPasswordTab(): Promise<void> {
    await this.page
      .getByRole("button", { name: /contras|contrase/i })
      .first()
      .click();
    await this.expectPasswordContent();
  }

  async openSystemTab(): Promise<void> {
    await this.page
      .getByRole("button", { name: /preferencias/i })
      .first()
      .click();
    await this.expectSystemContent();
  }

  async expectProfileContent(): Promise<void> {
    await expect(this.page.getByText(/datos personales/i).first()).toBeVisible();
    await expect(this.page.getByText(/cuenta/i).first()).toBeVisible();
  }

  async expectPasswordContent(): Promise<void> {
    await expect(this.page.getByText(/seguridad/i).first()).toBeVisible();
    await expect(
      this.page.getByText(/fortaleza de contrase|fortaleza de contras/i).first(),
    ).toBeVisible();
  }

  async expectSystemContent(): Promise<void> {
    await expect(
      this.page.getByText(/notificaciones por correo/i).first(),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /guardar preferencias/i }).first(),
    ).toBeVisible();
  }

  async clickVisibleButtonByText(label: RegExp): Promise<void> {
    await this.page
      .locator("button:visible")
      .filter({ hasText: label })
      .first()
      .click();
  }

  profileFirstNameInput() {
    return this.page.getByPlaceholder("Tu nombre");
  }

  profileLastNameInput() {
    return this.page.getByPlaceholder("Tu apellido");
  }

  currentPasswordInput() {
    return this.page.locator('input[name="currentPassword"]');
  }

  newPasswordInput() {
    return this.page.locator('input[name="newPassword"]');
  }

  confirmPasswordInput() {
    return this.page.locator('input[name="confirmPassword"]');
  }

  currentPasswordToggleButton() {
    return this.page.getByRole("button", { name: /(?:Mostrar|Ocultar) contraseña/i }).first();
  }

  emailNotificationsCheckbox() {
    return this.page.getByLabel(/recibir notificaciones por correo/i);
  }

  appConfigHeader() {
    return this.page.getByRole("heading", {
      name: /configuraci[oó]n global de app m[oó]vil/i,
    });
  }

  appConfigSectionButton(label: RegExp) {
    return this.page.getByRole("button", { name: label });
  }
}
