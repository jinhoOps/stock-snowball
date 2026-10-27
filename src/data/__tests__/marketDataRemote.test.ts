import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createBundledSnapshot } from '../bundledMarketData';
import { fetchRemoteSnapshot } from '../marketDataRemote';
import { STORAGE_BASE_URL } from '../marketDataContract';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
export const remoteFixture = () => {
  const raw = createBundledSnapshot().raw;
  const files: Record<string, string> = { ...raw.csvByFilename, 'manifest.json': raw.manifestText };
  const release = { transportVersion: 1, releaseId: 'fixture-one', publishedAt: '2026-10-26T01:17:00Z', dataHash: '0'.repeat(64),
    files: Object.fromEntries(Object.entries(files).map(([name,text]) => [name,{bytes: new TextEncoder().encode(text).length,sha256: hash(text)}])) };
  const text=JSON.stringify(release);
  return { files, release, pointer: { transportVersion:1, current: { releaseId:release.releaseId, publishedAt:release.publishedAt, releaseSha256:hash(text) } }, releaseText:text };
};
afterEach(() => vi.unstubAllGlobals());
describe('remote catalog verification', () => {
  it('loads an entire coherent catalog from public paths without credentials', async () => {
    const fixture=remoteFixture();
    const fetcher=vi.fn(async (input: string) => {
      expect(input.startsWith(STORAGE_BASE_URL)).toBe(true);
      if(input.endsWith('latest.json')) return new Response(JSON.stringify(fixture.pointer));
      if(input.endsWith('release.json')) return new Response(fixture.releaseText);
      return new Response(fixture.files[input.split('/').at(-1)!]);
    });
    vi.stubGlobal('fetch',fetcher);
    const snapshot=await fetchRemoteSnapshot('bundled');
    expect(snapshot?.releaseId).toBe('fixture-one');
    expect(snapshot?.raw.csvByFilename['qqq.csv']).toBe(fixture.files['qqq.csv']);
  });
  it('does not download payloads when already current',async()=>{
    const fixture=remoteFixture(); const fetcher=vi.fn(async()=>new Response(JSON.stringify(fixture.pointer)));
    vi.stubGlobal('fetch',fetcher);
    expect(await fetchRemoteSnapshot('fixture-one')).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects a tampered file instead of producing a partial snapshot',async()=>{
    const f=remoteFixture();
    vi.stubGlobal('fetch',async(input:string)=>new Response(input.endsWith('latest.json')?JSON.stringify(f.pointer):input.endsWith('release.json')?f.releaseText:input.endsWith('qqq.csv')?'corrupt':f.files[input.split('/').at(-1)!]));
    await expect(fetchRemoteSnapshot('bundled')).rejects.toThrow(/hash|size/i);
  });
  it('rejects path traversal before requesting any payload',async()=>{
    const f=remoteFixture(); f.pointer.current.releaseId='../outside';
    const fetcher=vi.fn(async()=>new Response(JSON.stringify(f.pointer))); vi.stubGlobal('fetch',fetcher);
    await expect(fetchRemoteSnapshot('bundled')).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('allows an explicit rollback to a previous version',async()=>{
    const f=remoteFixture();
    vi.stubGlobal('fetch',async(input:string)=>new Response(input.endsWith('latest.json')?JSON.stringify(f.pointer):input.endsWith('release.json')?f.releaseText:f.files[input.split('/').at(-1)!]));
    expect((await fetchRemoteSnapshot('newer-version'))?.releaseId).toBe('fixture-one');
  });
});
