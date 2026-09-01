import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_ASSET_IDS,
  getHistoricalCoverage,
  getHistoricalData,
  getHistoricalRangeError,
  isHistoricalRangeCovered,
  findPointOnOrBefore,
  parseHistoricalCsv,
} from '../historicalAssets';

describe('historical CSV data', () => {
  it('parses compact close and cash-dividend rows', () => {
    expect(
      parseHistoricalCsv(
        'date,close,dividend\n2024-01-02,100,0\n2024-01-03,99,1\n',
        'fixture.csv',
      ),
    ).toEqual([
      { date: '2024-01-02', price: 100, dividendYield: 0 },
      { date: '2024-01-03', price: 99, dividendYield: 1 / 99 },
    ]);
  });

  it('loads exactly the approved historical asset catalog', () => {
    expect(HISTORICAL_ASSET_IDS).toEqual([
      'QQQ', 'QLD', 'TQQQ', 'AMD', 'AMDL', 'TSLA', 'TSLL',
      'SOXX', 'SOXL', 'SPY', 'SCHD', 'KOSPI', 'KOSDAQ', 'GOLD',
    ]);
    expect(HISTORICAL_ASSET_IDS).toHaveLength(14);
    expect(HISTORICAL_ASSET_IDS).not.toContain('NASDAQ100');
    expect(HISTORICAL_ASSET_IDS).not.toContain('SP500');
    expect(HISTORICAL_ASSET_IDS).not.toContain('KOSPI_INDEX');
    for (const assetId of HISTORICAL_ASSET_IDS) {
      const coverage = getHistoricalCoverage(assetId);
      const data = getHistoricalData(assetId);
      expect(data).toHaveLength(coverage.rowCount);
      expect(data[0].date).toBe(coverage.startDate);
      expect(data.at(-1)?.date).toBe(coverage.endDate);
    }
  });

  it('accepts an entire in-coverage interval and rejects partial overlap', () => {
    const qqq = getHistoricalCoverage('QQQ');

    expect(isHistoricalRangeCovered('QQQ', qqq.startDate, qqq.endDate)).toBe(true);
    expect(isHistoricalRangeCovered('QQQ', '1999-03-09', '2002-10-09')).toBe(false);
    expect(getHistoricalRangeError('QQQ', '1999-03-09', '2002-10-09')).toContain('QQQ');
  });

  it('finds prior GOLD dates with logarithmic indexed access', () => {
    const points = Array.from({ length: 16_384 }, (_, index) => ({
      date: new Date(Date.UTC(1980, 0, index + 1)).toISOString().slice(0, 10),
      price: index + 1,
      dividendYield: 0,
    }));
    let indexedReads = 0;
    const instrumented = new Proxy(points, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) indexedReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });

    expect(findPointOnOrBefore(instrumented, points[12_345].date)).toEqual(points[12_345]);
    expect(indexedReads).toBeLessThan(64);
    expect(findPointOnOrBefore(points, '0000-01-01')).toBeNull();
    expect(findPointOnOrBefore(points, '9999-12-31')).toEqual(points.at(-1));
  });
});
