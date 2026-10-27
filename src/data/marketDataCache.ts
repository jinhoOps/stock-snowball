import type { MarketDataSnapshot } from './marketDataContract';
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
export async function readCachedSnapshot():Promise<MarketDataSnapshot|null>{
  const db=await open();
  try{
    const envelope=await new Promise<{snapshot:MarketDataSnapshot;sha256:string}|undefined>((resolve,reject)=>{
      const tx=db.transaction('catalogs','readonly');const store=tx.objectStore('catalogs');const next=store.get('next');
      let value:{snapshot:MarketDataSnapshot;sha256:string}|undefined;
      next.onsuccess=()=>{if(typeof next.result==='string'){const request=store.get('release:'+next.result);request.onsuccess=()=>{value=request.result;};}};
      tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error??new Error('Cache read aborted'));tx.onerror=()=>reject(tx.error);
    });
    if(!envelope)return null;
    if(await digest(envelope.snapshot)!==envelope.sha256)throw new Error('Corrupt market data cache');
    buildMarketDataCatalog(envelope.snapshot.raw);return envelope.snapshot;
  }finally{db.close();}
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
