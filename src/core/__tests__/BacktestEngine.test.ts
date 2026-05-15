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

  const defaultParams: BacktestParams = {
    initialPrincipal: 1000000,
    monthlyInstallment: 0,
    cycle: 'MONTHLY',
    startDate: '2023-01-01',
    endDate: '2023-04-01',
    reinvestDividends: false,
    assetId: 'SPY',
    accountType: 'GENERAL',
    buyFeeRate: 0,
    sellFeeRate: 0,
    taxDividendRate: 0,
    taxCapitalGainRate: 0,
    taxIsaLimit: 0,
    taxIsaReducedRate: 0,
  };

  describe('LumpSum Simulation (거치식)', () => {
    it('배당 재투자 없이 정확한 수익률을 계산해야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
      };

      const result = BacktestEngine.run(params, sampleData);

      expect(result.metrics.totalPrincipal).toBe(1000000);
      expect(result.metrics.finalValue).toBe(1210000);
      expect(result.metrics.totalReturn).toBeCloseTo(0.21, 5);
    });

    it('MDD(최대 낙폭)를 올바르게 계산해야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
      };

      const result = BacktestEngine.run(params, sampleData);

      // 최고점 110에서 99로 하락 -> (110-99)/110 = 0.1 (10%)
      expect(result.metrics.mdd).toBeCloseTo(0.1, 5);
    });

    it('배당 재투자(TR) 반영 시 수익률이 증가해야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        reinvestDividends: true,
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
        ...defaultParams,
        initialPrincipal: 0,
        monthlyInstallment: 1000000,
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
        ...defaultParams,
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2023-01-01',
        endDate: '2023-02-01',
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
        ...defaultParams,
        initialPrincipal: 1000000,
        monthlyInstallment: 0,
        startDate: '2010-01-01',
        endDate: '2019-12-01',
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
        ...defaultParams,
        initialPrincipal: 0,
        monthlyInstallment: 0,
      };

      const result = BacktestEngine.run(params, sampleData);

      expect(result.metrics.finalValue).toBe(0);
      expect(result.metrics.totalPrincipal).toBe(0);
      expect(result.metrics.totalReturn).toBe(0);
    });
  });

  describe('Cycle Support (D/W/M)', () => {
    const dailyData = [
      { date: '2023-01-02', price: 100 }, // 월
      { date: '2023-01-03', price: 100 },
      { date: '2023-01-04', price: 100 },
      { date: '2023-01-05', price: 100 },
      { date: '2023-01-06', price: 100 },
      { date: '2023-01-09', price: 100 }, // 월 (주말 건너뜀)
    ];

    it('DAILY cycle은 매 영업일마다 월간 불입금의 1/21을 투자해야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        initialPrincipal: 0,
        monthlyInstallment: 21000,
        cycle: 'DAILY',
        startDate: '2023-01-02',
        endDate: '2023-01-09',
      };

      const result = BacktestEngine.run(params, dailyData);
      // 6일 동안 매일 21000/21 = 1000원씩 투자 -> 6000원
      expect(result.metrics.totalPrincipal).toBe(6000);
    });

    it('WEEKLY cycle은 7일 간격으로 월간 불입금의 1/4을 투자해야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        initialPrincipal: 0,
        monthlyInstallment: 4000,
        cycle: 'WEEKLY',
        startDate: '2023-01-02',
        endDate: '2023-01-09',
      };

      const result = BacktestEngine.run(params, dailyData);
      // 1월 2일(첫날) 투자(1000원), 1월 9일(7일 후) 투자(1000원) -> 2000원
      expect(result.metrics.totalPrincipal).toBe(2000);
    });
  });

  describe('Fees and Taxes', () => {
    it('매수 수수료가 반영되어 최종 가치가 줄어들어야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        buyFeeRate: 0.01, // 1% 수수료
      };

      const result = BacktestEngine.run(params, sampleData);
      // 수수료 없을 때 1,210,000원이었음.
      // 1% 수수료 적용 시 초기 100만 -> 99만 투자됨 -> 99만 * 1.21 = 1,197,900원
      expect(result.metrics.finalValue).toBe(1197900);
    });

    it('ISA 계좌의 비과세 한도 초과 수익에 대해 세금이 적용되어야 한다', () => {
      const params: BacktestParams = {
        ...defaultParams,
        accountType: 'ISA',
        taxIsaLimit: 100000, // 10만 원 비과세
        taxIsaReducedRate: 0.1, // 10% 과세
      };

      const result = BacktestEngine.run(params, sampleData);
      // 수익 21만 원. 비과세 10만 원 제외 11만 원에 대해 10% 세금 -> 1.1만 원
      // 최종 가치 = 121만 - 1.1만 = 1,199,000원
      expect(result.metrics.finalValue).toBe(1199000);
    });
  });

  describe('Volatility Calculation', () => {
    it('연율화된 변동성을 올바르게 계산해야 한다', () => {
      // 일일 데이터 모사 (전부 1%씩 상승 시 변동성은 0)
      const steadyData = [
        { date: '2023-01-01', price: 100 },
        { date: '2023-01-02', price: 101 },
        { date: '2023-01-03', price: 102.01 },
        { date: '2023-01-04', price: 103.0301 },
      ];

      const params: BacktestParams = {
        ...defaultParams,
        startDate: '2023-01-01',
        endDate: '2023-01-04',
      };

      const result = BacktestEngine.run(params, steadyData);
      // 모든 수익률이 1%로 동일하므로 표준편차는 0
      expect(result.metrics.volatility).toBe(0);
    });

    it('변동이 있는 데이터에 대해 연율화된 변동성이 0보다 커야 한다', () => {
      const result = BacktestEngine.run(defaultParams, sampleData);
      expect(result.metrics.volatility).toBeGreaterThan(0);
    });
  });

  describe('Duration Limits', () => {
    it('DAILY cycle에서 30년이 넘는 데이터는 30년으로 제한해야 한다', () => {
      const manyYearsData = [];
      const startDate = '2000-01-01';
      // 35년 데이터 생성 (테스트 시간 단축을 위해 35년)
      for (let i = 0; i < 35 * 365; i += 10) { // 10일 간격으로 생성
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        manyYearsData.push({ date: d.toISOString().split('T')[0], price: 100 });
      }

      const params: BacktestParams = {
        ...defaultParams,
        cycle: 'DAILY',
        startDate: '2000-01-01',
        endDate: '2035-01-01',
      };

      const result = BacktestEngine.run(params, manyYearsData);
      
      const firstDate = new Date(result.history[0].date);
      const lastDate = new Date(result.history[result.history.length - 1].date);
      const diffYears = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      expect(diffYears).toBeLessThanOrEqual(30.5); 
    });

    it('일반 cycle에서 50년이 넘는 데이터는 50년으로 제한해야 한다', () => {
      const manyYearsData = [];
      const startDate = '1970-01-01';
      // 60년 데이터 생성
      for (let i = 0; i < 60 * 12; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        manyYearsData.push({ date: d.toISOString().split('T')[0], price: 100 });
      }

      const params: BacktestParams = {
        ...defaultParams,
        cycle: 'MONTHLY',
        startDate: '1970-01-01',
        endDate: '2030-01-01',
      };

      const result = BacktestEngine.run(params, manyYearsData);
      
      const firstDate = new Date(result.history[0].date);
      const lastDate = new Date(result.history[result.history.length - 1].date);
      const diffYears = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      expect(diffYears).toBeLessThanOrEqual(50.5);
    });
  });
});
