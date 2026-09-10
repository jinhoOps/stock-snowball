import { expect, test } from '@playwright/test';

test('sets up assets, dates and amounts before reviewing the applied conditions', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('exchange_rate', '1000'));
  await page.goto('/stock-snowball/');
  await expect(page.getByRole('button', { name: '스노우볼 모드', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '과거 백테스트 모드' }).click();
  const assets = page.getByRole('region', { name: '백테스트 종목 선택' });
  const dates = page.getByRole('button', { name: '백테스트 기간 변경' });
  const summary = page.getByRole('region', { name: '백테스트 적용 조건' });
  await expect(summary).toBeAttached();

  const order = await page.evaluate(() => {
    const nodes = [
      document.querySelector('[aria-label="백테스트 종목 선택"]'),
      document.querySelector('[aria-label="백테스트 기간 변경"]'),
      document.querySelector('#principal-input'),
      document.querySelector('[aria-label="백테스트 적용 조건"]'),
    ];
    return nodes.every((node, index) => node && (index === 0
      || Boolean(nodes[index - 1]!.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)));
  });
  expect(order).toBe(true);

  await assets.getByRole('button', { name: 'SPY 기준 종목 변경' }).click();
  await assets.getByLabel('새 기준 종목').selectOption('QQQ');
  await expect(assets.getByRole('group', { name: 'QQQ 기준 종목', exact: true })).toBeFocused();
  await expect(dates).toContainText('2010-01-01 ~ 2024-01-01');
  await assets.getByText('비교 종목 추가', { exact: true }).click();
  await assets.getByRole('button', { name: 'SCHD 개별 자산 선택' }).click();
  await expect(summary).toContainText('QQQ 기준 · SCHD 비교');
  await expect(dates).toContainText('2011-10-20 ~ 2024-01-01');

  await assets.getByRole('button', { name: 'QQQ 기준 종목 변경' }).click();
  await assets.getByLabel('새 기준 종목').selectOption('SCHD');
  await expect(summary).toContainText('SCHD 기준 · QQQ 비교');
  await page.getByLabel('초기 자산 (KRW)').fill('2000000');
  await page.getByLabel('초기 자산 (KRW)').press('Tab');
  await page.getByRole('group', { name: '납입 주기', exact: true }).getByRole('button', { name: '월', exact: true }).click();
  await expect(summary).toContainText('초기 200만 원 + 매월 3만 원');
  await page.getByRole('group', { name: '표시 통화' }).getByRole('button', { name: 'USD' }).click();
  await expect(summary).toContainText('초기 $2,000 + 매월 $30');
  await expect(summary).toContainText('조건을 변경하면 결과에 자동 반영됩니다.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await assets.getByText('비교 종목 추가', { exact: true }).click();
  await assets.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/visual-review/backtest-setup-' + info.project.name + '.png' });
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/visual-review/backtest-conditions-' + info.project.name + '.png' });
});

test('family members can be removed, promoted and toggled in one selection flow', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '과거 백테스트 모드' }).click();
  const family = page.getByRole('button', { name: '나스닥 레버리지 가족 선택' });
  await family.click();
  await expect(family).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'TQQQ 기준으로 설정' }).click();
  await expect(page.getByRole('region', { name: /TQQQ 핵심 지표/ })).toBeVisible();
  await page.getByRole('button', { name: 'TQQQ 기준 자산 제거' }).click();
  await expect(page.getByRole('region', { name: /QQQ 핵심 지표/ })).toBeVisible();
  await expect(family).toHaveAttribute('aria-pressed', 'false');
  await page.getByText('비교 종목 추가', { exact: true }).click();
  const individual = page.getByRole('group', { name: '개별 자산 선택' });
  await individual.getByRole('button', { name: 'TQQQ 개별 자산 선택' }).click();
  await expect(family).toHaveAttribute('aria-pressed', 'true');
  await expect(individual.getByRole('button', { name: 'AMD 개별 자산 선택' })).toBeDisabled();
  await individual.getByRole('button', { name: 'QLD 개별 자산 해제' }).click();
  await expect(individual.getByRole('button', { name: 'AMD 개별 자산 선택' })).toBeEnabled();
  await family.click();
  await family.click();
  await expect(page.getByRole('button', { name: 'QQQ 기준 자산 제거' })).toBeDisabled();
  await expect(individual.getByRole('button', { name: 'QQQ 개별 자산 해제' })).toBeDisabled();
  await expect(page.getByRole('group', { name: '선택 자산' })).not.toContainText('QLD');
  await expect(family).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: /경제 위기 시나리오/ })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('group', { name: '선택 자산' }).scrollIntoViewIfNeeded();
  await page.getByRole('group', { name: '선택 자산' }).locator('..').screenshot({ path: `test-results/visual-review/asset-selection-${info.project.name}.png` });
});
