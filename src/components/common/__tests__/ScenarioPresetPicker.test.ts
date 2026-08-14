import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getHistoricalCoverage } from '../../../data/historicalAssets';
import { getFamilyDurationPresets, LEVERAGE_FAMILIES } from '../../../data/leverageFamilies';
import {
  default as ScenarioPresetPicker,
  getDurationPresets,
  HISTORICAL_SCENARIOS,
  isPresetSupported,
} from '../ScenarioPresetPicker';

describe('asset-aware backtest presets', () => {
  it('ends rolling presets on the selected asset latest trading day', () => {
    const coverage = getHistoricalCoverage('QQQ');
    const ytd = getDurationPresets(coverage).find((preset) => preset.name === 'YTD');

    expect(ytd?.endDate).toBe(coverage.endDate);
  });

  it('rejects historical presets that are not completely covered', () => {
    const amdlCoverage = getHistoricalCoverage('AMDL');
    const dotCom = HISTORICAL_SCENARIOS.find((preset) => preset.name === 'Dot-com Crash')!;

    expect(isPresetSupported(dotCom, amdlCoverage)).toBe(false);
  });

  it('renders family durations instead of general historical presets', () => {
    const familyPresets = getFamilyDurationPresets(LEVERAGE_FAMILIES.AMD, getHistoricalCoverage);
    const markup = renderToStaticMarkup(React.createElement(ScenarioPresetPicker, {
      coverage: getHistoricalCoverage('AMD'),
      onSelect: () => undefined,
      familyPresets,
    }));

    expect(markup).toContain('1년');
    expect(markup).toContain('3년');
    expect(markup).toContain('5년');
    expect(markup).toContain('10년');
    expect(markup).toContain('전체');
    expect(markup).not.toContain('YTD');
  });

  it('visibly explains disabled family periods and associates the reason', () => {
    const familyPresets = getFamilyDurationPresets(LEVERAGE_FAMILIES.AMD, getHistoricalCoverage);
    const markup = renderToStaticMarkup(React.createElement(ScenarioPresetPicker, {
      coverage: getHistoricalCoverage('AMD'),
      onSelect: () => undefined,
      familyPresets,
    }));

    expect(markup).toContain('aria-describedby="family-preset-disabled-reason"');
    expect(markup).toMatch(
      /<p[^>]*id="family-preset-disabled-reason"[^>]*>AMDL 데이터는 2024-03-18부터 사용할 수 있습니다.<\/p>/,
    );
  });
});
