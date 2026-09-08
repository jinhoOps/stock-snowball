import { expect, test, type Page } from '@playwright/test';

async function appliedDates(page: Page) {
  return page.evaluate(() => {
    const { startDate, endDate } = JSON.parse(localStorage.getItem('backtest_params')!);
    return { startDate, endDate };
  });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '과거 백테스트 모드' }).click();
});

test('date edits are atomic and invalid drafts cannot affect results', async ({ page }, info) => {
  const original = await appliedDates(page);
  const opener = page.getByRole('button', { name: '백테스트 기간 변경' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '백테스트 기간 선택' });
  await dialog.getByLabel('백테스트 시작일').fill('20250301');
  await expect(dialog.getByRole('button', { name: '기간 적용' })).toBeDisabled();
  expect(await appliedDates(page)).toEqual(original);
  await dialog.getByLabel('백테스트 종료일').fill('2026-03-01');
  await expect(dialog.getByRole('button', { name: '기간 적용' })).toBeEnabled();
  expect(await appliedDates(page)).toEqual(original);
  await page.screenshot({ path: `test-results/visual-review/date-range-input-${info.project.name}.png` });
  await dialog.getByRole('button', { name: '기간 적용' }).click();
  await expect(opener).toBeFocused();
  expect(await appliedDates(page)).toEqual({ startDate: '2025-03-01', endDate: '2026-03-01' });
  await opener.click();
  await dialog.getByLabel('백테스트 시작일').fill('1990-01-01');
  await expect(dialog.getByRole('alert')).toContainText('선택 가능한 기간');
  await expect(dialog.getByRole('button', { name: '기간 적용' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  expect(await appliedDates(page)).toEqual({ startDate: '2025-03-01', endDate: '2026-03-01' });
});

test('calendar jumps across years and requires a complete range', async ({ page }, info) => {
  const original = await appliedDates(page);
  await page.getByRole('button', { name: '백테스트 기간 변경' }).click();
  const dialog = page.getByRole('dialog', { name: '백테스트 기간 선택' });
  await dialog.getByLabel('달력 연도').selectOption({ label: '2001년' });
  await dialog.getByLabel('달력 월').selectOption({ label: '3월' });
  const first = dialog.getByRole('button', { name: /2001년 3월 5일/ });
  await first.click();
  await expect(dialog.getByRole('button', { name: '기간 적용' })).toBeDisabled();
  await expect(dialog.getByRole('status')).toContainText('종료일을 선택');
  await dialog.getByLabel('달력 연도').selectOption({ label: '2020년' });
  await dialog.getByLabel('달력 월').selectOption({ label: '2월' });
  await dialog.getByRole('button', { name: /2020년 2월 29일/ }).click();
  await expect(dialog.getByLabel('백테스트 시작일')).toHaveValue('2001-03-05');
  await expect(dialog.getByLabel('백테스트 종료일')).toHaveValue('2020-02-29');
  expect(await appliedDates(page)).toEqual(original);
  for (const cell of await dialog.locator('.date-range-day:not([data-outside-month])').all()) {
    const rect = await cell.boundingBox();
    expect(rect!.height).toBeGreaterThanOrEqual(44);
    expect(rect!.width).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/visual-review/date-range-calendar-${info.project.name}.png` });
  if (info.project.name === 'mobile-chromium') {
    await page.setViewportSize({ width: 320, height: 740 });
    for (const cell of await dialog.locator('.date-range-day:not([data-outside-month])').all()) {
      expect((await cell.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/visual-review/date-range-small-mobile.png' });
  }
  await dialog.getByRole('button', { name: '기간 적용' }).click();
  expect(await appliedDates(page)).toEqual({ startDate: '2001-03-05', endDate: '2020-02-29' });
});

test('quick periods use the last data date and unsupported days stay disabled', async ({ page }) => {
  const presets = page.getByRole('group', { name: '기간 프리셋' });
  for (const name of ['1년', '3년', '5년', '10년', '전체']) {
    await expect(presets.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await presets.getByRole('button', { name: '3년', exact: true }).click();
  await expect(presets.getByRole('button', { name: '3년', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await appliedDates(page)).toEqual({ startDate: '2023-09-02', endDate: '2026-09-02' });
  await page.getByRole('button', { name: '백테스트 기간 변경' }).click();
  const dialog = page.getByRole('dialog', { name: '백테스트 기간 선택' });
  await dialog.getByLabel('달력 연도').selectOption({ label: '2026년' });
  await dialog.getByLabel('달력 월').selectOption({ label: '9월' });
  await expect(dialog.getByRole('button', { name: /2026년 9월 3일/ })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: '다음 달', exact: true })).toBeDisabled();
});

test('economic crises stay visible and apply complete historical windows', async ({ page }, info) => {
  const scenarios = page.getByRole('region', { name: '경제 위기 시나리오' });
  await expect(scenarios).toBeVisible();
  await expect(scenarios.getByRole('button', { name: /대공황/ })).toHaveCount(0);
  for (const [label, startDate, endDate] of [
    ['닷컴 버블 붕괴', '2000-03-24', '2002-10-09'],
    ['2011 유럽 재정위기', '2011-07-22', '2011-11-25'],
    ['2015 중국발 충격', '2015-05-20', '2015-09-23'],
    ['2018 긴축·무역갈등', '2018-10-01', '2018-12-31'],
    ['2023 미국 은행 위기', '2023-03-06', '2023-03-24'],
    ['리먼 금융위기', '2007-10-09', '2009-03-09'],
    ['코로나 급락', '2020-02-19', '2020-03-23'],
    ['2022 금리 인상', '2022-01-03', '2022-10-12'],
  ]) {
    await scenarios.getByRole('button', { name: `${label} 기간 적용` }).click();
    expect(await appliedDates(page)).toEqual({ startDate, endDate });
    await expect(scenarios.getByRole('button', { name: `${label} 기간 적용` })).toHaveAttribute('aria-pressed', 'true');
  }
  await scenarios.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/visual-review/economic-scenarios-${info.project.name}.png` });
});

test('family comparisons retain crisis presets and respect their common coverage', async ({ page }) => {
  await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();
  const scenarios = page.getByRole('region', { name: '경제 위기 시나리오' });
  await expect(scenarios).toBeVisible();
  await expect(scenarios.getByRole('button', { name: '리먼 금융위기 기간 적용' })).toBeDisabled();
  await scenarios.getByRole('button', { name: '2022 금리 인상 기간 적용' }).click();
  expect(await appliedDates(page)).toEqual({ startDate: '2022-01-03', endDate: '2022-10-12' });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'AMD 레버리지 가족 선택' }).click();
  await expect(scenarios.getByRole('button', { name: '2022 금리 인상 기간 적용' })).toBeDisabled();
  await scenarios.getByRole('button', { name: '2025 관세 충격 기간 적용' }).click();
  expect(await appliedDates(page)).toEqual({ startDate: '2025-04-02', endDate: '2025-04-08' });
  await expect(page.getByRole('alert')).toHaveCount(0);
});
