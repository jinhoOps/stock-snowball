import { afterEach, describe, expect, it } from 'vitest';
import { createBundledSnapshot } from '../bundledMarketData';
import { buildMarketDataCatalog } from '../marketDataCatalog';
import { getActiveMarketData, installMarketData } from '../marketDataRuntime';
import { getHistoricalData, parseHistoricalCsv } from '../historicalAssets';
import { getProjectionMarket } from '../projectionAssets';

afterEach(() => installMarketData(createBundledSnapshot()));

describe('versioned market catalogs', () => {
  it('installs a coherent version and invalidates reference statistics', () => {
    installMarketData(createBundledSnapshot());
    const before = getProjectionMarket('QQQ')!;
    const changed = structuredClone(createBundledSnapshot());
    changed.releaseId = 'fixture-changed';
    const lines = changed.raw.csvByFilename['qqq.csv'].trimEnd().split('\n');
    const last = lines.at(-1)!.split(',');
    last[1] = String(Number(last[1]) * 1.01);
    lines[lines.length - 1] = last.join(',');
    changed.raw.csvByFilename['qqq.csv'] = lines.join('\n') + '\n';
    installMarketData(changed);
    expect(getActiveMarketData().releaseId).toBe('fixture-changed');
    expect(getHistoricalData('QQQ').at(-1)!.price).toBe(Number(last[1]));
    expect(getProjectionMarket('QQQ')!.cagr).toBeGreaterThan(before.cagr);
  });

  it('keeps the current version if a replacement is incomplete', () => {
    const before = getHistoricalData('QQQ');
    const broken = structuredClone(createBundledSnapshot());
    delete broken.raw.csvByFilename['gold.csv'];
    expect(() => installMarketData(broken)).toThrow();
    expect(getHistoricalData('QQQ')).toBe(before);
  });

  it.each(['2026-02-30,100,0', '2024-01-02,0,0', '2024-01-02,NaN,0',
    '2024-01-02,100,-1', '2024-01-02,100,', '2024-01-02,100,0,extra'])('rejects invalid rows: %s', (row) => {
    expect(() => parseHistoricalCsv('date,close,dividend\n' + row + '\n', 'fixture.csv')).toThrow();
  });

  it('accepts new reviewed records without a rebuilt frontend', () => {
    const raw = structuredClone(createBundledSnapshot().raw);
    const manifest = JSON.parse(raw.manifestText);
    const line = raw.csvByFilename['qqq.csv'].trimEnd().split('\n').at(-1)!.split(',');
    manifest.source.reviewedDailyBackfills.push({
      assetId: 'QQQ', ticker: 'QQQ', records: [{ date: line[0], close: Number(line[1]), dividend: Number(line[2]) }],
      sourceUrl: 'https://finance.yahoo.com/', retrievedAt: '2026-10-25T00:00:00Z', reason: 'Reviewed fixture',
    });
    raw.manifestText = JSON.stringify(manifest);
    expect(buildMarketDataCatalog(raw).assets.QQQ.data.at(-1)!.price).toBe(Number(line[1]));
    manifest.source.reviewedDailyBackfills.at(-1).records[0].close += 1;
    raw.manifestText = JSON.stringify(manifest);
    expect(() => buildMarketDataCatalog(raw)).toThrow(/reviewed/);
  });

  it('rejects metadata tampering even when data rows parse', () => {
    const raw = structuredClone(createBundledSnapshot().raw);
    const manifest = JSON.parse(raw.manifestText);
    manifest.assets.QQQ.currency = 'KRW';
    raw.manifestText = JSON.stringify(manifest);
    expect(() => buildMarketDataCatalog(raw)).toThrow();
  });
});
it.each(['reviewedHistoricalDateRemovals','reviewedDailyGapAllowances'])('rejects malformed recorded exception %s',(field)=>{
  const raw=structuredClone(createBundledSnapshot().raw);const manifest=JSON.parse(raw.manifestText);
  manifest.source[field]=[null];raw.manifestText=JSON.stringify(manifest);
  expect(()=>buildMarketDataCatalog(raw)).toThrow();
});
