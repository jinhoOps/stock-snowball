import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';

describe('SnowballEngine Projection', () => {
  it('should result in identical smooth growth when using the same rate regardless of assetTypes', () => {
    const principal = 10000000;
    const rate = 0.08;
    const years = 5;
    
    // In the new implementation, assetType in simulateRange doesn't affect growth movement
    const customResult = SnowballEngine.simulate(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL', undefined, undefined, undefined, 365, 'CUSTOM');
    const qqqmResult = SnowballEngine.simulate(principal, rate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL', undefined, undefined, undefined, 365, 'QQQM');

    const lastCustom = customResult[customResult.length - 1].nominalValue;
    const lastQQQM = qqqmResult[qqqmResult.length - 1].nominalValue;

    // Both should be identical as they use the same CAGR (0.08) and smooth growth
    expect(lastCustom).toBe(lastQQQM);
  });
});
