import { expect, type Page } from "@playwright/test";
import type { LoginCredential } from "../fixtures/credentials.js";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/login");
    await expect(this.page.locator("#email")).toBeVisible();
    await expect(this.page.locator("#password")).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Brigada CMS" }),
    ).toBeVisible();
    await expect(this.page.getByText("Panel Administrativo")).toBeVisible();
  }

  async login(credential: LoginCredential): Promise<void> {
    await this.goto();

    await this.page.locator("#email").fill(credential.email);
    await this.page.locator("#password").fill(credential.password);
    await this.page.getByRole("button", { name: "Iniciar sesión" }).click();

    const loginError = this.page.locator("form div.bg-red-50");

    await Promise.race([
      this.page.waitForURL((url: URL) => !url.pathname.startsWith("/login"), {
        timeout: 15000,
      }),
      loginError.waitFor({ state: "visible", timeout: 15000 }),
    ]);

    if (await loginError.isVisible()) {
      const errorText =
        (await loginError.textContent())?.trim() ||
        "Error de autenticacion sin detalle";
      throw new Error(`Login fallido para ${credential.label}: ${errorText}`);
    }

    await expect(this.page).toHaveURL(/\/dashboard(?:\/.*)?$/);
  }
}
