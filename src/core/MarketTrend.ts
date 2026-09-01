import type { BenchmarkPoint, MarketBenchmarkDataset } from '../data/marketBenchmarks';

export interface WeeklyTrendValue extends BenchmarkPoint {
  sma20: number | null;
  sma60: number | null;
}

export interface MarketTrendPoint extends WeeklyTrendValue {
  sourceDate: string;
  indexedClose: number;
  indexedSma20: number | null;
  indexedSma60: number | null;
}

export interface MarketTrendOverlay {
  benchmarkId: MarketBenchmarkDataset['id'];
  ticker: string;
  label: string;
  currency: string;
  points: MarketTrendPoint[];
}

export const calculateWeeklyTrend = (points: readonly BenchmarkPoint[]): WeeklyTrendValue[] => {
  let sum20 = 0;
  let sum60 = 0;

  return points.map((point, index) => {
    sum20 += point.close;
    sum60 += point.close;
    if (index >= 20) sum20 -= points[index - 20].close;
    if (index >= 60) sum60 -= points[index - 60].close;

    return {
      ...point,
      sma20: index >= 19 ? sum20 / 20 : null,
      sma60: index >= 59 ? sum60 / 60 : null,
    };
  });
};

export const findMarketTrendOnOrBefore = <T extends { date: string }>(
  points: readonly T[],
  date: string,
): T | null => {
  let lower = 0;
  let upper = points.length - 1;
  let closestIndex = -1;

  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (points[middle].date <= date) {
      closestIndex = middle;
      lower = middle + 1;
    } else {
      upper = middle - 1;
    }
  }

  return closestIndex === -1 ? null : points[closestIndex];
};

const indexValue = (value: number | null, baseClose: number): number | null =>
  value === null ? null : value / baseClose * 100;

export const buildMarketTrendOverlay = (
  dataset: MarketBenchmarkDataset,
  startDate: string,
  endDate: string,
): MarketTrendOverlay | null => {
  if (startDate > endDate) {
    throw new RangeError('Market trend start date must not be after end date.');
  }

  const fullTrend = calculateWeeklyTrend(dataset.points);
  const anchor = findMarketTrendOnOrBefore(fullTrend, startDate);
  if (!anchor) return null;

  const selected = [
    { ...anchor, date: startDate, sourceDate: anchor.date },
    ...fullTrend
      .filter((point) => point.date > startDate && point.date <= endDate)
      .map((point) => ({ ...point, sourceDate: point.date })),
  ];
  const baseClose = anchor.close;

  return {
    benchmarkId: dataset.id,
    ticker: dataset.ticker,
    label: dataset.label,
    currency: dataset.currency,
    points: selected.map((point) => ({
      ...point,
      indexedClose: point.close / baseClose * 100,
      indexedSma20: indexValue(point.sma20, baseClose),
      indexedSma60: indexValue(point.sma60, baseClose),
    })),
  };
};
