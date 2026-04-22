/**
 * publish-diff-dialog.spec.ts
 *
 * D6 smoke — verify that `PublishChecklistDialog`'s DiffSection renders the
 * correct buckets when republishing a survey:
 *
 *   1. Create v1 with questions q_a + q_b → publish v1.
 *   2. Create draft v2 via `/draft-from-published`.
 *   3. Mutate v2:
 *        - q_a's `question_text` is changed (→ "changed" bucket).
 *        - q_b is dropped (→ "removed" bucket).
 *        - q_c is added (→ "added" bucket).
 *   4. Open the survey detail UI, click "Publicar" on v2, verify the
 *      DiffSection summary renders `1 añadidas · 1 eliminadas · 1 modificadas`
 *      and that each labelled bucket lists the expected question text.
 *
 * The dialog is informational; we do NOT click "Confirmar y publicar"
 * (publishing v2 would archive v1 and complicate teardown). Cleanup
 * deletes the survey at the end.
 *
 * Auth: role_1 (admin). Cleanup: DELETE survey in finally block.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

const Q_A_KEY = "diff_q_a";
const Q_B_KEY = "diff_q_b";
const Q_C_KEY = "diff_q_c";
const Q_A_OLD_TEXT = "Color preferido";
const Q_A_NEW_TEXT = "Color preferido (revisado)";
const Q_B_TEXT = "Edad del encuestado";
const Q_C_TEXT = "Comentario libre nuevo";

function uniqueTitle(): string {
  return `QA-D6-DiffDialog ${Date.now()}`;
}

function v1Payload(title: string) {
  return {
    title,
    description: "D6 — diff dialog smoke. Auto-created, safe to delete.",
    survey_type: "normal",
    estimated_duration_minutes: 1,
    schema_version: 2,
    questions: [
      {
        question_text: Q_A_OLD_TEXT,
        question_type: "text",
        question_key: Q_A_KEY,
        order: 1,
        is_required: false,
        validation_rules: {},
      },
      {
        question_text: Q_B_TEXT,
        question_type: "text",
        question_key: Q_B_KEY,
        order: 2,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

function v2UpdatePayload(title: string) {
  // PUT /admin/surveys/{id} replaces the draft questions in-place.
  // q_a is mutated (text changed), q_b is dropped, q_c is added.
  return {
    title,
    description: "D6 — diff dialog smoke (v2 draft).",
    survey_type: "normal",
    estimated_duration_minutes: 1,
    schema_version: 2,
    questions: [
      {
        question_text: Q_A_NEW_TEXT,
        question_type: "text",
        question_key: Q_A_KEY,
        order: 1,
        is_required: false,
        validation_rules: {},
      },
      {
        question_text: Q_C_TEXT,
        question_type: "text",
        question_key: Q_C_KEY,
        order: 2,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

test.describe("D6 — PublishChecklistDialog DiffSection smoke", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("dialog enumerates +1 added (q_c) +1 removed (q_b) +1 changed (q_a)", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();

    // ── 0. Create v1 ──────────────────────────────────────────────────────
    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: v1Payload(title),
    });
    expect(
      createResp.ok(),
      `Create v1 failed: ${createResp.status()} ${await createResp.text()}`,
    ).toBeTruthy();
    const created = await createResp.json();
    const surveyId: number = created.id;

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
      // ── 1. Publish v1 ──────────────────────────────────────────────────
      const detail1 = await (
        await page.request.get(`/api/backend/admin/surveys/${surveyId}`)
      ).json();
      const v1 = (detail1.versions ?? [])[0];
      expect(v1?.id).toBeTruthy();
      const publishV1 = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${v1.id}/publish`,
      );
      expect(publishV1.ok()).toBeTruthy();

      // ── 2. Clone published → draft v2 ─────────────────────────────────
      const cloneResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/draft-from-published`,
      );
      expect(cloneResp.status()).toBe(201);
      const draftV2 = await cloneResp.json();
      expect(draftV2.version_number).toBe(2);
      const v2Id: number = draftV2.id;

      // ── 3. Mutate draft v2: change q_a, drop q_b, add q_c ──────────────
      const updateResp = await page.request.put(
        `/api/backend/admin/surveys/${surveyId}`,
        { data: v2UpdatePayload(title) },
      );
      expect(
        updateResp.ok(),
        `PUT draft failed: ${updateResp.status()} ${await updateResp.text()}`,
      ).toBeTruthy();

      // Sanity-check: re-read survey, confirm v2 now has q_a (new text), q_c.
      const detail2 = await (
        await page.request.get(`/api/backend/admin/surveys/${surveyId}`)
      ).json();
      const v2After = (detail2.versions ?? []).find(
        (v: { id: number }) => v.id === v2Id,
      );
      expect(v2After, "v2 must still exist after PUT").toBeTruthy();
      const v2Keys = (v2After.questions ?? [])
        .map((q: { question_key?: string }) => q.question_key)
        .filter(Boolean)
        .sort();
      expect(v2Keys).toEqual([Q_A_KEY, Q_C_KEY]);
      const qAUpdated = (v2After.questions ?? []).find(
        (q: { question_key?: string }) => q.question_key === Q_A_KEY,
      );
      expect(qAUpdated?.question_text).toBe(Q_A_NEW_TEXT);

      // ── 4. Open survey detail UI, click "Publicar" on v2 ───────────────
      await page.goto(`/dashboard/surveys/${surveyId}`);
      await page.waitForLoadState("networkidle");

      // The page lists versions; v2 is the unpublished one with a Publicar
      // button. There is exactly one such button (v1 is already published,
      // v2 is the draft).
      const publishButton = page
        .getByRole("button", { name: /^Publicar$/ })
        .first();
      await expect(publishButton).toBeVisible({ timeout: 15_000 });
      await publishButton.click();

      // ── 5. Wait for the dialog and its diff summary to render ──────────
      // Dialog header shows "Reemplazar versión publicada por v2" because
      // v1 is already published.
      await expect(
        page.getByText(/Reemplazar versión publicada por v2/),
      ).toBeVisible({ timeout: 15_000 });

      // DiffSection renders the summary line with all three counters.
      await expect(
        page.getByText(/1 añadidas · 1 eliminadas · 1 modificadas/),
      ).toBeVisible({ timeout: 10_000 });

      // Each bucket's title carries its count.
      await expect(page.getByText(/Añadidas \(1\)/)).toBeVisible();
      await expect(page.getByText(/Eliminadas \(1\)/)).toBeVisible();
      await expect(page.getByText(/Modificadas \(1\)/)).toBeVisible();

      // Bucket entries reference the correct question_text. Use partial
      // matching since each `<li>` also includes the symbol prefix and
      // (for "changed") the field-name suffix.
      await expect(page.getByText(new RegExp(Q_C_TEXT))).toBeVisible();
      await expect(page.getByText(new RegExp(Q_B_TEXT))).toBeVisible();
      await expect(page.getByText(new RegExp(Q_A_NEW_TEXT))).toBeVisible();

      // The "changed" entry annotates which fields differ — q_a only had
      // its question_text mutated.
      await expect(page.getByText(/question_text/)).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
