import { describe, expect, it } from 'vitest';
import { getHistoricalData, getHistoricalDailyReturns } from '../historicalAssets';
import { CRISIS_MIN_DRAWDOWN, excludedCrisisLabel, getProjectionMarket, isProjectionAsset, sameCrises } from '../projectionAssets';
import { MARKET_CRISIS_IDS, PROJECTION_ASSET_IDS } from '../../types/finance';

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
    expect(market.dailyReturns).toEqual(getHistoricalDailyReturns('SPY'));
  });

  it.each([['QLD', 2], ['TQQQ', 3]] as const)('rebuilds %s from QQQ before listing and keeps its own days after', (asset, multiple) => {
    const market = getProjectionMarket(asset)!;
    const qqq = getHistoricalData('QQQ');
    const fund = getHistoricalData(asset);
    expect(market.startDate).toBe(qqq[0].date);
    expect(market.rebuiltUntil).toBe(fund[0].date);
    expect(market.endDate).toBe(fund.at(-1)!.date);

    const rebuiltDays = qqq.findIndex((point) => point.date === fund[0].date);
    expect(market.dailyReturns.slice(rebuiltDays)).toEqual(getHistoricalDailyReturns(asset));
    // Before listing: QQQ × multiple less one fixed daily cost.
    const cost = multiple * getHistoricalDailyReturns('QQQ')[0] - market.dailyReturns[0];
    expect(cost).toBeGreaterThan(0);
    expect(cost * 252).toBeLessThan(0.15);
    expect(multiple * getHistoricalDailyReturns('QQQ')[100] - market.dailyReturns[100]).toBeCloseTo(cost, 12);
  });

  it('shows deeper falls and lower long-run growth for more leverage over the same years', () => {
    const [qqq, qld, tqqq] = (['QQQ', 'QLD', 'TQQQ'] as const).map((asset) => getProjectionMarket(asset)!);
    expect(qld.maxDrawdown).toBeGreaterThan(qqq.maxDrawdown);
    expect(tqqq.maxDrawdown).toBeGreaterThan(qld.maxDrawdown);
    expect(tqqq.volatility).toBeGreaterThan(qld.volatility);
    expect(tqqq.cagr).toBeLessThan(qqq.cagr);
  });
});

describe('leaving market crashes out of a reference history', () => {
  it('finds the crashes each asset actually went through, as its own peak and trough', () => {
    const ids = (asset: typeof PROJECTION_ASSET_IDS[number]) => getProjectionMarket(asset)!.crises.map((crisis) => crisis.id);
    expect(ids('TQQQ')).toEqual(['DOTCOM', 'GFC']);
    expect(ids('KOSPI')).toEqual(['ASIA', 'DOTCOM', 'GFC']);
    // SCHD starts in 2011; gold's dot-com dip was shallower than a bear market.
    expect(ids('SCHD')).toEqual([]);
    expect(ids('GOLD')).toEqual(['GFC']);

    const dotcom = getProjectionMarket('QQQ')!.crises[0];
    expect(dotcom.peakDate.startsWith('2000-03')).toBe(true);
    expect(dotcom.troughDate.startsWith('2002-10')).toBe(true);
    expect(dotcom.drawdown).toBeCloseTo(getProjectionMarket('QQQ')!.maxDrawdown, 10);
    for (const asset of PROJECTION_ASSET_IDS) {
      for (const crisis of getProjectionMarket(asset)!.crises) expect(crisis.drawdown).toBeGreaterThanOrEqual(CRISIS_MIN_DRAWDOWN);
    }
  });

  it('removes the falling days and counts only the calendar time that remains', () => {
    const full = getProjectionMarket('TQQQ')!;
    const market = getProjectionMarket('TQQQ', ['DOTCOM'])!;
    const crisis = full.crises[0];
    const qqqDates = getHistoricalData('QQQ').slice(1).map((point) => point.date);
    const removed = qqqDates.filter((date) => date > crisis.peakDate && date <= crisis.troughDate).length;

    expect(market.excludedCrises).toEqual(['DOTCOM']);
    expect(market.dailyReturns).toHaveLength(full.dailyReturns.length - removed);
    expect(market.crises).toEqual(full.crises);
    expect(market.startDate).toBe(full.startDate);
    expect(market.endDate).toBe(full.endDate);
    const keptYears = years(full.startDate, full.endDate) - years(crisis.peakDate, crisis.troughDate);
    expect(market.cagr).toBeCloseTo(compound(market.dailyReturns) ** (1 / keptYears) - 1, 10);
    expect(market.cagr).toBeGreaterThan(full.cagr + 0.2);
    expect(market.maxDrawdown).toBeLessThan(full.maxDrawdown);
  });

  it('ignores a crash the asset never went through and shares the result', () => {
    expect(getProjectionMarket('SCHD', [...MARKET_CRISIS_IDS])).toBe(getProjectionMarket('SCHD'));
    expect(getProjectionMarket('GOLD', ['DOTCOM', 'GFC'])!.excludedCrises).toEqual(['GFC']);
    expect(getProjectionMarket('QQQ', ['GFC', 'DOTCOM'])).toBe(getProjectionMarket('QQQ', ['DOTCOM', 'GFC']));
  });

  it('lets each crash be kept or left out on its own, and names the ones left out', () => {
    const full = getProjectionMarket('TQQQ')!;
    const noDotcom = getProjectionMarket('TQQQ', ['DOTCOM'])!;
    const noGfc = getProjectionMarket('TQQQ', ['GFC'])!;
    const neither = getProjectionMarket('TQQQ', ['DOTCOM', 'GFC'])!;
    expect(new Set([full.cagr, noDotcom.cagr, noGfc.cagr, neither.cagr]).size).toBe(4);
    expect(noGfc.cagr).toBeGreaterThan(full.cagr);
    expect(neither.cagr).toBeGreaterThan(noDotcom.cagr);
    expect(excludedCrisisLabel(full)).toBe('');
    expect(excludedCrisisLabel(noGfc)).toBe('글로벌 금융위기 제외');
    expect(excludedCrisisLabel(neither)).toBe('닷컴 버블 붕괴·글로벌 금융위기 제외');
  });

  it('compares exclusion lists as sets', () => {
    expect(sameCrises(undefined, [])).toBe(true);
    expect(sameCrises(['GFC', 'DOTCOM'], ['DOTCOM', 'GFC'])).toBe(true);
    expect(sameCrises(['GFC'], undefined)).toBe(false);
  });
});
