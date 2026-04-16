/**
 * permission-cms-access.spec.ts
 *
 * SCEN-09: qa_no_cms_access  — data permissions but missing access_cms
 * SCEN-11: qa_zero_perms     — active role with permissions=[]
 * SCEN-13: qa_inactive_role  — role is_active=False (seeder deactivated it)
 * SCEN-14: qa_inactive_user  — user is_active=False (seeder deactivated it)
 * SCEN-01: qa_full_admin     — sanity: CMS should load normally
 *
 * Prereq: seed_qa_permissions.py must have run successfully.
 */

import { expect, test } from "@playwright/test";
import { LoginPage } from "../pages/login.page.js";
import { QA_CREDS, getApiToken } from "../fixtures/qa-credentials.js";

// Users that must never reach the CMS dashboard
const BLOCKED = [
  { id: "SCEN-09", reason: "missing access_cms", ...QA_CREDS.SCEN09 },
  { id: "SCEN-11", reason: "permissions=[]", ...QA_CREDS.SCEN11 },
  { id: "SCEN-13", reason: "role is_active=false", ...QA_CREDS.SCEN13 },
  { id: "SCEN-14", reason: "user is_active=false", ...QA_CREDS.SCEN14 },
];

test.describe("CMS access — login blocked", () => {
  for (const user of BLOCKED) {
    test(`${user.id} — login rejected (${user.reason})`, async ({
      page,
      request,
    }) => {
      await test.step("API: /auth/login must return 401 or 403", async () => {
        const token = await getApiToken(request, user);
        expect(
          token,
          `${user.id}: /auth/login returned a token but should have been blocked`,
        ).toBeNull();
      });

      await test.step("CMS UI: login page stays visible after submit", async () => {
        const lp = new LoginPage(page);
        await lp.login(
          { label: user.id, email: user.email, password: user.password },
          { expectedOutcome: "restricted" },
        );
        await expect(page).toHaveURL(/\/login/);
        // Dashboard shell must not be present
        await expect(page.getByRole("navigation")).not.toBeAttached();
      });
    });
  }
});

test.describe("CMS access — SCEN-01 sanity (full admin)", () => {
  test("qa_full_admin can authenticate and reach dashboard", async ({
    page,
    request,
  }) => {
    const { email, password } = QA_CREDS.SCEN01;

    await test.step("API: /auth/login returns a token", async () => {
      const token = await getApiToken(request, QA_CREDS.SCEN01);
      expect(token, "SCEN-01: expected a valid access_token").not.toBeNull();
    });

    await test.step("CMS UI: lands on /dashboard after login", async () => {
      const lp = new LoginPage(page);
      await lp.login({ label: "SCEN-01", email, password });
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("navigation")).toBeVisible();
    });
  });
});
