import type { AssetType, HistoricalAssetType } from '../types/finance';
import type { IndexPoint, HistoricalCoverage } from './marketDataContract';
import { getPreparedMarketData } from './marketDataRuntime';
export { HISTORICAL_ASSET_IDS } from '../types/finance';
export type { IndexPoint, HistoricalCoverage } from './marketDataContract';
export { parseHistoricalCsv } from './marketDataCatalog';
export const getHistoricalDailyReturns = (asset: HistoricalAssetType): number[] => getPreparedMarketData().assets[asset].dailyReturns;
const toHistoricalAsset = (asset: AssetType): HistoricalAssetType =>
  asset === 'CUSTOM' ? 'SPY' : asset;

/** 주요 자산별 원본 시계열 데이터셋 반환 */
export const getHistoricalData = (asset: AssetType): IndexPoint[] =>
  getPreparedMarketData().assets[toHistoricalAsset(asset)].data;

export const getHistoricalCoverage = (asset: AssetType): HistoricalCoverage =>
  getPreparedMarketData().assets[toHistoricalAsset(asset)].coverage;

export const isHistoricalRangeCovered = (
  asset: AssetType,
  startDate: string,
  endDate: string,
): boolean => {
  const coverage = getHistoricalCoverage(asset);
  return startDate >= coverage.startDate && endDate <= coverage.endDate && startDate <= endDate;
};

export const getHistoricalRangeError = (
  asset: AssetType,
  startDate: string,
  endDate: string,
): string | null => {
  const coverage = getHistoricalCoverage(asset);
  if (startDate > endDate) {
    return '백테스트 시작일은 종료일보다 앞서야 합니다.';
  }
  if (startDate < coverage.startDate || endDate > coverage.endDate) {
    return `${coverage.assetId} 데이터는 ${coverage.startDate}부터 ${coverage.endDate}까지 사용할 수 있습니다.`;
  }
  return null;
};

/** Returns the most recent market-data point on or before a calendar date. */
export const findPointOnOrBefore = (
  points: readonly IndexPoint[],
  date: string,
): IndexPoint | null => {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].date <= date) low = middle + 1;
    else high = middle;
  }
  return low > 0 ? points[low - 1] : null;
};

export const getDailyReturn = (asset: AssetType, dayIndex: number, defaultRate: number): number => {
  const returns = asset === 'CUSTOM' ? [] : getHistoricalDailyReturns(asset);
  if (returns.length === 0) {
    if (!Number.isFinite(defaultRate) || defaultRate < -1) throw new RangeError('Annual return must be finite and at least -100%.');
    return Math.expm1(Math.log1p(defaultRate) / 365);
  }
  return returns[dayIndex % returns.length];
};
