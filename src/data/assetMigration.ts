import {
  AssetType,
  HISTORICAL_ASSET_IDS,
  SimulationMode,
  SimulationParams,
} from '../types/finance';

const historicalAssets = new Set<string>(HISTORICAL_ASSET_IDS);

export const normalizeLegacyAssetType = (value: unknown): AssetType => {
  if (value === 'QQQM') return 'QQQ';
  if (value === 'CUSTOM' || (typeof value === 'string' && historicalAssets.has(value))) {
    return value as AssetType;
  }
  return 'SPY';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const nonNegativeNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value >= 0 ? value : fallback;

const finiteNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) ? value : fallback;

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const normalizePersistedAssetType = (
  value: unknown,
  mode: SimulationMode,
): AssetType => {
  const normalized = normalizeLegacyAssetType(value);
  return mode === 'BACKTEST' && normalized === 'CUSTOM' ? 'SPY' : normalized;
};

export const normalizePersistedSimulationParams = (
  value: unknown,
  defaults: SimulationParams,
  mode: SimulationMode,
): SimulationParams => {
  const source = isRecord(value) ? value : {};
  const cycle = source.cycle === 'DAILY' || source.cycle === 'WEEKLY' || source.cycle === 'MONTHLY'
    ? source.cycle
    : defaults.cycle;
  const accountType = source.accountType === 'GENERAL' || source.accountType === 'ISA'
    ? source.accountType
    : defaults.accountType;
  const strategyType = source.strategyType === 'FIXED'
    || source.strategyType === 'VALUE_AVERAGING'
    || source.strategyType === 'STEP_UP'
    ? source.strategyType
    : defaults.strategyType;
  const startDate = isCalendarDate(source.startDate) ? source.startDate : defaults.startDate;
  const endDate = isCalendarDate(source.endDate) ? source.endDate : defaults.endDate;

  return {
    principal: nonNegativeNumber(source.principal, defaults.principal),
    contribution: nonNegativeNumber(source.contribution, defaults.contribution),
    cycle,
    assetType: normalizePersistedAssetType(source.assetType ?? defaults.assetType, mode),
    years: isFiniteNumber(source.years) && source.years >= 1 ? source.years : defaults.years,
    rate: finiteNumber(source.rate, defaults.rate),
    accountType,
    inflationRate: isFiniteNumber(source.inflationRate) && source.inflationRate > -1
      ? source.inflationRate
      : defaults.inflationRate,
    strategyType,
    strategyIncreaseRate: finiteNumber(source.strategyIncreaseRate, defaults.strategyIncreaseRate),
    ...(startDate === undefined ? {} : { startDate }),
    ...(endDate === undefined ? {} : { endDate }),
  };
};

export const readPersistedSimulationParams = (
  serialized: string | null,
  defaults: SimulationParams,
  mode: SimulationMode,
): SimulationParams => {
  if (!serialized) return { ...defaults };
  try {
    return normalizePersistedSimulationParams(JSON.parse(serialized), defaults, mode);
  } catch {
    return { ...defaults };
  }
};

export const normalizePersistedScenario = <T extends Record<string, unknown>>(scenario: T): T & {
  simulationMode: SimulationMode;
  assetType: AssetType;
} => {
  const simulationMode: SimulationMode = scenario.simulationMode === 'BACKTEST'
    ? 'BACKTEST'
    : 'PROJECTION';
  return {
    ...scenario,
    simulationMode,
    assetType: normalizePersistedAssetType(scenario.assetType, simulationMode),
  };
};
