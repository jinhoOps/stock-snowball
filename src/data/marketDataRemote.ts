import { buildMarketDataCatalog } from './marketDataCatalog';
import { DATA_FILENAMES, LIMITS, STORAGE_BASE_URL, isReleaseId, isTimestamp, type LatestPointer, type ReleaseManifest, type ReleaseRef, type MarketDataSnapshot } from './marketDataContract';
const hashPattern = /^[a-f0-9]{64}$/;
export const sha256 = async (bytes: Uint8Array): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)), value => value.toString(16).padStart(2, '0')).join('');
const decode = (bytes: Uint8Array): string => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const json = (bytes: Uint8Array): unknown => JSON.parse(decode(bytes));
class RemoteError extends Error { constructor(message: string, readonly status?: number) { super(message); } }
function assertRef(ref: unknown): asserts ref is ReleaseRef {
  const r = ref as ReleaseRef | null;
  if (!r || !isReleaseId(r.releaseId) || !isTimestamp(r.publishedAt) || !hashPattern.test(r.releaseSha256)) throw new Error('Invalid release reference');
}
function assertPointer(pointer: unknown): asserts pointer is LatestPointer {
  const p = pointer as LatestPointer | null;
  if (!p || p.transportVersion !== 1) throw new Error('Unsupported pointer version');
  assertRef(p.current); if (p.previous !== undefined) assertRef(p.previous);
}
function assertRelease(release: unknown, ref: ReleaseRef): asserts release is ReleaseManifest {
  const r = release as ReleaseManifest | null;
  if (!r || r.transportVersion !== 1 || r.releaseId !== ref.releaseId || r.publishedAt !== ref.publishedAt || !hashPattern.test(r.dataHash)
    || !r.files || JSON.stringify(Object.keys(r.files).sort()) !== JSON.stringify([...DATA_FILENAMES].sort())) throw new Error('Invalid release manifest');
  let size=0;
  for (const file of Object.values(r.files)) {
    if (!file || !Number.isInteger(file.bytes) || file.bytes <= 0 || file.bytes > LIMITS.file || !hashPattern.test(file.sha256)) throw new Error('Invalid file size or hash');
    size+=file.bytes;
  }
  if (size>LIMITS.total) throw new Error('Catalog size limit exceeded');
}
async function download(path: string, limit: number, signal: AbortSignal): Promise<Uint8Array> {
  const response=await fetch(STORAGE_BASE_URL+path, { signal, cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new RemoteError('Market data HTTP '+response.status,response.status);
  if (Number(response.headers.get('content-length'))>limit) throw new Error('Response size limit exceeded');
  if (!response.body) throw new Error('Empty market data response');
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>limit)throw new Error('Response size limit exceeded');chunks.push(value);
    }
  } catch(error) { await reader.cancel().catch(()=>undefined);throw error; }
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
interface FetchOptions {
  signal?: AbortSignal;
  /** Looks at the release's manifest before the CSVs are downloaded; false skips the release. */
  accept?: (manifestText: string) => boolean;
}
export async function fetchRemoteSnapshot(currentReleaseId: string, { signal, accept }: FetchOptions = {}): Promise<MarketDataSnapshot | null> {
  const controller=new AbortController();
  const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    for(let attempt=0;attempt<2;attempt++) {
      timer=setTimeout(abort,8000);
      const pointer=json(await download('v1/latest.json',LIMITS.pointer,controller.signal));assertPointer(pointer);clearTimeout(timer);
      if(pointer.current.releaseId===currentReleaseId)return null;
      timer=setTimeout(abort,30000);
      const prefix='v1/releases/'+pointer.current.releaseId+'/';
      try {
        const releaseBytes=await download(prefix+'release.json',LIMITS.release,controller.signal);
        if(await sha256(releaseBytes)!==pointer.current.releaseSha256)throw new Error('Release hash mismatch');
        const release=json(releaseBytes);assertRelease(release,pointer.current);
        const files:Record<string,string>={};
        const fetchFile=async(name:string)=>{
          const descriptor=release.files[name];const bytes=await download(prefix+name,descriptor.bytes,controller.signal);
          if(bytes.length!==descriptor.bytes || await sha256(bytes)!==descriptor.sha256)throw new Error('File size or hash mismatch: '+name);
          files[name]=decode(bytes);
        };
        await fetchFile('manifest.json');
        if(accept && !accept(files['manifest.json']))return null;
        const names=Object.keys(release.files).filter(name=>name!=='manifest.json');
        for(let i=0;i<names.length;i+=4) await Promise.all(names.slice(i,i+4).map(fetchFile));
        const { ['manifest.json']:manifestText,...csvByFilename }=files;
        const snapshot={releaseId:release.releaseId,publishedAt:release.publishedAt,raw:{manifestText,csvByFilename}};
        buildMarketDataCatalog(snapshot.raw);return snapshot;
      } catch(error) {
        if(!(error instanceof RemoteError) || error.status!==404 || attempt===1)throw error;
      } finally {clearTimeout(timer);}
    }
    throw new Error('No complete market data release');
  } finally {clearTimeout(timer);controller.abort();signal?.removeEventListener('abort',abort);}
}
