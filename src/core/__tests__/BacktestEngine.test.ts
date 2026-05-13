import { describe, it, expect } from 'vitest';
import { BacktestEngine } from '../BacktestEngine';
import { BacktestParams } from '../../types/finance';

describe('BacktestEngine', () => {
  const sampleData = [
    { date: '2023-01-01', price: 100, dividendYield: 0.01 }, // 1월 시작
    { date: '2023-02-01', price: 110, dividendYield: 0.01 }, // 10% 상승
    { date: '2023-03-01', price: 99, dividendYield: 0.01 },  // 전고점(110) 대비 10% 하락
    { date: '2023-04-01', price: 121, dividendYield: 0.01 }, // 저점(99) 대비 22.2% 상승
  ];

  describe('LumpSum Simulation (거치식)', () => {
    it('배당 재투자 없이 정확한 수익률을 계산해야 한다', () => {
      const params: BacktestParams = {
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2023-01-01',
        endDate: '2023-04-01',
        reinvestDividends: false,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, sampleData);

      expect(result.metrics.totalPrincipal).toBe(1000000);
      expect(result.metrics.finalValue).toBe(1210000);
      expect(result.metrics.totalReturn).toBeCloseTo(0.21, 5);
    });

    it('MDD(최대 낙폭)를 올바르게 계산해야 한다', () => {
      const params: BacktestParams = {
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2023-01-01',
        endDate: '2023-04-01',
        reinvestDividends: false,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, sampleData);

      // 최고점 110에서 99로 하락 -> (110-99)/110 = 0.1 (10%)
      expect(result.metrics.mdd).toBeCloseTo(0.1, 5);
    });

    it('배당 재투자(TR) 반영 시 수익률이 증가해야 한다', () => {
      const params: BacktestParams = {
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2023-01-01',
        endDate: '2023-04-01',
        reinvestDividends: true,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, sampleData);

      // 1월: 100만원 시작
      // 2월: 110만원 가치 + 1월 배당(1%) 1만원 재투자 -> 111만원
      // 3월: 111만원 * (99/110) + 2월 배당(1%) 1.11만원 재투자 -> 99.9 + 1.11 = 101.01
      // 4월: 101.01 * (121/99) + 3월 배당(1%) 1.0101만원 재투자 -> 123.4455 + 1.234455 = 124.68...
      expect(result.metrics.finalValue).toBeGreaterThan(1210000);
    });
  });

  describe('Installment Simulation (적립식)', () => {
    it('매월 적립금이 정확히 반영되어야 한다', () => {
      const params: BacktestParams = {
        initialPrincipal: 0,
        monthlyInstallment: 1000000,
        startDate: '2023-01-01',
        endDate: '2023-04-01',
        reinvestDividends: false,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, sampleData);

      // 1월: 100만원 (수량 10000)
      // 2월: 10000*110 + 100만원 = 210만원 (수량 10000 + 9090.909 = 19090.909)
      // 3월: 19090.909*99 + 100만원 = 1890000 + 1000000 = 2890000 (수량 19090.909 + 10101.01 = 29191.919)
      // 4월: 29191.919*121 + 100만원 = 3532222.2 + 1000000 = 4532222.2 (수량 29191.919 + 8264.46 = 37456.38)
      expect(result.metrics.totalPrincipal).toBe(4000000);
      expect(result.history.length).toBe(4);
    });
  });

  describe('Edge Cases & Robustness', () => {
    it('자산 가치가 원금의 1% 미만일 때 청산되어야 한다', () => {
      const crashData = [
        { date: '2023-01-01', price: 100 },
        { date: '2023-02-01', price: 0.5 }, // 99.5% 폭락
      ];

      const params: BacktestParams = {
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2023-01-01',
        endDate: '2023-02-01',
        reinvestDividends: false,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, crashData);

      expect(result.history[1].isLiquidated).toBe(true);
      expect(result.metrics.finalValue).toBe(0);
    });

    it('10년 이상의 장기 시뮬레이션에서 CAGR과 IRR이 합리적이어야 한다', () => {
      const longData = [];
      for (let i = 0; i < 120; i++) {
        const year = 2010 + Math.floor(i / 12);
        const month = (i % 12) + 1;
        longData.push({
          date: `${year}-${month.toString().padStart(2, '0')}-01`,
          price: 100 * Math.pow(1.008, i) // 월 0.8%씩 꾸준히 상승 (연 약 10%)
        });
      }
      
      const params: BacktestParams = {
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2010-01-01',
        endDate: '2019-12-01',
        reinvestDividends: false,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, longData);

      // 연 10% 정도의 CAGR 기대
      expect(result.metrics.cagr).toBeGreaterThan(0.09);
      expect(result.metrics.cagr).toBeLessThan(0.11);
      // 거치식의 경우 CAGR과 IRR이 거의 일치해야 함
      expect(result.metrics.irr).toBeCloseTo(result.metrics.cagr, 2);
    });

    it('투자금이 모두 0이면 결과도 0이어야 한다', () => {
      const params: BacktestParams = {
        initialPrincipal: 0,
        monthlyInstallment: 0,
        startDate: '2023-01-01',
        endDate: '2023-04-01',
        reinvestDividends: false,
        assetId: 'SPY'
      };

      const result = BacktestEngine.run(params, sampleData);

      expect(result.metrics.finalValue).toBe(0);
      expect(result.metrics.totalPrincipal).toBe(0);
      expect(result.metrics.totalReturn).toBe(0);
    });
  });
});
