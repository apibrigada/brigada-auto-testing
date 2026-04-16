/**
 * permission-assignments.spec.ts
 *
 * SCEN-05: qa_brigadista_manager
 *   — has manage_brigadista_assignments but NOT manage_assignments
 *   — can assign brigadistas, blocked on encargados
 *
 * Prereq: seed_qa_permissions.py must have run.
 */

import { expect, test } from "@playwright/test";
import {
  QA_CREDS,
  apiGet,
  apiPost,
  getApiToken,
} from "../fixtures/qa-credentials.js";

test.describe("SCEN-05 — manage_brigadista_assignments vs manage_assignments", () => {
  let token: string;
  let surveyId: number | undefined;
  let brigadistaAlphaId: number | undefined;
  let encargadoAlphaId: number | undefined;

  test.beforeAll(async ({ request }) => {
    const t = await getApiToken(request, QA_CREDS.SCEN05);
    if (!t) test.skip();
    token = t!;

    // Get admin token to resolve IDs
    const adminToken = await getApiToken(request, {
      email: process.env.E2E_LOGIN_EMAIL_ROLE_1 ?? "admin@brigada.com",
      password: process.env.E2E_LOGIN_PASSWORD_ROLE_1 ?? "admin123",
    });
    if (!adminToken) {
      test.skip(true, "Admin token not available — set E2E_LOGIN_EMAIL_ROLE_1");
      return;
    }

    // Find a published QA survey
    const { json: surveysJson } = await apiGet(request, "/admin/surveys/metadata", adminToken, {
      limit: "20",
    });
    const surveys = Array.isArray(surveysJson)
      ? surveysJson
      : ((surveysJson as Record<string, unknown>)?.items ?? []) as unknown[];
    const published = (surveys as { title: string; id: number; status?: string }[]).find(
      (s) => s.title.startsWith("QA") && s.status === "published",
    );
    surveyId = published?.id;

    // Find user IDs
    const { json: usersJson } = await apiGet(request, "/users", adminToken, { limit: "100" });
    const users = Array.isArray(usersJson)
      ? usersJson
      : ((usersJson as Record<string, unknown>)?.items ?? []) as unknown[];
    for (const u of users as { email: string; id: number }[]) {
      if (u.email === QA_CREDS.BRIG_ALPHA.email) brigadistaAlphaId = u.id;
      if (u.email === QA_CREDS.ENC_ALPHA.email)  encargadoAlphaId  = u.id;
    }
  });

  test("API: assign brigadista → 200 or 201 (manage_brigadista_assignments present)", async ({ request }) => {
    test.skip(!surveyId || !brigadistaAlphaId, "Missing surveyId or brigadistaAlphaId");

    const { status } = await apiPost(request, "/assignments/team", token, {
      survey_ids:       [surveyId],
      user_ids:         [brigadistaAlphaId],
      target_role:      "brigadista",
      group_name:       "SCEN05 E2E Brig Test",
      group_description: "Created by SCEN-05 Playwright",
    });
    expect([200, 201], `Expected 200 or 201, got ${status}`).toContain(status);
  });

  test("API: assign encargado → 403 (manage_assignments absent)", async ({ request }) => {
    test.skip(!surveyId || !encargadoAlphaId, "Missing surveyId or encargadoAlphaId");

    const { status } = await apiPost(request, "/assignments/team", token, {
      survey_ids:       [surveyId],
      user_ids:         [encargadoAlphaId],
      target_role:      "encargado",
      group_name:       "SCEN05 E2E Enc Test",
      group_description: "Should be blocked",
    });
    expect(status).toBe(403);
  });

  test("API: DELETE /assignments/{id} → 403 (no manage_assignments)", async ({ request }) => {
    // Pick any existing assignment — attempt to delete it must be 403
    const { json: groups } = await apiGet(request, "/assignments/groups", token, { limit: "5" });
    const items = Array.isArray(groups)
      ? groups
      : ((groups as Record<string, unknown>)?.items ?? []) as unknown[];
    const firstGroupId = (items as { id: number }[])[0]?.id;
    if (!firstGroupId) {
      test.skip(true, "No assignment group found to test DELETE");
      return;
    }
    const { json: assigns } = await apiGet(request, `/assignments/groups/${firstGroupId}`, token);
    const assignments = (assigns as Record<string, { id: number }[]>)?.assignments ?? [];
    if (assignments.length === 0) {
      test.skip(true, "No assignments in group to test DELETE");
      return;
    }
    const assignId = assignments[0].id;
    const resp = await request.delete(
      `${process.env.API_BASE_URL ?? "http://localhost:8000"}/assignments/${assignId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(resp.status()).toBe(403);
  });
});
