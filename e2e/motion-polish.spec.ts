import { expect, test } from '@playwright/test';

test('numbers settle smoothly and settings remain usable with motion enabled', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/stock-snowball/');
  const value = page.locator('.ui-metric-value').first();
  await expect(value).toBeVisible();
  await page.getByLabel('납입액 (KRW)').fill('90000');
  const samples = await value.evaluate(async element => {
    const values: string[] = [];
    const startedAt = performance.now();
    while (performance.now() - startedAt < 500) {
      await new Promise(requestAnimationFrame);
      values.push(element.querySelector('[aria-hidden="true"]')!.textContent!);
    }
    return { values, final: element.querySelector('[aria-live]')!.textContent };
  });
  expect(new Set(samples.values).size).toBeGreaterThan(1);
  expect(samples.values.at(-1)).toBe(samples.final);
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
