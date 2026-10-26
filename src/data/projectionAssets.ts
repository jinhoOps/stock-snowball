import { getActiveMarketData } from './marketDataRuntime';
import { calculateProductPerformanceMetrics } from '../core/ProductPerformance';
import {
  PROJECTION_ASSET_IDS,
  type AssetType,
  type ProductPerformancePoint,
  type ProjectionAssetType,
} from '../types/finance';
import { getHistoricalData, getHistoricalDailyReturns } from './historicalAssets';

/**
 * Leveraged Nasdaq funds listed after QQQ. Before their listing, each day is rebuilt
 * from QQQ's daily return times the multiple, so all three share the 1999 start and its crash.
 */
const REBUILT_FROM_QQQ: Partial<Record<ProjectionAssetType, 2 | 3>> = { QLD: 2, TQQQ: 3 };

export interface ProjectionMarket {
  asset: ProjectionAssetType;
  startDate: string;
  endDate: string;
  /** Last rebuilt date; later days are the fund's own trading data. Absent when every day is real. */
  rebuiltUntil?: string;
  /** Daily total returns (dividends reinvested), oldest first. */
  dailyReturns: readonly number[];
  /** Annual growth over the whole series, compounded on 365.25-day years. */
  cagr: number;
  /** Annualized sample standard deviation of daily returns. */
  volatility: number;
  /** Deepest fall from a preceding peak, as a positive fraction. */
  maxDrawdown: number;
}

const projectionAssets = new Set<string>(PROJECTION_ASSET_IDS);

export const isProjectionAsset = (asset: unknown): asset is ProjectionAssetType =>
  typeof asset === 'string' && projectionAssets.has(asset);

interface DatedReturns {
  startDate: string;
  dates: string[];
  returns: number[];
  rebuiltUntil?: string;
}

const ownReturns = (asset: ProjectionAssetType): DatedReturns => {
  const data = getHistoricalData(asset);
  return {
    startDate: data[0].date,
    dates: data.slice(1).map((point) => point.date),
    returns: getHistoricalDailyReturns(asset).slice(),
  };
};

/**
 * The fund's own days after listing, and QQQ × multiple − daily cost before it.
 * The daily cost is the average gap between QQQ × multiple and the fund over the days both traded,
 * so it carries the fund's fees and financing cost as they actually showed up.
 */
const rebuiltReturns = (asset: ProjectionAssetType, multiple: 2 | 3): DatedReturns => {
  const fund = ownReturns(asset);
  const base = ownReturns('QQQ');
  const baseByDate = new Map(base.dates.map((date, index) => [date, base.returns[index]]));

  let gap = 0;
  let overlap = 0;
  fund.dates.forEach((date, index) => {
    const baseReturn = baseByDate.get(date);
    if (baseReturn === undefined) return;
    gap += multiple * baseReturn - fund.returns[index];
    overlap += 1;
  });
  const dailyCost = overlap > 0 ? gap / overlap : 0;

  const before = base.dates.flatMap((date, index) => (date <= fund.startDate ? [index] : []));
  if (before.length === 0) return fund;
  return {
    startDate: base.startDate,
    dates: [...before.map((index) => base.dates[index]), ...fund.dates],
    // A daily loss can't exceed the whole position.
    returns: [...before.map((index) => Math.max(-0.99, multiple * base.returns[index] - dailyCost)), ...fund.returns],
    rebuiltUntil: base.dates[before.at(-1)!],
  };
};

const cache = new Map<string, ProjectionMarket>();

/** The return history and summary a projection uses for a reference asset; undefined for a fixed custom rate. */
export const getProjectionMarket = (asset: AssetType): ProjectionMarket | undefined => {
  if (!isProjectionAsset(asset)) return undefined;
  const key = getActiveMarketData().releaseId + ':' + asset;
  const cached = cache.get(key);
  if (cached) return cached;

  const multiple = REBUILT_FROM_QQQ[asset];
  const series = multiple ? rebuiltReturns(asset, multiple) : ownReturns(asset);
  let value = 1;
  const points: ProductPerformancePoint[] = [{ date: series.startDate, value }];
  series.returns.forEach((dailyReturn, index) => {
    value *= 1 + dailyReturn;
    points.push({ date: series.dates[index], value });
  });
  const metrics = calculateProductPerformanceMetrics(points);

  const market: ProjectionMarket = {
    asset,
    startDate: series.startDate,
    endDate: points.at(-1)!.date,
    ...(series.rebuiltUntil ? { rebuiltUntil: series.rebuiltUntil } : {}),
    dailyReturns: series.returns,
    cagr: metrics.cagr ?? 0,
    volatility: metrics.volatility,
    maxDrawdown: metrics.mdd,
  };
  cache.set(key, market);
  return market;
};
