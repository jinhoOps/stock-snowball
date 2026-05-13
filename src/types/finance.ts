export type AccountType = 'GENERAL' | 'ISA';

export type StrategyType = 'FIXED' | 'VALUE_AVERAGING' | 'STEP_UP';

export type AssetType = 'CUSTOM' | 'QQQM' | 'QLD' | 'TQQQ' | 'KOSPI' | 'KOSDAQ' | 'SPY' | 'SCHD' | 'GOLD';

export type SimulationMode = 'PROJECTION' | 'BACKTEST';

export type ContributionCycle = 'DAILY' | 'WEEKLY' | 'MONTHLY';

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

/**
 * 백테스팅 관련 타입
 */

export interface BacktestParams {
  initialPrincipal: number;
  monthlyInstallment: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reinvestDividends: boolean;
  assetId: AssetType;
}

export interface BacktestMetrics {
  totalReturn: number; // 누적 수익률 (0.0 ~ )
  cagr: number; // 연평균 성장률
  irr: number; // 내부 수익률
  mdd: number; // 최대 낙폭 (0.0 ~ 1.0)
  finalValue: number;
  totalPrincipal: number;
  finalAnnualDividend: number;
}

export interface BacktestHistoryPoint {
  date: string;
  value: number;
  principal: number;
  isLiquidated?: boolean;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  history: BacktestHistoryPoint[];
}
