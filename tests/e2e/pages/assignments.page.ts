import { expect, type Locator, type Page } from "@playwright/test";

export class AssignmentsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/dashboard/assignments");
    await expect(this.page).toHaveURL(/\/dashboard\/assignments$/);
  }

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Asignaciones" }),
    ).toBeVisible();
  }

  async openFirstSurveyAssignModal(): Promise<void> {
    const button = this.page
      .getByRole("button", { name: /Asignar usuarios y areas/i })
      .first();
    await expect(button).toBeVisible();
    await button.click();
    await expect(
      this.page.getByRole("heading", { name: "Nueva asignación" }),
    ).toBeVisible();
  }

  async hasNoActiveAreasMessage(): Promise<boolean> {
    return this.page
      .getByText("No hay areas activas. Puedes continuar sin areas.")
      .isVisible();
  }

  async selectFirstAvailableArea(): Promise<void> {
    const firstCheckbox = this.page
      .locator('input[type="checkbox"]:not([disabled])')
      .first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();
  }

  areaOnlyActionButton(): Locator {
    return this.page.getByRole("button", { name: "Aplicar areas" });
  }
}
