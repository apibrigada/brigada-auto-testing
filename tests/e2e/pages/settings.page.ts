import { expect, type Page } from "@playwright/test";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/dashboard/settings");
    await expect(this.page).toHaveURL(/\/dashboard\/settings$/);
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Configuración" }),
    ).toBeVisible();
    await expect(
      this.page.getByText(
        "Administra tu perfil, contraseña y preferencias del sistema",
      ),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Perfil" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Contraseña" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Preferencias" }),
    ).toBeVisible();
  }
}
