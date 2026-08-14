// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BacktestChartInner,
  findClosestPointOnOrBefore,
  formatBacktestTooltipDate,
  resolveBacktestTooltip,
  type BacktestDisplaySeries,
} from '../BacktestChart';

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

afterEach(cleanup);

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
});
