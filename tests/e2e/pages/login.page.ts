import { expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import type { LoginCredential } from "../fixtures/credentials.js";

type LoginOutcome = "dashboard" | "restricted";

const authDir = path.resolve(__dirname, "../../../.auth");

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

  /**
   * Intenta restaurar el estado de autenticación guardado por el globalSetup.
   * Devuelve true si se restauraron cookies, false si no hay estado guardado.
   */
  private async tryRestoreSavedAuth(roleNumber: number): Promise<boolean> {
    const statePath = path.join(authDir, `rol_${roleNumber}.json`);
    if (!fs.existsSync(statePath)) return false;

    try {
      const raw = fs.readFileSync(statePath, "utf-8");
      const state = JSON.parse(raw) as {
        cookies?: unknown[];
        origins?: Array<{
          origin: string;
          localStorage: Array<{ name: string; value: string }>;
        }>;
      };

      // Restaurar cookies HTTP (access_token, user_cms_access, etc.)
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.page.context().addCookies(state.cookies as any);
      }

      // Restaurar localStorage (auth-storage de Zustand) via init script.
      // Esto es crítico: sin el localStorage el auth store ve isAuthenticated:false
      // y la app redirige a /login, creando un loop con el middleware.
      const allLocalStorage =
        state.origins?.flatMap((o) => o.localStorage ?? []) ?? [];
      if (allLocalStorage.length > 0) {
        await this.page.context().addInitScript(
          (items: Array<{ name: string; value: string }>) => {
            for (const { name, value } of items) {
              window.localStorage.setItem(name, value);
            }
          },
          allLocalStorage,
        );
      }

      return Array.isArray(state.cookies) && state.cookies.length > 0;
    } catch {
      // Estado corrupto o incompatible; se hará login normal.
    }

    return false;
  }

  async login(
    credential: LoginCredential,
    options?: { expectedOutcome?: LoginOutcome },
  ): Promise<void> {
    const expectedOutcome = options?.expectedOutcome ?? "dashboard";

    // Para usuarios con acceso CMS, intentar reutilizar el auth state del globalSetup.
    // Los usuarios restringidos (rol_3) deben pasar por el formulario para validar el bloqueo.
    if (
      typeof credential.roleNumber === "number" &&
      expectedOutcome === "dashboard"
    ) {
      const restored = await this.tryRestoreSavedAuth(credential.roleNumber);

      if (restored) {
        // Navegar directamente a /dashboard evita el redirect chain /login→/dashboard
        // que deja al App Router de Next.js en estado intermedio y causa ERR_ABORTED.
        try {
          await this.page.goto("/dashboard");
          const currentUrl = this.page.url();
          if (currentUrl && !currentUrl.includes("/login")) {
            return;
          }
          // Token expirado: el middleware redirigió a /login — continúa con login normal.
        } catch {
          // Error de navegación — continúa con login normal.
        }
      }
    }

    // Login completo vía formulario.
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
