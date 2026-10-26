import { Decimal } from 'decimal.js';
import { AccountType, FeeConfig, TaxConfig, SimulationResult, SimulationRangeResult, StrategyConfig, BacktestHistoryPoint, DEFAULT_TAX_CONFIG } from '../types/finance';
import { calculateMoneyWeightedReturn } from './MoneyWeightedReturn';
import {
  MONTE_CARLO_PATHS,
  MONTE_CARLO_STEP_DAYS,
  RANGE_LOWER_QUANTILE,
  RANGE_UPPER_QUANTILE,
  BAND_SMOOTHING_RADIUS,
  TRADING_DAYS_PER_YEAR,
  createBlockBootstrap,
  createNormalSource,
  smoothInLogSpace,
  sortedQuantile,
} from './MonteCarlo';

/** Annual volatility of a custom fixed-rate projection, which has no history to resample. */
export const CUSTOM_VOLATILITY = 0.2;

interface SamplePoint {
  date: Date;
  day: number;
  exchangeRate: Decimal;
  contribution: Decimal;
  buyFees: Decimal;
}


// Decimal 설정: 금융 연산을 위해 정밀도를 높게 설정 (기본 20 -> 40)
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * SnowballEngine: 고정밀 금융 연산을 담당하는 핵심 클래스
 */
export class SnowballEngine {
  /** Annual rates are effective rates; projection years contain 365 days. */
  private static dailyGrowthFactor(annualRate: Decimal | number | string): Decimal {
    const rate = new Decimal(annualRate);
    if (!rate.isFinite() || rate.lt(-1)) throw new RangeError('Annual rate must be finite and at least -100%.');
    return rate.plus(1).pow(new Decimal(1).dividedBy(365));
  }

  /**
   * Banker's Rounding (Rounding Half to Even)을 수행합니다.
   * @param value 반올림할 값
   * @param decimalPlaces 소수점 자리수
   */
  static bankersRounding(value: Decimal | number | string, decimalPlaces: number = 0): Decimal {
    const d = new Decimal(value);
    return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_EVEN);
  }

  /**
   * 일 단위 복리를 계산합니다. (추가 불입금 포함)
   * 일 수익률 q = (1 + 연 유효 수익률)^(1/365) - 1
   * 공식: A = P(1+q)^days + PMT * [((1+q)^days - 1) / q]
   * @param principal 원금 (P)
   * @param annualRate 연이율 (r, 예: 0.05 for 5%)
   * @param days 투자 기간 (n, 일수)
   * @param dailyContribution 매일 추가 불입금 (PMT)
   * @returns 최종 금액 (A)
   */
  static calculateDailyCompound(
    principal: Decimal | number | string,
    annualRate: Decimal | number | string,
    days: number,
    dailyContribution: Decimal | number | string = 0
  ): Decimal {
    const P = new Decimal(principal);
    const r = new Decimal(annualRate);
    const n = new Decimal(days);
    const PMT = new Decimal(dailyContribution);

    if (!n.isFinite() || n.lt(0)) throw new RangeError('Days must be finite and nonnegative.');
    const dailyRate = this.dailyGrowthFactor(r).minus(1);
    if (n.isZero()) return P;

    // 이자율이 0인 경우 단순 합산
    if (dailyRate.isZero()) {
      return P.plus(PMT.times(n));
    }

    // (1 + annualRate)^(days/365)
    const multiplier = dailyRate.plus(1).pow(n);
    
    // 원금의 성장
    const principalGrowth = P.times(multiplier);
    
    // 매일 말에 납입한 불입금의 성장
    const contributionGrowth = PMT.times(multiplier.minus(1).dividedBy(dailyRate));

    return principalGrowth.plus(contributionGrowth);
  }

  /**
   * 명목 가치를 실질 가치(현재 가치)로 환산합니다.
   * 공식: PV = FV / (1 + i/365)^n
   * @param nominalAmount 명목 금액 (Future Value, FV)
   * @param annualInflationRate 연간 물가상승률 또는 기준금리 (i)
   * @param days 경과 기간 (n, 일수)
   * @returns 실질 가치 (Present Value, PV)
   */
  static calculateRealValue(
    nominalAmount: Decimal | number | string,
    annualInflationRate: Decimal | number | string,
    days: number
  ): Decimal {
    const FV = new Decimal(nominalAmount);
    const i = new Decimal(annualInflationRate);
    const n = new Decimal(days);

    if (!i.isFinite() || i.lte(-1)) throw new RangeError('Inflation must be finite and greater than -100%.');
    if (!n.isFinite() || n.lt(0)) throw new RangeError('Days must be finite and nonnegative.');
    const divisor = i.plus(1).pow(n.dividedBy(365));

    return FV.dividedBy(divisor);
  }

  /**
   * 세금을 계산합니다.
   * @param gains 총 수익
   * @param accountType 계좌 유형
   * @param config 세금 설정
   */
  static calculateTax(
    gains: Decimal | number | string,
    accountType: AccountType,
    config: TaxConfig
  ): Decimal {
    const G = new Decimal(gains);
    if (G.lte(0)) return new Decimal(0);

    if (accountType === 'ISA') {
      const taxFreeLimit = new Decimal(config.isaTaxFreeLimit);
      if (G.lte(taxFreeLimit)) return new Decimal(0);

      const taxableGains = G.minus(taxFreeLimit);
      return taxableGains.times(config.isaReducedTaxRate);
    }

    // 일반 계좌: 배당소득세 기준으로 단순화 (양도소득세는 별도 로직 필요할 수 있음)
    return G.times(config.dividendTaxRate);
  }

  /**
   * 숫자를 한국인에게 친숙한 '만 원' 단위로 포맷팅합니다.
   * @param value 금액 (원 단위)
   * @param simplified 만 원 이하 단위를 절삭할지 여부
   * @returns 포맷팅된 문자열 (예: 1억 2,345만 6,789원)
   */
  static formatKoreanWon(value: Decimal | number | string, simplified: boolean = false): string {
    const signedAmount = new Decimal(value);
    if (signedAmount.isNegative()) {
      const formatted = this.formatKoreanWon(signedAmount.abs(), simplified);
      return formatted === '0원' ? formatted : `-${formatted}`;
    }
    const amount = signedAmount.floor();
    if (amount.isZero()) return '0원';

    // 1억 원(10^8) 이상일 경우 1만 원 미만 단위는 반드시 절삭 (사용자 요청)
    const effectiveSimplified = amount.gte(100000000) ? true : simplified;

    const units = [
      { label: '조', value: new Decimal('1000000000000') },
      { label: '억', value: new Decimal('100000000') },
      { label: '만', value: new Decimal('10000') },
    ];

    let remaining = amount;
    let parts: string[] = [];

    for (const { label, value: unitValue } of units) {
      if (remaining.gte(unitValue)) {
        const count = remaining.dividedBy(unitValue).floor();
        parts.push(`${count.toNumber().toLocaleString()}${label}`);
        remaining = remaining.mod(unitValue);
      }
    }

    if (!effectiveSimplified && remaining.gt(0)) {
      parts.push(`${remaining.toNumber().toLocaleString()}원`);
    } else if (parts.length > 0) {
      parts[parts.length - 1] += ' 원';
    } else if (effectiveSimplified && amount.lt(10000)) {
      // 만 원 미만인데 심플 모드인 경우 0만 원 대신 실제 원 표시
      return `${amount.toNumber().toLocaleString()}원`;
    }

    return parts.join(' ').trim();
  }

  /**
   * 달러 금액을 원화로 변환합니다.
   * @param usdAmount 달러 금액
   * @param exchangeRate 환율
   */
  static usdToKrw(usdAmount: Decimal | number | string, exchangeRate: number | Decimal): Decimal {
    return new Decimal(usdAmount).times(exchangeRate);
  }

  /**
   * 원화 금액을 달러로 변환합니다.
   * @param krwAmount 원화 금액
   * @param exchangeRate 환율
   */
  static krwToUsd(krwAmount: Decimal | number | string, exchangeRate: number | Decimal): Decimal {
    return new Decimal(krwAmount).dividedBy(exchangeRate);
  }

  /**
   * 통화 간의 자동 환산 기능을 수행합니다.
   * @param value 변환할 금액
   * @param rate 환율
   * @param to 대상 통화
   */
  static convertCurrency(value: number, rate: number, to: 'KRW' | 'USD'): number {
    const dValue = new Decimal(value);
    const dRate = new Decimal(rate);
    return to === 'USD' 
      ? dValue.dividedBy(dRate).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber()
      : dValue.times(dRate).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
  }

  /**
   * 숫자를 달러(USD) 형식으로 포맷팅합니다.
   * million 미만은 정수부분만 표시합니다.
   * @param value 금액
   * @param simplified 소수점 이하를 절삭할지 여부
   */
  static formatUSD(value: Decimal | number | string, simplified: boolean = false): string {
    const amount = new Decimal(value);
    if (amount.isZero()) return '$0';
    
    // simplified가 true이면 무조건 정수로 표시 (Billion/Million 단위 유지하되 소수점 제거)
    if (simplified) {
      if (amount.abs().gte(1e9)) return `${amount.dividedBy(1e9).toFixed(0)} Billion $`;
      if (amount.abs().gte(1e6)) return `${amount.dividedBy(1e6).toFixed(0)} Million $`;
      return `$${amount.toNumber().toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    // Billion, Million 단위 대응
    if (amount.abs().gte(1e9)) return `${amount.dividedBy(1e9).toFixed(2)} Billion $`;
    if (amount.abs().gte(1e6)) return `${amount.dividedBy(1e6).toFixed(2)} Million $`;
    
    // 1M 미만은 정수만 (사용자 요청)
    return `$${amount.toNumber().toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  /**
   * 큰 숫자를 읽기 쉽게 도와주는 헬퍼 텍스트를 생성합니다. (예: 50만 달러)
   */
  static getLargeNumberHelperText(value: number | Decimal, currency: 'KRW' | 'USD'): string {
    const amount = new Decimal(value);
    if (currency === 'KRW') {
      return this.formatKoreanWon(amount);
    } else {
      // 달러의 경우 한국어로 '~만 달러', '~억 달러' 등으로 변환하여 읽기 지원
      // 환율 참고값 (보통 1400-1500): amount.times(1450) 등으로 변환 가능
      if (amount.gte(1e6)) {
        return `${amount.dividedBy(1e6).toFixed(1)}M 달러`;
      }
      if (amount.gte(1e4)) {
        return `${amount.dividedBy(1e4).toFixed(0)}만 달러`;
      }
      return `${amount.toFixed(0)} 달러`;
    }
  }

  /**
   * 통화에 따라 대형 숫자를 읽기 쉬운 단위로 포맷팅합니다.
   * @param value 금액
   * @param currency 통화
   * @param simplified 간결하게 표시할지 여부
   */
  static formatBigNumber(value: Decimal | number | string, currency: 'KRW' | 'USD', simplified: boolean = false): string {
    return currency === 'KRW' ? this.formatKoreanWon(value, simplified) : this.formatUSD(value, simplified);
  }

  /**
   * 병행 표기(Dual Currency)를 포함한 포맷팅을 수행합니다.
   * @param value 금액 (현재 통화 기준)
   * @param currentCurrency 현재 표시 통화
   * @param exchangeRate 환율
   * @param simplified 간결하게 표시할지 여부
   * @param onlyEstimate 약식(약 $... / 약 ...원)만 반환할지 여부
   */
  static formatDualCurrency(value: number, currentCurrency: 'KRW' | 'USD', exchangeRate: number, simplified: boolean = false, onlyEstimate: boolean = false): string {
    const amount = new Decimal(value);
    const main = this.formatBigNumber(amount, currentCurrency, simplified);
    
    if (currentCurrency === 'KRW') {
      const usd = amount.dividedBy(exchangeRate).floor();
      const estimate = `약 ${this.formatUSD(usd, simplified)}`;
      return onlyEstimate ? estimate : `${main} (${estimate})`;
    } else {
      const krw = amount.times(exchangeRate).floor();
      const krwFormatted = this.formatKoreanWon(krw, simplified);
      const estimate = `약 ${krwFormatted}`;
      return onlyEstimate ? estimate : `${main} (${estimate})`;
    }
  }


  /**
   * UTC 날짜 기준으로 주말(토, 일)을 제외합니다. 시장 공휴일은 모델링하지 않습니다.
   */
  static isBusinessDay(date: Date): boolean {
    const day = date.getUTCDay();
    return day !== 0 && day !== 6;
  }

  /**
   * 상세 시뮬레이션을 수행합니다. (일 단위 반복 연산)
   * average는 고정 수익률(중앙 경로)을 Decimal로 정밀 계산하고,
   * pessimistic·optimistic은 같은 현금흐름에 시장 수익률만 무작위로 바꾼 고정 시드 몬테카를로의 10%·90% 분위수입니다.
   * marketReturns(참조 자산의 과거 일간 수익률)가 있으면 그 이력을 1년 블록으로 재표집하고,
   * 없으면(사용자 정의) 변동성 20%의 로그정규 수익률을 씁니다. 어느 쪽이든 중앙값 성장은 annualRate입니다.
   */
  static simulateRange(
    principal: number,
    annualRate: number,
    years: number,
    strategy: StrategyConfig = { type: 'FIXED', baseAmount: 0 },
    inflationRate: number = 0,
    accountType: AccountType = 'GENERAL',
    taxConfig: TaxConfig = DEFAULT_TAX_CONFIG,
    feeConfig: FeeConfig = { buyFeeRate: 0.00015, sellFeeRate: 0.00015 },
    exchangeRateConfig: { base: number; annualChangeRate: number } = { base: 1, annualChangeRate: 0 },
    intervalDays: number = 30,
    marketReturns?: readonly number[]
  ): SimulationRangeResult {
    if (!Number.isFinite(years) || years < 0 || !Number.isSafeInteger(Math.round(years * 365))) {
      throw new RangeError('Years must produce a finite, nonnegative number of days.');
    }
    if (!Number.isInteger(intervalDays) || intervalDays <= 0) throw new RangeError('Sampling interval must be a positive integer.');
    const nonnegativeAmounts = [principal, strategy.baseAmount ?? 0, strategy.targetGrowth ?? 0, taxConfig.isaTaxFreeLimit];
    if (nonnegativeAmounts.some(value => !Number.isFinite(value) || value < 0)) throw new RangeError('Amounts must be finite and nonnegative.');
    const feeAndTaxRates = [feeConfig.buyFeeRate, feeConfig.sellFeeRate, taxConfig.dividendTaxRate, taxConfig.capitalGainTaxRate, taxConfig.isaReducedTaxRate];
    if (feeAndTaxRates.some(value => !Number.isFinite(value) || value < 0 || value > 1) || feeConfig.buyFeeRate === 1) {
      throw new RangeError('Fees and tax rates must be between 0 and 1, with purchase fees below 1.');
    }
    if (!Number.isFinite(strategy.increaseRate ?? 0) || (strategy.increaseRate ?? 0) < -1) throw new RangeError('Contribution growth must be finite and at least -100%.');
    if (!Number.isFinite(exchangeRateConfig.base) || exchangeRateConfig.base <= 0) throw new RangeError('Exchange rate must be positive and finite.');
    if (!Number.isFinite(inflationRate) || inflationRate <= -1) throw new RangeError('Inflation must be finite and greater than -100%.');
    if (!Number.isFinite(exchangeRateConfig.annualChangeRate) || exchangeRateConfig.annualChangeRate <= -1) throw new RangeError('Exchange rate change must be finite and greater than -100%.');

    const totalDays = Math.round(years * 365);
    const today = new Date();
    // Encode the user's local calendar day as a UTC date-only timestamp.
    const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const buyFeeRate = new Decimal(feeConfig.buyFeeRate);
    const sellFeeRate = new Decimal(feeConfig.sellFeeRate);
    const dailyInflationGrowth = this.dailyGrowthFactor(inflationRate);
    const dailyExchangeGrowth = this.dailyGrowthFactor(exchangeRateConfig.annualChangeRate);

    const initialNominal = new Decimal(principal).minus(new Decimal(principal).times(buyFeeRate));
    
    const average = { currentNominal: initialNominal, results: [] as SimulationResult[] };
    const pessimisticResults: SimulationResult[] = [];
    const optimisticResults: SimulationResult[] = [];

    let currentExchangeRate = new Decimal(exchangeRateConfig.base);
    // Inputs use the asset currency; cost basis and paid fees use historical KRW.
    let totalContributionInKrw = new Decimal(principal).times(currentExchangeRate);
    let totalBuyFeesInKrw = totalContributionInKrw.times(buyFeeRate);
    const cashFlowHistory: BacktestHistoryPoint[] = [];

    // 일일 성장 연산 (Projection 모드에서는 과거 낙폭을 재현하지 않고 고정 CAGR 기반 성장)
    const dailyGrowth = this.dailyGrowthFactor(annualRate);
    
    // Range: random market returns with the same median growth, on the same cash flows as the median path.
    // With a history, the swings are resampled one-year runs of it; without one, lognormal draws.
    // Every money's own holding period gets its own uncertainty, so late contributions can lose money too.
    // Draws are taken step by step for all paths, so a longer horizon keeps the earlier draws unchanged.
    const drawHistory = marketReturns && marketReturns.length > 0
      ? createBlockBootstrap(marketReturns, MONTE_CARLO_PATHS)
      : null;
    const tradingDaysBy = (day: number) => Math.round(day * TRADING_DAYS_PER_YEAR / 365);
    const dailyLogGrowth = annualRate <= -1 ? -Infinity : Math.log1p(annualRate) / 365;
    const dailyGrowthNumber = Math.exp(dailyLogGrowth);
    const paths = new Float64Array(MONTE_CARLO_PATHS).fill(initialNominal.toNumber());
    const sortedPaths = new Float64Array(MONTE_CARLO_PATHS);
    const bandPoints: SamplePoint[] = [];
    const lowerBand: number[] = [];
    const upperBand: number[] = [];

    // Value after selling fees and tax at one sample point, for any scenario's holdings.
    const toResult = (nominal: Decimal, point: SamplePoint): SimulationResult => {
      const currentNominalInKrw = nominal.times(point.exchangeRate);
      const sellFees = currentNominalInKrw.times(sellFeeRate);
      const totalFeesWithSell = point.buyFees.plus(sellFees);
      const totalGains = currentNominalInKrw.minus(point.contribution).minus(sellFees);
      const estimatedTax = this.calculateTax(totalGains, accountType, taxConfig);
      const postTaxValue = currentNominalInKrw.minus(sellFees).minus(estimatedTax);
      const realValue = postTaxValue.dividedBy(dailyInflationGrowth.pow(point.day));
      return {
        date: point.date,
        nominalValue: currentNominalInKrw.toNumber(),
        realValue: realValue.toNumber(),
        totalContribution: point.contribution.toNumber(),
        totalGains: totalGains.toNumber(),
        totalFees: totalFeesWithSell.toNumber(),
        estimatedTax: estimatedTax.toNumber(),
        postTaxValue: postTaxValue.toNumber(),
      };
    };
    const nextNormal = createNormalSource();
    // Contributions since the last market step, grown at the median rate until the step ends.
    let pendingContribution = 0;
    let lastStepDay = 0;

    for (let d = 0; d <= totalDays; d++) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + d);

      // Initial principal only at day zero. Later points include that date's
      // closing growth and cash contribution, including the final date.
      if (d > 0) {
        average.currentNominal = average.currentNominal.times(dailyGrowth);
        pendingContribution *= dailyGrowthNumber;
        currentExchangeRate = currentExchangeRate.times(dailyExchangeGrowth);

        const cycle = strategy.cycle || 'MONTHLY';
        const contributionDue = (cycle === 'DAILY' && this.isBusinessDay(date))
          || (cycle === 'WEEKLY' && date.getUTCDay() === 1)
          || (cycle === 'MONTHLY' && date.getUTCDate() === 1);
        let contribution = new Decimal(0);
        if (strategy.type === 'VALUE_AVERAGING') {
          // Calendar-month targets, with the same average-path cashflow in all bands.
          if (date.getUTCDate() === 1) {
            const monthsPassed = (date.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + date.getUTCMonth() - startDate.getUTCMonth();
            const target = new Decimal(strategy.targetGrowth ?? strategy.baseAmount).times(monthsPassed).plus(principal);
            contribution = Decimal.max(0, target.minus(average.currentNominal)).dividedBy(new Decimal(1).minus(buyFeeRate));
          }
        } else if (contributionDue) {
          const increase = strategy.type === 'STEP_UP'
            ? new Decimal(strategy.increaseRate ?? 0).plus(1).pow(Math.floor(d / 365))
            : new Decimal(1);
          contribution = new Decimal(strategy.baseAmount).times(increase);
        }

        if (contribution.gt(0)) {
          const fee = contribution.times(buyFeeRate);
          const netContribution = contribution.minus(fee);
          average.currentNominal = average.currentNominal.plus(netContribution);
          pendingContribution += netContribution.toNumber();
          totalContributionInKrw = totalContributionInKrw.plus(contribution.times(currentExchangeRate));
          totalBuyFeesInKrw = totalBuyFeesInKrw.plus(fee.times(currentExchangeRate));
        }
      }

      const isSample = d % intervalDays === 0 || d === totalDays;
      if (d > 0 && (isSample || d - lastStepDay >= MONTE_CARLO_STEP_DAYS)) {
        const days = d - lastStepDay;
        const drift = dailyLogGrowth * days;
        if (drawHistory) {
          const tradingDays = tradingDaysBy(d) - tradingDaysBy(lastStepDay);
          for (let path = 0; path < paths.length; path++) {
            paths[path] = paths[path] * Math.exp(drift + drawHistory(path, tradingDays)) + pendingContribution;
          }
        } else {
          const spread = CUSTOM_VOLATILITY * Math.sqrt(days / 365);
          // Antithetic pairs (z, −z) keep the range edges smooth with the same number of paths.
          for (let path = 0; path < paths.length; path += 2) {
            const shock = spread * nextNormal();
            paths[path] = paths[path] * Math.exp(drift + shock) + pendingContribution;
            paths[path + 1] = paths[path + 1] * Math.exp(drift - shock) + pendingContribution;
          }
        }
        pendingContribution = 0;
        lastStepDay = d;
      }

      cashFlowHistory.push({
        date: date.toISOString().slice(0, 10),
        value: average.currentNominal.times(currentExchangeRate).toNumber(),
        principal: totalContributionInKrw.toNumber(),
      });

      // 데이터 포인트 기록
      if (isSample) {
        const point: SamplePoint = {
          date: new Date(date),
          day: d,
          exchangeRate: currentExchangeRate,
          contribution: totalContributionInKrw,
          buyFees: totalBuyFeesInKrw,
        };
        average.results.push(toResult(average.currentNominal, point));
        bandPoints.push(point);
        sortedPaths.set(paths);
        sortedPaths.sort();
        lowerBand.push(sortedQuantile(sortedPaths, RANGE_LOWER_QUANTILE));
        upperBand.push(sortedQuantile(sortedPaths, RANGE_UPPER_QUANTILE));
      }
    }

    const smoothLower = smoothInLogSpace(lowerBand, BAND_SMOOTHING_RADIUS);
    const smoothUpper = smoothInLogSpace(upperBand, BAND_SMOOTHING_RADIUS);
    bandPoints.forEach((point, index) => {
      pessimisticResults.push(toResult(new Decimal(smoothLower[index]), point));
      optimisticResults.push(toResult(new Decimal(smoothUpper[index]), point));
    });
    cashFlowHistory.at(-1)!.value = average.results.at(-1)!.postTaxValue;

    // Below the money put in after selling, before tax: tax only applies to gains, so it never decides a loss.
    const principalInKrw = totalContributionInKrw.toNumber();
    const keptAfterSale = currentExchangeRate.toNumber() * (1 - feeConfig.sellFeeRate);
    let losingPaths = 0;
    for (const value of paths) if (value * keptAfterSale < principalInKrw) losingPaths++;

    return {
      pessimistic: pessimisticResults,
      average: average.results,
      optimistic: optimisticResults,
      lossProbability: principalInKrw > 0 ? losingPaths / paths.length : 0,
      irr: calculateMoneyWeightedReturn(cashFlowHistory, 365),
    };
  }

  /**
   * 상세 시뮬레이션을 수행합니다. (일 단위 반복 연산)
   * 하위 호환성을 위해 유지하며 simulateRange의 average 결과를 반환합니다.
   */
  static simulate(
    principal: number,
    annualRate: number,
    years: number,
    strategy: StrategyConfig = { type: 'FIXED', baseAmount: 0 },
    inflationRate: number = 0,
    accountType: AccountType = 'GENERAL',
    taxConfig: TaxConfig = DEFAULT_TAX_CONFIG,
    feeConfig: FeeConfig = { buyFeeRate: 0.00015, sellFeeRate: 0.00015 },
    exchangeRateConfig: { base: number; annualChangeRate: number } = { base: 1, annualChangeRate: 0 },
    intervalDays: number = 30,
    marketReturns?: readonly number[]
  ): SimulationResult[] {
    return this.simulateRange(
      principal, annualRate, years, strategy, inflationRate, accountType, taxConfig, feeConfig, exchangeRateConfig, intervalDays, marketReturns
    ).average;
  }

  /**
   * 투자 기간 동안의 일별 성장을 시뮬레이션하여 시리즈 데이터를 생성합니다.
   * (하위 호환성을 위해 유지)
   */
  static generateSeries(
    principal: number,
    annualRate: number,
    years: number,
    dailyContribution: number = 0,
    intervalDays: number = 30
  ): { date: Date; value: number }[] {
    const strategy: StrategyConfig = { type: 'FIXED', baseAmount: dailyContribution, cycle: 'DAILY' };
    return this.simulate(principal, annualRate, years, strategy, 0, 'GENERAL', undefined, undefined, undefined, intervalDays)
      .map(r => ({ date: r.date, value: r.nominalValue }));
  }
}
