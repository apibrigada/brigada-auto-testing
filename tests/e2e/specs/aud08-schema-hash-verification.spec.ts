/**
 * aud08-schema-hash-verification.spec.ts
 *
 * AUD-08 fase 2 — Schema hash verification regression net.
 *
 * Backend already enforces this contract today
 * (`app/services/response_service.py::_async_validate_version_window` raises
 * 409 on mismatch — verified 2026-04-22). This spec locks the behaviour so
 * future refactors can't silently disable the stale-schema guard.
 *
 * Contract (from doc 17 §11.5.6 / 18-arquitectura-base-de-datos.md):
 *
 *   1. Backend computes `survey_versions.schema_hash` on publish (SHA-256
 *      over question order + text + type + required + validation_rules +
 *      options).
 *   2. Mobile sends `schema_hash` from the cached form_schema in every
 *      `SurveyResponseCreate` of a batch payload.
 *   3. Backend rejects the item with 409 when
 *      `schema_hash.lower() != version.schema_hash.lower()`.
 *   4. Backend allows the item when `schema_hash` is null/missing
 *      (legacy mobile clients pre-AUD-08).
 *
 * Test matrix (all engine_version=2, single batch item per case):
 *
 *   Case A  schema_hash matches server                → SUCCESS
 *   Case B  schema_hash mismatched (intentional bad)  → FAILED, 409 detail
 *           "Schema hash mismatch"
 *   Case C  schema_hash absent (null)                 → SUCCESS (legacy)
 *
 * Auth: role_1 (admin) — fixture identical to AUD-13/14.
 *
 * Cleanup: DELETE survey in finally (accepts 200/204/404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-AUD08-SchemaHash ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description:
      "AUD-08 fase 2 — schema_hash verification. Auto-created, safe to delete.",
    survey_type: "normal",
    estimated_duration_minutes: 1,
    schema_version: 2,
    questions: [
      {
        question_text: "Color preferido",
        question_type: "text",
        question_key: "q_color",
        order: 1,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

test.describe("AUD-08 fase 2 — schema_hash 409 enforcement", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("backend rejects mismatched schema_hash with 409, accepts matching + missing hashes", async ({
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
      // ── 1. Publish + capture schema_hash from server ─────────────────────
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const v1 = (detail.versions ?? [])[0];
      expect(v1?.id).toBeTruthy();
      const versionId: number = v1.id;
      const qColor = (v1.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === "q_color",
      );
      expect(qColor?.id).toBeTruthy();

      const publishResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${versionId}/publish`,
      );
      expect(publishResp.ok()).toBeTruthy();

      // Re-fetch detail post-publish to get the computed schema_hash. The
      // hash is set inside `publish_version()` so it is only present after
      // publish.
      const postPublishResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(postPublishResp.ok()).toBeTruthy();
      const postPublish = await postPublishResp.json();
      const publishedVersion = (postPublish.versions ?? []).find(
        (v: { id: number }) => v.id === versionId,
      );
      const serverSchemaHash: string | null =
        publishedVersion?.schema_hash ?? null;
      expect(
        serverSchemaHash,
        "Server must compute schema_hash on publish (AUD-08 fase 1 contract)",
      ).toBeTruthy();
      expect(typeof serverSchemaHash).toBe("string");
      expect((serverSchemaHash as string).length).toBeGreaterThan(8);

      // ── 2. Assign survey to admin (mobile user) ──────────────────────────
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

      // ── HELPER ───────────────────────────────────────────────────────────
      const submitWithHash = async (
        clientId: string,
        schemaHash: string | null | undefined,
      ) => {
        const item: Record<string, unknown> = {
          survey_id: surveyId,
          version_id: versionId,
          client_id: clientId,
          answers: [{ question_id: qColor.id, answer_value: "rojo" }],
          completed_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
        };
        if (schemaHash !== undefined) {
          item.schema_hash = schemaHash;
        }
        const batchResp = await page.request.post(
          "/api/backend/mobile/responses/batch",
          { data: { responses: [item] } },
        );
        expect(
          batchResp.ok(),
          `Batch POST HTTP failed: ${batchResp.status()} ${await batchResp.text()}`,
        ).toBeTruthy();
        const body = await batchResp.json();
        const result = (body.results ?? []).find(
          (r: { client_id: string }) => r.client_id === clientId,
        );
        expect(result, `No result entry for client_id ${clientId}`).toBeTruthy();
        return result as {
          status: string;
          message?: string;
          reject_category?: string;
        };
      };

      // ── CASE A: matching hash → SUCCESS ──────────────────────────────────
      const caseA = await submitWithHash(
        `aud08-caseA-${Date.now()}`,
        serverSchemaHash,
      );
      expect(
        caseA.status,
        `Case A: matching schema_hash must succeed. Got ${caseA.status}: ${caseA.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // ── CASE B: mismatched hash → FAILED with 409-style message ──────────
      const caseB = await submitWithHash(
        `aud08-caseB-${Date.now()}`,
        "0000000000000000000000000000000000000000000000000000000000000000",
      );
      expect(
        caseB.status,
        `Case B: mismatched schema_hash must FAIL. Got ${caseB.status}: ${caseB.message}`,
      ).toBe("failed");
      // Backend detail in `_async_validate_version_window` is verbatim:
      //   "Schema hash mismatch. Refresh the survey version and retry submission."
      expect(
        caseB.message ?? "",
        "Case B: error must mention schema_hash mismatch",
      ).toMatch(/schema hash/i);
      // 409 is a business reject — sync engine must not auto-retry forever.
      expect(
        (caseB.reject_category ?? "").toLowerCase(),
        "Case B: 409 must be classified as business_reject (no auto-retry)",
      ).toContain("business");

      // ── CASE C: missing hash → SUCCESS (legacy mobile clients) ───────────
      // `schema_hash: undefined` (omitted from payload) — the field is
      // Optional[str] = None so backend skips the comparison entirely. This
      // protects pre-AUD-08 mobile builds from breaking after a server
      // upgrade.
      const caseC = await submitWithHash(
        `aud08-caseC-${Date.now()}`,
        undefined,
      );
      expect(
        caseC.status,
        `Case C: missing schema_hash must succeed (legacy contract). Got ${caseC.status}: ${caseC.message}`,
      ).toMatch(/^(success|synced|duplicate)$/);

      // ── SUMMARY ──────────────────────────────────────────────────────────
      // A: SUCCESS ✓ — matching hash
      // B: FAILED  ✓ — mismatched hash → 409
      // C: SUCCESS ✓ — null hash → backend skips check
    } finally {
      await cleanup();
    }
  });
});
