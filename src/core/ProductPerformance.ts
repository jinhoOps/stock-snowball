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

const calculateAnnualizedSampleVolatility = (points: ProductPerformancePoint[]): number => {
  const dailyReturns = points.slice(1).map((point, index) => point.value / points[index].value - 1);

  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((sum, dailyReturn) => sum + dailyReturn, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce(
    (sum, dailyReturn) => sum + (dailyReturn - mean) ** 2,
    0,
  ) / (dailyReturns.length - 1);

  return Math.sqrt(variance) * Math.sqrt(252);
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
  let peak = value;
  let mdd = 0;
  const points: ProductPerformancePoint[] = [{ date: selectedData[0].date, value }];

  for (let index = 1; index < selectedData.length; index += 1) {
    const previous = selectedData[index - 1];
    const current = selectedData[index];
    value *= (current.price / previous.price) * (1 + current.dividendYield);
    peak = Math.max(peak, value);
    mdd = Math.max(mdd, (peak - value) / peak);
    points.push({ date: current.date, value });
  }

  const cumulativeReturn = value / 100 - 1;
  const calendarDays = calendarDaysBetween(selectedData[0].date, selectedData.at(-1)!.date);
  const cagr = calendarDays > 0
    ? (value / 100) ** (365.25 / calendarDays) - 1
    : 0;

  const metrics: ProductPerformanceMetrics = {
    cumulativeReturn,
    cagr,
    mdd,
    volatility: calculateAnnualizedSampleVolatility(points),
  };

  return { points, metrics };
};
