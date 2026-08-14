import { describe, expect, it } from 'vitest';
import { normalizeLegacyAssetType } from '../assetMigration';

describe('normalizeLegacyAssetType', () => {
  it('maps legacy QQQM to QQQ', () => {
    expect(normalizeLegacyAssetType('QQQM')).toBe('QQQ');
  });

  it('keeps a supported asset and safely falls back for unknown values', () => {
    expect(normalizeLegacyAssetType('SOXL')).toBe('SOXL');
    expect(normalizeLegacyAssetType('NOT_A_TICKER')).toBe('SPY');
  });
});
