import { expect, type Page } from '@playwright/test';

/**
 * Switches to backtest mode and makes the condition editor usable.
 * On small screens the editor starts collapsed behind the applied-conditions summary.
 */
export async function openBacktest(page: Page) {
  await page.getByRole('button', { name: '과거 백테스트 모드' }).click();
  await expect(page.locator('#backtest-conditions')).toBeAttached();
  const edit = page.getByRole('button', { name: '조건 편집' });
  if (await edit.isVisible()) await edit.click();
  await expect(page.locator('#backtest-conditions')).toBeVisible();
}

/** The applied-conditions summary; it is only shown on small screens, so match it even when hidden. */
export const appliedConditions = (page: Page) => page.locator('[aria-label="백테스트 적용 조건"]');
