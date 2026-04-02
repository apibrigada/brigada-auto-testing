import { expect, type Page } from "@playwright/test";

const dashboardStatsTimeoutMs = Number(
  process.env.E2E_DASHBOARD_STATS_TIMEOUT_MS ?? 30000,
);

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
    await expect(this.page).toHaveURL(/\/dashboard$/);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByText("Total de Usuarios")).toBeVisible({
      timeout: dashboardStatsTimeoutMs,
    });
    await expect(this.page.getByText("Estado del Sistema")).toBeVisible({
      timeout: dashboardStatsTimeoutMs,
    });

    await expect(
      this.page.locator("p.text-3xl.font-bold span.animate-pulse"),
    ).toHaveCount(0, {
      timeout: dashboardStatsTimeoutMs,
    });
  }
}
