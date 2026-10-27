import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBundledSnapshot } from '../bundledMarketData';
import { readCachedSnapshot, saveNextSnapshot } from '../marketDataCache';
afterEach(async()=>{ vi.restoreAllMocks(); await new Promise<void>((resolve,reject)=>{const r=indexedDB.deleteDatabase('stock-snowball-market-data');r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);}); });
describe('complete market data cache',()=>{
  it('stores a complete next-start snapshot and keeps prior data on abort',async()=>{
    const first=createBundledSnapshot(); await saveNextSnapshot(first);
    const next=structuredClone(first);next.releaseId='next';
    const original=IDBObjectStore.prototype.put;
    const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value:unknown,key?:IDBValidKey){
      if(key==='next') throw new DOMException('Quota exceeded','QuotaExceededError');
      return original.call(this,value,key!);
    });
    await expect(saveNextSnapshot(next)).rejects.toThrow();spy.mockRestore();
    expect((await readCachedSnapshot())?.releaseId).toBe(first.releaseId);
  });
  it('rejects an invalid candidate before modifying the current cache',async()=>{
    const first=createBundledSnapshot();await saveNextSnapshot(first);
    const broken=structuredClone(first);delete broken.raw.csvByFilename['qqq.csv'];
    await expect(saveNextSnapshot(broken)).rejects.toThrow();
    expect((await readCachedSnapshot())?.releaseId).toBe(first.releaseId);
  });
});
it('keeps a valid release named next separate from cache metadata',async()=>{
  const next=createBundledSnapshot();next.releaseId='next';
  await saveNextSnapshot(next);expect((await readCachedSnapshot())?.releaseId).toBe('next');
});
