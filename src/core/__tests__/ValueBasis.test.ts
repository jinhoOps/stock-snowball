import { describe, expect, it } from 'vitest';
import { findPointOnOrBefore } from '../../data/historicalAssets';
import {
  getGoldBasisError,
  transformPortfolioHistory,
  transformProductSeries,
  ValueBasisError,
} from '../ValueBasis';

describe('value-basis transforms', () => {
  const gold = [
    { date: '2024-01-02', price: 2000, dividendYield: 0 },
    { date: '2024-01-03', price: 4000, dividendYield: 0 },
  ];

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

  it('reports incomplete gold coverage and throws a typed error only for gold transforms', () => {
    const history = [{ date: '2024-01-01', value: 100, principal: 100 }];

    expect(getGoldBasisError('2024-01-01', '2024-01-03', gold)).toMatch(/2024-01-02/);
    expect(() => transformPortfolioHistory(history, 'GOLD', { inflationRate: 0, gold })).toThrow(ValueBasisError);
    expect(transformPortfolioHistory(history, 'NOMINAL', { inflationRate: 0, gold: [] })).toEqual(history);
  });
});
