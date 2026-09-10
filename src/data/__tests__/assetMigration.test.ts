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

  it('bounds cached projection inputs before they reach the compound engine', () => {
    const normalized = normalizePersistedSimulationParams({
      ...DEFAULT_PROJECTION_PARAMS,
      years: 10000, rate: -1.5, strategyIncreaseRate: -2,
    }, DEFAULT_PROJECTION_PARAMS, 'PROJECTION');
    expect(normalized.years).toBe(30);
    expect(normalized.rate).toBe(DEFAULT_PROJECTION_PARAMS.rate);
    expect(normalized.strategyIncreaseRate).toBe(DEFAULT_PROJECTION_PARAMS.strategyIncreaseRate);
    expect(normalizePersistedSimulationParams({
      ...DEFAULT_PROJECTION_PARAMS, cycle: 'MONTHLY', years: 100,
    }, DEFAULT_PROJECTION_PARAMS, 'PROJECTION').years).toBe(50);
  });

  it('restores value averaging with the monthly schedule used by the engine', () => {
    const normalized = normalizePersistedSimulationParams({
      ...DEFAULT_PROJECTION_PARAMS, strategyType: 'VALUE_AVERAGING', cycle: 'DAILY', years: 40,
    }, DEFAULT_PROJECTION_PARAMS, 'PROJECTION');
    expect(normalized.cycle).toBe('MONTHLY');
    expect(normalized.years).toBe(40);
  });
});
