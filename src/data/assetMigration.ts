import {
  AssetType,
  HISTORICAL_ASSET_IDS,
  SimulationMode,
  SimulationParams,
  DEFAULT_TAX_CONFIG,
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

const annualRate = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) && value >= -1 ? value : fallback;

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
  const effectiveCycle = mode === 'PROJECTION' && strategyType === 'VALUE_AVERAGING' ? 'MONTHLY' : cycle;
  const startDate = isCalendarDate(source.startDate) ? source.startDate : defaults.startDate;
  const endDate = isCalendarDate(source.endDate) ? source.endDate : defaults.endDate;
  const taxConfig = isRecord(source.taxConfig) ? source.taxConfig : null;
  const feeConfig = isRecord(source.feeConfig) ? source.feeConfig : null;
  const unitRate = (value: unknown, fallback: number): number =>
    isFiniteNumber(value) && value >= 0 && value <= 1 ? value : fallback;

  return {
    principal: nonNegativeNumber(source.principal, defaults.principal),
    contribution: nonNegativeNumber(source.contribution, defaults.contribution),
    cycle: effectiveCycle,
    assetType: normalizePersistedAssetType(source.assetType ?? defaults.assetType, mode),
    years: isFiniteNumber(source.years) && source.years >= 1
      ? Math.min(source.years, effectiveCycle === 'DAILY' ? 30 : 50)
      : defaults.years,
    rate: annualRate(source.rate, defaults.rate),
    accountType,
    inflationRate: isFiniteNumber(source.inflationRate) && source.inflationRate > -1
      ? source.inflationRate
      : defaults.inflationRate,
    strategyType,
    strategyIncreaseRate: annualRate(source.strategyIncreaseRate, defaults.strategyIncreaseRate),
    ...(taxConfig ? { taxConfig: {
      dividendTaxRate: unitRate(taxConfig.dividendTaxRate, DEFAULT_TAX_CONFIG.dividendTaxRate),
      capitalGainTaxRate: unitRate(taxConfig.capitalGainTaxRate, DEFAULT_TAX_CONFIG.capitalGainTaxRate),
      isaTaxFreeLimit: nonNegativeNumber(taxConfig.isaTaxFreeLimit, DEFAULT_TAX_CONFIG.isaTaxFreeLimit),
      isaReducedTaxRate: unitRate(taxConfig.isaReducedTaxRate, DEFAULT_TAX_CONFIG.isaReducedTaxRate),
    } } : {}),
    ...(feeConfig ? { feeConfig: {
      buyFeeRate: isFiniteNumber(feeConfig.buyFeeRate) && feeConfig.buyFeeRate >= 0 && feeConfig.buyFeeRate < 1 ? feeConfig.buyFeeRate : 0.00015,
      sellFeeRate: unitRate(feeConfig.sellFeeRate, 0.00015),
    } } : {}),
    ...(isFiniteNumber(source.exchangeAnnualChangeRate) && source.exchangeAnnualChangeRate > -1
      ? { exchangeAnnualChangeRate: source.exchangeAnnualChangeRate } : {}),
    ...(typeof source.reinvestDividends === 'boolean' ? { reinvestDividends: source.reinvestDividends } : {}),
    ...(isFiniteNumber(source.strategyTargetGrowth) && source.strategyTargetGrowth >= 0
      ? { strategyTargetGrowth: source.strategyTargetGrowth } : {}),
    ...(isFiniteNumber(source.annualRateOverride) && source.annualRateOverride >= -1
      ? { annualRateOverride: source.annualRateOverride } : {}),
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
