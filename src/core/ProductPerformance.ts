import { parseDate } from '@internationalized/date';
import { IndexPoint } from '../data/historicalAssets';
import {
  ProductPerformanceMetrics,
  ProductPerformancePoint,
  ProductPerformanceResult,
} from '../types/finance';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const calendarDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return (end.getTime() - start.getTime()) / MS_PER_DAY;
};

const calculateAnnualizedSampleVolatility = (points: readonly ProductPerformancePoint[]): number => {
  const dailyReturns = points.slice(1).map((point, index) => point.value / points[index].value - 1);

  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((sum, dailyReturn) => sum + dailyReturn, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce(
    (sum, dailyReturn) => sum + (dailyReturn - mean) ** 2,
    0,
  ) / (dailyReturns.length - 1);

  return Math.sqrt(variance) * Math.sqrt(252);
};

export const calculateProductPerformanceMetrics = (
  points: readonly ProductPerformancePoint[],
): ProductPerformanceMetrics => {
  if (points.length < 2 || points[0].value <= 0) {
    return { cumulativeReturn: 0, cagr: null, mdd: 0, volatility: 0 };
  }

  const first = points[0];
  const last = points.at(-1)!;
  const cumulativeReturn = last.value / first.value - 1;
  const calendarDays = calendarDaysBetween(first.date, last.date);
  // Do not extrapolate a sub-year observation window into an annual return.
  const hasFullYear = last.date >= parseDate(first.date).add({ years: 1 }).toString();
  const annualized = hasFullYear && calendarDays > 0 && last.value > 0
    ? (last.value / first.value) ** (365.25 / calendarDays) - 1
    : null;
  let peak = first.value;
  let mdd = 0;
  for (const point of points) {
    peak = Math.max(peak, point.value);
    if (peak > 0) mdd = Math.max(mdd, (peak - point.value) / peak);
  }

  return {
    cumulativeReturn,
    cagr: annualized !== null && Number.isFinite(annualized) ? annualized : null,
    mdd,
    volatility: calculateAnnualizedSampleVolatility(points),
  };
};

export const calculateProductPerformance = (
  data: IndexPoint[],
  startDate: string,
  endDate: string,
): ProductPerformanceResult => {
  const selectedData = data
    .filter((point) => point.date >= startDate && point.date <= endDate)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (selectedData.length < 2) {
    throw new RangeError('Product performance requires at least two points in the selected date range.');
  }

  let value = 100;
  const points: ProductPerformancePoint[] = [{ date: selectedData[0].date, value }];

  for (let index = 1; index < selectedData.length; index += 1) {
    const previous = selectedData[index - 1];
    const current = selectedData[index];
    value *= (current.price / previous.price) * (1 + current.dividendYield);
    points.push({ date: current.date, value });
  }

  const metrics = calculateProductPerformanceMetrics(points);

  return { points, metrics };
};

export interface ProductPeriodMetric {
  kind: 'CAGR' | 'RECOVERY';
  value: number | null;
}

/** Short periods use a non-annualized rebound from the lowest total-return value. */
export const getProductPeriodMetric = (
  points: readonly ProductPerformancePoint[],
  metrics: ProductPerformanceMetrics,
): ProductPeriodMetric => {
  if (points.length < 2) return { kind: 'CAGR', value: null };
  const first = points[0];
  const last = points.at(-1)!;
  if (last.date >= parseDate(first.date).add({ years: 1 }).toString()) {
    return { kind: 'CAGR', value: metrics.cagr };
  }
  if (last.date <= first.date || points.some((point) => !Number.isFinite(point.value) || point.value <= 0)) {
    return { kind: 'RECOVERY', value: null };
  }
  const low = points.reduce((minimum, point) => Math.min(minimum, point.value), first.value);
  const recovery = last.value / low - 1;
  return { kind: 'RECOVERY', value: Number.isFinite(recovery) ? recovery : null };
};
