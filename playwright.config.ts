import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';
const apiBaseURL = process.env.API_BASE_URL ?? 'http://localhost:8000';
const webServerCommand =
  process.env.E2E_WEB_SERVER_COMMAND ?? 'npm run dev -- --port 3100';
const webServerCwd =
  process.env.E2E_WEB_SERVER_CWD ?? path.resolve(__dirname, '../webCMS');
const disableWebServer = process.env.E2E_DISABLE_WEBSERVER === 'true';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    extraHTTPHeaders: {
      'x-e2e-suite': 'brigada-auto-testing'
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: disableWebServer
    ? undefined
    : {
        command: webServerCommand,
        cwd: webServerCwd,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
      },
  metadata: {
    apiBaseURL
  }
});
