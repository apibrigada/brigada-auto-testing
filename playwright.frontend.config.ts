import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const baseURL = process.env.E2E_FRONT_BASE_URL ?? "http://127.0.0.1:8081";
const webServerCommand =
  process.env.E2E_FRONT_WEB_SERVER_COMMAND ?? "npm run web -- --port 8081";
const webServerCwd =
  process.env.E2E_FRONT_WEB_SERVER_CWD ??
  path.resolve(__dirname, "../brigadaApp");
const disableWebServer =
  process.env.E2E_FRONT_DISABLE_WEBSERVER === "true";

export default defineConfig({
  testDir: "./tests/frontend-e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: disableWebServer
    ? undefined
    : {
        command: webServerCommand,
        cwd: webServerCwd,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
      },
});
