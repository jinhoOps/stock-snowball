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

    it('인플레이션율에 따라 미래 가치가 현재 가치로 올바르게 할인되어야 합니다 (다중 연도)', () => {
      const nominalAmount = 1000000;
      const inflationRate = 0.03; // 3%
      const years = 10;
      const days = years * 365;

      const realValue = SnowballEngine.calculateRealValue(nominalAmount, inflationRate, days);
      
      // PV = 1,000,000 / (1 + 0.03/365)^(3650)
      // 약 740,842
      expect(realValue.toNumber()).toBeLessThan(1000000);
      expect(realValue.toNumber()).toBeGreaterThan(700000);
      expect(Math.round(realValue.toNumber())).toBe(740827);
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
      expect(SnowballEngine.formatUSD(500)).toBe('$500');
    });

    it('병행 표기(Dual Currency) 포맷팅이 정확해야 합니다', () => {
      expect(SnowballEngine.formatDualCurrency(10000, 'KRW', 1450)).toContain('1만 원');
      expect(SnowballEngine.formatDualCurrency(10000, 'KRW', 1450)).toContain('$6');
      expect(SnowballEngine.formatDualCurrency(1000, 'USD', 1450)).toContain('$1,000');
      expect(SnowballEngine.formatDualCurrency(1000, 'USD', 1450)).toContain('145만 원');
    });
  });

  describe('Range Projection (Cone of Uncertainty)', () => {
    it('3가지 시나리오가 모두 생성되어야 하며 상/하한 관계가 정합적이어야 합니다', () => {
      const principal = 10000000;
      const rate = 0.1; // 10%
      const years = 10;
      
      const result = SnowballEngine.simulateRange(principal, rate, years);
      
      expect(result.average).toBeDefined();
      expect(result.pessimistic).toBeDefined();
      expect(result.optimistic).toBeDefined();
      
      const lastAvg = result.average[result.average.length - 1].postTaxValue;
      const lastPes = result.pessimistic[result.pessimistic.length - 1].postTaxValue;
      const lastOpt = result.optimistic[result.optimistic.length - 1].postTaxValue;
      
      expect(lastOpt).toBeGreaterThan(lastAvg);
      expect(lastAvg).toBeGreaterThan(lastPes);
    });

    it('시뮬레이션 결과에 인플레이션이 반영된 실질 가치가 포함되어야 합니다', () => {
      const principal = 1000000;
      const rate = 0.1;
      const years = 10;
      const inflation = 0.03;
      
      const result = SnowballEngine.simulateRange(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, inflation);
      
      const lastPoint = result.average[result.average.length - 1];
      expect(lastPoint.realValue).toBeDefined();
      expect(lastPoint.realValue).toBeLessThan(lastPoint.postTaxValue);
      
      // 수치 검증: nominalValue / (1 + 0.03/365)^(10*365)
      const expectedReal = new Decimal(lastPoint.postTaxValue).dividedBy(new Decimal(inflation).dividedBy(365).plus(1).pow(years * 365));
      expect(Math.abs(lastPoint.realValue - expectedReal.toNumber())).toBeLessThan(100);
    });

    it('시간이 경과할수록 범위(Variance)가 넓어져야 합니다', () => {
       const principal = 10000000;
       const rate = 0.1;
       const years = 5;
       // 365일 간격으로 포인트 기록 (1년 단위 확인 용이)
       const result = SnowballEngine.simulateRange(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL', undefined, undefined, undefined, 365);
       
       // 1년차(index 1) 차이 vs 5년차(index 5) 차이
       const diffYear1 = result.optimistic[1].postTaxValue - result.pessimistic[1].postTaxValue;
       const diffYear5 = result.optimistic[5].postTaxValue - result.pessimistic[5].postTaxValue;
       
       expect(diffYear5).toBeGreaterThan(diffYear1);
    });
  });

  describe('Business Day Logic', () => {
    it('일별 매수 시 주말을 제외하고 21영업일 기준으로 투자되어야 합니다', () => {
      const monthlyAmount = 2100000; // 계산 편의를 위해 210만원
      const principal = 0;
      const years = 1; // 1년
      
      // 수익률 0%로 설정하여 원금 합계만 확인
      const result = SnowballEngine.simulate(principal, 0, years, { type: 'FIXED', baseAmount: monthlyAmount }, 0);
      
      const lastResult = result[result.length - 1];
      // 1년 = 12개월. 월 210만원씩 총 2520만원 적립되어야 함.
      const expectedTotal = monthlyAmount * 12;
      // 수수료 및 소수점 오차 감안하여 근사치 확인
      expect(Math.abs(lastResult.totalContribution - expectedTotal)).toBeLessThan(100000);
    });
  });
});
