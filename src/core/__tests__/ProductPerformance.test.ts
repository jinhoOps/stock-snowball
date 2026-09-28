import { describe, expect, it } from 'vitest';
import { calculateProductPerformance, calculateProductPerformanceMetrics, getMaxDrawdownRecovery, getProductPeriodMetric } from '../ProductPerformance';

describe('calculateProductPerformance', () => {
  it('builds a total-return unit series independent of contributions', () => {
    const result = calculateProductPerformance([
      { date: '2024-01-02', price: 100, dividendYield: 0 },
      { date: '2024-01-03', price: 110, dividendYield: 0 },
      { date: '2024-01-04', price: 99, dividendYield: 0.01 },
    ], '2024-01-02', '2024-01-04');

    expect(result.points[0].value).toBe(100);
    expect(result.points.at(-1)?.value).toBeCloseTo(99.99, 6);
    expect(result.metrics.cumulativeReturn).toBeCloseTo(-0.0001, 6);
    expect(result.metrics.cagr).toBeNull();
    expect(result.metrics.mdd).toBeCloseTo(0.091, 3);
    expect(result.metrics.volatility).toBeCloseTo(2.14396968, 6);
  });

  it('filters inclusively and sorts a copy of the source data', () => {
    const data = [
      { date: '2024-01-04', price: 120, dividendYield: 0 },
      { date: '2024-01-03', price: 110, dividendYield: 0.01 },
      { date: '2024-01-02', price: 100, dividendYield: 0 },
      { date: '2024-01-01', price: 90, dividendYield: 0 },
    ];

    const result = calculateProductPerformance(data, '2024-01-02', '2024-01-03');

    expect(result.points.map((point) => point.date)).toEqual(['2024-01-02', '2024-01-03']);
    expect(result.points.at(-1)?.value).toBeCloseTo(111.1, 10);
    expect(data[0].date).toBe('2024-01-04');
  });

  it('rejects date ranges with fewer than two points', () => {
    expect(() => calculateProductPerformance([
      { date: '2024-01-02', price: 100, dividendYield: 0 },
    ], '2024-01-02', '2024-01-02')).toThrow(RangeError);
  });
});

it.each([90, 110])('does not annualize a six-day return ending at %s', (value) => {
  const result = calculateProductPerformanceMetrics([{ date: '2025-04-02', value: 100 }, { date: '2025-04-08', value }]);
  expect(result.cagr).toBeNull();
  expect(result.cumulativeReturn).toBeCloseTo(value / 100 - 1);
});

it('uses actual data dates and enables CAGR at a full calendar year', () => {
  const first = { date: '2025-04-02', value: 100 };
  expect(calculateProductPerformanceMetrics([first, { date: '2026-04-01', value: 110 }]).cagr).toBeNull();
  expect(calculateProductPerformanceMetrics([first, { date: '2026-04-02', value: 110 }]).cagr).toBeCloseTo(0.1, 3);
  expect(calculateProductPerformanceMetrics([{ date: '2024-02-29', value: 100 }, { date: '2025-02-28', value: 110 }]).cagr).toBeCloseTo(0.1, 3);
  expect(calculateProductPerformance([
    { date: '2025-04-02', price: 100, dividendYield: 0 },
    { date: '2025-04-08', price: 110, dividendYield: 0 },
  ], '2024-01-01', '2025-12-31').metrics.cagr).toBeNull();
});

it('does not emit a non-finite annualized result', () => {
  expect(calculateProductPerformanceMetrics([{ date: '2024-01-01', value: 1e-300 }, { date: '2025-01-01', value: 1e300 }]).cagr).toBeNull();
});

it('uses trough-to-end recovery for short periods without confusing it with total return', () => {
  const points = [{ date: '2025-04-02', value: 100 }, { date: '2025-04-04', value: 80 }, { date: '2025-04-08', value: 90 }];
  const metrics = calculateProductPerformanceMetrics(points);
  expect(metrics.cumulativeReturn).toBeCloseTo(-0.1);
  expect(metrics.mdd).toBeCloseTo(0.2);
  expect(getProductPeriodMetric(points, metrics)).toEqual({ kind: 'RECOVERY', value: 0.125 });
});

it('shows zero recovery when the last point is the low and rejects a zero denominator', () => {
  for (const [values, expected] of [[[100, 80, 80], 0], [[100, 0, 80], null]] as const) {
    const points = values.map((value, index) => ({ date: `2025-04-0${index + 2}`, value }));
    expect(getProductPeriodMetric(points, calculateProductPerformanceMetrics(points))).toEqual({ kind: 'RECOVERY', value: expected });
  }
});

it('retains CAGR for full-year periods', () => {
  const points = [{ date: '2024-04-02', value: 100 }, { date: '2025-04-02', value: 110 }];
  const metrics = calculateProductPerformanceMetrics(points);
  expect(getProductPeriodMetric(points, metrics)).toEqual({ kind: 'CAGR', value: metrics.cagr });
});

describe('getMaxDrawdownRecovery', () => {
  it('counts calendar days from the maximum drawdown peak to first full recovery', () => {
    const points = [
      { date: '2024-02-28', value: 100 },
      { date: '2024-02-29', value: 80 },
      { date: '2024-03-01', value: 95 },
      { date: '2024-03-04', value: 100 },
    ];
    expect(getMaxDrawdownRecovery(points)).toEqual({
      status: 'recovered', peakDate: '2024-02-28', troughDate: '2024-02-29',
      recoveryDate: '2024-03-04', calendarDays: 5,
    });
  });

  it('reports elapsed days through the last observation when the old peak is not regained', () => {
    expect(getMaxDrawdownRecovery([
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-03', value: 70 },
      { date: '2025-01-08', value: 95 },
    ])).toEqual({
      status: 'unrecovered', peakDate: '2025-01-01', troughDate: '2025-01-03',
      lastDate: '2025-01-08', calendarDays: 7,
    });
  });

  it('selects the deepest episode even after an earlier drawdown recovered', () => {
    expect(getMaxDrawdownRecovery([
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 90 },
      { date: '2025-01-03', value: 110 },
      { date: '2025-01-06', value: 75 },
      { date: '2025-01-09', value: 110 },
    ])).toEqual({
      status: 'recovered', peakDate: '2025-01-03', troughDate: '2025-01-06',
      recoveryDate: '2025-01-09', calendarDays: 6,
    });
  });

  it('keeps the first episode when separate drawdowns are equally deep', () => {
    expect(getMaxDrawdownRecovery([
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 80 },
      { date: '2025-01-03', value: 100 },
      { date: '2025-01-06', value: 80 },
      { date: '2025-01-09', value: 100 },
    ])).toEqual({
      status: 'recovered', peakDate: '2025-01-01', troughDate: '2025-01-02',
      recoveryDate: '2025-01-03', calendarDays: 2,
    });
  });

  it('uses the last equal peak before a decline and does not treat rounding noise as a decline', () => {
    expect(getMaxDrawdownRecovery([
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 100 },
      { date: '2025-01-03', value: 90 },
      { date: '2025-01-04', value: 100 - 1e-11 },
    ])).toEqual({
      status: 'recovered', peakDate: '2025-01-02', troughDate: '2025-01-03',
      recoveryDate: '2025-01-04', calendarDays: 2,
    });
    expect(getMaxDrawdownRecovery([
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 100 - 1e-11 },
    ])).toEqual({ status: 'no-drawdown' });
  });

  it('distinguishes flat performance from insufficient observations', () => {
    expect(getMaxDrawdownRecovery([
      { date: '2025-01-01', value: 100 },
      { date: '2025-01-02', value: 105 },
    ])).toEqual({ status: 'no-drawdown' });
    expect(getMaxDrawdownRecovery([{ date: '2025-01-01', value: 100 }])).toEqual({ status: 'insufficient-data' });
  });

  it('uses only the supplied total-return points inside the selected range', () => {
    const product = calculateProductPerformance([
      { date: '2025-01-01', price: 200, dividendYield: 0 },
      { date: '2025-01-02', price: 100, dividendYield: 0 },
      { date: '2025-01-03', price: 80, dividendYield: 0 },
      { date: '2025-01-06', price: 80, dividendYield: 0.25 },
    ], '2025-01-02', '2025-01-06');
    expect(getMaxDrawdownRecovery(product.points)).toEqual({
      status: 'recovered', peakDate: '2025-01-02', troughDate: '2025-01-03',
      recoveryDate: '2025-01-06', calendarDays: 4,
    });
  });
});
