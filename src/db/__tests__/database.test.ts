import { describe, expect, it } from 'vitest';
import { scenarioMigrationStrategies } from '../database';

describe('RxDB scenario migration boundary', () => {
  it('migrates QQQM and safely defaults an unknown asset in version 5', () => {
    const migrate = scenarioMigrationStrategies[5];

    expect(migrate({ simulationMode: 'BACKTEST', assetType: 'QQQM' } as never)).toMatchObject({
      assetType: 'QQQ',
    });
    expect(migrate({ simulationMode: 'BACKTEST', assetType: 'CORRUPT' } as never)).toMatchObject({
      assetType: 'SPY',
    });
  });
});
