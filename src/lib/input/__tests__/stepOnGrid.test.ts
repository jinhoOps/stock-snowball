import { describe, expect, it } from 'vitest';
import { amountStep, presetAmountLabel, stepAmount, stepOnGrid } from '../stepOnGrid';

describe('stepOnGrid', () => {
  it('lands on the grid from an off-grid value', () => {
    expect(stepOnGrid(32_500, 5_000, 1)).toBe(35_000);
    expect(stepOnGrid(32_500, 5_000, -1)).toBe(30_000);
    expect(stepOnGrid(30_000, 5_000, 1)).toBe(35_000);
    expect(stepOnGrid(30_000, 5_000, -1)).toBe(25_000);
  });

  it('keeps decimal steps clean', () => {
    expect(stepOnGrid(7, 0.5, 1)).toBe(7.5);
    expect(stepOnGrid(7.3, 0.5, 1)).toBe(7.5);
    expect(stepOnGrid(7.3, 0.5, -1)).toBe(7);
    expect(stepOnGrid(0.1 + 0.2, 0.1, 1)).toBe(0.4);
    expect(stepOnGrid(0, 0.5, -1)).toBe(-0.5);
  });
});

describe('stepAmount', () => {
  it('moves by about a tenth on a 1·2·5 ladder', () => {
    expect(amountStep(30_000, 1_000)).toBe(2_000);
    expect(amountStep(50_000, 1_000)).toBe(5_000);
    expect(amountStep(1_000_000, 1_000)).toBe(100_000);
    expect(amountStep(3_000, 1_000)).toBe(1_000);
    expect(amountStep(0, 1)).toBe(1);
  });

  it('returns to the start after one tap up and one tap down', () => {
    for (const start of [1_000, 19_000, 20_000, 30_000, 48_000, 50_000, 300_000, 1_000_000]) {
      expect(stepAmount(stepAmount(start, 1, 'KRW'), -1, 'KRW')).toBe(start);
    }
    for (const start of [1, 9, 10, 20, 100, 1_000]) {
      expect(stepAmount(stepAmount(start, 1, 'USD'), -1, 'USD')).toBe(start);
    }
  });

  it('steps down across a size boundary with the smaller step', () => {
    expect(stepAmount(50_000, -1, 'KRW')).toBe(48_000);
    expect(stepAmount(20_000, -1, 'KRW')).toBe(19_000);
    expect(stepAmount(1_000_000, -1, 'KRW')).toBe(950_000);
  });

  it('never goes below zero and starts again from the smallest step', () => {
    expect(stepAmount(1_000, -1, 'KRW')).toBe(0);
    expect(stepAmount(0, -1, 'KRW')).toBe(0);
    expect(stepAmount(0, 1, 'KRW')).toBe(1_000);
    expect(stepAmount(0, 1, 'USD')).toBe(1);
  });

  it('snaps a converted amount like $22.61 onto the grid', () => {
    expect(stepAmount(22.61, 1, 'USD')).toBe(24);
    expect(stepAmount(22.61, -1, 'USD')).toBe(22);
  });
});

it('labels presets in the units people say aloud', () => {
  expect(presetAmountLabel(30_000, 'KRW')).toBe('3만');
  expect(presetAmountLabel(1_000_000, 'KRW')).toBe('100만');
  expect(presetAmountLabel(1_000, 'USD')).toBe('$1,000');
});
