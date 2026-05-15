import { Decimal } from 'decimal.js';
import { AccountType, FeeConfig, TaxConfig, SimulationResult, StrategyConfig, AssetType } from '../types/finance';


// Decimal 설정: 금융 연산을 위해 정밀도를 높게 설정 (기본 20 -> 40)
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * SnowballEngine: 고정밀 금융 연산을 담당하는 핵심 클래스
 */
export class SnowballEngine {
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
   * 공식: A = P(1+r/n)^(nt) + PMT * [((1+r/n)^(nt) - 1) / (r/n)]
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

    if (n.isZero()) return P;

    const dailyRate = r.dividedBy(365);
    
    // 이자율이 0인 경우 단순 합산
    if (dailyRate.isZero()) {
      return P.plus(PMT.times(n));
    }

    // (1 + r/365)^n
    const multiplier = dailyRate.plus(1).pow(n);
    
    // 원금의 성장: P * (1 + r/365)^n
    const principalGrowth = P.times(multiplier);
    
    // 불입금의 성장: PMT * [((1 + r/365)^n - 1) / (r/365)]
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

    const dailyInflation = i.dividedBy(365);
    const divisor = dailyInflation.plus(1).pow(n);

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
    const amount = new Decimal(value).floor();
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
   */
  static formatDualCurrency(value: number, currentCurrency: 'KRW' | 'USD', exchangeRate: number, simplified: boolean = false): string {
    const amount = new Decimal(value);
    const main = this.formatBigNumber(amount, currentCurrency, simplified);
    
    if (currentCurrency === 'KRW') {
      const usd = amount.dividedBy(exchangeRate).floor();
      return `${main} (약 ${this.formatUSD(usd, simplified)})`;
    } else {
      const krw = amount.times(exchangeRate).floor();
      const krwFormatted = this.formatKoreanWon(krw, simplified);
      return `${main} (약 ${krwFormatted})`;
    }
  }


  /**
   * 주말(토, 일)을 제외한 영업일 여부를 확인합니다.
   */
  static isBusinessDay(date: Date): boolean {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  /**
   * 상세 시뮬레이션을 수행합니다. (일 단위 반복 연산)
   * 3가지 시나리오(Pessimistic, Average, Optimistic)를 동시에 연산합니다.
   */
  static simulateRange(
    principal: number,
    annualRate: number,
    years: number,
    strategy: StrategyConfig = { type: 'FIXED', baseAmount: 0 },
    inflationRate: number = 0,
    accountType: AccountType = 'GENERAL',
    taxConfig: TaxConfig = { dividendTaxRate: 0.154, capitalGainTaxRate: 0.22, isaTaxFreeLimit: 2000000, isaReducedTaxRate: 0.095 },
    feeConfig: FeeConfig = { buyFeeRate: 0.00015, sellFeeRate: 0.00015 },
    exchangeRateConfig: { base: number; annualChangeRate: number } = { base: 1, annualChangeRate: 0 },
    intervalDays: number = 30,
    _assetType: AssetType = 'CUSTOM'
  ): { pessimistic: SimulationResult[]; average: SimulationResult[]; optimistic: SimulationResult[] } {
    const totalDays = years * 365;
    const startDate = new Date();

    const buyFeeRate = new Decimal(feeConfig.buyFeeRate);
    const sellFeeRate = new Decimal(feeConfig.sellFeeRate);
    const dailyInflation = new Decimal(inflationRate).dividedBy(365);
    const dailyExchangeChange = new Decimal(exchangeRateConfig.annualChangeRate).dividedBy(365);

    const initialNominal = new Decimal(principal).minus(new Decimal(principal).times(buyFeeRate));
    
    // 3가지 시나리오용 상태
    let states = {
      pessimistic: { currentNominal: initialNominal, totalContribution: new Decimal(principal), totalFees: new Decimal(principal).times(buyFeeRate), results: [] as SimulationResult[] },
      average: { currentNominal: initialNominal, totalContribution: new Decimal(principal), totalFees: new Decimal(principal).times(buyFeeRate), results: [] as SimulationResult[] },
      optimistic: { currentNominal: initialNominal, totalContribution: new Decimal(principal), totalFees: new Decimal(principal).times(buyFeeRate), results: [] as SimulationResult[] },
    };

    let currentExchangeRate = new Decimal(exchangeRateConfig.base);

    // 일일 성장 연산 (Projection 모드에서는 과거 낙폭을 재현하지 않고 고정 CAGR 기반 성장)
    const dailyRate = new Decimal(annualRate).dividedBy(365);
    
    for (let d = 0; d <= totalDays; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + d);
      const yearsPassed = d / 365;
      const varianceMultiplier = _assetType === 'QLD' ? 4 : _assetType === 'TQQQ' ? 8 : 1;
      const variance = 0.0025 * yearsPassed * varianceMultiplier; // ±0.25% * n_years * leverage_weight

      // 데이터 포인트 기록
      if (d % intervalDays === 0 || d === totalDays) {
        for (const key of ['pessimistic', 'average', 'optimistic'] as const) {
          const state = states[key];
          const currentNominalInKrw = state.currentNominal.times(currentExchangeRate);
          const sellFees = currentNominalInKrw.times(sellFeeRate);
          const totalFeesWithSell = state.totalFees.plus(sellFees);
          const totalContributionInKrw = state.totalContribution.times(currentExchangeRate);
          const totalGains = currentNominalInKrw.minus(totalContributionInKrw).minus(sellFees);
          const estimatedTax = this.calculateTax(totalGains, accountType, taxConfig);
          const postTaxValue = currentNominalInKrw.minus(sellFees).minus(estimatedTax);
          const realValue = postTaxValue.dividedBy(dailyInflation.plus(1).pow(d));

          state.results.push({
            date: new Date(date),
            nominalValue: this.bankersRounding(currentNominalInKrw).toNumber(),
            realValue: this.bankersRounding(realValue).toNumber(),
            totalContribution: this.bankersRounding(totalContributionInKrw).toNumber(),
            totalGains: this.bankersRounding(totalGains).toNumber(),
            totalFees: this.bankersRounding(totalFeesWithSell).toNumber(),
            estimatedTax: this.bankersRounding(estimatedTax).toNumber(),
            postTaxValue: this.bankersRounding(postTaxValue).toNumber(),
          });
        }
      }

      if (d === totalDays) break;

      // 분산 적용 (Pessimistic / Average / Optimistic)
      const dailyVariance = new Decimal(variance).dividedBy(365);
      
      states.average.currentNominal = states.average.currentNominal.times(dailyRate.plus(1));
      states.pessimistic.currentNominal = states.pessimistic.currentNominal.times(dailyRate.minus(dailyVariance).plus(1));
      states.optimistic.currentNominal = states.optimistic.currentNominal.times(dailyRate.plus(dailyVariance).plus(1));
      
      // 환율 변동
      currentExchangeRate = currentExchangeRate.times(dailyExchangeChange.plus(1));

      // 추가 불입 (납입 주기에 따른 로직 적용)
      const isBizDay = this.isBusinessDay(date);
      const cycle = strategy.cycle || 'MONTHLY';
      let dailyContribution = new Decimal(0);
      
      if (strategy.type === 'FIXED') {
        if (cycle === 'DAILY' && isBizDay) {
          dailyContribution = new Decimal(strategy.baseAmount);
        } else if (cycle === 'WEEKLY' && date.getDay() === 1) { // 매주 월요일
          dailyContribution = new Decimal(strategy.baseAmount);
        } else if (cycle === 'MONTHLY' && date.getDate() === 1) { // 매달 1일
          dailyContribution = new Decimal(strategy.baseAmount);
        }
      } else if (strategy.type === 'STEP_UP') {
        const year = Math.floor(d / 365);
        const annualIncrease = new Decimal(strategy.increaseRate || 0).plus(1).pow(year);
        const base = new Decimal(strategy.baseAmount).times(annualIncrease);
        
        if (cycle === 'DAILY' && isBizDay) {
          dailyContribution = base;
        } else if (cycle === 'WEEKLY' && date.getDay() === 1) {
          dailyContribution = base;
        } else if (cycle === 'MONTHLY' && date.getDate() === 1) {
          dailyContribution = base;
        }
      } else if (strategy.type === 'VALUE_AVERAGING') {
        // VA는 월 단위로만 동작하도록 단순화 (필요 시 확장)
        if (d > 0 && d % 30 === 0) {
          const targetValue = new Decimal(strategy.targetGrowth || 0).times(d / 30).plus(principal);
          if (states.average.currentNominal.lt(targetValue)) {
            dailyContribution = targetValue.minus(states.average.currentNominal);
          }
        }
      }

      if (dailyContribution.gt(0)) {
        const fee = dailyContribution.times(buyFeeRate);
        const netContribution = dailyContribution.minus(fee);
        
        for (const key of ['pessimistic', 'average', 'optimistic'] as const) {
          states[key].currentNominal = states[key].currentNominal.plus(netContribution);
          states[key].totalContribution = states[key].totalContribution.plus(dailyContribution);
          states[key].totalFees = states[key].totalFees.plus(fee);
        }
      }
    }

    return {
      pessimistic: states.pessimistic.results,
      average: states.average.results,
      optimistic: states.optimistic.results,
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
    taxConfig: TaxConfig = { dividendTaxRate: 0.154, capitalGainTaxRate: 0.22, isaTaxFreeLimit: 2000000, isaReducedTaxRate: 0.095 },
    feeConfig: FeeConfig = { buyFeeRate: 0.00015, sellFeeRate: 0.00015 },
    exchangeRateConfig: { base: number; annualChangeRate: number } = { base: 1, annualChangeRate: 0 },
    intervalDays: number = 30,
    _assetType: AssetType = 'CUSTOM'
  ): SimulationResult[] {
    return this.simulateRange(
      principal, annualRate, years, strategy, inflationRate, accountType, taxConfig, feeConfig, exchangeRateConfig, intervalDays, _assetType
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
    // dailyContribution * 30.42를 월간 baseAmount로 환산하여 전달
    const strategy: StrategyConfig = { type: 'FIXED', baseAmount: dailyContribution * 30.42 };
    return this.simulate(principal, annualRate, years, strategy, 0, 'GENERAL', undefined, undefined, undefined, intervalDays)
      .map(r => ({ date: r.date, value: r.nominalValue }));
  }
}
