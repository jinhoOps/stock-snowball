import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

const openBacktest = async (page: Page) => {
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
};

const selectPrimaryAsset = async (page: Page, assetId: string) => {
  const settingsHeading = page.getByRole('heading', { name: '고급 설정' });
  await page.getByRole('button', { name: '고급 설정 열기' }).click();
  await page.locator('#asset-type-select').selectOption(assetId);
  const applyButton = page.getByRole('button', { name: '설정 적용' });
  if (await applyButton.isVisible()) {
    await applyButton.click();
  } else {
    await page.getByRole('button', { name: '고급 설정 닫기' }).click();
  }
  await expect(settingsHeading).toBeHidden();
};

const expectNoHorizontalOverflow = async (page: Page) => {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
};

const saveVisualReview = async (page: Page, market: string, project: string) => {
  await expect(page.locator('canvas[style*="position: fixed"]')).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/visual-review/market-trend-${market}-${project}.png`,
    fullPage: true,
  });
};

test('Nasdaq family exposes completed-week market values in both result views', async ({ page }, testInfo) => {
  const providerRequests: string[] = [];
  page.on('request', (request) => {
    if (/finance\.yahoo\.com|query[12]\.finance\.yahoo\.com/i.test(request.url())) {
      providerRequests.push(request.url());
    }
  });

  await openBacktest(page);
  await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();

  await expect(page.getByText('주 자산 QQQ 대응 · 나스닥100 시장 추세')).toBeVisible();
  await expect(page.getByText('나스닥100 (^NDX)')).toBeVisible();
  await expect(page.getByText('20주 SMA')).toBeVisible();
  await expect(page.getByText('60주 SMA')).toBeVisible();
  await expect(page.getByRole('button', { name: '투자 결과' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: '시장 추세 (시작값 100)' })).toBeVisible();

  const slider = page.getByRole('slider', { name: '차트 날짜 탐색' });
  await slider.focus();
  const tooltip = page.getByRole('status');
  await expect(tooltip).toContainText('나스닥100');
  await expect(tooltip).toContainText('완료 주봉');
  await expect(tooltip).toContainText('1,746.12');

  await page.getByRole('button', { name: '시작값 100' }).click();
  await expect(page.getByRole('button', { name: '시작값 100' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('path[aria-label="나스닥100 가격지수"]')).toBeVisible();
  await expect(page.locator('path[aria-label="나스닥100 20주 SMA"]')).toBeVisible();
  await expect(page.locator('path[aria-label="나스닥100 60주 SMA"]')).toBeVisible();
  await slider.focus();
  await expect(tooltip).toContainText('1,746.12');

  await expectNoHorizontalOverflow(page);
  expect(providerRequests).toEqual([]);
  await saveVisualReview(page, 'nasdaq', testInfo.project.name);
});

test('S&P 500 primary asset shows its static market overlay', async ({ page }, testInfo) => {
  await openBacktest(page);
  await selectPrimaryAsset(page, 'SPY');

  await expect(page.getByText('주 자산 SPY 대응 · S&P 500 시장 추세')).toBeVisible();
  await expect(page.getByText('S&P 500 (^GSPC)')).toBeVisible();
  await expect(page.locator('path[aria-label="S&P 500 가격지수"]')).toBeVisible();
  await expect(page.locator('path[aria-label="S&P 500 20주 SMA"]')).toBeVisible();
  await expect(page.locator('path[aria-label="S&P 500 60주 SMA"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await saveVisualReview(page, 'sp500', testInfo.project.name);
});

test('KOSPI primary asset shows its static market overlay', async ({ page }, testInfo) => {
  await openBacktest(page);
  await selectPrimaryAsset(page, 'KOSPI');

  await expect(page.getByText('주 자산 KOSPI 대응 · 코스피 시장 추세')).toBeVisible();
  await expect(page.getByText('코스피 (^KS11)')).toBeVisible();
  await expect(page.locator('path[aria-label="코스피 가격지수"]')).toBeVisible();
  await expect(page.locator('path[aria-label="코스피 20주 SMA"]')).toBeVisible();
  await expect(page.locator('path[aria-label="코스피 60주 SMA"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await saveVisualReview(page, 'kospi', testInfo.project.name);
});

test('unmapped AMD primary asset does not add a market overlay', async ({ page }) => {
  await openBacktest(page);
  await selectPrimaryAsset(page, 'AMD');

  await expect(page.getByText(/주 자산 AMD 대응 · .* 시장 추세/)).toHaveCount(0);
  await expect(page.getByRole('img', { name: '과거 백테스트 결과 다중 자산 비교 차트' })).toBeVisible();
  await expect(page.getByRole('group', { name: '시장 추세 (시작값 100)' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
