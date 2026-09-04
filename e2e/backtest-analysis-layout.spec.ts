import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
});

test('backtest foregrounds four metrics and one chart while preserving dates', async ({ page }, testInfo) => {
  const duplicateKeyWarnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /same key|unique ["']key["'] prop/i.test(message.text())) {
      duplicateKeyWarnings.push(message.text());
    }
  });

  await expect(page.getByText('백테스트 최종 자산', { exact: true })).toBeVisible();
  const primaryMetrics = page.getByRole('region', { name: /SPY 핵심 지표 · 명목 기준/ });
  for (const label of ['누적수익률', '연평균수익률 (CAGR)', '최대낙폭 (MDD)', '투자원금']) {
    await expect(primaryMetrics.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(primaryMetrics.getByText(/최종.*자산/)).toHaveCount(0);
  await expect(page.getByRole('img', { name: /과거 백테스트 결과 다중 자산 비교 차트/ })).toHaveCount(1);

  for (const family of ['나스닥', 'AMD', 'Tesla', '반도체']) {
    await expect(page.getByRole('button', { name: new RegExp(`${family} 레버리지 가족 선택`) })).toBeVisible();
  }

  const start = page.locator('input[type="date"]').first();
  const end = page.locator('input[type="date"]').last();
  await expect(start).toHaveValue('2010-01-01');
  await expect(end).toHaveValue('2024-01-01');

  const individualPicker = page.getByText('개별 종목 추가', { exact: true });
  await individualPicker.focus();
  await page.keyboard.press('Enter');
  const qqqPickerButton = page.getByRole('button', { name: 'QQQ 개별 자산 선택', exact: true });
  await expect(qqqPickerButton).toBeVisible();
  await individualPicker.focus();
  await page.keyboard.press('Space');
  await expect(qqqPickerButton).toHaveCount(0);
  await individualPicker.focus();
  await page.keyboard.press('Space');
  await expect(qqqPickerButton).toBeVisible();
  await qqqPickerButton.click();
  await expect(start).toHaveValue('2010-01-01');
  await expect(end).toHaveValue('2024-01-01');

  await page.getByRole('button', { name: '실질' }).click();
  await expect(page.getByRole('heading', { name: /핵심 지표 · 실질 기준/ })).toBeVisible();
  await expect(start).toHaveValue('2010-01-01');
  await expect(end).toHaveValue('2024-01-01');

  await expect(page.getByText('S&P 500 (^GSPC)')).toHaveCount(0);
  await page.getByRole('button', { name: '시장 추세' }).click();
  await expect(page.getByText('S&P 500 (^GSPC)')).toBeVisible();

  await page.getByPlaceholder('시나리오 이름 (예: 나스닥 100 적립)').fill('E2E 동일 이름 비교안');
  await page.getByRole('button', { name: '저장 및 비교' }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'E2E 동일 이름 비교안' })).toBeVisible();
  await page.getByRole('button', { name: '비교 중' }).click();
  await page.getByRole('button', { name: '비교하기' }).click();
  await page.getByRole('button', { name: '저장 시나리오 비교' }).click();
  const scenarioComparison = page.getByRole('region', { name: '저장 시나리오 비교' });
  await expect(scenarioComparison).toBeVisible();
  await expect(page.getByRole('img', { name: /과거 백테스트 결과 다중 자산 비교 차트/ })).toHaveCount(0);

  const interactionLayer = scenarioComparison.locator('rect[fill="transparent"]').last();
  await expect(interactionLayer).toBeVisible();
  await interactionLayer.hover({ position: { x: 50, y: 50 } });
  await expect(page.getByRole('heading', { name: '경과 개월수 기준 상세' })).toBeVisible();
  expect(duplicateKeyWarnings).toEqual([]);

  await page.getByRole('button', { name: '종목 상세' }).click();
  await expect(page.getByRole('img', { name: /과거 백테스트 결과 다중 자산 비교 차트/ })).toHaveCount(1);

  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  await page.screenshot({
    path: `test-results/visual-review/backtest-analysis-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
