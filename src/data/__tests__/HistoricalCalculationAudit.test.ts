import { describe, expect, it } from 'vitest';
import {
  getHistoricalData,
  getDailyReturn,
  HISTORICAL_DAILY_RETURNS,
} from '../historicalAssets';

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
});
