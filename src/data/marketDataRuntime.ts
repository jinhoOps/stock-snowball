import type { MarketDataSnapshot, PreparedMarketCatalog } from './marketDataContract';
import { buildMarketDataCatalog } from './marketDataCatalog';
let active: { snapshot: MarketDataSnapshot; catalog: PreparedMarketCatalog } | undefined;
export const installMarketData = (snapshot: MarketDataSnapshot): void => {
  const catalog = buildMarketDataCatalog(snapshot.raw);
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
