import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';
import { Decimal } from 'decimal.js';

describe('SnowballEngine', () => {
  describe('bankersRounding', () => {
    it('가장 가까운 짝수로 반올림해야 합니다 (Banker\'s Rounding)', () => {
      // Half to even cases
      expect(SnowballEngine.bankersRounding(2.5, 0).toNumber()).toBe(2);
      expect(SnowballEngine.bankersRounding(3.5, 0).toNumber()).toBe(4);
      expect(SnowballEngine.bankersRounding(2.55, 1).toNumber()).toBe(2.6);
      expect(SnowballEngine.bankersRounding(2.45, 1).toNumber()).toBe(2.4);
      
      // Standard cases
      expect(SnowballEngine.bankersRounding(2.1, 0).toNumber()).toBe(2);
      expect(SnowballEngine.bankersRounding(2.9, 0).toNumber()).toBe(3);
    });
  });

  describe('calculateDailyCompound', () => {
    it('일 단위 복리가 정확히 계산되어야 합니다', () => {
      const principal = 1000000; // 100만원
      const annualRate = 0.05;   // 5%
      const days = 365;          // 1년
      
      const result = SnowballEngine.calculateDailyCompound(principal, annualRate, days);
      
      // 공식: 1,000,000 * (1 + 0.05/365)^365
      // 계산값: 1,051,267.49646...
      // 반올림(2자리): 1,051,267.50
      expect(result.toDecimalPlaces(2).toNumber()).toBe(1051267.50);
    });

    it('10년 장기 복리 계산 시 정밀도가 유지되어야 합니다', () => {
      const principal = 1000000;
      const annualRate = 0.1;
      const days = 365 * 10;
      
      const result = SnowballEngine.calculateDailyCompound(principal, annualRate, days);
      
      // 1,000,000 * (1 + 0.1/365)^3650
      // 기대값: 약 2,717,909...
      expect(result.gt(2717000)).toBe(true);
      expect(result.lt(2719000)).toBe(true);
    });
  });

  describe('calculateRealValue', () => {
    it('물가상승률을 반영한 실질 가치가 정확히 계산되어야 합니다', () => {
      const principal = new Decimal(1000000);
      const rate = 0.05;
      const days = 365;
      
      // 1년 후 명목 가치 계산
      const nominalAmount = SnowballEngine.calculateDailyCompound(principal, rate, days);
      
      // 동일한 물가상승률로 현재 가치 환산
      const result = SnowballEngine.calculateRealValue(nominalAmount, rate, days);
      
      // 실질 가치는 원금과 정확히 일치해야 함
      expect(result.toDecimalPlaces(0).toNumber()).toBe(1000000);
    });
  });

  describe('Financial Accuracy (Floating Point Error Check)', () => {
    it('Decimal.js를 사용하여 부동 소수점 오차를 방지해야 합니다', () => {
      // 0.1 + 0.2 는 0.30000000000000004 가 아님
      const a = new Decimal('0.1');
      const b = new Decimal('0.2');
      expect(a.plus(b).toNumber()).toBe(0.3);
    });
  });

  describe('Currency Conversion & Formatting', () => {
    const exchangeRate = 1450;

    it('KRW -> USD 전환 시 Banker\'s Rounding이 적용되어야 합니다', () => {
      // 1450원 -> 1달러
      expect(SnowballEngine.convertCurrency(1450, exchangeRate, 'USD')).toBe(1);
      // 2175원 -> 1.5달러
      expect(SnowballEngine.convertCurrency(2175, exchangeRate, 'USD')).toBe(1.5);
      // 725원 -> 0.5달러
      expect(SnowballEngine.convertCurrency(725, exchangeRate, 'USD')).toBe(0.5);
    });

    it('USD -> KRW 전환 시 정수로 반올림되어야 합니다', () => {
      expect(SnowballEngine.convertCurrency(1, exchangeRate, 'KRW')).toBe(1450);
      expect(SnowballEngine.convertCurrency(1.5, exchangeRate, 'KRW')).toBe(2175);
    });

    it('한국어 금액 포맷팅 (억/만)이 정확해야 합니다', () => {
      expect(SnowballEngine.formatKoreanWon(125000000)).toBe('1억 2,500만 원');
      expect(SnowballEngine.formatKoreanWon(100000000)).toBe('1억 원');
      expect(SnowballEngine.formatKoreanWon(10000)).toBe('1만 원');
      expect(SnowballEngine.formatKoreanWon(12345)).toBe('1만 2,345원');
    });

    it('달러 금액 포맷팅 (Million/Billion)이 정확해야 합니다', () => {
      expect(SnowballEngine.formatUSD(1000000)).toBe('1.00 Million $');
      expect(SnowballEngine.formatUSD(1000000000)).toBe('1.00 Billion $');
      expect(SnowballEngine.formatUSD(1234567)).toBe('1.23 Million $');
      expect(SnowballEngine.formatUSD(500)).toBe('500 $');
    });
  });
});
