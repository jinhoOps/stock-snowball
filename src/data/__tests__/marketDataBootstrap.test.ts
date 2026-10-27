import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBundledSnapshot } from '../bundledMarketData';
vi.mock('../marketDataCache',()=>({readCachedSnapshot:vi.fn(),saveNextSnapshot:vi.fn()}));
vi.mock('../marketDataRemote',()=>({fetchRemoteSnapshot:vi.fn()}));
beforeEach(async()=>{
  vi.resetModules();
  const {installMarketData}=await import('../marketDataRuntime');installMarketData(createBundledSnapshot());
});
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
describe('market data startup',()=>{
  it('uses a valid cache before the App is imported',async()=>{
    const cache=await import('../marketDataCache');const saved=createBundledSnapshot();saved.releaseId='saved';
    vi.mocked(cache.readCachedSnapshot).mockResolvedValue(saved);
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    expect((await prepareInitialMarketData()).snapshot.releaseId).toBe('saved');
  });
  it('uses bundled data when IndexedDB is unavailable',async()=>{
    const cache=await import('../marketDataCache');vi.mocked(cache.readCachedSnapshot).mockRejectedValue(new Error('blocked'));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');
    expect((await prepareInitialMarketData()).source).toBe('bundled');
  });
  it('does not wait indefinitely for an unresponsive cache',async()=>{
    vi.useFakeTimers();const cache=await import('../marketDataCache');vi.mocked(cache.readCachedSnapshot).mockReturnValue(new Promise(()=>{}));
    const {prepareInitialMarketData}=await import('../marketDataBootstrap');const result=prepareInitialMarketData();
    await vi.advanceTimersByTimeAsync(1500);expect((await result).source).toBe('bundled');
  });
  it('shares a check and caches a new version without changing live calculations',async()=>{
    const remote=await import('../marketDataRemote');const cache=await import('../marketDataCache');
    const snapshot=createBundledSnapshot();snapshot.releaseId='pending';vi.mocked(remote.fetchRemoteSnapshot).mockResolvedValue(snapshot);vi.mocked(cache.saveNextSnapshot).mockResolvedValue();
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');
    await expect(Promise.all([checkForMarketDataUpdate(),checkForMarketDataUpdate()])).resolves.toEqual(['ready','ready']);
    expect(remote.fetchRemoteSnapshot).toHaveBeenCalledTimes(1);
    const {getActiveMarketData}=await import('../marketDataRuntime');expect(getActiveMarketData().releaseId).not.toBe('pending');
  });
  it('does not report a ready update when cache storage fails',async()=>{
    const remote=await import('../marketDataRemote');const cache=await import('../marketDataCache');
    vi.mocked(remote.fetchRemoteSnapshot).mockResolvedValue({...createBundledSnapshot(),releaseId:'pending'});vi.mocked(cache.saveNextSnapshot).mockRejectedValue(new Error('quota'));
    const {checkForMarketDataUpdate}=await import('../marketDataBootstrap');await expect(checkForMarketDataUpdate()).rejects.toThrow('quota');
  });
});
