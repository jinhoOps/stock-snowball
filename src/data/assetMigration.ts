import { AssetType, HISTORICAL_ASSET_IDS } from '../types/finance';

const historicalAssets = new Set<string>(HISTORICAL_ASSET_IDS);

export const normalizeLegacyAssetType = (value: unknown): AssetType => {
  if (value === 'QQQM') return 'QQQ';
  if (value === 'CUSTOM' || (typeof value === 'string' && historicalAssets.has(value))) {
    return value as AssetType;
  }
  return 'SPY';
};
