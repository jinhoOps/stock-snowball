import { RxJsonSchema } from 'rxdb';
import { AssetType } from '../types/finance';

export interface ScenarioDocument {
  id: string;
  name: string;
  simulationMode?: 'PROJECTION' | 'BACKTEST';
  backtestStartDate?: string;
  backtestEndDate?: string;
  reinvestDividends?: boolean;
  principal: number;
  annualRate: number;
  years: number;
  dailyContribution: number; // For backward compatibility/simplicity
  strategyType: 'FIXED' | 'VALUE_AVERAGING' | 'STEP_UP';
  strategyBaseAmount: number;
  strategyIncreaseRate?: number;
  strategyTargetGrowth?: number;
  assetType: AssetType;
  accountType: 'GENERAL' | 'ISA';
  inflationRate: number;
  buyFeeRate: number;
  sellFeeRate: number;
  taxDividendRate: number;
  taxCapitalGainRate: number;
  taxIsaLimit: number;
  taxIsaReducedRate: number;
  currency: 'USD' | 'KRW';
  exchangeRate: number;
  exchangeAnnualChangeRate: number;
  createdAt: number;
  updatedAt: number;
}

export const scenarioSchema: RxJsonSchema<ScenarioDocument> = {
  title: 'scenario schema',
  version: 3, // Bumped for simulationMode & backtest fields
  description: 'describes a snowball investment scenario',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
    },
    simulationMode: {
      type: 'string',
      enum: ['PROJECTION', 'BACKTEST'],
    },
    backtestStartDate: {
      type: 'string',
    },
    backtestEndDate: {
      type: 'string',
    },
    reinvestDividends: {
      type: 'boolean',
    },
    principal: {
      type: 'number',
      minimum: 0,
    },
    annualRate: {
      type: 'number',
    },
    years: {
      type: 'number',
      minimum: 1,
    },
    dailyContribution: {
      type: 'number',
      minimum: 0,
    },
    strategyType: {
      type: 'string',
      enum: ['FIXED', 'VALUE_AVERAGING', 'STEP_UP'],
    },
    strategyBaseAmount: {
      type: 'number',
      minimum: 0,
    },
    strategyIncreaseRate: {
      type: 'number',
    },
    strategyTargetGrowth: {
      type: 'number',
    },
    assetType: {
      type: 'string',
      enum: ['CUSTOM', 'QQQM', 'QLD', 'TQQQ', 'KOSPI', 'KOSDAQ', 'SPY', 'SCHD', 'GOLD'],
    },
    accountType: {
      type: 'string',
      enum: ['GENERAL', 'ISA'],
    },
    inflationRate: {
      type: 'number',
    },
    buyFeeRate: {
      type: 'number',
    },
    sellFeeRate: {
      type: 'number',
    },
    taxDividendRate: {
      type: 'number',
    },
    taxCapitalGainRate: {
      type: 'number',
    },
    taxIsaLimit: {
      type: 'number',
    },
    taxIsaReducedRate: {
      type: 'number',
    },
    currency: {
      type: 'string',
      enum: ['USD', 'KRW'],
    },
    exchangeRate: {
      type: 'number',
      minimum: 0,
    },
    exchangeAnnualChangeRate: {
      type: 'number',
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: [
    'id',
    'name',
    'principal',
    'annualRate',
    'years',
    'strategyType',
    'strategyBaseAmount',
    'assetType',
    'accountType',
    'inflationRate',
    'buyFeeRate',
    'sellFeeRate',
    'taxDividendRate',
    'taxCapitalGainRate',
    'taxIsaLimit',
    'taxIsaReducedRate',
    'currency',
    'exchangeRate',
    'exchangeAnnualChangeRate',
    'createdAt',
    'updatedAt',
  ],
  encrypted: ['principal', 'strategyBaseAmount'],
};


