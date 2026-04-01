import { test, expect, type Page } from '@playwright/test';

const dashboardStatsTimeoutMs = Number(process.env.E2E_DASHBOARD_STATS_TIMEOUT_MS ?? 30000);

type LoginCredential = {
  label: string;
  email: string;
  password: string;
};

function getLoginCredentials(): LoginCredential[] {
  const credentials: LoginCredential[] = [];

  // Compatibilidad hacia atras: una sola credencial
  if (process.env.E2E_LOGIN_EMAIL && process.env.E2E_LOGIN_PASSWORD) {
    credentials.push({
      label: 'default',
      email: process.env.E2E_LOGIN_EMAIL,
      password: process.env.E2E_LOGIN_PASSWORD
    });
  }

  // Credenciales por rol: E2E_LOGIN_EMAIL_ROLE_1 + E2E_LOGIN_PASSWORD_ROLE_1
  const roleEmails = Object.keys(process.env)
    .map((key) => key.match(/^E2E_LOGIN_EMAIL_ROLE_(\d+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);

  for (const roleNumber of roleEmails) {
    const email = process.env[`E2E_LOGIN_EMAIL_ROLE_${roleNumber}`];
    const password = process.env[`E2E_LOGIN_PASSWORD_ROLE_${roleNumber}`];

    if (!email || !password) {
      continue;
    }

    credentials.push({
      label: `rol_${roleNumber}`,
      email,
      password
    });
  }

  return credentials;
}

async function loginAndValidateDashboard(page: Page, credential: LoginCredential) {
  await page.goto('/login');

  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  await page.locator('#email').fill(credential.email);
  await page.locator('#password').fill(credential.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  const loginError = page.locator('form div.bg-red-50');

  await Promise.race([
    page.waitForURL((url: URL) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
    loginError.waitFor({ state: 'visible', timeout: 15000 })
  ]);

  if (await loginError.isVisible()) {
    const errorText = (await loginError.textContent())?.trim() || 'Error de autenticación sin detalle';
    throw new Error(`Login fallido para ${credential.label}: ${errorText}`);
  }

  await expect(page).toHaveURL(/\/dashboard(?:\/.*)?$/);
  await page.waitForLoadState('domcontentloaded');

  if (new URL(page.url()).pathname !== '/dashboard') {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
  }

  await expect(page.getByText('Total de Usuarios')).toBeVisible({ timeout: dashboardStatsTimeoutMs });
  await expect(page.getByText('Estado del Sistema')).toBeVisible({ timeout: dashboardStatsTimeoutMs });

  await expect(page.locator('p.text-3xl.font-bold span.animate-pulse')).toHaveCount(0, {
    timeout: dashboardStatsTimeoutMs
  });
}

const loginCredentials = getLoginCredentials();

test.describe('webCMS smoke', () => {
  test('debe redirigir de raiz a login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('debe mostrar pantalla de login', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Brigada CMS' })).toBeVisible();
    await expect(page.getByText('Panel Administrativo')).toBeVisible();
  });

  if (loginCredentials.length === 0) {
    test('debe intentar iniciar sesion con credenciales configuradas', async () => {
      test.skip(true, 'Define E2E_LOGIN_EMAIL/E2E_LOGIN_PASSWORD o E2E_LOGIN_EMAIL_ROLE_N/E2E_LOGIN_PASSWORD_ROLE_N en .env.');
    });
  }

  for (const credential of loginCredentials) {
    test(`debe iniciar sesion y cargar dashboard para ${credential.label}`, async ({ page }) => {
      await loginAndValidateDashboard(page, credential);
    });
  }
});
