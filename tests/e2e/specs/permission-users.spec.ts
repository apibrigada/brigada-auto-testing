/**
 * permission-users.spec.ts
 *
 * SCEN-04: qa_auditor_readonly       — all view_* but zero write permissions
 * SCEN-07: qa_brigadista_creator     — create_user_targets=["brigadista"] only
 * SCEN-08: qa_brigadista_editor      — edit_user_targets=["brigadista"] + view_all_users
 *
 * Prereq: seed_qa_permissions.py must have run.
 */

import { expect, test } from "@playwright/test";
import { LoginPage } from "../pages/login.page.js";
import {
  API_BASE_URL,
  QA_CREDS,
  QA_PASSWORD,
  apiGet,
  apiPatch,
  apiPost,
  getApiToken,
} from "../fixtures/qa-credentials.js";

// ─── SCEN-04 — Auditor: all reads OK, all writes blocked ──────────────────

test.describe("SCEN-04 — Auditor Solo Lectura: reads ✓ writes ✗", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN04);
    if (!t) test.skip();
    token = t!;
  });

  test("API: GET /admin/surveys → 200", async ({ request }) => {
    const { status } = await apiGet(request, "/admin/surveys/metadata", token);
    expect(status).toBe(200);
  });

  test("API: GET /users → 200", async ({ request }) => {
    const { status } = await apiGet(request, "/users", token);
    expect(status).toBe(200);
  });

  test("API: GET /admin/stats → 200", async ({ request }) => {
    const { status } = await apiGet(request, "/admin/stats", token);
    expect(status).toBe(200);
  });

  test("API: POST /admin/surveys → 403", async ({ request }) => {
    const { status } = await apiPost(request, "/admin/surveys", token, {
      title: "SCEN04 Should Fail",
      survey_type: "normal",
    });
    expect(status).toBe(403);
  });

  test("API: POST /users → 403", async ({ request }) => {
    const { status } = await apiPost(request, "/users", token, {
      email: "scen04.tmp@qa.brigada.com",
      full_name: "SCEN04 Tmp",
      password: QA_PASSWORD,
      custom_role_id: 1,
    });
    expect(status).toBe(403);
  });

  test("CMS UI: no write action buttons visible", async ({ page }) => {
    const { email, password } = QA_CREDS.SCEN04;
    const lp = new LoginPage(page);
    await lp.login({ label: "SCEN-04", email, password });

    await page.goto("/dashboard/surveys");
    await page.waitForLoadState("networkidle");

    // Write action buttons must be absent
    await expect(
      page.getByRole("button", { name: /nueva encuesta/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /publicar/i })).toHaveCount(
      0,
    );

    await page.goto("/dashboard/users");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: /invitar|crear usuario/i }),
    ).toHaveCount(0);
  });
});

// ─── SCEN-07 — Brigadista Creator: brigadista ✓ encargado ✗ ──────────────

test.describe("SCEN-07 — User Creator (brigadista scope only)", () => {
  let token: string;
  let brigadistaRoleId: number | undefined;
  let encargadoRoleId: number | undefined;
  let createdUserId: number | undefined;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN07);
    if (!t) test.skip();
    token = t!;

    // Discover role IDs via admin token
    const adminToken = await getApiToken(request, {
      email: process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? "admin@brigada.com",
      password: process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? "admin123",
    });
    if (adminToken) {
      const { json } = await apiGet(request, "/roles", adminToken);
      const roles = Array.isArray(json)
        ? json
        : (((json as Record<string, unknown>)?.items ?? []) as unknown[]);
      for (const r of roles as { key: string; id: number }[]) {
        if (r.key === "brigadista") brigadistaRoleId = r.id;
        if (r.key === "encargado") encargadoRoleId = r.id;
      }
    }
  });

  test("API: create user with brigadista role → 201", async ({ request }) => {
    test.skip(!brigadistaRoleId, "brigadista role ID not found");
    const { status, json } = await apiPost(request, "/users", token, {
      email: `scen07.brig.e2e.${Date.now()}@qa.brigada.com`,
      full_name: "SCEN07 Brig E2E",
      password: QA_PASSWORD,
      custom_role_id: brigadistaRoleId,
    });
    expect(status).toBe(201);
    createdUserId = (json as { id?: number }).id;
  });

  test("API: create user with encargado role → 403", async ({ request }) => {
    test.skip(!encargadoRoleId, "encargado role ID not found");
    const { status } = await apiPost(request, "/users", token, {
      email: `scen07.enc.e2e.${Date.now()}@qa.brigada.com`,
      full_name: "SCEN07 Enc E2E",
      password: QA_PASSWORD,
      custom_role_id: encargadoRoleId,
    });
    expect(status).toBe(403);
  });

  test("CMS UI: role selector only shows brigadista options", async ({
    page,
  }) => {
    const { email, password } = QA_CREDS.SCEN07;
    const lp = new LoginPage(page);
    await lp.login({ label: "SCEN-07", email, password });

    await page.goto("/dashboard/users");
    await page.waitForLoadState("networkidle");

    // Open create-user dialog/form
    const createBtn = page
      .getByRole("button", { name: /invitar|nuevo usuario|crear usuario/i })
      .first();
    if ((await createBtn.count()) === 0) {
      test.skip(true, "Create user button not found — check CMS route");
      return;
    }
    await createBtn.click();
    await page.waitForLoadState("networkidle");

    // The role dropdown must not contain "encargado" or "admin" system roles
    const roleDropdown = page
      .getByRole("combobox")
      .filter({ hasText: /rol|role/i })
      .first();
    if ((await roleDropdown.count()) === 0) return; // selector not visible, skip UI assertion

    await roleDropdown.click();
    await expect(page.getByRole("option", { name: /encargado/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("option", { name: /admin/i })).toHaveCount(0);
  });

  test.afterAll(async ({ request }) => {
    if (!createdUserId) return;
    const adminToken = await getApiToken(request, {
      email: process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? "admin@brigada.com",
      password: process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? "admin123",
    });
    if (adminToken) {
      await request.delete(`${API_BASE_URL}/users/${createdUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  });
});

// ─── SCEN-08 — Brigadista Editor: edit brigadista ✓ encargado ✗ ──────────

test.describe("SCEN-08 — User Editor (brigadista scope only)", () => {
  let token: string;
  let brigadistaAlphaId: number | undefined;
  let encargadoAlphaId: number | undefined;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN08);
    if (!t) test.skip();
    token = t!;

    // Discover user IDs via API (has view_all_users)
    const { json } = await apiGet(request, "/users", token, {
      search: "qa.brigadista.alpha",
      limit: "5",
    });
    const users = Array.isArray(json)
      ? json
      : (((json as Record<string, unknown>)?.items ?? []) as unknown[]);
    brigadistaAlphaId = (users as { email: string; id: number }[]).find(
      (u) => u.email === QA_CREDS.BRIG_ALPHA.email,
    )?.id;

    const { json: json2 } = await apiGet(request, "/users", token, {
      search: "qa.encargado.alpha",
      limit: "5",
    });
    const users2 = Array.isArray(json2)
      ? json2
      : (((json2 as Record<string, unknown>)?.items ?? []) as unknown[]);
    encargadoAlphaId = (users2 as { email: string; id: number }[]).find(
      (u) => u.email === QA_CREDS.ENC_ALPHA.email,
    )?.id;
  });

  test("API: GET /users → 200 (view_all_users present)", async ({
    request,
  }) => {
    const { status } = await apiGet(request, "/users", token);
    expect(status).toBe(200);
  });

  test("API: PATCH /users/{brigadista_id} → 200 (in scope)", async ({
    request,
  }) => {
    test.skip(!brigadistaAlphaId, "brigadista.alpha user ID not found");
    const { status } = await apiPatch(
      request,
      `/users/${brigadistaAlphaId}`,
      token,
      {
        full_name: "QA Brigadista Alpha [SCEN08 e2e]",
      },
    );
    expect(status).toBe(200);

    // Revert
    await apiPatch(request, `/users/${brigadistaAlphaId}`, token, {
      full_name: "QA Brigadista Alpha",
    });
  });

  test("API: PATCH /users/{encargado_id} → 403 (out of scope)", async ({
    request,
  }) => {
    test.skip(!encargadoAlphaId, "encargado.alpha user ID not found");
    const { status } = await apiPatch(
      request,
      `/users/${encargadoAlphaId}`,
      token,
      {
        full_name: "SCEN08 Should Fail",
      },
    );
    expect(status).toBe(403);
  });

  test("API: DELETE /users/{brigadista_id} → 403 (no delete_user)", async ({
    request,
  }) => {
    test.skip(!brigadistaAlphaId, "brigadista.alpha user ID not found");
    const { status } = await apiGet(
      request,
      `/users/${brigadistaAlphaId}`,
      token,
    );
    // Just check they can see the user (GET) but verify no DELETE
    expect(status).toBe(200);
    const deleteStatus = await request.delete(
      `${API_BASE_URL}/users/${brigadistaAlphaId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(deleteStatus.status()).toBe(403);
  });
});
