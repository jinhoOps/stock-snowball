import { describe, expect, it } from 'vitest';
import { getHistoricalCoverage } from '../../../data/historicalAssets';
import {
  getDurationPresets,
  HISTORICAL_SCENARIOS,
  isPresetSupported,
} from '../ScenarioPresetPicker';

describe('asset-aware backtest presets', () => {
  it('ends rolling presets on the selected asset latest trading day', () => {
    const coverage = getHistoricalCoverage('QQQM');
    const ytd = getDurationPresets(coverage).find((preset) => preset.name === 'YTD');

    expect(ytd?.endDate).toBe(coverage.endDate);
  });

  it('rejects historical presets that are not completely covered', () => {
    const qqqmCoverage = getHistoricalCoverage('QQQM');
    const dotCom = HISTORICAL_SCENARIOS.find((preset) => preset.name === 'Dot-com Crash')!;

    expect(isPresetSupported(dotCom, qqqmCoverage)).toBe(false);
  });
});
