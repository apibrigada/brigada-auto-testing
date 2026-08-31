import { expect, type Page } from "@playwright/test";

export class SidebarComponent {
  constructor(private readonly page: Page) {}

  async goToAssignments(): Promise<void> {
    const link = this.page.getByRole("link", { name: /Asignaciones/i }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(
      /\/dashboard\/(assignments|assignment-groups)(?:[/?#].*)?$/,
      { timeout: 10000 },
    );
  }

  async goToTeams(): Promise<void> {
    const link = this.page.locator("[data-tour='nav-teams']");
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(/\/dashboard\/teams(?:[/?#].*)?$/, { timeout: 10000 });
  }

  async goToCampaigns(): Promise<void> {
    const link = this.page.locator("[data-tour='nav-campaigns']");
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(/\/dashboard\/campaigns(?:[/?#].*)?$/, { timeout: 10000 });
  }

  async goToSurveys(): Promise<void> {
    const link = this.page.locator("[data-tour='nav-surveys']");
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(/\/dashboard\/surveys(?:[/?#].*)?$/, { timeout: 10000 });
  }

  async goToGestiones(): Promise<void> {
    const link = this.page.locator("[data-tour='nav-gestiones']");
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(/\/dashboard\/gestiones(?:[/?#].*)?$/, { timeout: 10000 });
  }
}
