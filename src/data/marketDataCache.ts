import type { MarketDataSnapshot, PreparedMarketCatalog } from './marketDataContract';
import { buildMarketDataCatalog } from './marketDataCatalog';
import { sha256 } from './marketDataRemote';
const DB_NAME='stock-snowball-market-data';
const digest=(snapshot:MarketDataSnapshot)=>sha256(new TextEncoder().encode(JSON.stringify(snapshot)));
function open():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('catalogs');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Market data cache blocked'));
  });
}
/** Whether this browser lets the app keep a release; without it a download could never be used. */
export const canUseMarketDataCache=():Promise<boolean>=>open().then(db=>{db.close();return true;},()=>false);
export interface CachedEnvelope { snapshot: MarketDataSnapshot; sha256: string }
/** Reads the saved release without checking it, so a caller can bound only the storage wait. */
export async function readCachedEnvelope():Promise<CachedEnvelope|null>{
  const db=await open();
  try{
    return await new Promise<CachedEnvelope|null>((resolve,reject)=>{
      const tx=db.transaction('catalogs','readonly');const store=tx.objectStore('catalogs');const next=store.get('next');
      let value:CachedEnvelope|undefined;
      next.onsuccess=()=>{if(typeof next.result==='string'){const request=store.get('release:'+next.result);request.onsuccess=()=>{value=request.result;};}};
      tx.oncomplete=()=>resolve(value??null);tx.onabort=()=>reject(tx.error??new Error('Cache read aborted'));tx.onerror=()=>reject(tx.error);
    });
  }finally{db.close();}
}
/** Checks a saved release and returns it with its parsed catalog, so startup parses it only once. */
export async function verifyCachedEnvelope(envelope:CachedEnvelope):Promise<{snapshot:MarketDataSnapshot;catalog:PreparedMarketCatalog}>{
  if(await digest(envelope.snapshot)!==envelope.sha256)throw new Error('Corrupt market data cache');
  return {snapshot:envelope.snapshot,catalog:buildMarketDataCatalog(envelope.snapshot.raw)};
}
export async function readCachedSnapshot():Promise<MarketDataSnapshot|null>{
  const envelope=await readCachedEnvelope();
  return envelope?(await verifyCachedEnvelope(envelope)).snapshot:null;
}
export async function saveNextSnapshot(snapshot:MarketDataSnapshot):Promise<void>{
  buildMarketDataCatalog(snapshot.raw);const checksum=await digest(snapshot);const db=await open();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('catalogs','readwrite');const store=tx.objectStore('catalogs');
      const next=store.get('next');
      const fail=(error:unknown)=>{tx.abort();reject(error);};
      next.onsuccess=()=>{
        try{
          const previous=next.result;
          store.put({snapshot,sha256:checksum},'release:'+snapshot.releaseId);
          store.put(snapshot.releaseId,'next');
          const keys=store.getAllKeys();keys.onsuccess=()=>{for(const key of keys.result)if(key!=='next'&&key!=='release:'+snapshot.releaseId&&key!=='release:'+previous)store.delete(key);};
        }catch(error){fail(error);}
      };
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error('Cache write aborted'));tx.onerror=()=>reject(tx.error);
    });
  }finally{db.close();}
}
