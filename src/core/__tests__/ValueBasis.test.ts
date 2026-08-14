import { describe, expect, it } from 'vitest';
import { findPointOnOrBefore } from '../../data/historicalAssets';
import {
  calculateSeriesCagr,
  getGoldBasisError,
  prepareBacktestDisplayResult,
  reconcilePortfolioHistoryFinalValue,
  transformPortfolioHistory,
  transformProductSeries,
  ValueBasisError,
} from '../ValueBasis';

describe('value-basis transforms', () => {
  const gold = [
    { date: '2024-01-02', price: 2000, dividendYield: 0 },
    { date: '2024-01-03', price: 4000, dividendYield: 0 },
  ];

  it('reconciles the final history value to the after-tax metric before basis conversion', () => {
    const history = [
      { date: '2024-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 121, principal: 100 },
    ];

    const reconciled = reconcilePortfolioHistoryFinalValue(history, 110);
    const real = transformPortfolioHistory(reconciled, 'REAL', { inflationRate: 0.1, gold: [] });

    expect(reconciled.at(-1)?.value).toBe(110);
    expect(real.at(-1)?.value).toBeCloseTo(99.9804310362, 8);
    expect(history.at(-1)?.value).toBe(121);
  });

  it('calculates CAGR from the transformed display series and handles invalid ranges', () => {
    const realSeries = [
      { date: '2024-01-01', value: 100 },
      { date: '2025-01-01', value: 99.98043103616163 },
    ];

    expect(calculateSeriesCagr(realSeries)).toBeCloseTo(-0.000195288674, 10);
    expect(calculateSeriesCagr(realSeries.slice(0, 1))).toBe(0);
    expect(calculateSeriesCagr([
      { date: '2024-01-01', value: 0 },
      { date: '2025-01-01', value: 100 },
    ])).toBe(0);
  });

  it('converts each contribution at its own gold factor', () => {
    const history = [
      { date: '2024-01-02', value: 100, principal: 100 },
      { date: '2024-01-03', value: 220, principal: 200 },
    ];

    expect(transformPortfolioHistory(history, 'GOLD', { inflationRate: 0, gold })[1]).toEqual({
      date: '2024-01-03',
      value: 110,
      principal: 150,
    });
    expect(history[1]).toEqual({ date: '2024-01-03', value: 220, principal: 200 });
  });

  it('uses the closest prior gold close and never looks ahead', () => {
    const sparseGold = [
      { date: '2024-01-02', price: 2000, dividendYield: 0 },
      { date: '2024-01-04', price: 2100, dividendYield: 0 },
    ];

    expect(findPointOnOrBefore(sparseGold, '2024-01-03')?.date).toBe('2024-01-02');
    expect(transformPortfolioHistory([
      { date: '2024-01-02', value: 100, principal: 100 },
      { date: '2024-01-03', value: 105, principal: 100 },
    ], 'GOLD', { inflationRate: 0, gold: sparseGold })[1]).toEqual({
      date: '2024-01-03',
      value: 105,
      principal: 100,
    });
  });

  it('deflates portfolio values and each contribution by elapsed real-value factors', () => {
    const history = [
      { date: '2024-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 220, principal: 200 },
    ];

    const result = transformPortfolioHistory(history, 'REAL', { inflationRate: 0.1, gold: [] });

    expect(result[1].value).toBeCloseTo(199.9608620723, 10);
    expect(result[1].principal).toBeCloseTo(190.891300942, 8);
  });

  it('leaves nominal product series unchanged without requiring gold data', () => {
    const points = [
      { date: '2024-01-02', value: 100 },
      { date: '2024-01-03', value: 110 },
    ];

    expect(transformProductSeries(points, 'NOMINAL', { inflationRate: 0.03, gold: [] })).toEqual(points);
    expect(points).toEqual([
      { date: '2024-01-02', value: 100 },
      { date: '2024-01-03', value: 110 },
    ]);
  });

  it('deflates a product series directly in real terms', () => {
    const result = transformProductSeries([
      { date: '2024-01-01', value: 100 },
      { date: '2025-01-01', value: 110 },
    ], 'REAL', { inflationRate: 0.1, gold: [] });

    expect(result[0].value).toBe(100);
    expect(result[1].value).toBeCloseTo(99.9804310361, 8);
  });

  it('converts a product series directly with the closest prior gold price', () => {
    const result = transformProductSeries([
      { date: '2024-01-02', value: 100 },
      { date: '2024-01-03', value: 120 },
    ], 'GOLD', {
      inflationRate: 0,
      gold: [
        { date: '2024-01-02', price: 2000, dividendYield: 0 },
        { date: '2024-01-04', price: 2400, dividendYield: 0 },
      ],
    });

    expect(result).toEqual([
      { date: '2024-01-02', value: 100 },
      { date: '2024-01-03', value: 120 },
    ]);
  });

  it('reports incomplete gold coverage and throws a typed error only for gold transforms', () => {
    const history = [{ date: '2024-01-01', value: 100, principal: 100 }];

    expect(getGoldBasisError('2024-01-01', '2024-01-03', gold)).toMatch(/2024-01-02/);
    expect(() => transformPortfolioHistory(history, 'GOLD', { inflationRate: 0, gold })).toThrow(ValueBasisError);
    expect(transformPortfolioHistory(history, 'NOMINAL', { inflationRate: 0, gold: [] })).toEqual(history);
  });

  it('reconciles once, transforms the full portfolio/product pipeline, and computes basis-consistent rates', () => {
    const portfolio = {
      history: [
        { date: '2024-01-01', value: 100, principal: 100 },
        { date: '2025-01-01', value: 121, principal: 100 },
      ],
      metrics: {
        totalReturn: 0.1, cagr: 0.1, irr: 0.1, mdd: 0, volatility: 0,
        finalValue: 110, totalPrincipal: 100, finalAnnualDividend: 0,
        estimatedTax: 11, totalFees: 0,
      },
    };
    const product = {
      points: [{ date: '2024-01-01', value: 100 }, { date: '2025-01-01', value: 110 }],
      metrics: { cumulativeReturn: 0.1, cagr: 0.1, mdd: 0, volatility: 0 },
    };

    const real = prepareBacktestDisplayResult(portfolio, product, 'REAL', {
      inflationRate: 0.1,
      gold: [],
    });
    expect(real.portfolioHistory.at(-1)?.value).toBeCloseTo(99.9804310362, 8);
    expect(real.portfolioIrr).toBeCloseTo(-0.000195288674, 10);
    expect(real.productPoints.at(-1)?.value).toBeCloseTo(99.9804310362, 8);
    expect(real.productMetrics.cagr).toBeCloseTo(-0.000195288674, 10);

    const goldResult = prepareBacktestDisplayResult(portfolio, product, 'GOLD', {
      inflationRate: 0,
      gold: [
        { date: '2024-01-01', price: 2_000, dividendYield: 0 },
        { date: '2025-01-01', price: 2_200, dividendYield: 0 },
      ],
    });
    expect(goldResult.portfolioHistory.at(-1)?.value).toBeCloseTo(100, 10);
    expect(goldResult.portfolioIrr).toBeCloseTo(0, 10);
    expect(goldResult.productPoints.at(-1)?.value).toBeCloseTo(100, 10);
    expect(goldResult.productMetrics.cagr).toBeCloseTo(0, 10);
  });
});
