/**
 * aud14b-label-expr-parity.spec.ts
 *
 * AUD-14b — Backend ↔ mobile parity for `label_expression`.
 *
 * Mirrors AUD-13 (`is_required_expr`) and AUD-14 (`constraint_expression`)
 * for the third "expression" column that the mobile FormEngine consumes
 * (B10): `label_expression`. Closes the testable lobe of G-Test-1
 * (`label_expression` lado parity admin-store ↔ mobile-form-schema). The
 * complementary "evaluated_label flows back to backend on submit" piece
 * stays open as G-Submit-1 — see doc 17 §15.6.
 *
 * Test surface (admin REST + mobile REST, no UI interaction):
 *
 *   1. Create survey v2 with question carrying
 *        `label_expression = {"cat": ["Hola, ", {"var": "answers.p_nombre"}]}`.
 *   2. Publish.
 *   3. GET admin survey detail → assert the question's `label_expression`
 *      round-trips (deep-equal to what was POSTed).
 *   4. Assign to admin (== mobile user for this fixture).
 *   5. GET `/mobile/surveys` → find this survey, find question in
 *      `form_schema.questions`, assert its `label_expression` === source.
 *      This is the contract the mobile FormEngine relies on: whatever the
 *      CMS author saves is what the device evaluates.
 *   6. Submit a response with `p_nombre = "Ana"` via batch ingest →
 *      backend accepts (label_expression has no validation side-effect
 *      server-side today; this is a smoke that the field doesn't break
 *      submission).
 *
 * Auth: role_1 (admin). Skipped if creds absent.
 *
 * Cleanup: DELETE survey in finally (accepts 200/204/404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

// The exact JSONLogic the mobile FormEngine evaluates client-side. Backend
// must persist + serve this byte-for-byte (modulo Pydantic dict reordering).
const LABEL_EXPR = {
  cat: ["Hola, ", { var: "answers.p_nombre" }],
};

function uniqueTitle(): string {
  return `QA-AUD14b-LabelExpr ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description:
      "AUD-14b — label_expression parity test. Auto-created, safe to delete.",
    survey_type: "normal",
    estimated_duration_minutes: 1,
    schema_version: 2,
    questions: [
      {
        question_text: "Nombre",
        question_type: "text",
        question_key: "p_nombre",
        order: 1,
        is_required: false,
        validation_rules: {},
      },
      {
        // Static text question whose displayed label is computed dynamically
        // by mobile from `label_expression` (e.g. `"Hola, Ana"`).
        question_text: "Saludo dinámico",
        question_type: "text",
        question_key: "q_saludo",
        order: 2,
        is_required: false,
        label_expression: LABEL_EXPR,
        validation_rules: {},
      },
    ],
  };
}

/**
 * JSONLogic deep-equal helper. Backend may re-serialize dicts; we compare
 * canonical JSON strings to be order-tolerant within objects (arrays stay
 * ordered).
 */
function canonical(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

test.describe("AUD-14b — label_expression backend ↔ mobile parity", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("label_expression round-trips through admin detail + mobile form_schema; submit accepts", async ({
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
      // ── 1. Admin detail: label_expression round-trip ────────────────────
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const v1 = (detail.versions ?? [])[0];
      expect(v1?.id).toBeTruthy();
      const versionId: number = v1.id;
      expect(v1.engine_version).toBe(2);

      const qSaludoAdmin = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_saludo",
      );
      const qNombreAdmin = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "p_nombre",
      );
      expect(qSaludoAdmin?.id).toBeTruthy();
      expect(qNombreAdmin?.id).toBeTruthy();
      expect(
        qSaludoAdmin.label_expression,
        "Admin detail must round-trip label_expression byte-for-byte",
      ).toEqual(LABEL_EXPR);
      // Sanity: question without label_expression stays null/undefined
      expect(qNombreAdmin.label_expression ?? null).toBeNull();

      // ── 2. Publish ───────────────────────────────────────────────────────
      const publishResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${versionId}/publish`,
      );
      expect(
        publishResp.ok(),
        `Publish failed: ${publishResp.status()} ${await publishResp.text()}`,
      ).toBeTruthy();

      // ── 3. Assign to admin (mobile user) ─────────────────────────────────
      const meResp = await page.request.get("/api/backend/mobile/me");
      expect(meResp.ok()).toBeTruthy();
      const me = await meResp.json();
      const adminUserId: number = me.id;

      const assignResp = await page.request.post("/api/backend/assignments", {
        data: { user_id: adminUserId, survey_id: surveyId },
      });
      expect(
        assignResp.ok(),
        `Assignment failed: ${assignResp.status()} ${await assignResp.text()}`,
      ).toBeTruthy();

      // ── 4. Mobile form_schema parity ─────────────────────────────────────
      const surveysResp = await page.request.get("/api/backend/mobile/surveys");
      expect(surveysResp.ok()).toBeTruthy();
      const surveysBody = await surveysResp.json();
      const mine = (surveysBody as Array<{ survey_id: number }>).find(
        (s) => s.survey_id === surveyId,
      );
      expect(
        mine,
        `/mobile/surveys did not include surveyId=${surveyId} after assignment`,
      ).toBeTruthy();
      const formSchema = (mine as { form_schema?: { questions?: unknown[] } })
        .form_schema;
      expect(formSchema, "Assigned survey must include form_schema").toBeTruthy();
      const fsQuestions = (formSchema?.questions ?? []) as Array<{
        question_key?: string;
        label_expression?: unknown;
      }>;
      const qSaludoMobile = fsQuestions.find(
        (q) => q.question_key === "q_saludo",
      );
      expect(
        qSaludoMobile,
        "form_schema.questions must contain q_saludo",
      ).toBeTruthy();
      expect(
        canonical(qSaludoMobile?.label_expression),
        "Mobile form_schema must serve the same label_expression that admin POSTed (B10 contract)",
      ).toBe(canonical(LABEL_EXPR));

      // ── 5. Submit response with p_nombre="Ana" (smoke) ───────────────────
      const clientId = `aud14b-${Date.now()}`;
      const batchResp = await page.request.post(
        "/api/backend/mobile/responses/batch",
        {
          data: {
            responses: [
              {
                survey_id: surveyId,
                version_id: versionId,
                client_id: clientId,
                answers: [
                  { question_id: qNombreAdmin.id, answer_value: "Ana" },
                  { question_id: qSaludoAdmin.id, answer_value: "" },
                ],
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
      const batchBody = await batchResp.json();
      const item = (batchBody.results ?? []).find(
        (r: { client_id: string }) => r.client_id === clientId,
      );
      expect(item, `No result entry for client_id ${clientId}`).toBeTruthy();
      expect(
        item.status,
        `Submission must succeed regardless of label_expression. Got ${item.status}: ${item.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // NOTE: the `evaluated_label` round-trip from mobile back to backend on
      // submit (so analytics can show "Hola, Ana" instead of "Saludo
      // dinámico") is intentionally NOT asserted here — that contract is
      // tracked under G-Submit-1 in doc 17 §15.6 and is deferred until the
      // mobile two-phase submit pipeline starts forwarding it.
    } finally {
      await cleanup();
    }
  });
});
