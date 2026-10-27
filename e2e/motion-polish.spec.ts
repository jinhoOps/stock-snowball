import { expect, test } from '@playwright/test';

test('numbers settle smoothly and settings remain usable with motion enabled', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/stock-snowball/');
  const value = page.locator('.ui-metric-value').first();
  await expect(value).toBeVisible();
  // Record every shown number from before the input changes, so a fast or slow runner can't start watching after the count ends.
  await value.evaluate(element => {
    const shown = () => element.querySelector('[aria-hidden="true"]')!.textContent!;
    const samples = [shown()];
    (window as unknown as { countSamples: string[] }).countSamples = samples;
    new MutationObserver(() => samples.push(shown())).observe(element, { subtree: true, childList: true, characterData: true });
  });
  await page.getByLabel('납입액 (KRW)').fill('90000');
  const settled = () => value.evaluate(element =>
    element.querySelector('[aria-hidden="true"]')!.textContent === element.querySelector('[aria-live]')!.textContent);
  await expect.poll(() => page.evaluate(() => new Set((window as unknown as { countSamples: string[] }).countSamples).size)).toBeGreaterThan(2);
  await expect.poll(settled).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByLabel('납입액 (KRW)').fill('30000');
  await expect.poll(() => value.evaluate(element =>
    element.querySelector('[aria-hidden="true"]')!.textContent === element.querySelector('[aria-live]')!.textContent,
  )).toBe(true);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const opener = page.getByRole('button', { name: '고급 설정 열기' });
  for (let attempt = 0; attempt < 2; attempt++) {
    await opener.click();
    const dialog = page.getByRole('dialog', { name: '고급 설정' });
    await expect(dialog.getByRole('button', { name: '고급 설정 닫기' })).toBeFocused();
    await expect(dialog).toHaveCSS('opacity', '1');
    if (attempt === 0) await page.screenshot({ path: `test-results/visual-review/polish-settings-${testInfo.project.name}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  expect(errors).toEqual([]);
});
