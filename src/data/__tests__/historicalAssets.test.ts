import { describe, expect, it } from 'vitest';
import {
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

  it('uses manifest-backed coverage for every static asset', () => {
    const spy = getHistoricalCoverage('SPY');
    const spyData = getHistoricalData('SPY');

    expect(spyData).toHaveLength(spy.rowCount);
    expect(spyData[0].date).toBe(spy.startDate);
    expect(spyData.at(-1)?.date).toBe(spy.endDate);
  });

  it('accepts an entire in-coverage interval and rejects partial overlap', () => {
    const qqqm = getHistoricalCoverage('QQQM');

    expect(isHistoricalRangeCovered('QQQM', qqqm.startDate, qqqm.endDate)).toBe(true);
    expect(isHistoricalRangeCovered('QQQM', '2000-03-24', '2002-10-09')).toBe(false);
    expect(getHistoricalRangeError('QQQM', '2000-03-24', '2002-10-09')).toContain('QQQM');
  });
});
