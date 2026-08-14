import { describe, expect, it } from 'vitest';
import { findClosestPointOnOrBefore } from '../BacktestChart';

describe('BacktestChart date alignment', () => {
  it('uses the closest prior point without looking ahead', () => {
    const points = [
      { date: '2024-01-02', value: 100 },
      { date: '2024-01-04', value: 104 },
    ];

    expect(findClosestPointOnOrBefore(points, '2024-01-03')).toEqual(points[0]);
    expect(findClosestPointOnOrBefore(points, '2024-01-01')).toBeNull();
  });
});
