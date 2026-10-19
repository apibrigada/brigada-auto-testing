/**
 * campaigns-crud.spec.ts
 *
 * E2E tests for the campaign detail page in the CMS:
 *   1. Navigate to campaigns list
 *   2. Select a campaign → CampaignPeek shows survey info card
 *   3. Navigate to campaign detail
 *   4. Config section shows survey label + "Cambiar encuesta" button
 *   5. Click "Cambiar encuesta" → selector appears
 *   6. Click "Cancelar" → returns to label
 *
 * Uses role_1 (admin) — assumes E2E_LOGIN_EMAIL_ROLE_1 / E2E_LOGIN_PASSWORD_ROLE_1.
 * Skips gracefully when no campaigns exist in the environment.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

test.describe("campaign detail — survey display and edit UX", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("shows survey card in peek and editable survey in config", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    // ── 1. Navigate to campaigns list ──────────────────────────────────────
    await page.goto("/dashboard/campaigns");
    await expect(
      page.getByRole("heading", { name: /Campañas/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    const campaignTable = page.locator("[data-tour='campaigns-table']");
    const campaignItems = campaignTable.locator("a, button, [role='option']");

    if ((await campaignItems.count()) === 0) {
      test.skip(true, "No campaigns found in current environment.");
    }

    // ── 2. Select first campaign → peek shows survey card ─────────────────
    await campaignItems.first().click();

    const peek = page.locator("[data-tour='campaign-peek']");
    await expect(peek).toBeVisible({ timeout: 10000 });

    const surveyCard = page.locator("[data-tour='campaign-survey-card']");
    await expect(surveyCard).toBeVisible({ timeout: 10000 });
    await expect(surveyCard).toContainText("Encuesta");
    await expect(surveyCard.getByRole("link", { name: /Ver encuesta/i })).toBeVisible();

    // ── 3. Navigate to campaign detail ─────────────────────────────────────
    const detailLink = peek.getByRole("link", { name: /Ver detalles/i });
    await expect(detailLink).toBeVisible();
    await detailLink.click();

    await expect(page).toHaveURL(/\/dashboard\/campaigns\/\d+/, {
      timeout: 10000,
    });

    // ── 4. Config section: survey label + change button ───────────────────
    const configCard = page.locator("[data-tour='campaign-config']");
    await expect(configCard).toBeVisible({ timeout: 10000 });

    const surveyLabel = page.locator("[data-tour='campaign-survey-label']");
    await expect(surveyLabel).toBeVisible({ timeout: 10000 });
    await expect(surveyLabel).toContainText(/ID \d+/);

    const changeBtn = page.locator("[data-tour='campaign-survey-change-btn']");
    await expect(changeBtn).toBeVisible();
    await expect(changeBtn).toHaveText(/Cambiar encuesta/i);

    // ── 5. Click "Cambiar encuesta" → selector appears ────────────────────
    await changeBtn.click();

    // In edit mode the label is replaced by a Select trigger + Cancel button
    const cancelBtn = page.getByRole("button", { name: /^Cancelar$/i });
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });

    // ── 6. Click "Cancelar" → returns to label ────────────────────────────
    await cancelBtn.click();
    await expect(
      page.locator("[data-tour='campaign-survey-label']"),
    ).toBeVisible({ timeout: 5000 });
    await expect(changeBtn).toBeVisible();
    await expect(cancelBtn).not.toBeVisible();
  });
});
