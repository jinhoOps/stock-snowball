import type { HistoricalAssetType } from '../types/finance';
import type { MarketBenchmarkId, MarketBenchmarkDataset, BenchmarkPoint } from './marketDataContract';
import { getPreparedMarketData, getActiveMarketData } from './marketDataRuntime';
import { validateReviewedWeeklyCloseValues as validateValues, type MarketManifest } from './marketDataCatalog';
export type { MarketBenchmarkId, MarketBenchmarkDataset, BenchmarkPoint } from './marketDataContract';
export { validateMarketDataManifest, validateCompletedWeeklyPoints } from './marketDataCatalog';
export const validateReviewedWeeklyCloseValues = (id: MarketBenchmarkId, points: BenchmarkPoint[], filename: string): void =>
  validateValues(id, points, filename, (JSON.parse(getActiveMarketData().raw.manifestText) as MarketManifest).source);
const PRIMARY_BENCHMARK: Partial<Record<HistoricalAssetType, MarketBenchmarkId>> = {
  QQQ: 'NASDAQ100',
  QLD: 'NASDAQ100',
  TQQQ: 'NASDAQ100',
  SPY: 'SP500',
  KOSPI: 'KOSPI_INDEX',
};

export const getMarketBenchmarkForAsset = (asset: HistoricalAssetType): MarketBenchmarkId | null =>
  PRIMARY_BENCHMARK[asset] ?? null;

export const getMarketBenchmarkData = (id: MarketBenchmarkId): MarketBenchmarkDataset =>
  getPreparedMarketData().benchmarks[id];
