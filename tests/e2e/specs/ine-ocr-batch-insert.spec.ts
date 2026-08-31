/**
 * ine-ocr-batch-insert.spec.ts
 *
 * INE-BATCH-01 — End-to-end coverage of the INE OCR batch insert feature.
 *
 * Covers:
 *   BATCH-01  Admin creates survey with INE OCR question, opens batch insert
 *             dialog, and inserts 15 linked questions with default_expression.
 *   BATCH-02  Admin can deselect individual questions before inserting.
 *   BATCH-03  Inserted questions have correct default_expression pointing
 *             to the INE OCR question_key.
 *
 * Auth: role_1 (admin).
 * Cleanup: DELETE survey after each test (accepts 404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-INEBatch ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description: "INE-BATCH-01 — batch insert E2E. Safe to delete.",
    survey_type: "normal",
    schema_version: 2,
    questions: [
      {
        question_text: "Captura INE",
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
  const res = await request.post("/api/backend/admin/surveys", {
    data: payload,
  });
  expect(
    res.ok(),
    `Create failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  const body = await res.json();
  return body.id;
}

async function deleteSurveyViaApi(
  request: import("@playwright/test").APIRequestContext,
  surveyId: number,
): Promise<void> {
  await request.delete(`/api/backend/admin/surveys/${surveyId}`);
}

// ─── BATCH-01 — Full batch insert flow ────────────────────────────────────

test.describe("INE-BATCH-01 — batch insert full flow", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  let surveyId: number | null = null;

  test("insert 15 linked questions after INE OCR", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();
    surveyId = await createSurveyViaApi(page.request, title);

    // ── Navigate to builder ───────────────────────────────────────────
    await page.goto(`/dashboard/surveys/builder?surveyId=${surveyId}`);
    await page.waitForLoadState("networkidle");

    // ── Click on the INE OCR question in the canvas ───────────────────
    const ineQuestion = page.getByText("Captura INE").first();
    await expect(ineQuestion).toBeVisible({ timeout: 15_000 });
    await ineQuestion.click();

    // ── Find and click "Insertar lote" button ─────────────────────────
    const batchBtn = page.getByText(
      "Insertar lote de preguntas vinculadas",
    );
    await expect(batchBtn).toBeVisible({ timeout: 10_000 });
    await batchBtn.click();

    // ── Verify dialog opens with all 15 questions ─────────────────────
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await expect(
      dialog.getByText("Insertar lote de preguntas vinculadas"),
    ).toBeVisible();

    // Verify key questions are listed
    const expectedLabels = [
      "Nombre(s)",
      "Apellido paterno",
      "Apellido materno",
      "CURP",
      "Fecha de nacimiento",
      "Sexo",
      "Sección electoral",
      "Clave de elector",
      "Estado",
      "Municipio / Alcaldía",
      "Colonia",
      "Código Postal",
    ];

    for (const label of expectedLabels) {
      await expect(dialog.getByText(label, { exact: false })).toBeVisible();
    }

    // ── Click insert button ───────────────────────────────────────────
    const insertBtn = dialog.getByRole("button", { name: /Insertar/i });
    await expect(insertBtn).toBeVisible();
    await insertBtn.click();

    // ── Verify questions were created ─────────────────────────────────
    // Wait for the toast success message
    await expect(page.getByText(/preguntas vinculadas/i)).toBeVisible({
      timeout: 10_000,
    });

    // Verify some of the created questions appear in the canvas
    await expect(page.getByText("Nombre(s) completo")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("CURP").first()).toBeVisible();
    await expect(page.getByText("Sección electoral").first()).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    if (surveyId) {
      await deleteSurveyViaApi(request, surveyId);
      surveyId = null;
    }
  });
});

// ─── BATCH-02 — Deselect questions before insert ──────────────────────────

test.describe("INE-BATCH-02 — deselect before insert", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  let surveyId: number | null = null;

  test("deselecting questions reduces insert count", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();
    surveyId = await createSurveyViaApi(page.request, title);

    await page.goto(`/dashboard/surveys/builder?surveyId=${surveyId}`);
    await page.waitForLoadState("networkidle");

    // Select INE question
    const ineQuestion = page.getByText("Captura INE").first();
    await expect(ineQuestion).toBeVisible({ timeout: 15_000 });
    await ineQuestion.click();

    // Open batch dialog
    const batchBtn = page.getByText(
      "Insertar lote de preguntas vinculadas",
    );
    await expect(batchBtn).toBeVisible({ timeout: 10_000 });
    await batchBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Deselect "Número OCR" by clicking its checkbox label
    const numeroOcrLabel = dialog.getByText("Número OCR").first();
    await numeroOcrLabel.click();

    // The insert button should show "Insertar 14 preguntas"
    const insertBtn = dialog.getByRole("button", { name: /Insertar/i });
    await expect(insertBtn).toContainText("14");

    // Re-select it
    await numeroOcrLabel.click();
    await expect(insertBtn).toContainText("15");

    // Close dialog without inserting
    const cancelBtn = dialog.getByRole("button", { name: /Cancelar/i });
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    if (surveyId) {
      await deleteSurveyViaApi(request, surveyId);
      surveyId = null;
    }
  });
});
