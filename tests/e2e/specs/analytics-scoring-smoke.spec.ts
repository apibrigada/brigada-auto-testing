import { expect, test } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";
import { LoginPage } from "../pages/login.page.js";

const adminCredential = getCredentialByRoleNumber(1);

type SurveyMetricItem = {
  survey_id: number;
  survey_title: string;
  total_responses: number;
  responses_with_location: number;
  survey_score?: number | null;
};

type SurveyMetricsResponse = {
  items?: SurveyMetricItem[];
};

type CoverageMapResponse = {
  responses_with_location: number;
  points?: Array<{ response_id: number; latitude: number; longitude: number }>;
};

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

test.describe("analytics scoring smoke", () => {
  test.skip(
    !adminCredential,
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  test("shows scored surveys and opens GPS coverage map when data exists", async ({
    page,
  }) => {
    const dateFrom = process.env.E2E_ANALYTICS_DATE_FROM ?? isoDaysAgo(30);
    const dateTo = process.env.E2E_ANALYTICS_DATE_TO ?? isoDaysAgo(0);

    const loginPage = new LoginPage(page);
    await loginPage.login(adminCredential!);

    const metricsResponse = await page.request.get(
      `/api/backend/admin/metrics/surveys?date_from=${dateFrom}&date_to=${dateTo}`,
    );
    expect(metricsResponse.ok()).toBeTruthy();

    const metrics = (await metricsResponse.json()) as SurveyMetricsResponse;
    const metricItems = metrics.items ?? [];
    const scoredSurvey = metricItems.find(
      (item) => item.survey_score != null && item.total_responses > 0,
    );

    test.skip(
      !scoredSurvey,
      "No hay encuestas con score/respuestas en el periodo configurado.",
    );

    await page.goto(
      `/dashboard/analytics?tab=encuestas&from=${dateFrom}&to=${dateTo}`,
    );
    await expect(
      page.getByRole("heading", { name: /Análisis por encuesta/i }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("columnheader", { name: /Score/i }),
    ).toBeVisible();
    await expect(
      page.getByText(scoredSurvey!.survey_title).first(),
    ).toBeVisible({
      timeout: 30000,
    });

    const gpsSurvey = metricItems.find(
      (item) => item.responses_with_location > 0 && item.total_responses > 0,
    );
    test.skip(
      !gpsSurvey,
      "No hay encuestas con GPS en el periodo configurado.",
    );

    const coverageResponse = await page.request.get(
      `/api/backend/admin/metrics/surveys/${gpsSurvey!.survey_id}/coverage-map?date_from=${dateFrom}&date_to=${dateTo}&limit=50`,
    );
    expect(coverageResponse.ok()).toBeTruthy();

    const coverage = (await coverageResponse.json()) as CoverageMapResponse;
    expect(coverage.responses_with_location).toBeGreaterThan(0);
    expect(coverage.points?.length ?? 0).toBeGreaterThan(0);

    await page.goto(
      `/dashboard/analytics?tab=mapa&survey=${gpsSurvey!.survey_id}&from=${dateFrom}&to=${dateTo}&limit=50`,
    );
    await expect(
      page.getByRole("heading", { name: /Mapa de cobertura/i }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(gpsSurvey!.survey_title).first()).toBeVisible({
      timeout: 30000,
    });
  });
});
