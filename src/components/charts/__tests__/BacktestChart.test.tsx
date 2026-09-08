// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BacktestChart, {
  BacktestChartInner,
  findClosestPointOnOrBefore,
  formatBacktestTooltipDate,
  resolveBacktestTooltip,
  type BacktestDisplaySeries,
} from '../BacktestChart';
import { transformPortfolioHistory } from '../../../core/ValueBasis';
import type { MarketTrendOverlay } from '../../../core/MarketTrend';

const series: BacktestDisplaySeries[] = [
  {
    assetId: 'QQQ',
    targetMultiple: 1,
    color: '#111111',
    points: [
      { date: '2024-01-02', value: 100, principal: 100 },
      { date: '2024-01-04', value: 104, principal: 100 },
    ],
  },
  {
    assetId: 'TQQQ',
    targetMultiple: 3,
    color: '#0077cc',
    points: [
      { date: '2024-01-02', value: 100, principal: 100 },
      { date: '2024-01-05', value: 115, principal: 100 },
    ],
  },
];

const marketSeries: BacktestDisplaySeries[] = [
  {
    assetId: 'QQQ',
    targetMultiple: 1,
    color: '#111111',
    points: [
      { date: '2024-01-05', value: 100, principal: 1_000 },
      { date: '2024-01-09', value: 102, principal: 1_000 },
      { date: '2024-01-12', value: 110, principal: 1_000 },
    ],
  },
];

const marketTrend: MarketTrendOverlay = {
  benchmarkId: 'NASDAQ100',
  ticker: '^NDX',
  label: '나스닥100',
  currency: 'USD',
  points: [
    {
      date: '2024-01-05',
      sourceDate: '2024-01-05',
      close: 16_400.25,
      sma20: 16_100.5,
      sma60: null,
      indexedClose: 100,
      indexedSma20: 98.17,
      indexedSma60: null,
    },
    {
      date: '2024-01-12',
      sourceDate: '2024-01-12',
      close: 16_850.75,
      sma20: 16_250.25,
      sma60: 15_900.5,
      indexedClose: 102.75,
      indexedSma20: 99.09,
      indexedSma60: 96.95,
    },
  ],
};

const firstPathY = (path: SVGPathElement): number => {
  const match = path.getAttribute('d')?.match(/^M[^,]+,([\d.-]+)/);
  if (!match) throw new Error(`Expected a path beginning with an M coordinate, received ${path.getAttribute('d')}`);
  return Number(match[1]);
};

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => vi.stubGlobal('ResizeObserver', TestResizeObserver));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BacktestChart date alignment', () => {
  it('uses the closest prior point without looking ahead', () => {
    const points = [
      { date: '2024-01-02', value: 100 },
      { date: '2024-01-04', value: 104 },
    ];

    expect(findClosestPointOnOrBefore(points, '2024-01-03')).toEqual(points[0]);
    expect(findClosestPointOnOrBefore(points, '2024-01-01')).toBeNull();
  });

  it('keeps the resolved ISO calendar key and formats it in UTC outside Korea', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    try {
      expect(resolveBacktestTooltip(series, '2024-01-03')).toMatchObject({
        date: '2024-01-03',
        points: [
          { assetId: 'QQQ', date: '2024-01-02', value: 100 },
          { assetId: 'TQQQ', date: '2024-01-02', value: 100 },
        ],
      });
      expect(formatBacktestTooltipDate('2024-01-03')).toContain('2024년 1월 3일');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('resolves Tuesday market values from the prior completed Friday without looking ahead', () => {
    expect(resolveBacktestTooltip(marketSeries, '2024-01-09', marketTrend)).toMatchObject({
      date: '2024-01-09',
      marketTrend: {
        label: '나스닥100',
        sourceDate: '2024-01-05',
        close: 16_400.25,
        sma20: 16_100.5,
        sma60: null,
      },
    });
  });

  it('supports Arrow, Home, and End keyboard scrubbing with live numeric text', () => {
    render(
      <BacktestChartInner
        series={series}
        currency="USD"
        resultView="NORMALIZED"
        width={800}
        height={360}
      />,
    );

    const scrubber = screen.getByRole('slider', { name: '차트 날짜 탐색' });
    fireEvent.focus(scrubber);
    expect(screen.getByRole('status').textContent).toContain('2024년 1월 2일');

    fireEvent.keyDown(scrubber, { key: 'End' });
    expect(screen.getByRole('status').textContent).toContain('2024년 1월 5일');
    expect(screen.getByRole('status').textContent).toContain('TQQQ');
    expect(screen.getByRole('status').textContent).toContain('115');

    fireEvent.keyDown(scrubber, { key: 'Home' });
    fireEvent.keyDown(scrubber, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('2024년 1월 4일');
    expect(screen.getByRole('status').textContent).toContain('QQQ');
    expect(screen.getByRole('status').textContent).toContain('104');

    fireEvent.keyDown(scrubber, { key: 'ArrowLeft' });
    expect(screen.getByRole('status').textContent).toContain('2024년 1월 2일');
  });

  it('announces available raw market levels during keyboard scrubbing and omits a warming-up SMA', () => {
    render(
      <BacktestChartInner
        series={marketSeries}
        marketTrend={marketTrend}
        currency="USD"
        resultView="NORMALIZED"
        width={800}
        height={360}
      />,
    );

    const scrubber = screen.getByRole('slider', { name: '차트 날짜 탐색' });
    fireEvent.focus(scrubber);

    const warmupTooltip = screen.getByRole('status');
    expect(warmupTooltip.textContent).toContain('나스닥100');
    expect(warmupTooltip.textContent).toContain('16,400.25');
    expect(warmupTooltip.textContent).toContain('20주선');
    expect(warmupTooltip.textContent).toContain('16,100.5');
    expect(warmupTooltip.textContent).not.toContain('60주선');

    fireEvent.keyDown(scrubber, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('2024년 1월 5일');
    expect(screen.getByRole('status').textContent).not.toContain('16,850.75');

    fireEvent.keyDown(scrubber, { key: 'End' });
    const completeTooltip = screen.getByRole('status');
    expect(completeTooltip.textContent).toContain('60주선');
    expect(completeTooltip.textContent).toContain('15,900.5');
  });

  it('announces the exact prepared GOLD value used by the chart tooltip', () => {
    const points = transformPortfolioHistory([
      { date: '2024-01-02', value: 100, principal: 100 },
      { date: '2025-01-02', value: 110, principal: 100 },
    ], 'GOLD', {
      inflationRate: 0,
      gold: [
        { date: '2024-01-02', price: 2_000, dividendYield: 0 },
        { date: '2025-01-02', price: 2_200, dividendYield: 0 },
      ],
    });

    render(
      <BacktestChartInner
        series={[{ assetId: 'SPY', targetMultiple: 1, color: '#111111', points }]}
        currency="USD"
        resultView="PORTFOLIO"
        width={800}
        height={360}
      />,
    );
    const scrubber = screen.getByRole('slider', { name: '차트 날짜 탐색' });
    fireEvent.focus(scrubber);
    fireEvent.keyDown(scrubber, { key: 'End' });

    const liveTooltip = screen.getByRole('status');
    expect(liveTooltip.textContent).toContain('2025년 1월 2일');
    expect(liveTooltip.textContent).toContain('SPY');
    expect(liveTooltip.textContent).toContain('$100');
  });
});

describe('BacktestChart market trend presentation', () => {
  it('plots normalized market values on the shared left scale without a market right axis', () => {
    const normalizedMarketTrend: MarketTrendOverlay = {
      ...marketTrend,
      points: [
        { ...marketTrend.points[0], date: '2024-01-05', indexedClose: 100 },
        { ...marketTrend.points[1], date: '2024-01-12', indexedClose: 110 },
      ],
    };
    const { container } = render(
      <BacktestChartInner
        series={marketSeries}
        marketTrend={normalizedMarketTrend}
        currency="USD"
        resultView="NORMALIZED"
        width={800}
        height={360}
      />,
    );

    const assetPath = container.querySelector<SVGPathElement>('path[stroke="#111111"]');
    const marketPath = screen.getByLabelText('나스닥100 가격지수');
    expect(assetPath).not.toBeNull();
    expect(firstPathY(marketPath as unknown as SVGPathElement)).toBe(firstPathY(assetPath!));
    expect(screen.queryByLabelText('시장 추세 (시작값 100)')).toBeNull();
  });

  it('keeps portfolio currency values on the left axis and gives market trends an integer right axis', () => {
    render(
      <BacktestChartInner
        series={marketSeries}
        marketTrend={marketTrend}
        currency="USD"
        resultView="PORTFOLIO"
        width={800}
        height={360}
      />,
    );

    const portfolioAxis = screen.getByLabelText('포트폴리오 가치');
    const marketAxis = screen.getByLabelText('시장 추세 (시작값 100)');
    expect(portfolioAxis.textContent).toContain('$');
    expect(marketAxis.textContent).not.toContain('$');
    const marketTickLabels = [...marketAxis.querySelectorAll('text')].map((label) => label.textContent);
    expect(marketTickLabels.length).toBeGreaterThan(0);
    expect(marketTickLabels.every((label) => /^\d+$/.test(label ?? ''))).toBe(true);
  });

  it('shows a patterned market legend and completed-week price-index disclosure', () => {
    render(
      <BacktestChart
        series={marketSeries}
        marketTrend={marketTrend}
        currency="USD"
        resultView="NORMALIZED"
      />,
    );

    expect(screen.getByText('나스닥100 (^NDX)')).not.toBeNull();
    expect(screen.getByText('20주 SMA')).not.toBeNull();
    expect(screen.getByText('60주 SMA')).not.toBeNull();

    const legendPatterns = [
      '나스닥100 가격지수 범례',
      '20주 SMA 범례',
      '60주 SMA 범례',
    ].map((label) => within(screen.getByLabelText(label)).getByRole('presentation').getAttribute('stroke-dasharray') ?? 'solid');
    expect(new Set(legendPatterns).size).toBe(3);

    const disclosure = screen.getByText(/완료 주봉 가격지수/);
    expect(disclosure.textContent).toContain('수익률 비교선이 아닙니다');
  });
});
