// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import SnowballChart, { type SnowballChartSelection, type SnowballScenarioData } from '../SnowballChart';

// JSDOM has no layout. Keep the chart and its interaction code real, fixing only its viewport.
vi.mock('@visx/responsive', () => ({
  ParentSize: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 800, height: 400 }),
}));

const day = 86_400_000;
const point = (start: string, days: number, value: number) => ({
  date: new Date(Date.parse(`${start}T00:00:00Z`) + days * day),
  value,
  realValue: value / 2,
});
const projection: SnowballScenarioData = {
  id: 'projection', name: '미래 예측', color: '#123456',
  points: [point('2023-01-01', 0, 100), point('2023-01-01', 30, 130), point('2023-01-01', 365, 465)],
};
const historical: SnowballScenarioData = {
  id: 'history', name: '저장 백테스트', color: '#654321',
  points: [point('2001-01-01', 0, 2000), point('2001-01-01', 1, 2001), point('2001-01-01', 30, 2030), point('2001-01-01', 365, 2365)],
};
const move = (container: HTMLElement, fraction: number) => {
  fireEvent.mouseMove(container.querySelector('rect[fill="transparent"]')!, {
    clientX: 72 + 696 * fraction,
    clientY: 100,
  });
};

beforeEach(() => vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('SnowballChart date-aligned values', () => {
  it('plots equal one-year horizons at the same endpoint despite unequal sample counts', () => {
    const { container } = render(<SnowballChart scenarios={[projection, historical]} mode="PROJECTION" comparisonMode />);
    for (const color of ['#123456', '#654321']) {
      const path = container.querySelector(`path[stroke="${color}"]`)!.getAttribute('d')!;
      const lastX = Number(path.match(/([\d.-]+),[\d.-]+$/)![1]);
      expect(lastX).toBeCloseTo(696, 6);
    }
  });

  it('compares the same elapsed time in daily historical and sparse projection series', () => {
    const onPointHover = vi.fn<(selection: SnowballChartSelection | null) => void>();
    const { container } = render(<SnowballChart scenarios={[projection, historical]} mode="PROJECTION" comparisonMode showRealValue onPointHover={onPointHover} />);
    move(container, 30 / 365);
    expect(onPointHover).toHaveBeenLastCalledWith(expect.objectContaining({
      points: [
        expect.objectContaining({ id: 'projection', value: 130, realValue: 65 }),
        expect.objectContaining({ id: 'history', value: 2030, realValue: 1015 }),
      ],
    }));
  });

  it('omits an ended shorter scenario without crashing or carrying its terminal value forward', () => {
    const onPointHover = vi.fn<(selection: SnowballChartSelection | null) => void>();
    const short = { ...historical, points: historical.points.slice(0, 2) };
    const errors: unknown[] = [];
    const recordError = (event: ErrorEvent) => { errors.push(event.error); event.preventDefault(); };
    window.addEventListener('error', recordError);
    try {
      const { container } = render(<SnowballChart scenarios={[projection, short]} mode="PROJECTION" comparisonMode onPointHover={onPointHover} />);
      move(container, 1);
      expect(errors).toEqual([]);
      expect(onPointHover).toHaveBeenLastCalledWith(expect.objectContaining({
        points: [expect.objectContaining({ id: 'projection', value: 465 })],
      }));
    } finally {
      window.removeEventListener('error', recordError);
    }
  });

  it('uses a longer saved scenario after the primary scenario ends and includes exact endpoints', () => {
    const onPointHover = vi.fn<(selection: SnowballChartSelection | null) => void>();
    const short = { ...projection, points: projection.points.slice(0, 2) };
    const { container } = render(<SnowballChart scenarios={[short, historical]} mode="PROJECTION" comparisonMode onPointHover={onPointHover} />);
    move(container, 1);
    expect(onPointHover).toHaveBeenLastCalledWith(expect.objectContaining({
      points: [expect.objectContaining({ id: 'history', value: 2365 })],
    }));
  });

  it('aligns chronological mode by date and excludes a scenario before its start', () => {
    const onPointHover = vi.fn<(selection: SnowballChartSelection | null) => void>();
    const later: SnowballScenarioData = {
      ...historical,
      points: [point('2023-01-01', 15, 2015), point('2023-01-01', 31, 2031), point('2023-01-01', 365, 2365)],
    };
    const { container } = render(<SnowballChart scenarios={[projection, later]} mode="BACKTEST" onPointHover={onPointHover} />);
    move(container, 0);
    expect(onPointHover).toHaveBeenLastCalledWith(expect.objectContaining({
      points: [expect.objectContaining({ id: 'projection', value: 100 })],
    }));
    move(container, 30 / 365);
    expect(onPointHover).toHaveBeenLastCalledWith(expect.objectContaining({
      points: [
        expect.objectContaining({ id: 'projection', value: 130 }),
        expect.objectContaining({ id: 'history', value: 2015 }),
      ],
    }));
  });
});
