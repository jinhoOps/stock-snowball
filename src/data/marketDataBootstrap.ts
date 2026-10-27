import type { MarketDataSnapshot, PreparedMarketCatalog } from './marketDataContract';
import { buildMarketDataCatalog } from './marketDataCatalog';
import { readCachedEnvelope, saveNextSnapshot, verifyCachedEnvelope, type CachedEnvelope } from './marketDataCache';
import { isNewerCatalog } from './marketDataFreshness';
import { fetchRemoteSnapshot } from './marketDataRemote';
import { getActiveMarketData } from './marketDataRuntime';
import bundledManifest from './indices/manifest.json';

const bundledManifestText = JSON.stringify(bundledManifest);
/** How long startup waits for IndexedDB itself; checking and parsing what it returns isn't timed. */
const CACHE_READ_TIMEOUT_MS = 1500;

interface InitialMarketData { snapshot: MarketDataSnapshot; catalog: PreparedMarketCatalog; source: 'cache' | 'bundled' }

const readCacheInTime = async (): Promise<CachedEnvelope | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      readCachedEnvelope().catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), CACHE_READ_TIMEOUT_MS); }),
    ]);
  } finally { clearTimeout(timer); }
};

/** The saved release, unless the data shipped with this build reaches later days. */
export async function prepareInitialMarketData(): Promise<InitialMarketData> {
  const envelope = await readCacheInTime();
  if (envelope) {
    try {
      const cached = await verifyCachedEnvelope(envelope);
      if (!isNewerCatalog(bundledManifestText, cached.snapshot.raw.manifestText)) return { ...cached, source: 'cache' };
    } catch { /* A damaged cache falls back to the bundled data. */ }
  }
  const { createBundledSnapshot } = await import('./bundledMarketData');
  const snapshot = createBundledSnapshot();
  return { snapshot, catalog: buildMarketDataCatalog(snapshot.raw), source: 'bundled' };
}

let check: Promise<'unchanged' | 'ready'> | undefined;
/**
 * Saves the published release for the next start.
 * On a saved release the remote pointer is followed even to older data, so a rollback reaches users.
 * On the bundled data a release counts only when it reaches later days; otherwise it would offer the same or older data.
 */
export const checkForMarketDataUpdate = (): Promise<'unchanged' | 'ready'> => {
  if (check) return check;
  check = (async () => {
    const active = getActiveMarketData();
    const accept = active.publishedAt === null
      ? (manifestText: string) => isNewerCatalog(manifestText, active.raw.manifestText)
      : undefined;
    const next = await fetchRemoteSnapshot(active.releaseId, { accept });
    if (!next) return 'unchanged' as const;
    await saveNextSnapshot(next); return 'ready' as const;
  })();
  // Successful work is shared across StrictMode remounts. Failures may be retried.
  check.catch(() => { check = undefined; }); return check;
};
