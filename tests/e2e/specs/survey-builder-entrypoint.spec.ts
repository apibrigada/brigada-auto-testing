/**
 * survey-builder-entrypoint.spec.ts
 *
 * SB2-ENTRY-04 — End-to-end coverage of the surveys-list → builder entrypoint.
 *
 * Covers:
 *   ENTRY-A  Admin clicks "Editar" in survey list dropdown → URL navigates
 *            to /dashboard/surveys/builder?surveyId=N and the builder loads.
 *   ENTRY-B  Admin clicks "Editar" from the survey detail version history
 *            (SB2-ENTRY-03 CTA) → same destination.
 *   PERM-01  User with publish_survey but NOT edit_survey (SCEN-03) navigates
 *            directly to /dashboard/surveys/builder?surveyId=N → PermissionDenied
 *            page is rendered.
 *
 * Auth: role_1 (admin) for ENTRY-A/B; QA_CREDS.SCEN03 for PERM-01.
 * Cleanup: DELETE survey after each relevant test (accepts 404).
 *
 * Prereq for PERM-01: seed_qa_permissions.py must have run (SCEN03 user exists).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { QA_CREDS, getApiToken } from "../fixtures/qa-credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-BuilderEntrypoint ${Date.now()}`;
}

function buildSurveyPayload(title: string) {
  return {
    title,
    description: "SB2-ENTRY-04 — entrypoint E2E. Safe to delete.",
    survey_type: "normal",
    schema_version: 2,
    questions: [
      {
        question_text: "Pregunta de prueba entrypoint",
        question_type: "text",
        question_key: "entry_q1",
        order: 1,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

// ─── ENTRY-A — survey list dropdown ───────────────────────────────────────

test.describe("SB2-ENTRY-04 ENTRY-A — surveys list Editar → builder", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("clicking Editar in list dropdown navigates to builder with surveyId", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();

    // ── 0. Seed survey via API ────────────────────────────────────────────
    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: buildSurveyPayload(title),
    });
    expect(
      createResp.ok(),
      `Create failed: ${createResp.status()} ${await createResp.text()}`,
    ).toBeTruthy();
    const created = await createResp.json();
    const surveyId: number = created.id;
    expect(surveyId).toBeGreaterThan(0);

    let cleanedUp = false;
    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      await page.request.delete(`/api/backend/admin/surveys/${surveyId}`);
    };

    try {
      // ── 1. Navigate to surveys list ───────────────────────────────────
      await page.goto("/dashboard/surveys");
      await expect(
        page.getByRole("heading", { name: /Encuestas/i }).first(),
      ).toBeVisible({ timeout: 15_000 });

      // ── 2. Find the row for our survey and open its actions dropdown ──
      const surveyRow = page.getByText(title).first();
      await expect(surveyRow).toBeVisible({ timeout: 15_000 });

      // Click the MoreVertical trigger in the same row. The table sticky
      // actions column holds a single DropdownMenuTrigger per row.
      // We look for the closest row ancestor and click the trigger within it.
      const row = page.locator("tr").filter({ has: page.getByText(title) });
      const menuTrigger = row.getByRole("button").last();
      await menuTrigger.click();

      // ── 3. Click "Editar" in the dropdown ─────────────────────────────
      const editItem = page.getByRole("menuitem", { name: /Editar/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click();

      // ── 4. Verify URL navigates to builder with correct surveyId ──────
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/surveys/builder\\?surveyId=${surveyId}`),
        { timeout: 15_000 },
      );

      // ── 5. Verify builder shell is rendered (header "Editar encuesta") ─
      await expect(
        page.getByRole("heading", { name: /Editar encuesta/i }).first(),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanup();
    }
  });
});

// ─── ENTRY-B — version history "Editar" Link (SB2-ENTRY-03) ──────────────

test.describe("SB2-ENTRY-04 ENTRY-B — version list Editar link → builder", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("Editar link on latest version row navigates to builder", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();

    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: buildSurveyPayload(title),
    });
    expect(createResp.ok()).toBeTruthy();
    const created = await createResp.json();
    const surveyId: number = created.id;

    let cleanedUp = false;
    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      await page.request.delete(`/api/backend/admin/surveys/${surveyId}`);
    };

    try {
      // Navigate to survey detail page
      await page.goto(`/dashboard/surveys/${surveyId}`);
      await expect(page.getByText(/Historial de Versiones/i)).toBeVisible({
        timeout: 15_000,
      });

      // The "Editar" Link button appears on the latest non-archived version row
      const editLink = page
        .getByRole("link", { name: /Editar/i })
        .filter({ hasText: /Editar/ })
        .first();
      await expect(editLink).toBeVisible({ timeout: 10_000 });
      await editLink.click();

      await expect(page).toHaveURL(
        new RegExp(`/dashboard/surveys/builder\\?surveyId=${surveyId}`),
        { timeout: 15_000 },
      );
      await expect(
        page.getByRole("heading", { name: /Editar encuesta/i }).first(),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanup();
    }
  });
});

// ─── PERM-01 — publisher cannot reach builder edit mode ───────────────────

test.describe("SB2-ENTRY-04 PERM-01 — publisher blocked from edit builder", () => {
  let scen03Token: string | null = null;

  test.beforeAll(async ({ request }) => {
    scen03Token = await getApiToken(request, QA_CREDS.SCEN03);
  });

  test("SCEN-03 navigating to builder?surveyId sees PermissionDenied", async ({
    page,
    request,
  }) => {
    test.skip(
      !scen03Token,
      "SCEN-03 user not available (seed_qa_permissions.py not run).",
    );
    test.setTimeout(60_000);

    // Create a survey as SCEN-03 — they have create_survey. If that also
    // fails, fall back to survey id=1 (must exist in any seeded env).
    let targetSurveyId = 1;
    const createResp = await request.post(
      `${process.env.API_BASE_URL ?? "http://localhost:8000"}/admin/surveys`,
      {
        headers: {
          Authorization: `Bearer ${scen03Token}`,
          "Content-Type": "application/json",
        },
        data: buildSurveyPayload(uniqueTitle()),
      },
    );
    if (createResp.ok()) {
      const body = await createResp.json();
      targetSurveyId = body.id ?? targetSurveyId;
    }

    // Log in as SCEN-03 via the UI login form
    const loginPage = new LoginPage(page);
    await loginPage.login({
      label: "SCEN-03",
      email: QA_CREDS.SCEN03.email,
      password: QA_CREDS.SCEN03.password,
    });

    // Navigate directly to builder in edit mode
    await page.goto(`/dashboard/surveys/builder?surveyId=${targetSurveyId}`);

    // Builder renders PermissionDenied when user lacks edit_survey
    await expect(page.getByText(/no tienes permiso para editar/i)).toBeVisible({
      timeout: 15_000,
    });

    // Must NOT navigate away to /dashboard/surveys — stays on builder URL
    expect(page.url()).toContain("/dashboard/surveys/builder");
  });
});
