import { Decimal } from 'decimal.js';
import { AccountType, FeeConfig, TaxConfig, SimulationResult, StrategyConfig, AssetType } from '../types/finance';
import { getDailyReturn } from '../data/historicalAssets';

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
   * @returns 포맷팅된 문자열 (예: 1억 2,345만 6,789원)
   */
  static formatKoreanWon(value: Decimal | number | string): string {
    const amount = new Decimal(value).floor();
    if (amount.isZero()) return '0원';

    const units = [
      { label: '조', value: new Decimal('1000000000000') },
      { label: '억', value: new Decimal('100000000') },
      { label: '만', value: new Decimal('10000') },
    ];

    let remaining = amount;
    let result = '';

    for (const { label, value: unitValue } of units) {
      if (remaining.gte(unitValue)) {
        const count = remaining.dividedBy(unitValue).floor();
        result += `${count.toLocaleString()}${label} `;
        remaining = remaining.mod(unitValue);
      }
    }

    if (remaining.gt(0) || result === '') {
      result += `${remaining.toNumber().toLocaleString()}원`;
    }

    return result.trim();
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
   * 상세 시뮬레이션을 수행합니다. (일 단위 반복 연산)
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
    assetType: AssetType = 'CUSTOM'
  ): SimulationResult[] {
    const results: SimulationResult[] = [];
    const totalDays = years * 365;
    const startDate = new Date();

    const buyFeeRate = new Decimal(feeConfig.buyFeeRate);
    const sellFeeRate = new Decimal(feeConfig.sellFeeRate);
    const dailyInflation = new Decimal(inflationRate).dividedBy(365);
    const dailyExchangeChange = new Decimal(exchangeRateConfig.annualChangeRate).dividedBy(365);

    let currentNominal = new Decimal(principal).minus(new Decimal(principal).times(buyFeeRate));
    let totalContribution = new Decimal(principal);
    let totalFees = new Decimal(principal).times(buyFeeRate);
    let currentExchangeRate = new Decimal(exchangeRateConfig.base);

    for (let d = 0; d <= totalDays; d++) {
      // 데이터 포인트 기록
      if (d % intervalDays === 0 || d === totalDays) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + d);

        const currentNominalInKrw = currentNominal.times(currentExchangeRate);
        const sellFees = currentNominalInKrw.times(sellFeeRate);
        const totalFeesWithSell = totalFees.plus(sellFees);
        const totalContributionInKrw = totalContribution.times(currentExchangeRate); // 단순화를 위해 현재 환율 적용
        const totalGains = currentNominalInKrw.minus(totalContributionInKrw).minus(sellFees);
        const estimatedTax = this.calculateTax(totalGains, accountType, taxConfig);
        const postTaxValue = currentNominalInKrw.minus(sellFees).minus(estimatedTax);
        const realValue = postTaxValue.dividedBy(dailyInflation.plus(1).pow(d));

        results.push({
          date,
          nominalValue: this.bankersRounding(currentNominalInKrw).toNumber(),
          realValue: this.bankersRounding(realValue).toNumber(),
          totalContribution: this.bankersRounding(totalContributionInKrw).toNumber(),
          totalGains: this.bankersRounding(totalGains).toNumber(),
          totalFees: this.bankersRounding(totalFeesWithSell).toNumber(),
          estimatedTax: this.bankersRounding(estimatedTax).toNumber(),
          postTaxValue: this.bankersRounding(postTaxValue).toNumber(),
        });
      }

      if (d === totalDays) break;

      // 일일 성장 (자산별 데이터 또는 고정 이율 사용)
      const dailyRate = new Decimal(getDailyReturn(assetType, d, annualRate));
      currentNominal = currentNominal.times(dailyRate.plus(1));
      
      // 환율 변동
      currentExchangeRate = currentExchangeRate.times(dailyExchangeChange.plus(1));

      // 추가 불입 (전략에 따라)
      let dailyContribution = new Decimal(0);
      if (strategy.type === 'FIXED') {
        dailyContribution = new Decimal(strategy.baseAmount).dividedBy(30.42); // 월간 불입금을 일간으로 환산
      } else if (strategy.type === 'STEP_UP') {
        const year = Math.floor(d / 365);
        const annualIncrease = new Decimal(strategy.increaseRate || 0).plus(1).pow(year);
        dailyContribution = new Decimal(strategy.baseAmount).times(annualIncrease).dividedBy(30.42);
      } else if (strategy.type === 'VALUE_AVERAGING') {
        // 매달 정해진 성장 목표(targetGrowth)를 맞추기 위해 부족분만큼 불입
        if (d > 0 && d % 30 === 0) {
          const targetValue = new Decimal(strategy.targetGrowth || 0).times(d / 30).plus(principal);
          if (currentNominal.lt(targetValue)) {
            dailyContribution = targetValue.minus(currentNominal);
          }
        }
      }

      if (dailyContribution.gt(0)) {
        const fee = dailyContribution.times(buyFeeRate);
        currentNominal = currentNominal.plus(dailyContribution.minus(fee));
        totalContribution = totalContribution.plus(dailyContribution);
        totalFees = totalFees.plus(fee);
      }
    }

    return results;
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
