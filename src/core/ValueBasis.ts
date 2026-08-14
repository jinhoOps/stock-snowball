import { findPointOnOrBefore, IndexPoint } from '../data/historicalAssets';
import {
  BacktestHistoryPoint,
  ProductPerformancePoint,
  ValueBasis,
} from '../types/finance';

const MS_PER_DAY = 86_400_000;

export interface ValueBasisOptions {
  inflationRate: number;
  gold: readonly IndexPoint[];
}

export class ValueBasisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueBasisError';
  }
}

export const getGoldBasisError = (
  startDate: string,
  endDate: string,
  gold: readonly IndexPoint[],
): string | null => {
  if (gold.length === 0) {
    return 'GOLD 데이터가 없습니다.';
  }

  const firstDate = gold.reduce((earliest, point) =>
    point.date < earliest ? point.date : earliest, gold[0].date);
  const lastDate = gold.reduce((latest, point) =>
    point.date > latest ? point.date : latest, gold[0].date);

  if (startDate < firstDate || endDate > lastDate) {
    return `GOLD 데이터는 ${firstDate}부터 ${lastDate}까지 사용할 수 있습니다.`;
  }

  return null;
};

const elapsedDays = (startDate: string, date: string): number =>
  (Date.parse(date) - Date.parse(startDate)) / MS_PER_DAY;

const getFactor = (
  date: string,
  startDate: string,
  basis: ValueBasis,
  options: ValueBasisOptions,
  startGold: IndexPoint | null,
): number => {
  if (basis === 'NOMINAL') return 1;
  if (basis === 'REAL') {
    return (1 + options.inflationRate) ** (elapsedDays(startDate, date) / 365.25);
  }

  const currentGold = findPointOnOrBefore(options.gold, date);
  if (!startGold || !currentGold) {
    throw new ValueBasisError(`GOLD 데이터가 ${date} 이전을 포함하지 않습니다.`);
  }
  return currentGold.price / startGold.price;
};

const getGoldStartPoint = (
  startDate: string,
  endDate: string,
  basis: ValueBasis,
  gold: readonly IndexPoint[],
): IndexPoint | null => {
  if (basis !== 'GOLD') return null;

  const coverageError = getGoldBasisError(startDate, endDate, gold);
  if (coverageError) throw new ValueBasisError(coverageError);

  const startGold = findPointOnOrBefore(gold, startDate);
  if (!startGold) {
    throw new ValueBasisError(`GOLD 데이터가 ${startDate} 이전을 포함하지 않습니다.`);
  }
  return startGold;
};

export const transformPortfolioHistory = (
  history: readonly BacktestHistoryPoint[],
  basis: ValueBasis,
  options: ValueBasisOptions,
): BacktestHistoryPoint[] => {
  if (history.length === 0) return [];

  const startDate = history[0].date;
  const startGold = getGoldStartPoint(startDate, history.at(-1)!.date, basis, options.gold);
  let previousPrincipal = 0;
  let transformedPrincipal = 0;

  return history.map((point) => {
    const factor = getFactor(point.date, startDate, basis, options, startGold);
    const principalDelta = point.principal - previousPrincipal;
    transformedPrincipal += principalDelta / factor;
    previousPrincipal = point.principal;

    return {
      ...point,
      value: point.value / factor,
      principal: transformedPrincipal,
    };
  });
};

export const transformProductSeries = (
  points: readonly ProductPerformancePoint[],
  basis: ValueBasis,
  options: ValueBasisOptions,
): ProductPerformancePoint[] => {
  if (points.length === 0) return [];

  const startDate = points[0].date;
  const startGold = getGoldStartPoint(startDate, points.at(-1)!.date, basis, options.gold);

  return points.map((point) => ({
    ...point,
    value: point.value / getFactor(point.date, startDate, basis, options, startGold),
  }));
};
