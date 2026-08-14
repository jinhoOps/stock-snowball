import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_ASSET_IDS,
  getHistoricalCoverage,
  getHistoricalData,
  getHistoricalRangeError,
  isHistoricalRangeCovered,
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
    expect(HISTORICAL_ASSET_IDS).toHaveLength(14);
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
});
