import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function expectTouchTargets(buttons: Locator) {
  for (const button of await buttons.all()) {
    const bounds = await button.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/stock-snowball/');
});

test('projection uses aligned fields, readable metrics and full-size choices', async ({ page }, testInfo) => {
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  for (const control of [page.getByRole('button', { name: '고급 설정 열기' }), page.getByRole('link', { name: 'Stock Snowball 홈' })]) {
    const duration = await control.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));
    expect(duration).toBeLessThanOrEqual(0.001);
  }
  for (const group of ['계산 모드', '표시 통화', '납입 주기']) {
    await expectTouchTargets(page.getByRole('group', { name: group }).getByRole('button'));
  }
  const principal = page.getByLabel('초기 자산 (KRW)');
  const contribution = page.getByLabel('납입액 (KRW)');
  const principalBounds = await principal.boundingBox();
  const contributionBounds = await contribution.boundingBox();
  expect(principalBounds?.height).toBe(48);
  expect(contributionBounds?.height).toBe(48);
  if (page.viewportSize()!.width >= 768) expect(principalBounds?.y).toBe(contributionBounds?.y);
  await expect(page.locator('.ui-metric-value').first()).toHaveCSS('font-size', '24px');
  const percentCard = page.locator('.ui-metric').filter({ hasText: '연복리 수익률 (CAGR)' });
  await expect(percentCard).not.toContainText(/약|원|\$/);
  const selectedColor = await page.getByRole('group', { name: '납입 주기' }).getByRole('button', { name: '일', exact: true })
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect(page.getByRole('button', { name: '저장 및 비교', exact: true })).toHaveCSS('background-color', selectedColor);
  expect(await page.locator('canvas').count()).toBe(0); // Reduced motion also suppresses celebration overlays.
  await expectNoPageOverflow(page);
  await page.screenshot({ path: `test-results/visual-review/frontend-projection-${testInfo.project.name}.png`, animations: 'disabled' });
  await page.locator('.ui-metric').last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/visual-review/frontend-metrics-${testInfo.project.name}.png`, animations: 'disabled' });
});

test('settings stays above navigation and preserves the focus and draft lifecycle', async ({ page }, testInfo) => {
  const opener = page.getByRole('button', { name: '고급 설정 열기' });
  await page.getByLabel('시나리오 이름', { exact: true }).scrollIntoViewIfNeeded();
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '고급 설정' });
  const close = dialog.getByRole('button', { name: '고급 설정 닫기' });
  await expect(close).toBeFocused();
  await expect(close).toBeVisible();
  expect(await close.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);

  const cycle = dialog.getByRole('group', { name: '납입 주기' });
  await expectTouchTargets(cycle.getByRole('button'));
  await cycle.getByRole('button', { name: '월', exact: true }).click();
  await expect(cycle.getByRole('button', { name: '월', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(cycle.getByRole('button', { name: '월', exact: true })).toHaveCSS('background-color', 'rgb(0, 102, 204)');
  const apply = dialog.getByRole('button', { name: '설정 적용' });
  await apply.focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(apply).toBeFocused();
  await expectNoPageOverflow(page);
  await page.screenshot({ path: `test-results/visual-review/frontend-settings-${testInfo.project.name}.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.getByRole('group', { name: '납입 주기' }).getByRole('button', { name: '일', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('backtest and long scenario names reflow without losing controls', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '과거 백테스트 모드' }).click();
  const metrics = page.getByRole('region', { name: 'SPY 핵심 지표 · 명목 기준' });
  await expect(metrics.locator('.ui-metric')).toHaveCount(4);
  await expect(metrics.locator('.ui-metric-value').first()).toHaveCSS('font-size', '24px');
  await expectTouchTargets(page.getByRole('group', { name: '가치 기준' }).getByRole('button'));
  await expect(page.getByRole('button', { name: '백테스트 기간 변경' })).toContainText('2010-01-01 ~ 2024-01-01');
  await page.getByLabel('초기 자산 (KRW)').fill('100000000000');
  await metrics.scrollIntoViewIfNeeded();
  await expectNoPageOverflow(page);
  await page.screenshot({ path: `test-results/visual-review/frontend-backtest-${testInfo.project.name}.png`, animations: 'disabled' });

  const name = '장기간 적립식 투자 비교 시나리오 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  await page.getByLabel('시나리오 이름', { exact: true }).fill(name);
  await page.getByRole('button', { name: '저장 및 비교', exact: true }).click();
  const load = page.getByRole('button', { name: `${name} 불러오기` });
  await expect(load).toBeVisible();
  await load.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('시나리오 이름', { exact: true })).toHaveValue(name);
  await expectTouchTargets(page.getByRole('button', { name: `${name} 삭제` }));
  await expectTouchTargets(page.getByRole('button', { name: `${name} 비교 중` }));
  await expectNoPageOverflow(page);
  await load.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/visual-review/frontend-scenarios-${testInfo.project.name}.png`, animations: 'disabled' });
});

test('sharing exports the styled result as a PNG', async ({ page }, testInfo) => {
  for (const [suffix, name] of [
    ['', '기본 시나리오'],
    ['-long', '장기간 적립식 투자 비교 시나리오 ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'],
  ]) {
    await page.getByLabel('시나리오 이름', { exact: true }).fill(name);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '공유(이미지)', exact: true }).click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    const imagePath = `test-results/visual-review/frontend-share${suffix}-${testInfo.project.name}.png`;
    await download.saveAs(imagePath);
    const png = await readFile(imagePath);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 1560]);
  }
});
