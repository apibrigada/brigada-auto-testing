/**
 * aud14-constraint-expr-parity.spec.ts
 *
 * AUD-14 — Backend parity for `constraint_expression` (A10 contract).
 *
 * Verifies that the backend's server-side evaluation of `constraint_expression`
 * mirrors the mobile FormEngine.evaluateConstraint() behaviour. Closes the
 * cross-system loop: A10 (backend `collect_constraint_violations`) +
 * mobile B9 (FormEngine constraint inline) + CMS SB2-09-03 (ConstraintBuilder)
 * all rely on the same JSONLogic evaluation logic.
 *
 * Test matrix (all engine_version=2, single batch item per case):
 *
 *   Case A  value VIOLATES expression               → FAILED (form_constraint_violation)
 *   Case B  value SATISFIES expression              → SUCCESS
 *   Case C  field ABSENT (empty/null)               → SUCCESS (constraint skipped)
 *   Case D  second constraint VIOLATED (different)  → FAILED (form_constraint_violation)
 *
 * Survey fixture:
 *   q_color   — text, constraint_expression = {"==":[{"var":"answers.q_color"},"rojo"]}
 *               constraint_message = "El color debe ser rojo"
 *   q_email   — text, constraint_expression = {"in":["@", {"var":"answers.q_email"}]}
 *               constraint_message = "Debe contener @"
 *   q_filler  — text, no constraint (control field, always optional)
 *
 * Auth: role_1 (admin) — CMS session. Admin has `submit_response` permission;
 * an assignment is created programmatically for the admin user. Mirrors
 * exactly the auth pattern used by `aud13-required-expr-parity.spec.ts`.
 *
 * Cleanup: survey deleted in finally block (also accepts 404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-AUD14-ConstraintExpr ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description:
      "AUD-14 — constraint_expression parity test. Auto-created, safe to delete.",
    survey_type: "normal",
    estimated_duration_minutes: 1,
    schema_version: 2, // engine_version 2 required for A10 validation
    questions: [
      {
        question_text: "Color preferido (debe ser rojo)",
        question_type: "text",
        question_key: "q_color",
        order: 1,
        is_required: false,
        // Constraint: value must equal "rojo" exactly.
        constraint_expression: {
          "==": [{ var: "answers.q_color" }, "rojo"],
        },
        constraint_message: "El color debe ser rojo",
        validation_rules: {},
      },
      {
        question_text: "Email (debe contener @)",
        question_type: "text",
        question_key: "q_email",
        order: 2,
        is_required: false,
        // Constraint: value must contain "@".
        constraint_expression: {
          in: ["@", { var: "answers.q_email" }],
        },
        constraint_message: "Debe contener @",
        validation_rules: {},
      },
      {
        question_text: "Comentario libre (sin constraint)",
        question_type: "text",
        question_key: "q_filler",
        order: 3,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

test.describe("AUD-14 — constraint_expression backend validation parity", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("constraint_expression evaluated server-side: value violates → 400, value satisfies → ok, absent → skipped", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();

    // ── 0. Create survey ──────────────────────────────────────────────────
    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: buildSurveyPayload(title),
    });
    expect(
      createResp.ok(),
      `Create survey failed: ${createResp.status()} ${await createResp.text()}`,
    ).toBeTruthy();
    const created = await createResp.json();
    const surveyId: number = created.id;
    expect(surveyId).toBeTruthy();

    let cleanedUp = false;
    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      const del = await page.request.delete(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect([200, 204, 404]).toContain(del.status());
    };

    try {
      // ── 1. Get version and question IDs ─────────────────────────────────
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const v1 = (detail.versions ?? [])[0];
      expect(v1?.id).toBeTruthy();
      const versionId: number = v1.id;

      // Verify engine_version=2 was set (required for A10)
      expect(v1.engine_version).toBe(2);

      const qColor = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_color",
      );
      const qEmail = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_email",
      );
      const qFiller = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_filler",
      );
      expect(qColor?.id).toBeTruthy();
      expect(qEmail?.id).toBeTruthy();
      expect(qFiller?.id).toBeTruthy();
      // Sanity-check that constraint round-tripped through admin storage.
      expect(qColor?.constraint_expression).toBeTruthy();
      expect(qEmail?.constraint_expression).toBeTruthy();

      // ── 2. Publish ───────────────────────────────────────────────────────
      const publishResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${versionId}/publish`,
      );
      expect(
        publishResp.ok(),
        `Publish failed: ${publishResp.status()} ${await publishResp.text()}`,
      ).toBeTruthy();

      // ── 3. Get current user ID (admin = mobile user for this test) ───────
      const meResp = await page.request.get("/api/backend/mobile/me");
      expect(
        meResp.ok(),
        `GET /mobile/me failed: ${meResp.status()} ${await meResp.text()}`,
      ).toBeTruthy();
      const meData = await meResp.json();
      const adminUserId: number = meData.id;
      expect(adminUserId).toBeTruthy();

      // ── 4. Assign survey to admin ────────────────────────────────────────
      const assignResp = await page.request.post("/api/backend/assignments", {
        data: { user_id: adminUserId, survey_id: surveyId },
      });
      expect(
        assignResp.ok(),
        `Assignment failed: ${assignResp.status()} ${await assignResp.text()}`,
      ).toBeTruthy();

      // ── HELPER: submit a batch item and return its result entry ──────────
      const submitBatch = async (
        clientId: string,
        answers: Array<{ question_id: number; answer_value: unknown }>,
      ) => {
        const batchResp = await page.request.post(
          "/api/backend/mobile/responses/batch",
          {
            data: {
              responses: [
                {
                  survey_id: surveyId,
                  version_id: versionId,
                  client_id: clientId,
                  answers,
                  completed_at: new Date().toISOString(),
                  started_at: new Date().toISOString(),
                },
              ],
            },
          },
        );
        expect(
          batchResp.ok(),
          `Batch POST failed HTTP: ${batchResp.status()} ${await batchResp.text()}`,
        ).toBeTruthy();
        const body = await batchResp.json();
        const item = (body.results ?? []).find(
          (r: { client_id: string }) => r.client_id === clientId,
        );
        expect(
          item,
          `No result entry found for client_id ${clientId}`,
        ).toBeTruthy();
        return item as {
          status: string;
          message?: string;
          reject_category?: string;
        };
      };

      // ── CASE A: value VIOLATES constraint → FAILED ──────────────────────
      // q_color = "azul" violates `q_color == "rojo"`.
      const caseA = await submitBatch(`aud14-caseA-${Date.now()}`, [
        { question_id: qColor.id, answer_value: "azul" },
        { question_id: qEmail.id, answer_value: "valid@example.com" },
      ]);
      expect(
        caseA.status,
        `Case A: expected FAILED (constraint violation on q_color), got ${caseA.status}. Message: ${caseA.message}`,
      ).toBe("failed");
      expect(
        caseA.message ?? "",
        "Case A: error should mention form_constraint_violation",
      ).toContain("form_constraint_violation");

      // ── CASE B: both constraints SATISFIED → SUCCESS ────────────────────
      const caseB = await submitBatch(`aud14-caseB-${Date.now()}`, [
        { question_id: qColor.id, answer_value: "rojo" },
        { question_id: qEmail.id, answer_value: "valid@example.com" },
        { question_id: qFiller.id, answer_value: "comentario" },
      ]);
      expect(
        caseB.status,
        `Case B: expected success (both constraints satisfied), got ${caseB.status}. Message: ${caseB.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // ── CASE C: constrained fields ABSENT → SUCCESS (constraint skipped) ─
      // Backend `evaluate_constraint` skips the check when value is null/empty.
      // Mirrors the mobile B9 contract: constraint applies only to provided values.
      const caseC = await submitBatch(`aud14-caseC-${Date.now()}`, [
        { question_id: qFiller.id, answer_value: "solo filler" },
      ]);
      expect(
        caseC.status,
        `Case C: expected success (constrained fields absent), got ${caseC.status}. Message: ${caseC.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // ── CASE D: second constraint VIOLATED (q_email missing @) → FAILED ─
      // Sanity check that constraint enforcement is per-field, not just on
      // the first failing question encountered.
      const caseD = await submitBatch(`aud14-caseD-${Date.now()}`, [
        { question_id: qColor.id, answer_value: "rojo" },
        { question_id: qEmail.id, answer_value: "no-arroba" },
      ]);
      expect(
        caseD.status,
        `Case D: expected FAILED (constraint violation on q_email), got ${caseD.status}. Message: ${caseD.message}`,
      ).toBe("failed");
      expect(
        caseD.message ?? "",
        "Case D: error should mention form_constraint_violation",
      ).toContain("form_constraint_violation");

      // ── SUMMARY ──────────────────────────────────────────────────────────
      // A: FAILED  ✓ — q_color != "rojo" violated
      // B: SUCCESS ✓ — both constraints satisfied
      // C: SUCCESS ✓ — constrained fields absent (skipped per A10 contract)
      // D: FAILED  ✓ — q_email missing "@"
    } finally {
      await cleanup();
    }
  });
});
