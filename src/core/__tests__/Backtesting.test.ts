import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';
import { BacktestEngine } from '../BacktestEngine';
import { getHistoricalData } from '../../data/historicalAssets';
import { AssetType, BacktestParams } from '../../types/finance';

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

describe('Multi-Asset Backtesting Logic', () => {
  it('should run backtests for multiple assets with same parameters', () => {
    const assets: AssetType[] = ['SPY', 'QQQM', 'SCHD'];
    const baseParams: Omit<BacktestParams, 'assetId'> = {
      initialPrincipal: 10000000,
      monthlyInstallment: 1000000,
      cycle: 'MONTHLY',
      startDate: '2015-01-01',
      endDate: '2024-01-01',
      reinvestDividends: true,
      accountType: 'GENERAL',
      buyFeeRate: 0.00015,
      sellFeeRate: 0.00015,
      taxDividendRate: 0.154,
      taxCapitalGainRate: 0.22,
      taxIsaLimit: 2000000,
      taxIsaReducedRate: 0.095,
    };

    const results = assets.map(assetId => {
      const data = getHistoricalData(assetId);
      return {
        assetId,
        result: BacktestEngine.run({ ...baseParams, assetId }, data)
      };
    });

    expect(results).toHaveLength(3);
    results.forEach(r => {
      expect(r.result.history.length).toBeGreaterThan(0);
      expect(r.result.metrics.finalValue).toBeGreaterThan(0);
    });
    
    // Check that results are different
    expect(results[0].result.metrics.finalValue).not.toBe(results[1].result.metrics.finalValue);
  });
});
