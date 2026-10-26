import { describe, expect, it } from 'vitest';
import { getHistoricalData, HISTORICAL_DAILY_RETURNS } from '../historicalAssets';
import { getProjectionMarket, isProjectionAsset } from '../projectionAssets';
import { PROJECTION_ASSET_IDS } from '../../types/finance';

const compound = (returns: readonly number[]) => returns.reduce((value, dailyReturn) => value * (1 + dailyReturn), 1);
const years = (start: string, end: string) => (Date.parse(end) - Date.parse(start)) / 86400000 / 365.25;

describe('projection reference assets', () => {
  it('offers only the Nasdaq family, broad indices, dividends, and gold', () => {
    expect(PROJECTION_ASSET_IDS).toEqual(['QQQ', 'QLD', 'TQQQ', 'SPY', 'KOSPI', 'SCHD', 'GOLD']);
    expect(isProjectionAsset('AMD')).toBe(false);
    expect(getProjectionMarket('CUSTOM')).toBeUndefined();
    expect(getProjectionMarket('SOXL')).toBeUndefined();
  });

  it.each(PROJECTION_ASSET_IDS)('summarizes %s as compound growth, not a median one-year return', (asset) => {
    const market = getProjectionMarket(asset)!;
    const growth = compound(market.dailyReturns);
    expect(market.cagr).toBeCloseTo(growth ** (1 / years(market.startDate, market.endDate)) - 1, 10);
    expect(market.volatility).toBeGreaterThan(0);
    expect(market.maxDrawdown).toBeGreaterThan(0);
    expect(market.maxDrawdown).toBeLessThan(1);
  });

  it('uses an unleveraged asset its own history unchanged', () => {
    const market = getProjectionMarket('SPY')!;
    expect(market.startDate).toBe(getHistoricalData('SPY')[0].date);
    expect(market.rebuiltUntil).toBeUndefined();
    expect(market.dailyReturns).toEqual(HISTORICAL_DAILY_RETURNS.SPY);
  });

  it.each([['QLD', 2], ['TQQQ', 3]] as const)('rebuilds %s from QQQ before listing and keeps its own days after', (asset, multiple) => {
    const market = getProjectionMarket(asset)!;
    const qqq = getHistoricalData('QQQ');
    const fund = getHistoricalData(asset);
    expect(market.startDate).toBe(qqq[0].date);
    expect(market.rebuiltUntil).toBe(fund[0].date);
    expect(market.endDate).toBe(fund.at(-1)!.date);

    const rebuiltDays = qqq.findIndex((point) => point.date === fund[0].date);
    expect(market.dailyReturns.slice(rebuiltDays)).toEqual(HISTORICAL_DAILY_RETURNS[asset]);
    // Before listing: QQQ × multiple less one fixed daily cost.
    const cost = multiple * HISTORICAL_DAILY_RETURNS.QQQ[0] - market.dailyReturns[0];
    expect(cost).toBeGreaterThan(0);
    expect(cost * 252).toBeLessThan(0.15);
    expect(multiple * HISTORICAL_DAILY_RETURNS.QQQ[100] - market.dailyReturns[100]).toBeCloseTo(cost, 12);
  });

  it('shows deeper falls and lower long-run growth for more leverage over the same years', () => {
    const [qqq, qld, tqqq] = (['QQQ', 'QLD', 'TQQQ'] as const).map((asset) => getProjectionMarket(asset)!);
    expect(qld.maxDrawdown).toBeGreaterThan(qqq.maxDrawdown);
    expect(tqqq.maxDrawdown).toBeGreaterThan(qld.maxDrawdown);
    expect(tqqq.volatility).toBeGreaterThan(qld.volatility);
    expect(tqqq.cagr).toBeLessThan(qqq.cagr);
  });
});
