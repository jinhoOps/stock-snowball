import { getActiveMarketData } from './marketDataRuntime';
import { calculateProductPerformanceMetrics } from '../core/ProductPerformance';
import {
  MARKET_CRISIS_IDS,
  PROJECTION_ASSET_IDS,
  type AssetType,
  type MarketCrisisId,
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
  /** Crashes this asset went through, measured on its full history, whether or not they are left out. */
  crises: readonly ProjectionCrisis[];
  /** Crashes whose days were removed from `dailyReturns` and the summary above. */
  excludedCrises: readonly MarketCrisisId[];
}

export interface ProjectionCrisis {
  id: MarketCrisisId;
  label: string;
  /** Close the fall started from; its own day stays in the history. */
  peakDate: string;
  /** Last day of the fall; the days after the peak through this one are what leaving it out removes. */
  troughDate: string;
  /** Peak-to-trough fall, as a positive fraction. */
  drawdown: number;
}

/**
 * Each crash is looked for inside a window around it, and the asset's own deepest fall there is the crash:
 * KOSPI and gold peaked and bottomed on other days than the Nasdaq.
 * Assets that start later simply have fewer crashes.
 */
const MARKET_CRISES: readonly { id: MarketCrisisId; label: string; from: string; to: string }[] = [
  { id: 'ASIA', label: '아시아 외환위기', from: '1997-01-01', to: '1998-12-31' },
  { id: 'DOTCOM', label: '닷컴 버블 붕괴', from: '1999-07-01', to: '2002-12-31' },
  { id: 'GFC', label: '글로벌 금융위기', from: '2007-07-01', to: '2009-06-30' },
];
/** A fall smaller than a bear market (20%) isn't offered as a crash for that asset. */
export const CRISIS_MIN_DRAWDOWN = 0.2;

/** Names the crashes left out, e.g. "닷컴 버블 붕괴·글로벌 금융위기 제외"; empty when none are. */
export const excludedCrisisLabel = (market: Pick<ProjectionMarket, 'crises' | 'excludedCrises'>) => {
  const names = market.crises.filter((crisis) => market.excludedCrises.includes(crisis.id)).map((crisis) => crisis.label);
  return names.length > 0 ? `${names.join('·')} 제외` : '';
};

/** Whether two exclusion lists leave out the same crashes, ignoring order; absent means none. */
export const sameCrises = (a?: readonly MarketCrisisId[], b?: readonly MarketCrisisId[]) =>
  MARKET_CRISIS_IDS.every((id) => (a?.includes(id) ?? false) === (b?.includes(id) ?? false));

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

/** The deepest peak-to-trough fall whose peak and trough both fall inside [from, to]. */
const findCrisis = (series: DatedReturns, crisis: typeof MARKET_CRISES[number]): ProjectionCrisis | undefined => {
  let value = 1;
  let peak: { date: string; value: number } | undefined;
  let worst: ProjectionCrisis | undefined;
  const visit = (date: string, current: number) => {
    if (date < crisis.from || date > crisis.to) return;
    if (!peak || current >= peak.value) {
      peak = { date, value: current };
      return;
    }
    const drawdown = 1 - current / peak.value;
    if (!worst || drawdown > worst.drawdown) {
      worst = { id: crisis.id, label: crisis.label, peakDate: peak.date, troughDate: date, drawdown };
    }
  };
  visit(series.startDate, value);
  series.returns.forEach((dailyReturn, index) => {
    value *= 1 + dailyReturn;
    visit(series.dates[index], value);
  });
  return worst && worst.drawdown >= CRISIS_MIN_DRAWDOWN ? worst : undefined;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY;
const dateFromDayNumber = (day: number) => new Date(day * MS_PER_DAY).toISOString().slice(0, 10);

const seriesCache = new Map<string, DatedReturns>();
const cache = new Map<string, ProjectionMarket>();

const getSeries = (asset: ProjectionAssetType): DatedReturns => {
  const key = getActiveMarketData().releaseId + ':' + asset;
  const cached = seriesCache.get(key);
  if (cached) return cached;
  const multiple = REBUILT_FROM_QQQ[asset];
  const series = multiple ? rebuiltReturns(asset, multiple) : ownReturns(asset);
  seriesCache.set(key, series);
  return series;
};

/**
 * The return history and summary a projection uses for a reference asset; undefined for a fixed custom rate.
 * Leaving a crash out removes its falling days and joins the days on either side, so the CAGR counts
 * only the calendar time that remains.
 */
export const getProjectionMarket = (
  asset: AssetType,
  excludedCrises: readonly MarketCrisisId[] = [],
): ProjectionMarket | undefined => {
  if (!isProjectionAsset(asset)) return undefined;
  const series = getSeries(asset);
  const crises = MARKET_CRISES.flatMap((crisis) => findCrisis(series, crisis) ?? []);
  const removed = crises.filter((crisis) => excludedCrises.includes(crisis.id));
  const key = getActiveMarketData().releaseId + ':' + asset + ':' + removed.map((crisis) => crisis.id).join(',');
  const cached = cache.get(key);
  if (cached) return cached;

  const isRemoved = (date: string) => removed.some((crisis) => date > crisis.peakDate && date <= crisis.troughDate);
  const returns: number[] = [];
  let value = 1;
  let day = dayNumber(series.startDate);
  let previousDay = day;
  const points: ProductPerformancePoint[] = [{ date: series.startDate, value }];
  series.returns.forEach((dailyReturn, index) => {
    const date = series.dates[index];
    const gap = dayNumber(date) - previousDay;
    previousDay = dayNumber(date);
    if (isRemoved(date)) return;
    day += gap;
    value *= 1 + dailyReturn;
    returns.push(dailyReturn);
    // Kept days are laid end to end, so the summary's calendar span skips the removed stretch.
    points.push({ date: dateFromDayNumber(day), value });
  });
  const metrics = calculateProductPerformanceMetrics(points);

  const market: ProjectionMarket = {
    asset,
    startDate: series.startDate,
    endDate: series.dates.at(-1) ?? series.startDate,
    ...(series.rebuiltUntil ? { rebuiltUntil: series.rebuiltUntil } : {}),
    dailyReturns: returns,
    cagr: metrics.cagr ?? 0,
    volatility: metrics.volatility,
    maxDrawdown: metrics.mdd,
    crises,
    excludedCrises: removed.map((crisis) => crisis.id),
  };
  cache.set(key, market);
  return market;
};
