/**
 * survey-v2-smoke.spec.ts
 *
 * B12 — Shadow run smoke test for Form Engine v2.
 *
 * Validates the end-to-end seed → publish → CMS visibility flow for a v2 survey
 * with `engine_version=2`, `relevance_expression`, and `constraint_expression`.
 *
 * The survey is created via the admin API (mirrors `scripts/seed_survey_v2.py`)
 * to avoid coupling to the in-progress survey builder UI. UI verification is
 * limited to the survey list (which is the canonical CMS reference for any
 * published survey).
 *
 * Cleanup: DELETE /admin/surveys/:id at end (also accepts 404 if already gone).
 *
 * Uses role_1 (admin) — assumes E2E_LOGIN_EMAIL_ROLE_1 / E2E_LOGIN_PASSWORD_ROLE_1.
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-V2 E2E Smoke ${Date.now()}`;
}

function buildV2SurveyPayload(title: string) {
  return {
    title,
    description:
      "Smoke test B12 — Form Engine v2 (relevance + constraint server-side).",
    survey_type: "normal",
    estimated_duration_minutes: 3,
    schema_version: 2,
    questions: [
      {
        question_text: "¿Cuál es tu edad?",
        question_type: "number",
        question_key: "edad_smoke",
        order: 1,
        is_required: true,
        validation_rules: { min: 0, max: 120, integer_only: true },
        constraint_expression: { ">=": [{ var: "answers.edad_smoke" }, 18] },
        constraint_message: "Debes ser mayor de edad (18+).",
      },
      {
        question_text: "¿Tienes hijos?",
        question_type: "yes_no",
        question_key: "tiene_hijos_smoke",
        order: 2,
        is_required: true,
        validation_rules: {},
      },
      {
        question_text: "¿Cuántos hijos tienes?",
        question_type: "number",
        question_key: "num_hijos_smoke",
        order: 3,
        is_required: true,
        validation_rules: { min: 1, max: 20, integer_only: true },
        relevance_expression: {
          "==": [{ var: "answers.tiene_hijos_smoke" }, true],
        },
      },
    ],
  };
}

test.describe("Form Engine v2 — shadow run smoke (B12)", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("creates a v2 survey via API, publishes it, and verifies CMS list visibility", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();
    const payload = buildV2SurveyPayload(title);

    // ── 1. Create v2 survey via admin API ──────────────────────────────────
    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: payload,
    });
    expect(
      createResp.ok(),
      `Create v2 survey failed: ${createResp.status()} ${await createResp.text()}`,
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
      // ── 2. Fetch survey detail and confirm engine_version=2 ──────────────
      const detailResp = await page.request.get(
        `/api/backend/admin/surveys/${surveyId}`,
      );
      expect(detailResp.ok()).toBeTruthy();
      const detail = await detailResp.json();
      const versions = detail.versions ?? [];
      expect(versions.length).toBeGreaterThan(0);
      const firstVersion = versions[0];
      const engineVersion =
        firstVersion.engine_version ?? firstVersion.schema_version;
      expect(engineVersion).toBe(2);

      // Confirm question_key + relevance_expression + constraint_expression
      // round-tripped through the API.
      const questions = firstVersion.questions ?? detail.questions ?? [];
      const byKey = new Map<string, Record<string, unknown>>();
      for (const q of questions) {
        if (q?.question_key) byKey.set(q.question_key, q);
      }
      expect(byKey.has("edad_smoke")).toBeTruthy();
      expect(byKey.has("tiene_hijos_smoke")).toBeTruthy();
      expect(byKey.has("num_hijos_smoke")).toBeTruthy();
      expect(byKey.get("edad_smoke")?.constraint_expression).toBeTruthy();
      expect(byKey.get("num_hijos_smoke")?.relevance_expression).toBeTruthy();

      // ── 3. Publish the first version ─────────────────────────────────────
      const publishResp = await page.request.post(
        `/api/backend/admin/surveys/${surveyId}/versions/${firstVersion.id}/publish`,
      );
      expect(
        publishResp.ok(),
        `Publish failed: ${publishResp.status()} ${await publishResp.text()}`,
      ).toBeTruthy();

      // ── 4. Verify it shows up in the CMS survey list UI ──────────────────
      await page.goto("/dashboard/surveys");
      await expect(
        page.getByRole("heading", { name: /Encuestas/i }).first(),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(title)).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup();
    }
  });
});
