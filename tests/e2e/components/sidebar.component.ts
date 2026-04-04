import { expect, type Page } from "@playwright/test";

export class SidebarComponent {
  constructor(private readonly page: Page) {}

  async goToAssignments(): Promise<void> {
    const link = this.page.getByRole("link", { name: /Asignaciones/i }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(this.page).toHaveURL(
      /\/dashboard\/(assignments|assignment-groups)(?:\/.*)?$/,
    );
  }
}
