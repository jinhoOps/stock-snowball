import { expect, test, type Page } from '@playwright/test';
import { openBacktest } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

const settleVisualEffects = async (page: Page) => {
  await expect(page.locator('canvas[style*="position: fixed"]')).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
};

test('Nasdaq family shows 1x, 2x, and 3x actual-history comparison', async ({ page }, testInfo) => {
  await page.goto('/stock-snowball/');
  await openBacktest(page);
  await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();

  const results = page.getByRole('region', { name: '과거 자산 비교', exact: true });
  for (const asset of ['QQQ', 'QLD', 'TQQQ']) {
    const performance = testInfo.project.name === 'desktop-chromium'
      ? results.getByRole('table').getByText(asset, { exact: true })
      : results.getByRole('heading', { name: asset, exact: true });
    await expect(performance).toBeVisible();
  }
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
  await openBacktest(page);
  await page.getByRole('button', { name: 'AMD 레버리지 가족 선택' }).click();

  await expect(page.getByRole('button', { name: '5년' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '10년' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '5년' })).toHaveAttribute('aria-describedby', 'family-preset-disabled-reason');
  await expect(page.getByText('AMDL 데이터는 2024-03-18부터 사용할 수 있습니다.', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('선택한 자산의 공통 데이터는 2024-03-18부터');
  await page.getByRole('button', { name: '가능한 전체 기간 적용' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
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
