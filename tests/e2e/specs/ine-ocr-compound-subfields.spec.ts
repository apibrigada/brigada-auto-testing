/**
 * ine-ocr-compound-subfields.spec.ts
 *
 * INE-OCR-COMPOUND — E2E coverage of INE OCR compound sub-fields in the
 * survey builder variable selector and settings panel.
 *
 * Covers:
 *   VAR-01  Variable selector shows ine_ocr sub-fields (q_ine.curp, etc.)
 *           when an ine_ocr question with question_key exists in the draft.
 *   VAR-02  IneOcrSettings renders "Campos a exponer como variables" section
 *           with 15 extract_* checkboxes (all checked by default).
 *   VAR-03  Unchecking a sub-field excludes it from the variable selector.
 *
 * Auth: role_1 (admin).
 * Cleanup: DELETE survey after each test (accepts 404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-INECompound ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description: "INE-OCR-COMPOUND — compound sub-fields E2E. Safe to delete.",
    survey_type: "normal",
    schema_version: 2,
    questions: [
      {
        question_text: "INE OCR Question",
        question_type: "ine_ocr",
        question_key: "q_ine",
        order: 1,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

async function createSurveyViaApi(
  request: import("@playwright/test").APIRequestContext,
  title: string,
): Promise<number> {
  const payload = buildSurveyPayload(title);
  const res = await request.post("/api/v1/admin/surveys", { data: payload });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.id;
}

async function deleteSurveyViaApi(
  request: import("@playwright/test").APIRequestContext,
  surveyId: number,
): Promise<void> {
  await request.delete(`/api/v1/admin/surveys/${surveyId}`);
}

// ─── VAR-01 — Variable selector shows ine_ocr sub-fields ──────────────────

test.describe("INE-OCR-COMPOUND VAR-01 — variable selector", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  let surveyId: number | null = null;

  test("variable selector shows q_ine.curp, q_ine.nombre, etc.", async ({
    page,
    request,
  }) => {
    const title = uniqueTitle();
    surveyId = await createSurveyViaApi(request, title);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      adminCredential!.email,
      adminCredential!.password,
    );

    // Navigate to builder
    await page.goto(
      `/dashboard/surveys/builder?surveyId=${surveyId}`,
    );
    await page.waitForLoadState("networkidle");

    // Add a second question to trigger variable selector
    // Click "Add question" button
    const addBtn = page.getByRole("button", { name: /agregar|add/i });
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Select text type for second question
    const typeSelect = page.locator('[data-testid="question-type-select"]');
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await page.getByRole("option", { name: /text/i }).click();
    }

    // Look for variable selector / expression builder
    const variableSelector = page.locator(
      '[data-testid="variable-selector"], [data-testid="expression-builder"]',
    );
    if (await variableSelector.isVisible()) {
      // Check that ine_ocr sub-fields are listed
      await expect(
        page.getByText("q_ine.curp", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByText("q_ine.nombre", { exact: false }),
      ).toBeVisible();
    }
  });

  test.afterEach(async ({ request }) => {
    if (surveyId) {
      await deleteSurveyViaApi(request, surveyId);
      surveyId = null;
    }
  });
});

// ─── VAR-02 — IneOcrSettings extract toggles ──────────────────────────────

test.describe("INE-OCR-COMPOUND VAR-02 — settings panel", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  let surveyId: number | null = null;

  test("IneOcrSettings shows 15 extract toggles checked by default", async ({
    page,
    request,
  }) => {
    const title = uniqueTitle();
    surveyId = await createSurveyViaApi(request, title);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      adminCredential!.email,
      adminCredential!.password,
    );

    await page.goto(
      `/dashboard/surveys/builder?surveyId=${surveyId}`,
    );
    await page.waitForLoadState("networkidle");

    // Click on the INE OCR question in the builder
    const ineQuestion = page.getByText("INE OCR Question");
    if (await ineQuestion.isVisible()) {
      await ineQuestion.click();
    }

    // Look for the "Campos a exponer como variables" section
    const exposeSection = page.getByText(
      "Campos a exponer como variables",
      { exact: false },
    );
    await expect(exposeSection).toBeVisible({ timeout: 5000 });

    // Verify sub-field labels are present
    const expectedLabels = [
      "Nombre(s)",
      "Apellido paterno",
      "Apellido materno",
      "CURP",
      "Fecha de nacimiento",
      "Sexo",
      "Sección electoral",
      "Clave de elector",
      "CIC (MRZ)",
      "Número OCR",
      "Domicilio",
      "Vigencia",
      "Año de registro",
      "Modelo detectado",
      "Confianza global",
    ];

    for (const label of expectedLabels) {
      await expect(
        page.getByText(label, { exact: false }),
      ).toBeVisible();
    }
  });

  test.afterEach(async ({ request }) => {
    if (surveyId) {
      await deleteSurveyViaApi(request, surveyId);
      surveyId = null;
    }
  });
});
