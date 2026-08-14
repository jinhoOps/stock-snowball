import { describe, expect, it } from 'vitest';
import { calculateMoneyWeightedReturn } from '../MoneyWeightedReturn';

describe('dated portfolio money-weighted return', () => {
  it('uses the actual dates of irregular principal deltas', () => {
    const result = calculateMoneyWeightedReturn([
      { date: '2024-01-01', value: 100, principal: 100 },
      { date: '2024-07-01', value: 205, principal: 200 },
      { date: '2025-01-01', value: 214.94005284553214, principal: 200 },
    ]);

    expect(result).toBeCloseTo(0.1, 10);
  });

  it('returns stable values for empty, same-day, and fully liquidated histories', () => {
    expect(calculateMoneyWeightedReturn([])).toBe(0);
    expect(calculateMoneyWeightedReturn([
      { date: '2024-01-01', value: 100, principal: 100 },
    ])).toBe(0);
    expect(calculateMoneyWeightedReturn([
      { date: '2024-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 0, principal: 100, isLiquidated: true },
    ])).toBe(-1);
  });
});
