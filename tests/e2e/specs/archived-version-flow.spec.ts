/**
 * archived-version-flow.spec.ts
 *
 * SB2-08-06 + SB2-08-06b + SB2-08-06c — End-to-end coverage for the
 * archived-version safety net.
 *
 * Flow:
 *
 *   1. Admin creates a survey + publishes v1.
 *   2. Admin POSTs `/admin/surveys/{id}/versions/{vid}/archive`.
 *      → expect 200 + `version_id`/`survey_id` in body.
 *   3. GET survey detail confirms v1 row still present with
 *      `is_archived: true` and `is_published: false` (soft archive).
 *   4. POST `/mobile/assignments/archived-warnings` with `{survey_id, version_number: 1}`
 *      → expect `archived[]` to contain that pair, with `archived_since`
 *        being a non-null ISO timestamp (SB2-08-06c contract).
 *   5. POST same archive endpoint again → 409 `already_archived`.
 *   6. POST archive on a *non-existent* version → 404 `version_not_found`.
 *
 * Cleanup: DELETE survey in finally (accepts 200/204/404).
 *
 * Auth: role_1 (admin). Skipped if creds absent.
 *
 * NOTE: this spec exercises only the API surface (CMS UI panel for archive
 * is covered manually). The mobile drafts banner is a UI-only behaviour and
 * is exercised by the existing mobile smoke (`smoke_sb2_08_06.py` +
 * Maestro/manual). Here we lock the cross-system contract: archive →
 * detail still has it → mobile warnings include the timestamp.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-SB2-08-06 Archive Flow ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description: "SB2-08-06 archive flow E2E. Auto-created, safe to delete.",
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

test.describe("SB2-08-06 — Archive lifecycle (publish → archive → warnings)", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("publish v1 → archive → detail keeps row → archived-warnings exposes archived_since timestamp", async ({
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
      // ── 1. Get version id ─────────────────────────────────────────────────
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const v1 = (detail.versions ?? [])[0];
      expect(v1?.id).toBeTruthy();
      const versionId: number = v1.id;
      const versionNumber: number = v1.version_number ?? 1;

      // ── 2. Publish v1 ────────────────────────────────────────────────────
      const publishResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${versionId}/publish`,
      );
      expect(
        publishResp.ok(),
        `Publish failed: ${publishResp.status()} ${await publishResp.text()}`,
      ).toBeTruthy();

      // Capture the moment just before archiving so we can sanity-check the
      // returned `archived_since` is monotonic (>= this timestamp).
      const beforeArchiveMs = Date.now();

      // ── 3. Archive v1 ────────────────────────────────────────────────────
      const archiveResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${versionId}/archive`,
      );
      expect(
        archiveResp.ok(),
        `Archive failed: ${archiveResp.status()} ${await archiveResp.text()}`,
      ).toBeTruthy();
      const archiveBody = await archiveResp.json();
      expect(archiveBody.version_id).toBe(versionId);
      expect(archiveBody.survey_id).toBe(surveyId);

      // ── 4. Survey detail still has v1, now archived ──────────────────────
      const postArchiveDetailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(postArchiveDetailResp.ok()).toBeTruthy();
      const postArchiveDetail = await postArchiveDetailResp.json();
      const archivedRow = (postArchiveDetail.versions ?? []).find(
        (v: { id: number }) => v.id === versionId,
      );
      expect(
        archivedRow,
        "Archived version row was removed from detail (must be soft-archive)",
      ).toBeTruthy();
      expect(
        archivedRow.is_archived,
        "Detail must surface is_archived=true after archive",
      ).toBe(true);
      expect(
        archivedRow.is_published,
        "Detail must surface is_published=false after archive",
      ).toBe(false);

      // ── 5. archived-warnings exposes archived_since (SB2-08-06c) ─────────
      const warnResp = await page.request.post(
        "/api/backend/mobile/assignments/archived-warnings",
        {
          data: {
            items: [{ survey_id: surveyId, version_number: versionNumber }],
          },
        },
      );
      expect(
        warnResp.ok(),
        `Archived-warnings failed: ${warnResp.status()} ${await warnResp.text()}`,
      ).toBeTruthy();
      const warnBody = await warnResp.json();
      const entry = (warnBody.archived ?? []).find(
        (w: { survey_id: number; version_number: number }) =>
          w.survey_id === surveyId && w.version_number === versionNumber,
      );
      expect(
        entry,
        `Archived-warnings did not include surveyId=${surveyId} v${versionNumber}`,
      ).toBeTruthy();
      expect(
        entry.archived_since,
        "SB2-08-06c regression: archived_since must be a non-null ISO timestamp",
      ).toBeTruthy();
      const archivedSinceMs = Date.parse(entry.archived_since);
      expect(
        Number.isFinite(archivedSinceMs),
        `archived_since not parseable as ISO date: ${entry.archived_since}`,
      ).toBeTruthy();
      // Allow up to 60s clock drift between server and CI runner.
      expect(archivedSinceMs).toBeGreaterThanOrEqual(beforeArchiveMs - 60_000);
      expect(archivedSinceMs).toBeLessThanOrEqual(Date.now() + 60_000);

      // ── 6. Archive again → 409 already_archived ──────────────────────────
      const reArchiveResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${versionId}/archive`,
      );
      expect(reArchiveResp.status()).toBe(409);
      const reArchiveBody = await reArchiveResp.json();
      // FastAPI wraps `detail` (object) under `detail` or surfaces it directly
      // through Next's proxy depending on shape; assert the code is somewhere
      // in the body string.
      expect(JSON.stringify(reArchiveBody)).toContain("already_archived");

      // ── 7. Archive non-existent version → 404 version_not_found ──────────
      const ghostResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/999999999/archive`,
      );
      expect(ghostResp.status()).toBe(404);
      const ghostBody = await ghostResp.json();
      expect(JSON.stringify(ghostBody)).toContain("version_not_found");
    } finally {
      await cleanup();
    }
  });
});
