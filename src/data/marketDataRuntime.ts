import type { MarketDataSnapshot, PreparedMarketCatalog } from './marketDataContract';
import { buildMarketDataCatalog } from './marketDataCatalog';
let active: { snapshot: MarketDataSnapshot; catalog: PreparedMarketCatalog } | undefined;
/** `catalog` skips parsing again when the caller already built it from this snapshot. */
export const installMarketData = (snapshot: MarketDataSnapshot, catalog: PreparedMarketCatalog = buildMarketDataCatalog(snapshot.raw)): void => {
  active = { snapshot, catalog };
};
export const getActiveMarketData = (): MarketDataSnapshot => {
  if (!active) throw new Error('Market data must be initialized before rendering');
  return active.snapshot;
};
export const getPreparedMarketData = (): PreparedMarketCatalog => {
  if (!active) throw new Error('Market data must be initialized before rendering');
  return active.catalog;
};
