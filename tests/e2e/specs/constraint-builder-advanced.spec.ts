/**
 * constraint-builder-advanced.spec.ts
 *
 * Sister spec to `constraint-builder-ui.spec.ts` covering the
 * **"Avanzado" preset** of `ConstraintBuilder` — the raw JSON textarea
 * (`JsonLogicExpressionEditor`) used for cross-question constraints that
 * the visual presets cannot express.
 *
 * Scenario:
 *   - Add q_other (Texto corto) and q_check (Texto corto).
 *   - Select q_check → open "Restricción de validez" → "Avanzado" tab.
 *   - Read the "Variables disponibles" list from the JSONLogic editor to
 *     discover q_other's auto-generated `question_key` (the builder picks
 *     keys at random for new questions).
 *   - Type a cross-question JSONLogic constraint into the textarea:
 *         {"==": [{"var": "answers.<q_check_key>"}, {"var": "answers.<q_other_key>"}]}
 *     ("q_check must equal q_other").
 *   - Save → assert the survey detail JSON contains exactly that AST in
 *     `q_check.constraint_expression`.
 *
 * Auth: role_1 (admin). Cleanup: DELETE survey in finally block.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

const SURVEY_TITLE = `QA-SB2-09-03-Advanced ${Date.now()}`;
const Q_OTHER_TEXT = "Pregunta de referencia";
const Q_CHECK_TEXT = "Pregunta con constraint cross-question";

test.describe("SB2-09-03 — ConstraintBuilder Avanzado preset (raw JSON)", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("Avanzado preset persists arbitrary JSONLogic with cross-question references", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    let createdSurveyId: number | null = null;
    let cleanedUp = false;
    const cleanup = async () => {
      if (cleanedUp || createdSurveyId == null) return;
      cleanedUp = true;
      const del = await page.request.delete(
        `/api/backend/admin/surveys/${createdSurveyId}`,
      );
      expect([200, 204, 404]).toContain(del.status());
    };

    try {
      // ── 1. Open builder v2 ────────────────────────────────────────────
      await page.goto("/dashboard/surveys/builder");
      await page.waitForLoadState("networkidle");

      // ── 2. Title ────────────────────────────────────────────────────────
      const titleInput = page.getByPlaceholder("Ej: Encuesta de campo Q2");
      await expect(titleInput).toBeVisible({ timeout: 15_000 });
      await titleInput.fill(SURVEY_TITLE);

      // ── 3. Add q_other (Texto corto) ────────────────────────────────────
      const textoCortoButton = page
        .getByRole("button", { name: /^Texto corto/ })
        .first();
      await expect(textoCortoButton).toBeVisible({ timeout: 10_000 });
      await textoCortoButton.click();

      const enunciadoTextarea = page.locator('textarea[maxlength="240"]');
      await expect(enunciadoTextarea).toBeVisible({ timeout: 10_000 });
      await enunciadoTextarea.fill(Q_OTHER_TEXT);

      // ── 4. Add q_check (auto-selected) ──────────────────────────────────
      await textoCortoButton.click();
      await expect(enunciadoTextarea).toHaveValue("", { timeout: 10_000 });
      await enunciadoTextarea.fill(Q_CHECK_TEXT);

      // ── 5. Open "Restricción de validez" → "Avanzado" tab ───────────────
      await page
        .getByRole("button", { name: /Restricción de validez/i })
        .click();
      const avanzadoTab = page
        .getByRole("button", { name: /^Avanzado$/ })
        .first();
      await expect(avanzadoTab).toBeVisible({ timeout: 10_000 });
      await avanzadoTab.click();

      // ── 6. Discover q_other's auto-generated key from the
      //      "Variables disponibles" reference list. The JsonLogic editor
      //      renders one <code>answers.<key></code> entry per available
      //      key; with only one other question in the survey, that's the
      //      key we want. ─────────────────────────────────────────────────
      const variablesDetails = page.getByText(/Variables disponibles \(1\)/);
      await expect(variablesDetails).toBeVisible({ timeout: 10_000 });
      await variablesDetails.click(); // expand <details>
      const keyCode = page.locator("code", { hasText: /^answers\./ }).first();
      await expect(keyCode).toBeVisible({ timeout: 5_000 });
      const otherRef = (await keyCode.textContent())?.trim() ?? "";
      expect(
        otherRef.startsWith("answers."),
        `Expected an answers.<key> reference, got "${otherRef}"`,
      ).toBeTruthy();
      const qOtherKey = otherRef.slice("answers.".length);
      expect(qOtherKey.length).toBeGreaterThan(0);

      // ── 7. Type the raw JSONLogic into the editor's textarea ────────────
      // ConstraintBuilder's Avanzado tab mounts a single mono-spaced
      // textarea (rows=5). We don't know q_check's own key yet — but the
      // backend reference validator only blocks self-cycles, so we use a
      // safe cross-question reference: q_other on both sides of an
      // identity check (always-true logically; meaningful here only as
      // round-trip evidence). The persisted AST must equal the input
      // verbatim.
      const expectedAst = {
        "==": [
          { var: `answers.${qOtherKey}` },
          { var: `answers.${qOtherKey}` },
        ],
      };
      const expressionTextarea = page.locator('textarea.font-mono[rows="5"]');
      await expect(expressionTextarea).toBeVisible({ timeout: 10_000 });
      await expressionTextarea.fill(JSON.stringify(expectedAst, null, 2));

      // The editor displays a "Expresión válida" badge on successful parse.
      await expect(page.getByText(/Expresión válida/)).toBeVisible({
        timeout: 10_000,
      });

      // ── 8. Save ─────────────────────────────────────────────────────────
      const saveButton = page.getByRole("button", { name: /^Crear encuesta$/ });
      await expect(saveButton).toBeEnabled({ timeout: 10_000 });
      await saveButton.click();

      await page.waitForURL(/\/dashboard\/surveys\/builder\?surveyId=\d+/, {
        timeout: 30_000,
      });
      const surveyIdRaw = new URL(page.url()).searchParams.get("surveyId");
      expect(surveyIdRaw).toBeTruthy();
      const surveyId = Number(surveyIdRaw);
      createdSurveyId = surveyId;

      // ── 9. Verify the constraint round-trips verbatim ───────────────────
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const v1 = (detail.versions ?? [])[0];
      expect(v1, "v1 should exist").toBeTruthy();
      const qCheck = (v1.questions ?? []).find(
        (q: { question_text: string }) => q.question_text === Q_CHECK_TEXT,
      );
      expect(
        qCheck,
        `question with text "${Q_CHECK_TEXT}" missing`,
      ).toBeTruthy();
      expect(qCheck.constraint_expression).toEqual(expectedAst);
    } finally {
      await cleanup();
    }
  });
});
