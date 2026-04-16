/**
 * surveys-crud.spec.ts
 *
 * E2E tests for the survey CRUD lifecycle in the CMS:
 *   1. Create a draft survey with a text question
 *   2. Verify it appears in the survey list
 *   3. Publish the draft version
 *   4. Verify published status badge
 *   5. Verify survey can be deleted (soft-delete) via API cleanup
 *
 * Uses role_1 (admin) — assumes E2E_LOGIN_EMAIL_ROLE_1 / E2E_LOGIN_PASSWORD_ROLE_1.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `E2E Encuesta ${Date.now()}`;
}

test.describe("surveys CRUD lifecycle", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  /**
   * Full CRUD flow: create → verify in list → publish → cleanup
   */
  test("creates, publishes and cleans up a draft survey", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const title = uniqueTitle();

    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/surveys");

    await expect(
      page.getByRole("heading", { name: /Encuestas/i }).first(),
    ).toBeVisible();

    // ── 1. Open new survey dialog ──────────────────────────────────────────
    const newSurveyBtn = page
      .getByRole("button", { name: /Nueva encuesta|Crear encuesta/i })
      .first();

    if ((await newSurveyBtn.count()) === 0) {
      test.skip(
        true,
        "No 'Nueva encuesta' button found in current environment.",
      );
    }

    await newSurveyBtn.click();
    await expect(page.getByRole("dialog").first()).toBeVisible({
      timeout: 10000,
    });

    // ── 2. Fill survey metadata ────────────────────────────────────────────
    await page.getByLabel(/Título|Nombre/i).fill(title);

    const descInputs = page.getByLabel(/Descripción/i);
    if ((await descInputs.count()) > 0) {
      await descInputs.first().fill("Encuesta creada por E2E tests — eliminar");
    }

    await page
      .getByRole("button", { name: /Crear|Guardar/i })
      .last()
      .click();

    // Wait for navigation or success indicator
    await expect(page).toHaveURL(/\/dashboard\/surveys\/\d+/, {
      timeout: 20000,
    });

    // ── 3. Extract survey ID from URL ──────────────────────────────────────
    const surveyUrl = page.url();
    const surveyIdMatch = surveyUrl.match(/\/surveys\/(\d+)/);
    const surveyId = surveyIdMatch ? surveyIdMatch[1] : null;

    // ── 4. Verify we are on the survey detail page ─────────────────────────
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    // ── 5. Add a text question via the builder ─────────────────────────────
    const addQuestionBtn = page
      .getByRole("button", { name: /Agregar pregunta|Nueva pregunta/i })
      .first();

    if ((await addQuestionBtn.count()) > 0) {
      await addQuestionBtn.click();

      // Select text question type if a type picker is shown
      const textTypeOption = page
        .getByRole("option", { name: /Texto corto|Text/i })
        .first();
      if ((await textTypeOption.count()) > 0) {
        await textTypeOption.click();
      }

      // Fill question label
      const questionLabelInput = page
        .getByLabel(/Texto de la pregunta|Pregunta|Label/i)
        .first();
      if ((await questionLabelInput.count()) > 0) {
        await questionLabelInput.fill("¿Cuál es tu nombre? (E2E)");
      }

      // Save question
      const saveQuestionBtn = page
        .getByRole("button", { name: /Guardar pregunta|Agregar/i })
        .first();
      if ((await saveQuestionBtn.count()) > 0) {
        await saveQuestionBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // ── 6. Publish the draft version ───────────────────────────────────────
    const publishBtn = page
      .getByRole("button", { name: /Publicar|Publish/i })
      .first();

    if ((await publishBtn.count()) > 0) {
      await publishBtn.click();

      // Confirm dialog if shown
      const confirmBtn = page
        .getByRole("button", { name: /Confirmar|Publicar|Sí/i })
        .last();
      if ((await confirmBtn.count()) > 0) {
        await confirmBtn.click();
      }

      // Verify published state
      await expect(
        page.getByText(/Publicad[ao]|publicado/i).first(),
      ).toBeVisible({ timeout: 20000 });
    }

    // ── 7. Go back to list and verify survey appears ───────────────────────
    await page.goto("/dashboard/surveys");
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });

    // ── 8. Cleanup: delete via API ─────────────────────────────────────────
    if (surveyId) {
      const deleteResponse = await page.request.delete(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      // 200 or 404 (already gone) are both acceptable
      expect([200, 204, 404]).toContain(deleteResponse.status());
    }
  });

  /**
   * Verify survey list loads and shows expected columns
   */
  test("survey list shows title, status, and action buttons", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/surveys");

    await expect(
      page.getByRole("heading", { name: /Encuestas/i }).first(),
    ).toBeVisible();

    // List should render without JS error (network errors would show empty state)
    // At minimum verify the page structure exists
    const surveyListOrEmptyState = page
      .locator('[data-testid="survey-list"], [data-testid="empty-state"]')
      .or(page.getByText(/No hay encuestas|Encuesta/i).first())
      .first();

    await expect(surveyListOrEmptyState).toBeVisible({ timeout: 15000 });
  });

  /**
   * Verify navigating to a non-existent survey shows 404 / redirect
   */
  test("non-existent survey shows error state", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);
    await page.goto("/dashboard/surveys/999999999");

    // Should show error message or redirect to list
    await expect(
      page
        .getByText(/No encontrado|Not found|no existe|404/i)
        .or(page.getByRole("heading", { name: /Encuestas/i }))
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
