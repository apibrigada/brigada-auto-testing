/**
 * aud13-required-expr-parity.spec.ts
 *
 * AUD-13 — Backend parity for `is_required_expr` (A11 contract).
 *
 * Verifies that the backend's server-side evaluation of `is_required_expr`
 * mirrors the mobile FormEngine.isRequired() behaviour. This closes the
 * cross-system loop: A11 (backend) + C3 (mobile is_required_expr) + SB2-09-04
 * (CMS IsRequiredBuilder) all rely on the same JSONLogic evaluation logic.
 *
 * Test matrix (all engine_version=2, single batch item per case):
 *
 *   Case A  trigger HAS value  + conditional MISSING   → FAILED (form_required_violation)
 *   Case B  trigger NO value   + conditional MISSING   → SUCCESS (required = false)
 *   Case C  trigger HAS value  + conditional PRESENT   → SUCCESS (required = true, answered)
 *   Case D  is_required=true   + conditional MISSING   → FAILED  (static required fallback)
 *
 * Survey fixture:
 *   q_trigger      — text, is_required=false, no is_required_expr
 *   q_conditional  — text, is_required=false, is_required_expr = {"!!": {"var": "answers.q_trigger"}}
 *   q_always       — text, is_required=true  (static; Case D control)
 *
 * Auth: role_1 (admin) — CMS session. Admin has `submit_response` permission;
 * an assignment is created programmatically for the admin user.
 *
 * Cleanup: survey deleted in finally block (also accepts 404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-AUD13-RequiredExpr ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description:
      "AUD-13 — is_required_expr parity test. Auto-created, safe to delete.",
    survey_type: "normal",
    estimated_duration_minutes: 1,
    schema_version: 2, // engine_version 2 required for A11 validation
    questions: [
      {
        question_text: "Valor disparador (opcional)",
        question_type: "text",
        question_key: "q_trigger",
        order: 1,
        is_required: false,
        validation_rules: {},
      },
      {
        question_text:
          "Campo condicional (requerido si disparador tiene valor)",
        question_type: "text",
        question_key: "q_conditional",
        order: 2,
        is_required: false,
        // is_required_expr: required when q_trigger is truthy (non-empty)
        is_required_expr: { "!!": { var: "answers.q_trigger" } },
        validation_rules: {},
      },
      {
        question_text: "Siempre requerido",
        question_type: "text",
        question_key: "q_always",
        order: 3,
        is_required: true,
        validation_rules: {},
      },
    ],
  };
}

test.describe("AUD-13 — is_required_expr backend validation parity", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("is_required_expr evaluated server-side: true→required, false→optional", async ({
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

      // Verify engine_version=2 was set (required for A11)
      expect(v1.engine_version).toBe(2);

      const qTrigger = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_trigger",
      );
      const qConditional = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_conditional",
      );
      const qAlways = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_always",
      );
      expect(qTrigger?.id).toBeTruthy();
      expect(qConditional?.id).toBeTruthy();
      expect(qAlways?.id).toBeTruthy();
      expect(qConditional?.is_required_expr).toBeTruthy();

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

      // ── CASE A: trigger HAS value, conditional MISSING → FAILED ─────────
      const caseA = await submitBatch(`aud13-caseA-${Date.now()}`, [
        { question_id: qTrigger.id, answer_value: "disparador_presente" },
        { question_id: qAlways.id, answer_value: "siempre" },
        // q_conditional intentionally omitted
      ]);
      expect(
        caseA.status,
        `Case A: expected FAILED (required expr=true, field missing), got ${caseA.status}. Message: ${caseA.message}`,
      ).toBe("failed");
      expect(
        caseA.message ?? "",
        "Case A: error should mention form_required_violation",
      ).toContain("form_required_violation");

      // ── CASE B: trigger NO value, conditional MISSING → SUCCESS ──────────
      // q_trigger absent → is_required_expr evaluates to false → q_conditional optional
      const caseB = await submitBatch(`aud13-caseB-${Date.now()}`, [
        { question_id: qAlways.id, answer_value: "siempre" },
        // q_trigger absent → {"!!": null} = false
        // q_conditional absent → allowed
      ]);
      expect(
        caseB.status,
        `Case B: expected success (required expr=false, field absent), got ${caseB.status}. Message: ${caseB.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // ── CASE C: trigger HAS value, conditional PRESENT → SUCCESS ─────────
      const caseC = await submitBatch(`aud13-caseC-${Date.now()}`, [
        { question_id: qTrigger.id, answer_value: "disparador" },
        { question_id: qConditional.id, answer_value: "respuesta_condicional" },
        { question_id: qAlways.id, answer_value: "siempre" },
      ]);
      expect(
        caseC.status,
        `Case C: expected success (required expr=true, field present), got ${caseC.status}. Message: ${caseC.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // ── CASE D: static is_required=true, always field MISSING → FAILED ───
      const caseD = await submitBatch(`aud13-caseD-${Date.now()}`, [
        { question_id: qTrigger.id, answer_value: "algo" },
        { question_id: qConditional.id, answer_value: "algo" },
        // q_always intentionally omitted (is_required=true static)
      ]);
      expect(
        caseD.status,
        `Case D: expected FAILED (static is_required=true, field missing), got ${caseD.status}. Message: ${caseD.message}`,
      ).toBe("failed");
      expect(
        caseD.message ?? "",
        "Case D: error should mention form_required_violation",
      ).toContain("form_required_violation");

      // ── SUMMARY ──────────────────────────────────────────────────────────
      // A: FAILED  ✓ — required when trigger has value
      // B: SUCCESS ✓ — optional when trigger is absent
      // C: SUCCESS ✓ — required when trigger has value AND field answered
      // D: FAILED  ✓ — static is_required=true still enforced
    } finally {
      await cleanup();
    }
  });
});
