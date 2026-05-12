import { Decimal } from 'decimal.js';

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
   * 일 단위 복리를 계산합니다.
   * 공식: A = P * (1 + r/365)^n
   * @param principal 원금 (P)
   * @param annualRate 연이율 (r, 예: 0.05 for 5%)
   * @param days 투자 기간 (n, 일수)
   * @returns 최종 금액 (A)
   */
  static calculateDailyCompound(
    principal: Decimal | number | string,
    annualRate: Decimal | number | string,
    days: number
  ): Decimal {
    const P = new Decimal(principal);
    const r = new Decimal(annualRate);
    const n = new Decimal(days);

    // (1 + r/365)^n
    const dailyRate = r.dividedBy(365);
    const multiplier = dailyRate.plus(1).pow(n);

    return P.times(multiplier);
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
   * 투자 기간 동안의 일별 성장을 시뮬레이션하여 시리즈 데이터를 생성합니다.
   * @param principal 초기 원금
   * @param annualRate 연이율
   * @param years 투자 년수
   * @param intervalDays 데이터 포인트 간격 (기본 30일)
   */
  static generateSeries(
    principal: number,
    annualRate: number,
    years: number,
    intervalDays: number = 30
  ): { date: Date; value: number }[] {
    const series = [];
    const totalDays = years * 365;
    const startDate = new Date();

    for (let d = 0; d <= totalDays; d += intervalDays) {
      const amount = this.calculateDailyCompound(principal, annualRate, d);
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + d);
      
      series.push({
        date,
        value: amount.toNumber(),
      });
    }

    return series;
  }
}
