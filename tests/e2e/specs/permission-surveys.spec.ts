/**
 * permission-surveys.spec.ts
 *
 * SCEN-02: qa_survey_creator   — create+edit but NOT publish
 * SCEN-03: qa_survey_publisher — publish-only, cannot create or edit
 * SCEN-06: qa_survey_scoped    — view_surveys (not view_all) + allowed_survey_ids=[2 IDs]
 *
 * Prereq: seed_qa_permissions.py + seed_qa_surveys.py must have run.
 */

import { expect, test } from "@playwright/test";
import { LoginPage } from "../pages/login.page.js";
import {
  API_BASE_URL,
  QA_CREDS,
  apiGet,
  apiPost,
  getApiToken,
} from "../fixtures/qa-credentials.js";

// ─── SCEN-02 — Survey Creator (no publish) ────────────────────────────────

test.describe("SCEN-02 — Survey Creator: create ✓ edit ✓ publish ✗", () => {
  let token: string;
  let createdSurveyId: number | undefined;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN02);
    if (!t) test.skip();
    token = t!;
  });

  test("API: POST /admin/surveys → 201 (has create_survey)", async ({
    request,
  }) => {
    const { status, json } = await apiPost(request, "/admin/surveys", token, {
      title: "SCEN02 E2E Tmp Survey",
      survey_type: "normal",
    });
    expect(status).toBe(201);
    createdSurveyId = (json as { id?: number }).id;
  });

  test("API: POST .../publish → 403 (missing publish_survey)", async ({
    request,
  }) => {
    test.skip(!createdSurveyId, "Needs survey from previous test");
    // Get version_id first
    const { json: detail } = await apiGet(
      request,
      `/admin/surveys/${createdSurveyId}`,
      token,
    );
    const versionId =
      ((detail as Record<string, unknown>)?.current_version as { id?: number })
        ?.id ??
      ((detail as Record<string, unknown[]>)?.versions as { id: number }[])?.[0]
        ?.id;
    if (!versionId) {
      test.skip(true, "Could not resolve version_id");
      return;
    }
    const { status } = await apiPost(
      request,
      `/admin/surveys/${createdSurveyId}/versions/${versionId}/publish`,
      token,
      {},
    );
    expect(status).toBe(403);
  });

  test("CMS UI: Publish button is absent/disabled on survey detail page", async ({
    page,
  }) => {
    const { email, password } = QA_CREDS.SCEN02;
    const lp = new LoginPage(page);
    await lp.login({ label: "SCEN-02", email, password });

    await page.goto("/dashboard/surveys");
    await page.waitForLoadState("networkidle");
    // Open first available survey
    await page
      .locator("table tbody tr, [data-testid='survey-row']")
      .first()
      .click();
    await page.waitForLoadState("networkidle");

    const publishBtn = page.getByRole("button", { name: /publicar/i });
    const isAbsent = (await publishBtn.count()) === 0;
    const isDisabled = !isAbsent && (await publishBtn.isDisabled());

    expect(
      isAbsent || isDisabled,
      "Publish button must be absent or disabled for SCEN-02",
    ).toBe(true);
  });

  test.afterAll(async ({ request }) => {
    if (!createdSurveyId || !token) return;
    // Cleanup: delete the tmp survey with admin token
    const adminToken = await getApiToken(request, {
      email: process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? "admin@brigada.com",
      password: process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? "admin123",
    });
    if (adminToken) {
      await request.delete(`${API_BASE_URL}/admin/surveys/${createdSurveyId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });
});

// ─── SCEN-03 — Survey Publisher (no create / no edit) ─────────────────────

test.describe("SCEN-03 — Survey Publisher: publish ✓ create ✗ edit ✗", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN03);
    if (!t) test.skip();
    token = t!;
  });

  test("API: POST /admin/surveys → 403 (missing create_survey)", async ({
    request,
  }) => {
    const { status } = await apiPost(request, "/admin/surveys", token, {
      title: "SCEN03 Should Fail",
      survey_type: "normal",
    });
    expect(status).toBe(403);
  });

  test("API: GET /admin/surveys → 200 (has view_surveys)", async ({
    request,
  }) => {
    const { status } = await apiGet(request, "/admin/surveys/metadata", token);
    expect(status).toBe(200);
  });

  test("CMS UI: Nueva Encuesta button is absent", async ({ page }) => {
    const { email, password } = QA_CREDS.SCEN03;
    const lp = new LoginPage(page);
    await lp.login({ label: "SCEN-03", email, password });

    await page.goto("/dashboard/surveys");
    await page.waitForLoadState("networkidle");

    const createBtn = page.getByRole("button", { name: /nueva encuesta/i });
    await expect(createBtn).toHaveCount(0);
  });
});

// ─── SCEN-06 — Scoped Surveys (allowed_survey_ids=[2]) ────────────────────

test.describe("SCEN-06 — Scoped Encargado: only 2 surveys accessible", () => {
  let token: string;
  let inScopeId: number | undefined;
  let outOfScopeId: number | undefined;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN06);
    if (!t) test.skip();
    token = t!;

    // Get the list to find in-scope ID
    const { json } = await apiGet(request, "/admin/surveys/metadata", token);
    const items = Array.isArray(json)
      ? json
      : (((json as Record<string, unknown>)?.items ?? []) as unknown[]);
    inScopeId = (items[0] as { id?: number })?.id;

    // Find an out-of-scope survey using admin token
    const adminToken = await getApiToken(request, {
      email: process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? "admin@brigada.com",
      password: process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? "admin123",
    });
    if (adminToken) {
      const { json: allJson } = await apiGet(
        request,
        "/admin/surveys/metadata",
        adminToken,
        { limit: "20" },
      );
      const allItems = Array.isArray(allJson)
        ? allJson
        : (((allJson as Record<string, unknown>)?.items ?? []) as unknown[]);
      const scopedIds = new Set((items as { id?: number }[]).map((s) => s.id));
      outOfScopeId = (allItems as { id?: number }[]).find(
        (s) => !scopedIds.has(s.id),
      )?.id;
    }
  });

  test("API: GET /admin/surveys/metadata returns exactly 2 surveys", async ({
    request,
  }) => {
    const { status, json } = await apiGet(
      request,
      "/admin/surveys/metadata",
      token,
    );
    expect(status).toBe(200);
    const items = Array.isArray(json)
      ? json
      : (((json as Record<string, unknown>)?.items ?? []) as unknown[]);
    expect(
      items.length,
      "SCEN-06: scoped user must see exactly 2 surveys",
    ).toBe(2);
  });

  test("API: in-scope survey detail → 200", async ({ request }) => {
    test.skip(!inScopeId, "No in-scope survey ID resolved");
    const { status } = await apiGet(
      request,
      `/admin/surveys/${inScopeId}`,
      token,
    );
    expect(status).toBe(200);
  });

  test("API: out-of-scope survey detail → 403 or 404", async ({ request }) => {
    test.skip(!outOfScopeId, "No out-of-scope survey ID resolved");
    const { status } = await apiGet(
      request,
      `/admin/surveys/${outOfScopeId}`,
      token,
    );
    expect(
      [403, 404],
      `Expected 403 or 404 for out-of-scope survey, got ${status}`,
    ).toContain(status);
  });

  test("API: responses for out-of-scope survey → 403 or 404", async ({
    request,
  }) => {
    test.skip(!outOfScopeId, "No out-of-scope survey ID resolved");
    const { status } = await apiGet(request, `/admin/responses`, token, {
      survey_id: outOfScopeId!,
    });
    expect(
      [403, 404],
      `Expected 403 or 404 for out-of-scope responses, got ${status}`,
    ).toContain(status);
  });

  test("CMS UI: survey list shows exactly 2 rows", async ({ page }) => {
    const { email, password } = QA_CREDS.SCEN06;
    const lp = new LoginPage(page);
    await lp.login({ label: "SCEN-06", email, password });

    await page.goto("/dashboard/surveys");
    await page.waitForLoadState("networkidle");

    // Count survey rows — use a broad locator that matches table rows under surveys
    const rows = page
      .locator("table tbody tr")
      .filter({ hasNot: page.locator("td[colspan]") });
    await expect(rows).toHaveCount(2, { timeout: 10_000 });
  });
});
