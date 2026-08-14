import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

const settleVisualEffects = async (page: Page) => {
  await expect(page.locator('canvas[style*="position: fixed"]')).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
};

test('Nasdaq family shows 1x, 2x, and 3x actual-history comparison', async ({ page }, testInfo) => {
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
  await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();

  await expect(page.getByText('QQQ', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('QLD', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('TQQQ', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('2배·3배는 하루의 목표이며, 전체 기간 수익률의 약속이 아닙니다.')).toBeVisible();

  await expect(page.getByRole('button', { name: '투자 결과' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '시작값 100' }).click();
  await expect(page.getByRole('button', { name: '시작값 100' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '투자 결과' }).click();
  await expect(page.getByRole('button', { name: '명목' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await settleVisualEffects(page);

  await page.screenshot({
    path: `test-results/visual-review/nasdaq-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('AMD family explains unavailable long periods and supports gold basis', async ({ page }, testInfo) => {
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
  await page.getByRole('button', { name: 'AMD 레버리지 가족 선택' }).click();

  await expect(page.getByRole('button', { name: '5년' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '10년' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '5년' })).toHaveAttribute('title', /AMDL/);
  await page.getByRole('button', { name: '금 기준' }).click();
  await expect(page.getByText('시작일 금 가치 기준')).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await settleVisualEffects(page);

  await page.screenshot({
    path: `test-results/visual-review/amd-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
