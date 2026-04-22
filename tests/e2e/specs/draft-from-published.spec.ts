/**
 * draft-from-published.spec.ts
 *
 * SB2-08-04 — End-to-end coverage of the "edit a published survey" flow:
 *
 *   Escenario A:  publicada sin draft     → POST draft-from-published creates v2
 *   Escenario B:  publicada + draft       → second POST returns 409, then DELETE
 *                                           draft + POST again succeeds
 *   Trigger:      direct UPDATE of a question in the published version is
 *                 blocked by `fn_block_published_version_mutation` (SB2-08-01b)
 *
 * The CMS UI portion is not exercised here (kept API-level for stability and
 * speed); the dialog/banner are unit-friendly React components and would be
 * better covered by component tests. This spec asserts the BACKEND contract
 * the dialog/banner depends on.
 *
 * Cleanup: deletes the survey at the end (also accepts 404 if already gone).
 *
 * Uses role_1 (admin) — assumes E2E_LOGIN_EMAIL_ROLE_1 / E2E_LOGIN_PASSWORD_ROLE_1.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-DraftFromPublished ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description:
      "SB2-08-04 — Edit-published flow: clone, conflict, discard, trigger guard.",
    survey_type: "normal",
    estimated_duration_minutes: 2,
    schema_version: 2,
    questions: [
      {
        question_text: "¿Cuál es tu edad?",
        question_type: "number",
        question_key: "dfp_edad",
        order: 1,
        is_required: true,
        validation_rules: { min: 0, max: 120, integer_only: true },
      },
      {
        question_text: "Color favorito",
        question_type: "single_choice",
        question_key: "dfp_color",
        order: 2,
        is_required: false,
        validation_rules: {},
        options: [
          { option_text: "Rojo", order: 1 },
          { option_text: "Azul", order: 2 },
        ],
      },
    ],
  };
}

test.describe("SB2-08-04 — draft-from-published flow", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("Escenario A + B + trigger immutability", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();

    // ── 0. Create + publish a v1 survey ────────────────────────────────────
    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: buildSurveyPayload(title),
    });
    expect(
      createResp.ok(),
      `Create failed: ${createResp.status()} ${await createResp.text()}`,
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
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const v1 = (detail.versions ?? [])[0];
      expect(v1?.id).toBeTruthy();
      const v1Id = v1.id as number;

      const publishResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${v1Id}/publish`,
      );
      expect(publishResp.ok()).toBeTruthy();

      // ── ESCENARIO A — clone published → 201 with draft v2 ────────────────
      const cloneResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/draft-from-published`,
      );
      expect(
        cloneResp.status(),
        `Expected 201 on first clone, got ${cloneResp.status()} ${await cloneResp.text()}`,
      ).toBe(201);
      const draft = await cloneResp.json();
      expect(draft.is_published).toBe(false);
      expect(draft.version_number).toBe(2);
      expect(Array.isArray(draft.questions)).toBeTruthy();
      // question_key must be preserved across the clone for analytics safety
      const draftKeys = (draft.questions ?? [])
        .map((q: { question_key?: string }) => q.question_key)
        .filter(Boolean)
        .sort();
      expect(draftKeys).toEqual(["dfp_color", "dfp_edad"]);
      // IDs MUST be fresh (deep clone)
      const draftQIds = (draft.questions ?? []).map(
        (q: { id: number }) => q.id,
      );
      const v1QIds = (v1.questions ?? []).map((q: { id: number }) => q.id);
      for (const id of draftQIds) {
        expect(v1QIds).not.toContain(id);
      }

      // ── ESCENARIO B — second clone → 409 draft_already_exists ────────────
      const conflictResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/draft-from-published`,
      );
      expect(conflictResp.status()).toBe(409);
      const conflictBody = await conflictResp.json();
      expect(conflictBody.detail?.code).toBe("draft_already_exists");
      expect(conflictBody.detail?.draft_version_id).toBe(draft.id);

      // ── ESCENARIO B alt — DELETE draft + clone again succeeds ────────────
      const deleteResp = await page.request.delete(
        `/api/backend/admin/surveys/${surveyId}/versions/${draft.id}`,
      );
      expect(deleteResp.status()).toBe(204);

      const recloneResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/draft-from-published`,
      );
      expect(recloneResp.status()).toBe(201);
      const fresh = await recloneResp.json();
      expect(fresh.id).not.toBe(draft.id);
      expect(fresh.version_number).toBe(3);

      // ── DELETE published version → 409 cannot_delete_published ──────────
      const blockedDelResp = await page.request.delete(
        `/api/backend/admin/surveys/${surveyId}/versions/${v1Id}`,
      );
      expect(blockedDelResp.status()).toBe(409);
      const blockedBody = await blockedDelResp.json();
      expect(blockedBody.detail?.code).toBe("cannot_delete_published");

      // ── PG TRIGGER — UPDATE on a published question goes through the
      // backend (which has no public mutation endpoint for that), but the
      // trigger is verified by the backend smoke `scripts/smoke_sb2_08.py`.
      // Here we simply confirm the published version still exposes its
      // original questions intact (proxy: the v1 ID still resolves and has
      // the same question keys).
      const v1AfterResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(v1AfterResp.ok()).toBeTruthy();
      const detailAfter = await v1AfterResp.json();
      const v1After = (detailAfter.versions ?? []).find(
        (v: { id: number }) => v.id === v1Id,
      );
      expect(v1After?.is_published).toBe(true);
      const v1AfterKeys = (v1After?.questions ?? [])
        .map((q: { question_key?: string }) => q.question_key)
        .filter(Boolean)
        .sort();
      expect(v1AfterKeys).toEqual(["dfp_color", "dfp_edad"]);
    } finally {
      await cleanup();
    }
  });
});
