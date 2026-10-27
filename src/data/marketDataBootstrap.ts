import type { MarketDataSnapshot } from './marketDataContract';
import { readCachedSnapshot, saveNextSnapshot } from './marketDataCache';
import { fetchRemoteSnapshot } from './marketDataRemote';
import { getActiveMarketData } from './marketDataRuntime';
export async function prepareInitialMarketData():Promise<{snapshot:MarketDataSnapshot;source:'cache'|'bundled'}>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const cached=await Promise.race([readCachedSnapshot().catch(()=>null),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),1500);})]);
    if(cached)return {snapshot:cached,source:'cache'};
  }finally{clearTimeout(timer);}
  const {createBundledSnapshot}=await import('./bundledMarketData');return {snapshot:createBundledSnapshot(),source:'bundled'};
}
let check:Promise<'unchanged'|'ready'>|undefined;
export const checkForMarketDataUpdate=():Promise<'unchanged'|'ready'>=>{
  if(check)return check;
  check=(async()=>{
    const next=await fetchRemoteSnapshot(getActiveMarketData().releaseId);
    if(!next)return 'unchanged' as const;
    await saveNextSnapshot(next);return 'ready' as const;
  })();
  // Successful work is shared across StrictMode remounts. Failures may be retried.
  check.catch(()=>{check=undefined;});return check;
};
