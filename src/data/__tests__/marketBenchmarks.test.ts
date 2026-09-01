import { describe, expect, it } from 'vitest';
import manifest from '../indices/manifest.json';
import {
  getMarketBenchmarkData,
  getMarketBenchmarkForAsset,
  validateMarketDataManifest,
  validateReviewedWeeklyCloseValues,
  validateCompletedWeeklyPoints,
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

  it('rejects multiple rows from the same completed ISO week', () => {
    expect(() => validateCompletedWeeklyPoints([
      { date: '2026-08-24', close: 100 },
      { date: '2026-08-25', close: 101 },
    ], 'fixture.csv')).toThrow('one completed-week close');
  });

  it('rejects a non-final weekday when a later weekday exists in that ISO week', () => {
    expect(() => validateCompletedWeeklyPoints([
      { date: '2026-08-27', close: 100 },
      { date: '2026-08-28', close: 101 },
    ], 'fixture.csv')).toThrow('non-final');
  });

  it('rejects an isolated Thursday when the static calendar expects Friday', () => {
    expect(() => validateCompletedWeeklyPoints([
      { date: '2026-09-03', close: 100 },
    ], 'fixture.csv', '2026-09-04')).toThrow('final trading day 2026-09-04');
  });

  it('accepts Thursday when the static calendar records a Friday closure', () => {
    expect(validateCompletedWeeklyPoints([
      { date: '2026-12-24', close: 100 },
    ], 'fixture.csv', '2026-12-24')).toEqual([
      { date: '2026-12-24', close: 100 },
    ]);
  });

  it('rejects missing or mismatched reviewed weekly-close provenance', () => {
    const missingOverrides: unknown = {
      ...structuredClone(manifest),
      source: {
        provider: 'Yahoo Finance',
        client: 'yfinance',
      },
    };
    expect(() => validateMarketDataManifest(missingOverrides)).toThrow('reviewed weekly close override provenance');

    const mismatchedClose = structuredClone(manifest);
    mismatchedClose.source.reviewedWeeklyCloseOverrides[0].close = 0;
    expect(() => validateMarketDataManifest(mismatchedClose)).toThrow('reviewed weekly close override provenance');
  });

  it('rejects missing or mismatched reviewed weekly-close values', () => {
    expect(() => validateReviewedWeeklyCloseValues(
      'NASDAQ100',
      [{ date: '2026-08-21', close: 29308.859375 }],
      'fixture.csv',
    )).toThrow('is missing');
    expect(() => validateReviewedWeeklyCloseValues(
      'NASDAQ100',
      [{ date: '2026-08-28', close: 1 }],
      'fixture.csv',
    )).toThrow('does not match');
  });

  it('loads nonempty validated completed-week datasets that agree with the manifest', () => {
    expect(manifest.schemaVersion).toBe(4);
    for (const id of BENCHMARK_IDS) {
      const dataset = getMarketBenchmarkData(id);
      const coverage = manifest.assets[id as keyof typeof manifest.assets];
      expect(dataset.points.length).toBeGreaterThan(0);
      expect(coverage).toMatchObject({
        assetId: id,
        kind: 'benchmark',
        frequency: 'weekly',
        calendar: id === 'KOSPI_INDEX' ? 'XKRX' : 'XNYS',
        expectedEndDate: dataset.endDate,
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
