/**
 * permission-privilege-escalation.spec.ts
 *
 * SCEN-12: qa_wildcard_manager
 *   — create/edit/delete/reset_password targets=["*"]
 *   — the wildcard must NOT allow modifying the system admin (admin@brigada.com)
 *   — does NOT have manage_access_control → cannot create/delete roles
 *
 * Prereq: seed_qa_permissions.py must have run.
 */

import { expect, test } from "@playwright/test";
import {
  API_BASE_URL,
  QA_CREDS,
  apiGet,
  apiPost,
  apiPatch,
  getApiToken,
} from "../fixtures/qa-credentials.js";

test.describe("SCEN-12 — Privilege Escalation via Wildcard Targets", () => {
  let token: string;
  let adminPrincipalId: number | undefined;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN12);
    if (!t) test.skip();
    token = t!;

    // Discover the system admin user ID
    const adminEmail = process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? "admin@brigada.com";
    const { json } = await apiGet(request, "/users", token, {
      search: adminEmail,
      limit: "10",
    });
    const users = Array.isArray(json)
      ? json
      : ((json as Record<string, unknown>)?.items ?? []) as unknown[];
    adminPrincipalId = (users as { email: string; id: number }[]).find(
      (u) => u.email === adminEmail,
    )?.id;
  });

  test("API: GET /users → 200 (has view_all_users)", async ({ request }) => {
    const { status } = await apiGet(request, "/users", token);
    expect(status).toBe(200);
  });

  test("API: PATCH /users/{admin_principal_id} → 403 (CRITICAL: wildcard must not reach system admin)", async ({ request }) => {
    test.skip(!adminPrincipalId, "Admin principal user ID not found");

    const { status } = await apiPatch(request, `/users/${adminPrincipalId}`, token, {
      full_name: "SCEN12 Wildcard Escalation Test",
    });
    expect(
      status,
      `🚨 CRITICAL: SCEN-12 wildcard manager was able to PATCH the system admin (id=${adminPrincipalId}). targets=['*'] must not reach is_system users.`,
    ).toBe(403);
  });

  test("API: DELETE /users/{admin_principal_id} → 403 (CRITICAL: wildcard cannot delete admin)", async ({ request }) => {
    test.skip(!adminPrincipalId, "Admin principal user ID not found");

    const resp = await request.delete(`${API_BASE_URL}/users/${adminPrincipalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(
      resp.status(),
      `🚨 CRITICAL: SCEN-12 was able to DELETE the system admin. This is a privilege escalation bug.`,
    ).toBe(403);
  });

  test("API: POST /roles → 403 (no manage_access_control)", async ({ request }) => {
    const { status } = await apiPost(request, "/roles", token, {
      key: `scen12_priv_esc_${Date.now()}`,
      display_name: "SCEN12 Should Fail",
      permissions: [],
    });
    expect(status).toBe(403);
  });

  test("API: POST /users/reset-password/{admin_id} → 403", async ({ request }) => {
    test.skip(!adminPrincipalId, "Admin principal user ID not found");

    const { status } = await apiPost(
      request,
      `/users/reset-password/${adminPrincipalId}`,
      token,
      {},
    );
    expect(status).toBe(403);
  });
});
