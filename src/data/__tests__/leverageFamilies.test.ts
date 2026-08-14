import { describe, expect, it } from 'vitest';
import type { HistoricalCoverage } from '../historicalAssets';
import { getHistoricalCoverage } from '../historicalAssets';
import type { HistoricalAssetType } from '../../types/finance';
import {
  applyFamilySelection,
  calculateLeverageInsights,
  getCommonCoverage,
  getFamilyDurationPresets,
  LEVERAGE_FAMILIES,
  selectLeverageFamily,
} from '../leverageFamilies';

describe('leveraged asset families', () => {
  it('changes primary, comparisons, and dates as one family action', () => {
    const next = applyFamilySelection(
      { assetType: 'SPY', startDate: '2000-01-01', endDate: '2026-08-13' },
      'NASDAQ',
      getHistoricalCoverage,
    );

    const common = getCommonCoverage(['QQQ', 'QLD', 'TQQQ'], getHistoricalCoverage);
    expect(next).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
      startDate: common.startDate,
      endDate: common.endDate,
    });
  });

  it('selects the Nasdaq family with the underlying as primary', () => {
    expect(selectLeverageFamily('NASDAQ')).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
    });
  });

  it('intersects coverage and identifies the limiting start asset', () => {
    const coverage = getCommonCoverage(['QQQ', 'QLD', 'TQQQ'], getHistoricalCoverage);

    expect(coverage.startDate).toBe(getHistoricalCoverage('TQQQ').startDate);
    expect(coverage.startAsset).toBe('TQQQ');
    expect(coverage.endDate).toBe(
      [getHistoricalCoverage('QQQ'), getHistoricalCoverage('QLD'), getHistoricalCoverage('TQQQ')]
        .map((item) => item.endDate)
        .sort()[0],
    );
  });

  it('rejects histories without a shared coverage interval', () => {
    const coverages: Record<'QQQ' | 'TQQQ', HistoricalCoverage> = {
      QQQ: {
        assetId: 'QQQ', ticker: 'QQQ', displayName: 'QQQ', currency: 'USD',
        startDate: '2000-01-01', endDate: '2001-01-01', rowCount: 1,
      },
      TQQQ: {
        assetId: 'TQQQ', ticker: 'TQQQ', displayName: 'TQQQ', currency: 'USD',
        startDate: '2002-01-01', endDate: '2003-01-01', rowCount: 1,
      },
    };
    const getCoverage = (asset: HistoricalAssetType): HistoricalCoverage => {
      const coverage = coverages[asset as keyof typeof coverages];
      if (!coverage) throw new Error(`Unexpected test asset: ${asset}`);
      return coverage;
    };

    expect(() => getCommonCoverage(['QQQ', 'TQQQ'], getCoverage)).toThrow(RangeError);
  });

  it('reports percentage-point differences without dividing by the underlying return', () => {
    expect(calculateLeverageInsights(
      { QQQ: 0.20, QLD: 0.31, TQQQ: 0.35 },
      LEVERAGE_FAMILIES.NASDAQ,
    )).toEqual([
      { assetId: 'QLD', targetMultiple: 2, underlyingReturn: 0.20, actualReturn: 0.31, simpleReference: 0.40, difference: -0.09 },
      { assetId: 'TQQQ', targetMultiple: 3, underlyingReturn: 0.20, actualReturn: 0.35, simpleReference: 0.60, difference: -0.25 },
    ]);
  });

  it('keeps the arithmetic reference explicit for a negative underlying return', () => {
    expect(calculateLeverageInsights(
      { AMD: -0.60, AMDL: -0.90 },
      LEVERAGE_FAMILIES.AMD,
    )[0]).toMatchObject({
      simpleReference: -1.20,
      difference: 0.30,
    });
  });

  it('disables unavailable family durations with the limiting asset in the reason', () => {
    const presets = getFamilyDurationPresets(LEVERAGE_FAMILIES.AMD, getHistoricalCoverage);

    expect(presets.find((preset) => preset.name === '5년')).toMatchObject({
      disabled: true,
      reason: 'AMDL 데이터는 2024-03-18부터 사용할 수 있습니다.',
    });
    expect(presets.find((preset) => preset.name === '10년')).toMatchObject({
      disabled: true,
      reason: 'AMDL 데이터는 2024-03-18부터 사용할 수 있습니다.',
    });
  });
});
