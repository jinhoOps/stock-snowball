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

  it('keeps every scenario unchanged in version 6, which only adds optional excluded crashes', () => {
    const doc = { id: 'a', simulationMode: 'PROJECTION', assetType: 'TQQQ', annualRate: 0.1 };
    expect(scenarioMigrationStrategies[6](doc as never)).toEqual(doc);
  });
});
