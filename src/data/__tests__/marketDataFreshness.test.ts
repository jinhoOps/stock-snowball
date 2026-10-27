import { describe, expect, it } from 'vitest';
import { isNewerCatalog } from '../marketDataFreshness';
const manifest=(ends:Record<string,string>)=>JSON.stringify({assets:Object.fromEntries(Object.entries(ends).map(([id,endDate])=>[id,{endDate}]))});
describe('catalog freshness',()=>{
  it('is newer only when some dataset reaches later and none falls behind',()=>{
    const base=manifest({QQQ:'2026-10-23',NASDAQ100:'2026-10-16'});
    expect(isNewerCatalog(manifest({QQQ:'2026-10-26',NASDAQ100:'2026-10-16'}),base)).toBe(true);
    expect(isNewerCatalog(base,base)).toBe(false);
    expect(isNewerCatalog(manifest({QQQ:'2026-10-26',NASDAQ100:'2026-10-09'}),base)).toBe(false);
    expect(isNewerCatalog(manifest({QQQ:'2026-10-26'}),base)).toBe(false);
  });
});
