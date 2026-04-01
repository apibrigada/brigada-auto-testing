import { test, expect } from '@playwright/test';

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
});
