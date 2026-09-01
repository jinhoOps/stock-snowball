import { describe, expect, it } from 'vitest';
import manifest from '../indices/manifest.json';
import {
  getMarketBenchmarkData,
  getMarketBenchmarkForAsset,
  type MarketBenchmarkId,
} from '../marketBenchmarks';

const BENCHMARK_IDS: MarketBenchmarkId[] = ['NASDAQ100', 'SP500', 'KOSPI_INDEX'];

describe('market benchmark data', () => {
  it('maps only the approved primary assets to their representative indices', () => {
    expect(getMarketBenchmarkForAsset('QQQ')).toBe('NASDAQ100');
    expect(getMarketBenchmarkForAsset('QLD')).toBe('NASDAQ100');
    expect(getMarketBenchmarkForAsset('TQQQ')).toBe('NASDAQ100');
    expect(getMarketBenchmarkForAsset('SPY')).toBe('SP500');
    expect(getMarketBenchmarkForAsset('KOSPI')).toBe('KOSPI_INDEX');
    for (const asset of ['AMD', 'AMDL', 'TSLA', 'TSLL', 'SOXX', 'SOXL', 'SCHD', 'KOSDAQ', 'GOLD'] as const) {
      expect(getMarketBenchmarkForAsset(asset)).toBeNull();
    }
  });

  it('loads the exact Nasdaq 100 metadata', () => {
    expect(getMarketBenchmarkData('NASDAQ100')).toMatchObject({
      ticker: '^NDX',
      label: '나스닥100',
      currency: 'USD',
    });
  });

  it('loads nonempty validated completed-week datasets that agree with the manifest', () => {
    expect(manifest.schemaVersion).toBe(2);
    for (const id of BENCHMARK_IDS) {
      const dataset = getMarketBenchmarkData(id);
      const coverage = manifest.assets[id as keyof typeof manifest.assets];
      expect(dataset.points.length).toBeGreaterThan(0);
      expect(coverage).toMatchObject({
        assetId: id,
        kind: 'benchmark',
        frequency: 'weekly',
        startDate: dataset.startDate,
        endDate: dataset.endDate,
        rowCount: dataset.points.length,
      });
      for (let index = 0; index < dataset.points.length; index += 1) {
        const point = dataset.points[index];
        expect(point.close).toBeGreaterThan(0);
        expect(new Date(`${point.date}T00:00:00Z`).getUTCDay()).toBeGreaterThan(0);
        expect(new Date(`${point.date}T00:00:00Z`).getUTCDay()).toBeLessThan(6);
        if (index > 0) expect(point.date > dataset.points[index - 1].date).toBe(true);
      }
    }
  });
});
