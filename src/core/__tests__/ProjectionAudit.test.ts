import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';
import type { FeeConfig, StrategyConfig, TaxConfig } from '../../types/finance';

const noTax: TaxConfig = {
  dividendTaxRate: 0, capitalGainTaxRate: 0,
  isaTaxFreeLimit: 2000000, isaReducedTaxRate: 0,
};
const noFees: FeeConfig = { buyFeeRate: 0, sellFeeRate: 0 };
const noContribution: StrategyConfig = { type: 'FIXED', baseAmount: 0 };

describe('Projection independent financial audit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 30, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('uses the stated annual effective return for a one-year investment', () => {
    const results = SnowballEngine.simulate(1000000, 0.1, 1, noContribution, 0, 'GENERAL', noTax, noFees);
    expect(results.at(-1)!.nominalValue).toBeCloseTo(1100000, 6);
  });

  it('discounts by the stated annual inflation factor', () => {
    const results = SnowballEngine.simulate(1100000, 0, 1, noContribution, 0.1, 'GENERAL', noTax, noFees);
    expect(results.at(-1)!.realValue).toBeCloseTo(1000000, 6);
    expect(SnowballEngine.calculateRealValue(1100000, 0.1, 365).toNumber()).toBeCloseTo(1000000, 6);
  });

  it('records a monthly contribution on the first, including the terminal date', () => {
    const results = SnowballEngine.simulate(0, 0, 1 / 365, { type: 'FIXED', baseAmount: 100, cycle: 'MONTHLY' }, 0, 'GENERAL', noTax, noFees, undefined, 1);
    expect(results[0].totalContribution).toBe(0);
    expect(results.at(-1)!.date.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(results.at(-1)!.totalContribution).toBe(100);
    expect(results.at(-1)!.nominalValue).toBe(100);
  });

  it('preserves the final date for a fractional number of years', () => {
    const results = SnowballEngine.simulate(1000000, 0, 0.5, noContribution, 0, 'GENERAL', noTax, noFees);
    const elapsed = (results.at(-1)!.date.getTime() - results[0].date.getTime()) / 86400000;
    expect(elapsed).toBe(Math.round(0.5 * 365));
  });

  it('keeps cash contributions at their historical FX cost', () => {
    const results = SnowballEngine.simulate(1000, 0, 1, noContribution, 0, 'GENERAL', noTax, noFees, { base: 1300, annualChangeRate: 0.1 });
    expect(results.at(-1)!.totalContribution).toBe(1300000);
    expect(results.at(-1)!.nominalValue).toBeCloseTo(1430000, 6);
    expect(results.at(-1)!.totalGains).toBeCloseTo(130000, 6);
  });

  it('reports purchase and sale fees in the same output currency', () => {
    const results = SnowballEngine.simulate(1000, 0, 0, noContribution, 0, 'GENERAL', noTax, { buyFeeRate: 0.01, sellFeeRate: 0.01 }, { base: 1300, annualChangeRate: 0 });
    expect(results[0].totalFees).toBeCloseTo(13000 + 12870, 6);
    expect(results[0].postTaxValue + results[0].totalFees).toBeCloseTo(1300000, 6);
  });

  it('retains sub-unit amounts until presentation', () => {
    const results = SnowballEngine.simulate(0.25, 0, 1, noContribution, 0, 'GENERAL', noTax, noFees);
    expect(results.at(-1)!.nominalValue).toBe(0.25);
    expect(results.at(-1)!.totalContribution).toBe(0.25);
  });

  it('represents a complete annual loss as zero value', () => {
    const results = SnowballEngine.simulate(1000000, -1, 1, noContribution, 0, 'GENERAL', noTax, noFees);
    expect(results.at(-1)!.nominalValue).toBe(0);
  });

  it('rejects invalid durations before simulation', () => {
    expect(() => SnowballEngine.simulate(100, 0, Number.NaN)).toThrow(RangeError);
  });

  it('uses the configured contribution as the default monthly value-averaging target', () => {
    const results = SnowballEngine.simulate(0, 0, 32 / 365, { type: 'VALUE_AVERAGING', baseAmount: 100 }, 0, 'GENERAL', noTax, noFees, undefined, 1);
    expect(results[1].totalContribution).toBe(100); // October 1
    expect(results.at(-1)!.totalContribution).toBe(200); // November 1
  });

  it('funds the value-averaging target after purchase fees', () => {
    const results = SnowballEngine.simulate(0, 0, 1 / 365, { type: 'VALUE_AVERAGING', baseAmount: 100 }, 0, 'GENERAL', noTax, { buyFeeRate: 0.01, sellFeeRate: 0 }, undefined, 1);
    expect(results.at(-1)!.nominalValue).toBeCloseTo(100, 8);
    expect(results.at(-1)!.totalContribution).toBeCloseTo(100 / 0.99, 8);
  });

  it('calculates cashflow-aware return independently of chart sampling', () => {
    const run = (intervalDays: number) => SnowballEngine.simulateRange(100, 0.1, 1, { type: 'FIXED', baseAmount: 1000, cycle: 'MONTHLY' }, 0, 'GENERAL', noTax, noFees, undefined, intervalDays);
    const daily = run(1);
    const monthly = run(30);
    expect(daily.irr).toBeCloseTo(0.1, 8);
    expect(monthly.irr).toBeCloseTo(daily.irr!, 10);
  });

  it('matches the illustrative square-root-of-time envelope from the first day', () => {
    const result = SnowballEngine.simulateRange(1000000, 0, 1 / 365, noContribution, 0, 'GENERAL', noTax, noFees, undefined, 1, 'CUSTOM');
    const offset = 0.2 * 1.645 * Math.sqrt(1 / 365);
    expect(result.optimistic.at(-1)!.nominalValue).toBeCloseTo(1000000 * Math.exp(offset), 6);
    expect(result.pessimistic.at(-1)!.nominalValue).toBeCloseTo(1000000 * Math.exp(-offset), 6);
  });

  it('applies the default ISA 9.9% rate above the 2 million allowance', () => {
    const results = SnowballEngine.simulate(3000000, 1, 1, noContribution, 0, 'ISA', undefined, noFees);
    expect(results.at(-1)!.estimatedTax).toBeCloseTo(99000, 6);
  });

  it('anchors the starting date to the local calendar day even near midnight', () => {
    vi.setSystemTime(new Date(2026, 8, 30, 0, 30));
    const result = SnowballEngine.simulate(100, 0, 0, noContribution, 0, 'GENERAL', noTax, noFees);
    expect(result[0].date.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  it.each(['DAILY', 'WEEKLY'] as const)('includes Monday at the end of a weekend for %s payments', cycle => {
    vi.setSystemTime(new Date(2026, 9, 2, 12)); // Friday
    const results = SnowballEngine.simulate(0, 0, 3 / 365, { type: 'FIXED', baseAmount: 100, cycle }, 0, 'GENERAL', noTax, noFees, undefined, 1);
    expect(results.map(point => point.totalContribution)).toEqual([0, 0, 0, 100]);
  });

  it('does not double-count the initial date when a simulation starts on the first', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 12));
    const results = SnowballEngine.simulate(1000, 0, 1, { type: 'FIXED', baseAmount: 100, cycle: 'MONTHLY' }, 0, 'GENERAL', noTax, noFees, undefined, 1);
    expect(results[0].totalContribution).toBe(1000);
    expect(results.at(-1)!.totalContribution).toBe(2200);
  });

  it('increases step-up payments when their date reaches the annual anniversary', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 12));
    const results = SnowballEngine.simulate(0, 0, 1, { type: 'STEP_UP', baseAmount: 100, increaseRate: 0.1, cycle: 'MONTHLY' }, 0, 'GENERAL', noTax, noFees, undefined, 1);
    expect(results.at(-1)!.totalContribution).toBe(11 * 100 + 110);
  });

  it.each([-0.9, 0, 0.08, 1])('reproduces an effective annual return of %s, including negative returns', rate => {
    const result = SnowballEngine.simulateRange(1000000, rate, 1, noContribution, 0, 'GENERAL', noTax, noFees);
    expect(result.average.at(-1)!.nominalValue).toBeCloseTo(1000000 * (1 + rate), 6);
    expect(result.irr).toBeCloseTo(rate, 8);
    expect(result.pessimistic.at(-1)!.nominalValue).toBeGreaterThanOrEqual(0);
    expect(result.pessimistic.at(-1)!.nominalValue).toBeLessThanOrEqual(result.average.at(-1)!.nominalValue);
    expect(result.optimistic.at(-1)!.nominalValue).toBeGreaterThanOrEqual(result.average.at(-1)!.nominalValue);
  });

  it('keeps an empty investment finite and zero in every scenario', () => {
    const result = SnowballEngine.simulateRange(0, 0.1, 1, noContribution, 0, 'GENERAL', noTax, noFees);
    expect(result.irr).toBe(0);
    for (const series of [result.average, result.pessimistic, result.optimistic]) {
      expect(series.every(point => point.nominalValue === 0 && point.totalContribution === 0 && point.estimatedTax === 0)).toBe(true);
    }
  });

  it('treats the legacy series daily contribution as one payment per weekday', () => {
    const result = SnowballEngine.generateSeries(0, 0, 1 / 365, 100, 1);
    expect(result.at(-1)!.value).toBeCloseTo(100 * (1 - 0.00015), 8);
  });
});
