import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SimulationControls from '../SimulationControls';

describe('SimulationControls', () => {
  it('renders family duration presets for an exact selected leverage family', () => {
    const markup = renderToStaticMarkup(React.createElement(SimulationControls, {
      mode: 'BACKTEST',
      setMode: () => undefined,
      params: {
        principal: 10_000_000,
        contribution: 30_000,
        cycle: 'DAILY',
        assetType: 'QQQ',
        years: 10,
        rate: 0.08,
        accountType: 'GENERAL',
        inflationRate: 0.02,
        strategyType: 'FIXED',
        strategyIncreaseRate: 0.05,
        startDate: '2010-01-01',
        endDate: '2024-01-01',
      },
      onUpdate: () => undefined,
      currency: 'KRW',
      setCurrency: () => undefined,
      exchangeRate: 1450,
      onOpenAdvanced: () => undefined,
      selectedAssets: ['QQQ', 'QLD', 'TQQQ'],
    }));

    expect(markup).toContain('1년');
    expect(markup).toContain('3년');
    expect(markup).toContain('5년');
    expect(markup).toContain('10년');
    expect(markup).toContain('전체');
    expect(markup).not.toContain('YTD');
  });
});
