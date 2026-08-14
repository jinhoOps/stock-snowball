import { describe, expect, it } from 'vitest';
import {
  normalizeLegacyAssetType,
  normalizePersistedScenario,
  normalizePersistedSimulationParams,
} from '../assetMigration';
import { DEFAULT_BACKTEST_PARAMS, DEFAULT_PROJECTION_PARAMS } from '../../types/finance';

describe('normalizeLegacyAssetType', () => {
  it('maps legacy QQQM to QQQ', () => {
    expect(normalizeLegacyAssetType('QQQM')).toBe('QQQ');
  });

  it('keeps a supported asset and safely falls back for unknown values', () => {
    expect(normalizeLegacyAssetType('SOXL')).toBe('SOXL');
    expect(normalizeLegacyAssetType('NOT_A_TICKER')).toBe('SPY');
  });

  it('normalizes legacy projection and backtest cache payloads through one boundary', () => {
    expect(normalizePersistedSimulationParams(
      { ...DEFAULT_PROJECTION_PARAMS, assetType: 'QQQM' },
      DEFAULT_PROJECTION_PARAMS,
      'PROJECTION',
    ).assetType).toBe('QQQ');
    expect(normalizePersistedSimulationParams(
      { ...DEFAULT_BACKTEST_PARAMS, assetType: 'QQQM' },
      DEFAULT_BACKTEST_PARAMS,
      'BACKTEST',
    ).assetType).toBe('QQQ');
  });

  it('uses safe field defaults for malformed cached state', () => {
    const normalized = normalizePersistedSimulationParams({
      principal: 'not-a-number',
      contribution: -1,
      cycle: 'YEARLY',
      assetType: 'UNKNOWN',
      years: 0,
      rate: Number.NaN,
      accountType: 'BROKERAGE',
      inflationRate: Number.POSITIVE_INFINITY,
      strategyType: 'UNKNOWN',
      strategyIncreaseRate: Number.NaN,
      startDate: 20200101,
      endDate: 'not-a-date',
    }, DEFAULT_BACKTEST_PARAMS, 'BACKTEST');

    expect(normalized).toEqual(DEFAULT_BACKTEST_PARAMS);
  });

  it('normalizes loaded scenario modes and assets before consumers see them', () => {
    expect(normalizePersistedScenario({ simulationMode: 'BACKTEST', assetType: 'QQQM' })).toMatchObject({
      simulationMode: 'BACKTEST',
      assetType: 'QQQ',
    });
    expect(normalizePersistedScenario({ simulationMode: 'BACKTEST', assetType: 'CORRUPT' })).toMatchObject({
      simulationMode: 'BACKTEST',
      assetType: 'SPY',
    });
    expect(normalizePersistedScenario({ simulationMode: 'PROJECTION', assetType: 'CUSTOM' })).toMatchObject({
      simulationMode: 'PROJECTION',
      assetType: 'CUSTOM',
    });
  });
});
