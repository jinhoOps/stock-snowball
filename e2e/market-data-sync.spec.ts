import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const base='https://olqdftjssrzqvcindekh.supabase.co/storage/v1/object/public/stock-snowball-market-data/';
function fixture(){
  const dir=resolve('src/data/indices');
  const files:Record<string,string>=Object.fromEntries(readdirSync(dir).filter(name=>name.endsWith('.csv')).map(name=>[name,readFileSync(resolve(dir,name),'utf8')]));
  const manifest=JSON.parse(readFileSync(resolve(dir,'manifest.json'),'utf8'));
  const row=files['spy.csv'].trimEnd().split('\n').at(-1)!.split(',');
  files['spy.csv']=files['spy.csv'].trimEnd()+'\n2026-10-26,'+row[1]+',0\n';
  manifest.assets.SPY.endDate='2026-10-26';manifest.assets.SPY.rowCount+=1;manifest.generatedAt='2026-10-27T00:00:00Z';
  files['manifest.json']=JSON.stringify(manifest);
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  const release={transportVersion:1,releaseId:'browser-fixture',publishedAt:'2026-10-27T01:17:00Z',dataHash:'0'.repeat(64),files:Object.fromEntries(Object.entries(files).map(([name,s])=>[name,{bytes:Buffer.byteLength(s),sha256:hash(s)}]))};
  const releaseText=JSON.stringify(release);
  const pointer={transportVersion:1,current:{releaseId:release.releaseId,publishedAt:release.publishedAt,releaseSha256:hash(releaseText)}};
  return {files,releaseText,pointer};
}
async function mockRemote(page:Page,broken=false){
  const f=fixture();let payloads=0;
  await page.route(base+'**',async route=>{
    const name=route.request().url().split('/').at(-1)!;
    if(name==='latest.json')return route.fulfill({json:f.pointer});
    if(name==='release.json')return route.fulfill({body:f.releaseText,contentType:'application/json'});
    payloads++;
    if(broken&&name==='qqq.csv')return route.abort('failed');
    return route.fulfill({body:f.files[name],contentType:name.endsWith('.csv')?'text/csv':'application/json'});
  });
  return ()=>payloads;
}
test('caches a complete release and applies it only on explicit reload',async({page},info)=>{
  const payloads=await mockRemote(page);
  await page.goto('/stock-snowball/');
  await expect(page.getByText('시세 기준 2026-10-23 · 기본 데이터')).toBeVisible();
  await expect(page.getByRole('button',{name:'새로고침해 적용'})).toBeVisible();
  const before=await page.evaluate(()=>localStorage.getItem('projection_params'));
  await page.getByRole('button',{name:'새로고침해 적용'}).click();
  await expect(page.getByText('시세 기준 2026-10-26',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'새로고침해 적용'})).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem('projection_params'))).toBe(before);
  expect(payloads()).toBe(18);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:'test-results/market-data-'+info.project.name+'.png',fullPage:true});
});
test('incomplete downloads keep bundled calculations and offer retry',async({page})=>{
  await mockRemote(page,true);await page.goto('/stock-snowball/');
  await expect(page.getByRole('button',{name:'다시 확인'})).toBeVisible();
  await expect(page.getByRole('button',{name:'새로고침해 적용'})).toHaveCount(0);
  await expect(page.getByText('시세 기준 2026-10-23 · 기본 데이터')).toBeVisible();
});
test('blocked IndexedDB keeps the app usable and never reports a saved update',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new Error('Cache denied');}}));
  await mockRemote(page);await page.goto('/stock-snowball/');
  await expect(page.getByRole('button',{name:'다시 확인'})).toBeVisible();
  await expect(page.getByText('시세 기준 2026-10-23 · 기본 데이터')).toBeVisible();
  await expect(page.getByRole('button',{name:'새로고침해 적용'})).toHaveCount(0);
});
