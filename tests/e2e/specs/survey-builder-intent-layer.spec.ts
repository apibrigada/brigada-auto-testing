/**
 * survey-builder-intent-layer.spec.ts
 *
 * SB2-UX-23 — Smoke E2E for the inline intent-layer rewrite (SB2-UX-19 / DD-07).
 *
 * Verifies that after opening the builder for a freshly-seeded survey
 * and selecting its question, the legacy modal-driven editor is gone:
 *
 *   INTENT-A  The four legacy <Dialog> "Validación / Lógica condicional /
 *             Apariencia / Lógica avanzada" no longer act as triggers — the
 *             corresponding sections live inline inside an Accordion.
 *   INTENT-B  No `answers.<key>` strings leak into the visible DOM (the
 *             intent layer hides JSONLogic refs from authors).
 *   INTENT-C  Expanding "Validación" reveals the RequiredBlock + ValidationBlock
 *             without any modal opening.
 *
 * Auth: role_1 (admin).
 * Cleanup: DELETE survey on teardown (accepts 404).
 */

import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

function uniqueTitle(): string {
  return `QA-IntentLayer ${Date.now()}`;
}

function seedPayload(title: string) {
  return {
    title,
    description: "SB2-UX-23 — intent-layer smoke. Safe to delete.",
    survey_type: "normal",
    schema_version: 2,
    questions: [
      {
        question_text: "Edad del entrevistado",
        question_type: "number",
        question_key: "edad",
        order: 1,
        is_required: false,
        validation_rules: {},
      },
    ],
  };
}

test.describe("SB2-UX-23 — survey builder intent layer (inline, no dialogs)", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("validation/skip-logic/appearance/advanced render inline as accordion items", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const title = uniqueTitle();

    // ── 0. Seed survey via API ────────────────────────────────────────────
    const createResp = await page.request.post("/api/backend/admin/surveys", {
      data: seedPayload(title),
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
      // ── 1. Open builder ─────────────────────────────────────────────────
      await page.goto(`/dashboard/surveys/builder?surveyId=${surveyId}`);
      await expect(
        page.getByRole("heading", { name: /Editar encuesta/i }).first(),
      ).toBeVisible({ timeout: 15_000 });

      // ── 2. Select the seeded question ──────────────────────────────────
      const questionItem = page.getByText("Edad del entrevistado").first();
      await expect(questionItem).toBeVisible({ timeout: 15_000 });
      await questionItem.click();

      // ── 3. INTENT-A — All four section headers are present as
      //       accordion triggers, not as modal triggers. Clicking them
      //       must NOT open any role="dialog" element. ───────────────────
      const sectionLabels = [
        /Validación/i,
        /Lógica condicional/i,
        /Apariencia/i,
        /Lógica avanzada/i,
      ];

      for (const label of sectionLabels) {
        const trigger = page.getByRole("button", { name: label }).first();
        await expect(trigger).toBeVisible({ timeout: 5_000 });
        await trigger.click();
        // Allow accordion open animation a tick.
        await page.waitForTimeout(150);
      }

      // No <Dialog/> from radix should be open as a result of those clicks.
      const openDialogs = await page
        .locator('[role="dialog"][data-state="open"]')
        .count();
      expect(openDialogs, "intent-layer must not open dialogs").toBe(0);

      // ── 4. INTENT-C — Validación block exposes intent UI ──────────────
      // RequiredBlock surfaces the literal "Obligatoriedad" label (or the
      // localized "Obligatoria" toggle), and ValidationBlock surfaces a
      // "Restricción" / "Validación" preset section. We assert at least
      // one tell-tale label is present in the panel area.
      const intentTell = page.getByText(/Obligator|Restricci/i).first();
      await expect(intentTell).toBeVisible({ timeout: 5_000 });

      // ── 5. INTENT-B — No `answers.<key>` strings leak to the DOM ──────
      const bodyText = (await page.locator("body").innerText()) ?? "";
      expect(
        bodyText.includes("answers."),
        "intent layer must not show JSONLogic refs to authors",
      ).toBeFalsy();
    } finally {
      await cleanup();
    }
  });
});
