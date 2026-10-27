import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBundledSnapshot } from '../bundledMarketData';
import type { MarketDataSnapshot, PreparedMarketCatalog } from '../marketDataContract';
vi.mock('../marketDataCache',()=>({canUseMarketDataCache:vi.fn(),readCachedEnvelope:vi.fn(),verifyCachedEnvelope:vi.fn(),saveNextSnapshot:vi.fn()}));
vi.mock('../marketDataRemote',()=>({fetchRemoteSnapshot:vi.fn()}));
const catalog={} as PreparedMarketCatalog;
/** A release whose every dataset ends `days` days from the bundled data's end (negative is older). */
const shifted=(releaseId:string,days:number):MarketDataSnapshot=>{
  const snapshot=createBundledSnapshot();const manifest=JSON.parse(snapshot.raw.manifestText);
  for(const coverage of Object.values(manifest.assets) as {endDate:string}[]){
    const end=new Date(coverage.endDate+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+days);coverage.endDate=end.toISOString().slice(0,10);
  }
  return {releaseId,publishedAt:'2026-10-27T01:17:00Z',raw:{...snapshot.raw,manifestText:JSON.stringify(manifest)}};
};
const mockCache=async(snapshot:MarketDataSnapshot)=>{
  const cache=await import('../marketDataCache');
  vi.mocked(cache.readCachedEnvelope).mockResolvedValue({snapshot,sha256:'0'.repeat(64)});
  vi.mocked(cache.verifyCachedEnvelope).mockImplementation(async envelope=>({snapshot:envelope.snapshot,catalog}));
  return cache;
};
beforeEach(async()=>{
  vi.resetModules();
  const cache=await import('../marketDataCache');vi.mocked(cache.canUseMarketDataCache).mockResolvedValue(true);
  const {installMarketData}=await import('../marketDataRuntime');installMarketData(createBundledSnapshot());
});
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
describe('market data startup',()=>{
  it('uses a valid cache, and its parsed catalog, before the App is imported',async()=>{
    await mockCache(shifted('saved',1));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    const initial=await prepareInitialMarketData();
    expect(initial.snapshot.releaseId).toBe('saved');expect(initial.catalog).toBe(catalog);
  });
  it('keeps a cached release that holds the same days as the bundled data',async()=>{
    await mockCache(shifted('saved',0));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    expect((await prepareInitialMarketData()).source).toBe('cache');
  });
  it('prefers bundled data that reaches later days than the cache',async()=>{
    await mockCache(shifted('stale',-3));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    const initial=await prepareInitialMarketData();
    expect(initial.source).toBe('bundled');expect(initial.snapshot.releaseId).toMatch(/^bundled-/);
  });
  it('uses bundled data when IndexedDB is unavailable',async()=>{
    const cache=await import('../marketDataCache');vi.mocked(cache.readCachedEnvelope).mockRejectedValue(new Error('blocked'));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    expect((await prepareInitialMarketData()).source).toBe('bundled');
  });
  it('uses bundled data when the cache is damaged',async()=>{
    const cache=await mockCache(shifted('saved',1));vi.mocked(cache.verifyCachedEnvelope).mockRejectedValue(new Error('Corrupt market data cache'));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    expect((await prepareInitialMarketData()).source).toBe('bundled');
  });
  it('does not wait indefinitely for an unresponsive cache',async()=>{
    vi.useFakeTimers();const cache=await import('../marketDataCache');vi.mocked(cache.readCachedEnvelope).mockReturnValue(new Promise(()=>{}));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');const result=prepareInitialMarketData();
    await vi.advanceTimersByTimeAsync(1500);expect((await result).source).toBe('bundled');
  });
  it('keeps a cache whose check runs past the storage timeout, so slow devices are not sent back to bundled data',async()=>{
    vi.useFakeTimers();const cache=await mockCache(shifted('saved',1));
    vi.mocked(cache.verifyCachedEnvelope).mockImplementation(envelope=>new Promise(resolve=>setTimeout(()=>resolve({snapshot:envelope.snapshot,catalog}),5000)));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');const result=prepareInitialMarketData();
    await vi.advanceTimersByTimeAsync(5000);expect((await result).source).toBe('cache');
  });
});
describe('market data update check',()=>{
  it('shares a check and caches a new version without changing live calculations',async()=>{
    const remote=await import('../marketDataRemote');const cache=await import('../marketDataCache');
    vi.mocked(remote.fetchRemoteSnapshot).mockResolvedValue(shifted('pending',1));vi.mocked(cache.saveNextSnapshot).mockResolvedValue();
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');
    await expect(Promise.all([checkForMarketDataUpdate(),checkForMarketDataUpdate()])).resolves.toEqual(['ready','ready']);
    expect(remote.fetchRemoteSnapshot).toHaveBeenCalledTimes(1);
    const {getActiveMarketData}=await import('../marketDataRuntime');expect(getActiveMarketData().releaseId).not.toBe('pending');
  });
  it('on bundled data, offers only a release that reaches later days',async()=>{
    const remote=await import('../marketDataRemote');vi.mocked(remote.fetchRemoteSnapshot).mockResolvedValue(null);
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');await checkForMarketDataUpdate();
    const accept=vi.mocked(remote.fetchRemoteSnapshot).mock.calls[0][1]?.accept;
    expect(accept?.(shifted('same',0).raw.manifestText)).toBe(false);
    expect(accept?.(shifted('older',-1).raw.manifestText)).toBe(false);
    expect(accept?.(shifted('newer',1).raw.manifestText)).toBe(true);
  });
  it('on a saved release, follows the published pointer even to older data so a rollback reaches users',async()=>{
    const {installMarketData}=await import('../marketDataRuntime');installMarketData(shifted('saved',1),catalog);
    const remote=await import('../marketDataRemote');vi.mocked(remote.fetchRemoteSnapshot).mockResolvedValue(null);
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');await checkForMarketDataUpdate();
    expect(vi.mocked(remote.fetchRemoteSnapshot).mock.calls[0]).toEqual(['saved',{accept:undefined}]);
  });
  it('does not download a release this browser cannot keep',async()=>{
    const remote=await import('../marketDataRemote');const cache=await import('../marketDataCache');
    vi.mocked(cache.canUseMarketDataCache).mockResolvedValue(false);
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');
    await expect(checkForMarketDataUpdate()).rejects.toThrow('unavailable');
    expect(remote.fetchRemoteSnapshot).not.toHaveBeenCalled();
  });
  it('does not report a ready update when cache storage fails',async()=>{
    const remote=await import('../marketDataRemote');const cache=await import('../marketDataCache');
    vi.mocked(remote.fetchRemoteSnapshot).mockResolvedValue(shifted('pending',1));vi.mocked(cache.saveNextSnapshot).mockRejectedValue(new Error('quota'));
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');await expect(checkForMarketDataUpdate()).rejects.toThrow('quota');
  });
});
