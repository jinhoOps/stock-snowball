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

  it('does not report zero when the NPV lower bound overflows over 50 years', () => {
    // 1975-01-01 to 2025-01-01 is 18,263 calendar days.
    const result = calculateMoneyWeightedReturn([
      { date: '1975-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 100 * 1.1 ** (18263 / 365.25), principal: 100 },
    ]);
    expect(result).toBeCloseTo(0.1, 10);
  });

  it('resolves losses over 50 years without overflowing the search bracket', () => {
    const result = calculateMoneyWeightedReturn([
      { date: '1975-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 100 * 0.98 ** (18263 / 365.25), principal: 100 },
    ]);
    expect(result).toBeCloseTo(-0.02, 10);
  });

  it('annualizes sharp one-day losses instead of returning a false zero', () => {
    const result = calculateMoneyWeightedReturn([
      { date: '2026-09-01', value: 100, principal: 100 },
      { date: '2026-09-02', value: 94, principal: 100 },
    ]);
    expect(result).toBeCloseTo(Math.expm1(Math.log(0.94) * 365.25), 13);
  });

  it('annualizes a one-day gain beyond the former arbitrary search cap', () => {
    const result = calculateMoneyWeightedReturn([
      { date: '2026-09-01', value: 100, principal: 100 },
      { date: '2026-09-02', value: 104, principal: 100 },
    ]);
    expect(result! / Math.expm1(Math.log(1.04) * 365.25)).toBeCloseTo(1, 10);
  });

  it('does not call terminal-only funding a total investment loss', () => {
    expect(calculateMoneyWeightedReturn([
      { date: '2026-09-01', value: 0, principal: 0 },
      { date: '2026-09-02', value: 99.97, principal: 100 },
    ])).toBeNull();
  });

  it('marks annualized returns beyond finite numeric range unavailable', () => {
    expect(calculateMoneyWeightedReturn([
      { date: '2026-09-01', value: 1, principal: 1 },
      { date: '2026-09-02', value: 100, principal: 1 },
    ])).toBeNull();
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
