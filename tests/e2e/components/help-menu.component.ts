import { expect, type Page } from "@playwright/test";

export class HelpMenuComponent {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    const trigger = this.page.locator("[data-tour='help-button']");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(
      this.page.getByText("Recorridos disponibles"),
    ).toBeVisible();
  }

  async startTour(title: string): Promise<void> {
    const item = this.page.getByRole("menuitem", {
      name: new RegExp(title, "i"),
    }).first();
    await expect(item).toBeVisible();
    await item.click();
  }

  async expectTourTooltipVisible(title: string, stepIndex: number, total: number): Promise<void> {
    const floater = this.page.locator("[data-testid='floater']");
    await expect(floater).toBeVisible();
    await expect(floater.locator("h4").filter({ hasText: title }).first()).toBeVisible();
    await expect(
      floater.getByText(`${stepIndex + 1} / ${total}`),
    ).toBeVisible();
  }

  async expectStepContent(content: string): Promise<void> {
    const floater = this.page.locator("[data-testid='floater']");
    await expect(floater.getByText(content, { exact: false })).toBeVisible();
  }

  async clickNext(): Promise<void> {
    const nextBtn = this.page.locator("[data-action='primary']");
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
  }

  async clickBack(): Promise<void> {
    const backBtn = this.page.locator("[data-action='previous']");
    await expect(backBtn).toBeVisible();
    await backBtn.click();
  }

  async clickSkip(): Promise<void> {
    const skipBtn = this.page.locator("[data-action='skip']");
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();
  }

  async expectTourClosed(): Promise<void> {
    const floater = this.page.locator("[data-testid='floater']");
    await expect(floater).toBeHidden({ timeout: 5000 });
  }

  async expectTourVisible(): Promise<void> {
    const floater = this.page.locator("[data-testid='floater']");
    await expect(floater).toBeVisible({ timeout: 5000 });
  }

  async expectNoTourVisible(): Promise<void> {
    const floater = this.page.locator("[data-testid='floater']");
    await expect(floater).toBeHidden({ timeout: 3000 });
  }
}
