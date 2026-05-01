import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

const survey = {
  id: 9001,
  title: "E2E Impacto Cascada",
  description: "Mock de preflight",
  survey_type: "normal",
  is_active: true,
  starts_at: null,
  ends_at: null,
  created_at: new Date().toISOString(),
  updated_at: null,
  created_by_email: "qa@example.com",
  published_version_id: 1,
  published_version_number: 1,
  has_published_version: true,
  version_count: 1,
};

test.describe("impact preflight contract", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("survey deactivate preflights before execution and forwards token", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    let preflightSeen = false;
    let executionSeen = false;
    const token = "e2e-impact-token";

    await page.route(
      "**/api/backend/admin/surveys/metadata**",
      async (route) => {
        await route.fulfill({ json: [survey] });
      },
    );
    await page.route(
      "**/api/backend/admin/impact/survey/9001**",
      async (route) => {
        expect(
          new URL(route.request().url()).searchParams.get("operation"),
        ).toBe("deactivate");
        preflightSeen = true;
        await route.fulfill({
          json: {
            resource_type: "survey",
            resource_id: "9001",
            operation: "deactivate",
            severity: "high",
            allowed: true,
            requires_confirmation: true,
            confirm_token: token,
            expires_at: new Date(Date.now() + 600000).toISOString(),
            impact: { active_assignments: 2, affected_users: 2 },
            actions: [
              {
                target: "assignments",
                effect: "suspend",
                reason: "survey_disabled",
                count: 2,
                reversible: true,
              },
            ],
            blocked_by: [],
            recommended_action: "suspend_dependents",
          },
        });
      },
    );
    await page.route("**/api/backend/admin/surveys/9001", async (route) => {
      if (route.request().method() === "PUT") {
        expect(preflightSeen).toBe(true);
        expect(route.request().headers()["x-impact-confirm-token"]).toBe(token);
        executionSeen = true;
        await route.fulfill({ json: { ...survey, is_active: false } });
        return;
      }
      await route.continue();
    });

    await page.goto("/dashboard/surveys");
    const surveyRow = page.getByRole("row").filter({ hasText: survey.title });
    await expect(surveyRow).toBeVisible({ timeout: 15000 });

    await surveyRow.getByRole("button").first().click();
    await page.getByRole("menuitem", { name: /Desactivar/i }).click();
    await expect(page.getByText(/Asignaciones activas/i)).toBeVisible();
    await page.getByRole("button", { name: /^Desactivar$/i }).click();

    await expect.poll(() => executionSeen).toBe(true);
  });
});
