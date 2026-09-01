import { describe, expect, it } from 'vitest';
import type { BenchmarkPoint, MarketBenchmarkDataset } from '../../data/marketBenchmarks';
import {
  buildMarketTrendOverlay,
  calculateWeeklyTrend,
  findMarketTrendOnOrBefore,
} from '../MarketTrend';

const weeklyPoints = (startDate: string, count: number, firstClose = 1): BenchmarkPoint[] => {
  const start = new Date(`${startDate}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index * 7);
    return { date: date.toISOString().slice(0, 10), close: firstClose + index };
  });
};

const datasetFor = (points: BenchmarkPoint[]): MarketBenchmarkDataset => ({
  id: 'NASDAQ100',
  ticker: '^NDX',
  label: 'Nasdaq 100',
  currency: 'USD',
  startDate: points[0]?.date ?? '',
  endDate: points.at(-1)?.date ?? '',
  points,
});

describe('weekly market trend model', () => {
  it('calculates full-history 20-week and 60-week rolling averages', () => {
    const points = weeklyPoints('2025-01-03', 65);
    const trend = calculateWeeklyTrend(points);

    expect(trend[18].sma20).toBeNull();
    expect(trend[19].sma20).toBeCloseTo(10.5);
    expect(trend[58].sma60).toBeNull();
    expect(trend[59].sma60).toBeCloseTo(30.5);

    for (let index = 0; index < points.length; index += 1) {
      const expectedSma20 = index < 19
        ? null
        : points.slice(index - 19, index + 1).reduce((sum, point) => sum + point.close, 0) / 20;
      const expectedSma60 = index < 59
        ? null
        : points.slice(index - 59, index + 1).reduce((sum, point) => sum + point.close, 0) / 60;

      expect(trend[index]).toMatchObject({
        date: points[index].date,
        close: points[index].close,
        sma20: expectedSma20,
        sma60: expectedSma60,
      });
    }
  });

  it('finds the closest completed trend point on or before a date', () => {
    const trend = calculateWeeklyTrend([
      { date: '2026-08-21', close: 100 },
      { date: '2026-08-28', close: 110 },
      { date: '2026-09-04', close: 120 },
    ]);

    expect(findMarketTrendOnOrBefore(trend, '2026-08-20')).toBeNull();
    expect(findMarketTrendOnOrBefore(trend, '2026-08-28')).toMatchObject({ date: '2026-08-28', close: 110 });
    expect(findMarketTrendOnOrBefore(trend, '2026-09-01')).toMatchObject({ date: '2026-08-28', close: 110 });
  });

  it('anchors the left edge without lookahead and indexes every value to the anchor close', () => {
    const points = weeklyPoints('2026-04-10', 22, 100);
    expect(points.slice(-3).map((point) => point.date)).toEqual(['2026-08-21', '2026-08-28', '2026-09-04']);

    const overlay = buildMarketTrendOverlay(datasetFor(points), '2026-08-25', '2026-09-03');

    expect(overlay).not.toBeNull();
    expect(overlay?.points).toHaveLength(2);
    expect(overlay?.points[0]).toMatchObject({
      date: '2026-08-25',
      sourceDate: '2026-08-21',
      close: 119,
      sma20: 109.5,
      sma60: null,
      indexedClose: 100,
      indexedSma20: 109.5 / 119 * 100,
      indexedSma60: null,
    });
    expect(overlay?.points[1]).toMatchObject({
      date: '2026-08-28',
      sourceDate: '2026-08-28',
      close: 120,
      sma20: 110.5,
      sma60: null,
      indexedClose: 120 / 119 * 100,
      indexedSma20: 110.5 / 119 * 100,
      indexedSma60: null,
    });
    expect(overlay?.points.map((point) => point.sourceDate)).not.toContain('2026-09-04');
  });

  it('returns null when no completed benchmark point exists on or before the range end', () => {
    const overlay = buildMarketTrendOverlay(
      datasetFor([{ date: '2026-08-21', close: 100 }]),
      '2026-08-01',
      '2026-08-20',
    );

    expect(overlay).toBeNull();
  });

  it('rejects inverted date ranges', () => {
    expect(() => buildMarketTrendOverlay(
      datasetFor([{ date: '2026-08-21', close: 100 }]),
      '2026-08-22',
      '2026-08-21',
    )).toThrow(RangeError);
  });
});
