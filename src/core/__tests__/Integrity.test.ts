import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';

/**
 * Phase 1 Task 1.4: Integrity Validation
 * SnowballEngine의 복리 계산 및 실질 가치 환산 로직을 검증합니다.
 * 비교 대상: 외부 계산식 (Excel/Node.js Math)의 고정밀 결과값
 */
describe('SnowballEngine Integrity Validation', () => {
  const principal = 10000000; // 1,000만원
  const annualRate = 0.05;    // 5%
  const inflationRate = 0.03; // 3%

  describe('Long-term Compound Interest Validation (FV)', () => {
    // 1년 (365일)
    it('1년 복리 계산 결과가 외부 기준값과 일치해야 합니다', () => {
      const days = 365;
      const result = SnowballEngine.calculateDailyCompound(principal, annualRate, days);
      
      // Expected: 10,000,000 * (1 + 0.05/365)^365 = 10512674.9646...
      // Banker's Rounding (0자리): 10,512,675
      const rounded = SnowballEngine.bankersRounding(result, 0);
      expect(rounded.toNumber()).toBe(10512675);
    });

    // 5년 (1825일)
    it('5년 복리 계산 결과가 외부 기준값과 일치해야 합니다', () => {
      const days = 1825;
      const result = SnowballEngine.calculateDailyCompound(principal, annualRate, days);
      
      // Expected: 10,000,000 * (1 + 0.05/365)^1825 = 12840034.3214...
      // Banker's Rounding (0자리): 12,840,034
      const rounded = SnowballEngine.bankersRounding(result, 0);
      expect(rounded.toNumber()).toBe(12840034);
    });

    // 10년 (3650일)
    it('10년 복리 계산 결과가 외부 기준값과 일치해야 합니다', () => {
      const days = 3650;
      const result = SnowballEngine.calculateDailyCompound(principal, annualRate, days);
      
      // Expected: 10,000,000 * (1 + 0.05/365)^3650 = 16486648.1376...
      // Banker's Rounding (0자리): 16,486,648
      const rounded = SnowballEngine.bankersRounding(result, 0);
      expect(rounded.toNumber()).toBe(16486648);
    });
  });

  describe('Real Value Discounting Validation (PV)', () => {
    it('물가상승률을 반영한 실질 가치 환산이 정확해야 합니다 (10년)', () => {
      const days = 3650;
      const nominalFV = SnowballEngine.calculateDailyCompound(principal, annualRate, days);
      const realPV = SnowballEngine.calculateRealValue(nominalFV, inflationRate, days);
      
      // Nominal FV: 16,486,648.137...
      // Inflation Divisor: (1 + 0.03/365)^3650 = 1.34983...
      // Real PV: 12,213,759.9097...
      // Banker's Rounding (0자리): 12,213,760
      const rounded = SnowballEngine.bankersRounding(realPV, 0);
      expect(rounded.toNumber()).toBe(12213760);
    });

    it('수익률과 물가상승률이 동일할 경우 실질 가치는 원금과 같아야 합니다', () => {
      const days = 365 * 20; // 20년
      const rate = 0.04;
      const nominalFV = SnowballEngine.calculateDailyCompound(principal, rate, days);
      const realPV = SnowballEngine.calculateRealValue(nominalFV, rate, days);
      
      // 오차 범위 1원 이내 (Banker's rounding 시 정확히 일치해야 함)
      expect(SnowballEngine.bankersRounding(realPV, 0).toNumber()).toBe(principal);
    });
  });

  describe('Edge Case: Leap Year Consideration', () => {
    it('365일 고정 기반 엔진임을 확인 (윤년 보정은 향후 과제)', () => {
      // 현재 엔진은 365일 고정 사용 중
      const result1 = SnowballEngine.calculateDailyCompound(100, 0.05, 365);
      const result2 = SnowballEngine.calculateDailyCompound(100, 0.05, 366);
      expect(result2.gt(result1)).toBe(true);
    });
  });
});
