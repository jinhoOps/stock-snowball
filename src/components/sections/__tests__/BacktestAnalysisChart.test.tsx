// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BacktestAnalysisChart, { type BacktestAnalysisChartProps } from '../BacktestAnalysisChart';
import type { BacktestDisplaySeries } from '../../charts/BacktestChart';
import type { SnowballScenarioData } from '../../charts/SnowballChart';
import type { MarketTrendOverlay } from '../../../core/MarketTrend';

vi.mock('../../charts/BacktestChart', () => ({
  default: ({ marketTrend }: { marketTrend?: MarketTrendOverlay }) => (
    <div data-testid="asset-chart" data-market-trend={marketTrend ? 'on' : 'off'} />
  ),
}));

vi.mock('../../charts/SnowballChart', () => ({
  default: ({ scenarios, onPointHover }: {
    scenarios: SnowballScenarioData[];
    onPointHover?: (selection: {
    date: Date;
    points: Array<{ id: string; name: string; value: number; color: string; pessimistic?: number; optimistic?: number }>;
  } | null) => void;
  }) => (
    <div data-testid="scenario-chart">
      <button
        type="button"
        onMouseEnter={() => onPointHover?.({
          date: new Date('2024-01-01T00:00:00Z'),
          points: scenarios.map((scenario) => ({
            id: scenario.id,
            name: scenario.name,
            value: scenario.points[0].value,
            color: scenario.color,
            pessimistic: scenario.points[0].pessimistic,
            optimistic: scenario.points[0].optimistic,
          })),
        })}
      >
        시나리오 포인트 호버
      </button>
    </div>
  ),
}));

afterEach(cleanup);

const assetSeries: BacktestDisplaySeries[] = [{
  assetId: 'SPY',
  targetMultiple: 1,
  color: '#1d1d1f',
  points: [{ date: '2024-01-01', value: 100, principal: 100 }],
}];

const scenarioSeries: SnowballScenarioData[] = [
  { id: 'active', name: '현재 백테스트', color: '#0066cc', points: [{ date: new Date('2024-01-01T00:00:00Z'), value: 100 }] },
  { id: 'saved', name: '저장 백테스트', color: '#1d1d1f', points: [{ date: new Date('2024-01-01T00:00:00Z'), value: 120, pessimistic: 0, optimistic: 140 }] },
];

const marketTrend: MarketTrendOverlay = {
  benchmarkId: 'SP500',
  ticker: '^GSPC',
  label: 'S&P 500',
  currency: 'USD',
  points: [{
    date: '2024-01-01',
    sourceDate: '2023-12-29',
    close: 100,
    sma20: null,
    sma60: null,
    indexedClose: 100,
    indexedSma20: null,
    indexedSma60: null,
  }],
};

const defaultProps: BacktestAnalysisChartProps = {
  primaryAsset: 'SPY',
  assetSeries,
  scenarioSeries,
  currency: 'USD',
  resultView: 'PORTFOLIO',
  valueBasis: 'NOMINAL',
  marketTrend,
};

const renderChart = (props: Partial<BacktestAnalysisChartProps> = {}) => render(
  <BacktestAnalysisChart {...defaultProps} {...props} />,
);

describe('BacktestAnalysisChart', () => {
  it('shows the asset chart alone and keeps market trend off by default', async () => {
    // Catches the production break where both charts mount or the market overlay is enabled initially.
    const user = userEvent.setup();
    renderChart();

    expect(screen.getByTestId('asset-chart').dataset.marketTrend).toBe('off');
    expect(screen.queryByTestId('scenario-chart')).toBeNull();
    expect(screen.getByRole('button', { name: '시장 추세' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('거치식과 적립식이 섞인 투자 결과 · 명목 기준')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '시장 추세' }));

    expect(screen.getByTestId('asset-chart').dataset.marketTrend).toBe('on');
    expect(screen.getByRole('button', { name: '시장 추세' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('replaces the asset chart with the saved-scenario chart', async () => {
    // Catches the production break where scenario comparison renders alongside asset detail.
    const user = userEvent.setup();
    renderChart();

    await user.click(screen.getByRole('button', { name: '저장 시나리오 비교' }));

    expect(screen.queryByTestId('asset-chart')).toBeNull();
    expect(screen.getByTestId('scenario-chart')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '시장 추세' })).toBeNull();

    await user.hover(screen.getByRole('button', { name: '시나리오 포인트 호버' }));
    expect(screen.getByRole('heading', { name: '경과 개월수 기준 상세' })).toBeTruthy();
    expect(screen.getByText('저장 백테스트').parentElement?.parentElement?.textContent).toContain('$120');
    expect(screen.getByText('$0 ~ $140')).toBeTruthy();
  });

  it.each([
    ['currency', { currency: 'KRW' as const }],
    ['value basis', { valueBasis: 'REAL' as const }],
    ['scenario series', {
      scenarioSeries: scenarioSeries.map((scenario) => ({
        ...scenario,
        points: scenario.points.map((point) => ({ ...point, value: point.value + 1 })),
      })),
    }],
  ])('clears hovered scenario details when the %s changes', async (_dependency, changedProps) => {
    // Catches the production break where a formatted hover snapshot survives changed display/source inputs.
    const user = userEvent.setup();
    const view = renderChart();

    await user.click(screen.getByRole('button', { name: '저장 시나리오 비교' }));
    await user.hover(screen.getByRole('button', { name: '시나리오 포인트 호버' }));
    expect(screen.getByRole('heading', { name: '경과 개월수 기준 상세' })).toBeTruthy();

    view.rerender(<BacktestAnalysisChart {...defaultProps} {...changedProps} />);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '경과 개월수 기준 상세' })).toBeNull();
    });
  });

  it('uses scenario identity for same-name detail cards', async () => {
    // Catches the production break where distinct scenarios with the same name produce duplicate React keys.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderChart({
      scenarioSeries: scenarioSeries.map((scenario) => ({ ...scenario, name: '동일 이름' })),
    });

    await user.click(screen.getByRole('button', { name: '저장 시나리오 비교' }));
    await user.hover(screen.getByRole('button', { name: '시나리오 포인트 호버' }));
    expect(screen.getAllByText('동일 이름')).toHaveLength(2);

    await waitFor(() => {
      expect(consoleError.mock.calls.some((args) => args.join(' ').includes('same key'))).toBe(false);
    });
    consoleError.mockRestore();
  });

  it('does not offer scenario comparison when only the active scenario exists', () => {
    // Catches the production break where a non-actionable saved-scenario control is shown.
    renderChart({ scenarioSeries: scenarioSeries.slice(0, 1) });

    expect(screen.queryByRole('button', { name: '저장 시나리오 비교' })).toBeNull();
    expect(screen.getByTestId('asset-chart')).toBeTruthy();
  });
});
