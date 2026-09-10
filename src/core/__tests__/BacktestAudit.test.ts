import { describe, expect, it } from 'vitest';
import { BacktestEngine } from '../BacktestEngine';
import type { BacktestParams } from '../../types/finance';

const params: BacktestParams = {
  initialPrincipal: 100,
  monthlyInstallment: 0,
  cycle: 'MONTHLY',
  startDate: '2024-01-02',
  endDate: '2025-01-02',
  reinvestDividends: true,
  assetId: 'SPY',
  accountType: 'GENERAL',
  buyFeeRate: 0,
  sellFeeRate: 0,
  taxDividendRate: 0,
  taxCapitalGainRate: 0,
  taxIsaLimit: 0,
  taxIsaReducedRate: 0,
};

describe('Backtest accounting regressions', () => {
  it('does not grant the starting ex-date dividend to newly purchased shares', () => {
    const result = BacktestEngine.run(params, [
      { date: '2024-01-02', price: 100, dividendYield: 0.1 },
      { date: '2025-01-02', price: 100 },
    ]);
    expect(result.metrics.finalValue).toBe(100);
    expect(result.metrics.irr).toBe(0);
  });

  it.each([
    { reinvestDividends: true, finalValue: 600 },
    { reinvestDividends: false, finalValue: 580 },
  ])('credits only preexisting shares and retains dividend value ($reinvestDividends)', ({ reinvestDividends, finalValue }) => {
    const result = BacktestEngine.run({ ...params, monthlyInstallment: 100, reinvestDividends }, [
      { date: '2024-01-31', price: 100 },
      { date: '2024-02-01', price: 90, dividendYield: 10 / 90 },
      { date: '2024-02-02', price: 180 },
    ]);
    // Two old shares earn $20; the new $100 contribution earns no dividend.
    expect(result.history[1].value).toBeCloseTo(300, 10);
    expect(result.metrics.finalValue).toBeCloseTo(finalValue, 10);
    expect(result.metrics.totalPrincipal).toBe(300);
  });

  it('keeps fractional money and fees in records and the dated return calculation', () => {
    const result = BacktestEngine.run({ ...params, initialPrincipal: 0.49, buyFeeRate: 0.01 }, [
      { date: '2024-01-02', price: 100 },
      { date: '2025-01-02', price: 110 },
    ]);
    expect(result.history[0].principal).toBe(0.49);
    expect(result.metrics.totalFees).toBe(0.0049);
    expect(result.metrics.finalValue).toBeCloseTo(0.53361, 12);
    expect(result.metrics.totalReturn).toBeCloseTo(0.089, 6);
    expect(result.metrics.irr).toBeCloseTo(0.08881, 5);
  });

  it('continues scheduled purchases through a deep drawdown and recovery', () => {
    const result = BacktestEngine.run({ ...params, monthlyInstallment: 1 }, [
      { date: '2024-01-02', price: 100 },
      { date: '2024-02-01', price: 0.001 },
      { date: '2024-03-01', price: 100 },
    ]);
    expect(result.metrics.totalPrincipal).toBe(103);
    expect(result.metrics.finalValue).toBeCloseTo(100102, 8);
    expect(result.history.some((point) => point.isLiquidated)).toBe(false);
  });

  it('excludes contributions from the legacy CAGR metric', () => {
    const result = BacktestEngine.run({ ...params, monthlyInstallment: 100 }, [
      { date: '2024-01-02', price: 100 },
      { date: '2025-01-02', price: 100 },
    ]);
    expect(result.metrics.cagr).toBe(0);
  });

  it('includes unreinvested cash in unit returns and drawdown', () => {
    const result = BacktestEngine.run({ ...params, reinvestDividends: false }, [
      { date: '2024-01-02', price: 100 },
      { date: '2024-06-03', price: 90, dividendYield: 10 / 90 },
      { date: '2025-01-02', price: 90 },
    ]);
    expect(result.metrics.finalValue).toBeCloseTo(100, 10);
    expect(result.metrics.cagr).toBe(0);
    expect(result.metrics.mdd).toBe(0);
    expect(result.metrics.volatility).toBe(0);
  });

  it('estimates annual dividends from trailing distributions, even on a non-dividend end date', () => {
    const result = BacktestEngine.run({ ...params, reinvestDividends: false }, [
      { date: '2024-01-02', price: 100, dividendYield: 0.5 }, // outside trailing year
      { date: '2024-04-02', price: 100, dividendYield: 0.01 },
      { date: '2024-07-02', price: 100, dividendYield: 0.02 },
      { date: '2024-10-02', price: 100, dividendYield: 0.03 },
      { date: '2025-01-02', price: 100 },
    ]);
    expect(result.metrics.finalAnnualDividend).toBeCloseTo(6, 10);
  });

  it('returns the same after-tax terminal value in history and metrics', () => {
    const result = BacktestEngine.run({ ...params, accountType: 'ISA', taxIsaReducedRate: 0.1 }, [
      { date: '2024-01-02', price: 100 },
      { date: '2025-01-02', price: 120.15 },
    ]);
    expect(result.metrics.estimatedTax).toBeCloseTo(2.015, 10);
    expect(result.metrics.finalValue).toBeCloseTo(118.135, 10);
    expect(result.history.at(-1)!.value).toBe(result.metrics.finalValue);
  });
});
