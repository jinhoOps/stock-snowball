import { describe, expect, it } from 'vitest';
import { resetBacktestSelection } from '../App';

describe('backtest parent selection', () => {
  it('clears comparisons with the default backtest selection on reset', () => {
    expect(resetBacktestSelection()).toMatchObject({
      params: { assetType: 'SPY' },
      comparisonAssets: [],
    });
  });
});
