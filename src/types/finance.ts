export type AccountType = 'GENERAL' | 'ISA';

export type StrategyType = 'FIXED' | 'VALUE_AVERAGING' | 'STEP_UP';

export type AssetType = 'CUSTOM' | 'QQQM' | 'QLD' | 'TQQQ' | 'KOSPI' | 'KOSDAQ' | 'SPY' | 'SCHD' | 'GOLD';

export interface StrategyConfig {
  type: StrategyType;
  baseAmount: number; // 기본 불입금
  increaseRate?: number; // STEP_UP용: 연간 불입금 증가율 (e.g., 0.05)
  targetGrowth?: number; // VALUE_AVERAGING용: 목표 월간 성장 금액
}

export interface TaxConfig {
  dividendTaxRate: number; // 배당소득세율 (e.g., 0.154)
  capitalGainTaxRate: number; // 양도소득세율 (e.g., 0.22)
  isaTaxFreeLimit: number; // ISA 비과세 한도 (e.g., 2,000,000 or 4,000,000)
  isaReducedTaxRate: number; // ISA 우대세율 (e.g., 0.09)
}

export interface FeeConfig {
  buyFeeRate: number; // 매수 수수료율 (e.g., 0.00015)
  sellFeeRate: number; // 매도 수수료율 (e.g., 0.00015)
}

export interface SimulationResult {
  date: Date;
  nominalValue: number;
  realValue: number;
  totalContribution: number;
  totalGains: number;
  totalFees: number;
  estimatedTax: number;
  postTaxValue: number;
}
