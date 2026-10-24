import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://localhost:5199/stock-snowball/');
  await p.waitForTimeout(1500);
  const g = p.locator('[aria-label^="자주 쓰는"]').first();
  for (const c of ['일','주','월']) {
    await p.getByRole('radio', { name: c, exact: true }).first().click().catch(async () => p.getByRole('button', { name: c, exact: true }).first().click());
    await p.waitForTimeout(200);
    const tops = await g.locator('button').evaluateAll(bs => bs.map(b => [b.textContent, Math.round(b.getBoundingClientRect().top)]));
    console.log(w, c, JSON.stringify(tops));
  }
  await g.screenshot({ path: `/private/tmp/claude-501/-Users-jinho-orca-stock-snowball/b23503db-a058-42c1-968a-c0d30af990f7/scratchpad/chips-${w}.png` });
}
await b.close();
