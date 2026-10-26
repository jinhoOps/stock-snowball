import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_BLOCK_DAYS, createBlockBootstrap, createNormalSource, smoothInLogSpace, sortedQuantile } from '../MonteCarlo';

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

  it('resamples a history centred on zero, the same way for the same seed', () => {
    const history = Array.from({ length: 1000 }, (_, index) => (index % 3 === 0 ? -0.02 : 0.015));
    const first = createBlockBootstrap(history, 2, 7);
    const second = createBlockBootstrap(history, 2, 7);
    const draws = Array.from({ length: 200 }, () => first(0, 21));
    expect(Array.from({ length: 200 }, () => second(0, 21))).toEqual(draws);
    // Many one-year draws average to about zero: growth is set by the caller.
    const yearly = Array.from({ length: 2000 }, () => first(1, 252));
    expect(Math.abs(yearly.reduce((sum, value) => sum + value, 0) / yearly.length)).toBeLessThan(0.01);
  });

  it('walks consecutive historical days inside a block, then jumps', () => {
    // Each day's log return is its own index × 1e-6, so a draw tells which day it was.
    const count = 1000;
    const history = Array.from({ length: count }, (_, index) => Math.expm1(index * 1e-6));
    const draw = createBlockBootstrap(history, 1, 11);
    const days = Array.from({ length: BOOTSTRAP_BLOCK_DAYS * 3 }, () => Math.round(draw(0, 1) / 1e-6 + (count - 1) / 2));
    for (let index = 1; index < days.length; index++) {
      const step = (days[index] - days[index - 1] + count) % count;
      if (index % BOOTSTRAP_BLOCK_DAYS !== 0) expect(step).toBe(1);
    }
    // A multi-day draw is the same days summed.
    const again = createBlockBootstrap(history, 1, 11);
    const summed = again(0, 10);
    const singles = createBlockBootstrap(history, 1, 11);
    expect(summed).toBeCloseTo(Array.from({ length: 10 }, () => singles(0, 1)).reduce((sum, value) => sum + value, 0), 12);
  });

  it('rejects an empty or impossible history', () => {
    expect(() => createBlockBootstrap([], 2)).toThrow(RangeError);
    expect(() => createBlockBootstrap([-1], 2)).toThrow(RangeError);
  });
});
