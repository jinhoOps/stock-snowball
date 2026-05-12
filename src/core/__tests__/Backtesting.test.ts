import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';

describe('SnowballEngine Backtesting', () => {
  it('should result in different values when using different assetTypes', () => {
    const principal = 10000000;
    const rate = 0.08;
    const years = 5;
    
    const customResult = SnowballEngine.simulate(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL', undefined, undefined, undefined, 365, 'CUSTOM');
    const qqqmResult = SnowballEngine.simulate(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL', undefined, undefined, undefined, 365, 'QQQM');
    const tqqqResult = SnowballEngine.simulate(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL', undefined, undefined, undefined, 365, 'TQQQ');

    const lastCustom = customResult[customResult.length - 1].nominalValue;
    const lastQQQM = qqqmResult[qqqmResult.length - 1].nominalValue;
    const lastTQQQ = tqqqResult[tqqqResult.length - 1].nominalValue;

    expect(lastCustom).not.toBe(lastQQQM);
    expect(lastTQQQ).not.toBe(lastQQQM);
    // TQQQ (3x) should typically be higher or significantly different due to random mock returns
    expect(Math.abs(lastTQQQ - lastQQQM)).toBeGreaterThan(0);
  });
});
