import { expect, type Page } from "@playwright/test";
import type { LoginCredential } from "../fixtures/credentials.js";

type LoginOutcome = "dashboard" | "restricted";

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

  async login(
    credential: LoginCredential,
    options?: { expectedOutcome?: LoginOutcome },
  ): Promise<void> {
    const expectedOutcome = options?.expectedOutcome ?? "dashboard";

    await this.goto();

    await this.page.locator("#email").fill(credential.email);
    await this.page.locator("#password").fill(credential.password);
    await this.page.getByRole("button", { name: "Iniciar sesión" }).click();

    const loginError = this.page.locator("form div.bg-red-50");

    await Promise.race([
      this.page.waitForURL(
        (url: URL) =>
          expectedOutcome === "restricted"
            ? url.pathname === "/login" &&
              url.searchParams.get("error") === "admin_only"
            : !url.pathname.startsWith("/login"),
        {
          timeout: 15000,
        },
      ),
      loginError.waitFor({ state: "visible", timeout: 15000 }),
    ]);

    if (await loginError.isVisible()) {
      const errorText =
        (await loginError.textContent())?.trim() ||
        "Error de autenticacion sin detalle";
      throw new Error(`Login fallido para ${credential.label}: ${errorText}`);
    }

    if (expectedOutcome === "restricted") {
      await expect(this.page).toHaveURL(/\/login\?error=admin_only$/);
      return;
    }

    await expect(this.page).toHaveURL(/\/dashboard(?:\/.*)?$/);
  }
}
