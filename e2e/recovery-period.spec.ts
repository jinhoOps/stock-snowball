import { expect, test, type Page } from '@playwright/test';

async function expectNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
}

test('recovery periods follow the selected crisis window and survive the mobile comparison flow', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '과거 백테스트 모드' }).click();
  await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();
  const assets = page.getByRole('region', { name: '백테스트 종목 선택' });
  await assets.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/visual-review/qa-01-assets-${info.project.name}.png` });

  await page.getByRole('button', { name: /경제 위기 시나리오/ }).click();
  await page.getByRole('button', { name: '코로나 급락 기간 적용' }).click();
  await expect(page.locator('canvas[style*="position: fixed"]')).toHaveCount(0);
  const recovery = page.getByRole('region', { name: '전고점 회복 기간', exact: true });
  for (const asset of ['QQQ', 'QLD', 'TQQQ']) {
    await expect(recovery.getByRole('group', { name: `${asset} 회복 기간`, exact: true })).toContainText('미회복');
  }
  await recovery.scrollIntoViewIfNeeded();
  await expectNoOverflow(page);
  await recovery.screenshot({ path: `test-results/visual-review/qa-02-unrecovered-${info.project.name}.png` });

  await page.getByRole('button', { name: '백테스트 기간 변경' }).click();
  const dates = page.getByRole('dialog', { name: '백테스트 기간 선택' });
  await dates.getByLabel('백테스트 종료일').fill('2021-01-04');
  await page.screenshot({ path: `test-results/visual-review/qa-03-dates-${info.project.name}.png` });
  await dates.getByRole('button', { name: '기간 적용' }).click();
  for (const asset of ['QQQ', 'QLD', 'TQQQ']) {
    const result = recovery.getByRole('group', { name: `${asset} 회복 기간`, exact: true });
    await expect(result).not.toContainText('미회복');
    await expect(result).toContainText('회복일');
    await expect(result).toContainText('2020-02-19');
  }
  const before = await recovery.innerText();
  await page.getByRole('button', { name: '시작값 100', exact: true }).click();
  await expect(recovery).toHaveText(before, { useInnerText: true });
  await page.getByLabel('납입액 (KRW)').fill('50000');
  await page.getByLabel('납입액 (KRW)').press('Tab');
  await expect(recovery).toHaveText(before, { useInnerText: true });
  await recovery.scrollIntoViewIfNeeded();
  await expectNoOverflow(page);
  await recovery.screenshot({ path: `test-results/visual-review/qa-04-recovered-${info.project.name}.png` });

  for (const basis of ['실질', '금 기준', '명목']) {
    await page.getByRole('button', { name: basis, exact: true }).click();
    await expect(recovery.getByRole('group', { name: 'QQQ 회복 기간', exact: true })).toBeVisible();
    await expectNoOverflow(page);
  }
  if (info.project.name === 'mobile-chromium') {
    await page.setViewportSize({ width: 320, height: 740 });
    await expectNoOverflow(page);
    await recovery.scrollIntoViewIfNeeded();
    await recovery.screenshot({ path: 'test-results/visual-review/qa-05-recovery-small-mobile.png' });
  }
  await page.getByRole('button', { name: '투자 결과', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '공유(이미지)', exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  await download.saveAs(`test-results/visual-review/qa-06-backtest-share-${info.project.name}.png`);
});
