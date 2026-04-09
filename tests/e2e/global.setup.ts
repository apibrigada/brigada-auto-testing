import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { getLoginCredentials } from "./fixtures/credentials.js";

const authDir = path.resolve(__dirname, "../../.auth");

async function globalSetup(): Promise<void> {
  const credentials = getLoginCredentials();

  if (credentials.length === 0) {
    console.log("[setup] No hay credenciales configuradas, omitiendo auth setup.");
    return;
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
  const browser = await chromium.launch();

  for (const credential of credentials) {
    if (typeof credential.roleNumber !== "number") continue;

    const statePath = path.join(authDir, `rol_${credential.roleNumber}.json`);
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();

    try {
      await page.goto("/login");
      await page.locator("#email").fill(credential.email);
      await page.locator("#password").fill(credential.password);
      await page.getByRole("button", { name: "Iniciar sesión" }).click();

      await page.waitForURL(
        (url) =>
          !url.pathname.startsWith("/login") ||
          url.searchParams.has("error"),
        { timeout: 15000 },
      );

      if (!page.url().includes("/login")) {
        await context.storageState({ path: statePath });
        console.log(`[setup] Auth state guardado para rol_${credential.roleNumber}`);
      } else {
        console.log(
          `[setup] rol_${credential.roleNumber} sin acceso CMS o login fallido — no se guardó estado.`,
        );
      }
    } catch (err) {
      console.warn(
        `[setup] No se pudo autenticar rol_${credential.roleNumber}: ${err}`,
      );
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

export default globalSetup;
