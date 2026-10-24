import { describe, expect, it } from 'vitest';
import { createNormalSource, smoothInLogSpace, sortedQuantile } from '../MonteCarlo';

describe('MonteCarlo helpers', () => {
  it('draws the same standard normals from the same seed', () => {
    const first = createNormalSource(42);
    const second = createNormalSource(42);
    const draws = Array.from({ length: 20000 }, () => first());
    expect(Array.from({ length: 5 }, () => second())).toEqual(draws.slice(0, 5));
    const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
    const variance = draws.reduce((sum, value) => sum + (value - mean) ** 2, 0) / draws.length;
    expect(mean).toBeCloseTo(0, 1);
    expect(variance).toBeCloseTo(1, 1);
  });

  it('interpolates quantiles between sorted values', () => {
    const sorted = Float64Array.from([10, 20, 30, 40, 50]);
    expect(sortedQuantile(sorted, 0)).toBe(10);
    expect(sortedQuantile(sorted, 0.5)).toBe(30);
    expect(sortedQuantile(sorted, 0.1)).toBeCloseTo(14, 10);
    expect(sortedQuantile(sorted, 1)).toBe(50);
  });

  it('smooths jitter in log space but keeps the ends and a steady curve as sampled', () => {
    const steady = [1, 2, 4, 8, 16, 32];
    expect(smoothInLogSpace(steady, 2).map((value) => Number(value.toFixed(9)))).toEqual(steady);

    const jittery = [100, 120, 100, 120, 100, 120, 100];
    const smoothed = smoothInLogSpace(jittery, 2);
    expect(smoothed[0]).toBe(100);
    expect(smoothed.at(-1)).toBe(100);
    expect(Math.max(...smoothed.slice(2, -2)) - Math.min(...smoothed.slice(2, -2))).toBeLessThan(5);
    expect(smoothInLogSpace([0, 0, 0], 2)).toEqual([0, 0, 0]);
  });
});
