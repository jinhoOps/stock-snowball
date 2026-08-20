import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SimulationControls from '../SimulationControls';

describe('SimulationControls', () => {
  const baseProjectionProps = {
    mode: 'PROJECTION' as const,
    setMode: () => undefined,
    params: {
      principal: 10_000_000,
      contribution: 30_000,
      cycle: 'DAILY' as const,
      assetType: 'QQQ' as const,
      years: 10,
      rate: 0.08,
      accountType: 'GENERAL' as const,
      inflationRate: 0.02,
      strategyType: 'FIXED' as const,
      strategyIncreaseRate: 0.05,
      startDate: '2010-01-01',
      endDate: '2024-01-01',
    },
    onUpdate: () => undefined,
    currency: 'KRW' as const,
    setCurrency: () => undefined,
    exchangeRate: 1450,
    onOpenAdvanced: () => undefined,
    selectedAssets: ['QQQ' as const],
  };

  it('keeps projection input controls visually aligned', () => {
    const markup = renderToStaticMarkup(React.createElement(SimulationControls, baseProjectionProps));

    expect(markup).toContain('id="principal-input"');
    expect(markup).toContain('id="monthly-investment-input"');
    expect(markup).toContain('id="years-number"');
    expect(markup).toContain('class="mb-3 flex h-6 w-full items-center px-2"');
    expect(markup).toContain('class="relative mb-3 flex h-6 w-full items-center px-2"');
    expect(markup).toContain('absolute right-2 top-1/2 flex -translate-y-1/2');
    expect(markup).toContain('flex h-12 min-h-12 flex-1 items-center rounded-pill border border-apple-hairline bg-apple-canvas px-4');
  });

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
