import { describe, expect, it } from 'vitest';
import {
  calculateMedianCAGR,
  getHistoricalData,
  getDailyReturn,
  HISTORICAL_DAILY_RETURNS,
  type IndexPoint,
} from '../historicalAssets';

const withHistory = (points: IndexPoint[], assertion: () => void): void => {
  const data = getHistoricalData('QQQ');
  const original = data.slice();
  data.splice(0, data.length, ...points);
  try {
    assertion();
  } finally {
    data.splice(0, data.length, ...original);
  }
};

const oneYear = (price: (index: number) => number, dividendYield = 0): IndexPoint[] =>
  Array.from({ length: 253 }, (_, index) => ({
    date: new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10),
    price: price(index),
    dividendYield: index === 0 ? 0 : dividendYield,
  }));

describe('historical calculation audit', () => {
  it.each([0.1, -0.5, -1])('preserves an effective annual rate of %s through daily compounding', (rate) => {
    const dailyReturn = getDailyReturn('CUSTOM', 0, rate);
    expect((1 + dailyReturn) ** 365 - 1).toBeCloseTo(rate, 12);
  });

  it('values a cash dividend relative to the previous investment value', () => {
    const data = getHistoricalData('QLD');
    const index = data.findIndex((point) => point.date === '2006-12-20');
    const previous = data[index - 1];
    const current = data[index];
    // A share held overnight owns the closing share plus its cash distribution.
    const endingWealth = current.price + current.price * current.dividendYield;
    expect(HISTORICAL_DAILY_RETURNS.QLD[index - 1]).toBeCloseTo(
      endingWealth / previous.price - 1,
      12,
    );
  });

  it('uses 252 return intervals rather than 252 observations for the annual estimate', () => {
    withHistory(oneYear((index) => 100 * 1.001 ** index), () => {
      expect(calculateMedianCAGR('QQQ')).toBeCloseTo(0.28643404437615216, 12);
    });
  });

  it('includes reinvested distributions in the historical annual estimate', () => {
    withHistory(oneYear(() => 100, 0.001), () => {
      expect(calculateMedianCAGR('QQQ')).toBeCloseTo(0.28643404437615216, 12);
    });
  });
});
