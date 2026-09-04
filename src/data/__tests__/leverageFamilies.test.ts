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
  normalizeBacktestSelection,
  selectLeverageFamily,
  transitionBacktestPrimary,
} from '../leverageFamilies';

describe('leveraged asset families', () => {
  it('defines the exact approved membership and target for all four families', () => {
    expect(Object.fromEntries(Object.entries(LEVERAGE_FAMILIES).map(([id, family]) => [
      id,
      family.members.map(({ assetId, targetMultiple }) => [assetId, targetMultiple]),
    ]))).toEqual({
      NASDAQ: [['QQQ', 1], ['QLD', 2], ['TQQQ', 3]],
      AMD: [['AMD', 1], ['AMDL', 2]],
      TESLA: [['TSLA', 1], ['TSLL', 2]],
      SEMICONDUCTORS: [['SOXX', 1], ['SOXL', 3]],
    });
  });

  it('changes the family while preserving a compatible selected period', () => {
    const next = applyFamilySelection(
      { assetType: 'SPY', startDate: '2025-01-01', endDate: '2026-08-31' },
      'NASDAQ',
      getHistoricalCoverage,
    );

    expect(next).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
      startDate: '2025-01-01',
      endDate: '2026-08-31',
    });
  });

  it('clamps only the unavailable edge when a selected period partially overlaps coverage', () => {
    const next = applyFamilySelection(
      { assetType: 'SPY', startDate: '2000-01-01', endDate: '2024-01-01' },
      'NASDAQ',
      getHistoricalCoverage,
    );

    expect(next).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
      startDate: getHistoricalCoverage('TQQQ').startDate,
      endDate: '2024-01-01',
    });
  });

  it('preserves the start date when only the selected end exceeds common coverage', () => {
    const coverage = getCommonCoverage(['QQQ', 'QLD', 'TQQQ'], getHistoricalCoverage);
    const next = applyFamilySelection(
      { assetType: 'SPY', startDate: '2025-01-01', endDate: '2099-12-31' },
      'NASDAQ',
      getHistoricalCoverage,
    );

    expect(next).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
      startDate: '2025-01-01',
      endDate: coverage.endDate,
    });
  });

  it('preserves an unavailable period instead of silently expanding it to full coverage', () => {
    expect(applyFamilySelection(
      { assetType: 'SPY', startDate: '2010-01-01', endDate: '2011-01-01' },
      'AMD',
      getHistoricalCoverage,
    )).toEqual({
      primaryAsset: 'AMD',
      comparisonAssets: ['AMDL'],
      startDate: '2010-01-01',
      endDate: '2011-01-01',
    });
  });

  it('selects the Nasdaq family with the underlying as primary', () => {
    expect(selectLeverageFamily('NASDAQ')).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
    });
  });

  it('deduplicates comparisons, removes the primary, caps three total assets, and clamps dates', () => {
    expect(normalizeBacktestSelection({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QQQ', 'QLD', 'QLD', 'TQQQ', 'SPY'],
      startDate: '1900-01-01',
      endDate: '2099-12-31',
    }, getHistoricalCoverage)).toEqual({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
      startDate: getHistoricalCoverage('TQQQ').startDate,
      endDate: getHistoricalCoverage('QQQ').endDate,
    });
  });

  it('clears stale family comparisons and preserves a non-overlapping period when the primary changes', () => {
    expect(transitionBacktestPrimary({
      primaryAsset: 'QQQ',
      comparisonAssets: ['QLD', 'TQQQ'],
      startDate: '2010-02-11',
      endDate: '2011-02-11',
    }, 'AMDL', getHistoricalCoverage)).toEqual({
      primaryAsset: 'AMDL',
      comparisonAssets: [],
      startDate: '2010-02-11',
      endDate: '2011-02-11',
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
        assetId: 'QQQ', ticker: 'QQQ', displayName: 'QQQ', currency: 'USD', kind: 'asset', frequency: 'daily',
        startDate: '2000-01-01', endDate: '2001-01-01', rowCount: 1,
      },
      TQQQ: {
        assetId: 'TQQQ', ticker: 'TQQQ', displayName: 'TQQQ', currency: 'USD', kind: 'asset', frequency: 'daily',
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
