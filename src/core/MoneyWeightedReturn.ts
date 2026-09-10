import type { BacktestHistoryPoint } from '../types/finance';

const MS_PER_DAY = 86_400_000;
const MIN_LOG_RATE = Math.log(Number.MIN_VALUE);
const MAX_LOG_RATE = Math.log(Number.MAX_VALUE);

interface DatedCashFlow {
  date: string;
  amount: number;
}

const calendarDays = (start: string, end: string): number =>
  (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / MS_PER_DAY;

const aggregateCashFlows = (cashFlows: readonly DatedCashFlow[]): DatedCashFlow[] => {
  const byDate = new Map<string, number>();
  for (const cashFlow of cashFlows) {
    byDate.set(cashFlow.date, (byDate.get(cashFlow.date) ?? 0) + cashFlow.amount);
  }
  return [...byDate.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .filter((cashFlow) => Math.abs(cashFlow.amount) > 1e-12)
    .sort((left, right) => left.date.localeCompare(right.date));
};

const calculateXirr = (cashFlows: readonly DatedCashFlow[], daysPerYear: number): number | null => {
  const flows = aggregateCashFlows(cashFlows);
  if (!flows.some((flow) => flow.amount < 0)) return 0;
  if (!flows.some((flow) => flow.amount > 0)) return cashFlows.some((flow) => flow.amount > 0) ? null : -1;
  if (flows.length < 2 || flows[0].date === flows.at(-1)!.date) return null;

  const startDate = flows[0].date;
  const terms = flows.map((flow) => ({
    years: calendarDays(startDate, flow.date) / daysPerYear,
    logAmount: Math.log(Math.abs(flow.amount)),
    sign: Math.sign(flow.amount),
  }));
  // Scale every term by the largest absolute discounted flow. This preserves
  // the NPV sign/root without overflowing near -100% for multi-decade histories.
  const netPresentValue = (logRate: number): number => {
    const exponents = terms.map((term) => term.logAmount - logRate * term.years);
    const scale = Math.max(...exponents);
    return terms.reduce((sum, term, index) =>
      sum + term.sign * Math.exp(exponents[index] - scale), 0);
  };

  const atZero = netPresentValue(0);
  if (Math.abs(atZero) < 1e-13) return 0;

  let low = MIN_LOG_RATE;
  let high = MAX_LOG_RATE;
  let lowValue = netPresentValue(low);
  const highValue = netPresentValue(high);
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) {
    return null;
  }

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const middle = (low + high) / 2;
    const middleValue = netPresentValue(middle);
    if (Math.abs(middleValue) < 1e-13) return Math.expm1(middle);
    if (lowValue * middleValue <= 0) {
      high = middle;
    } else {
      low = middle;
      lowValue = middleValue;
    }
  }

  const result = Math.expm1((low + high) / 2);
  return Number.isFinite(result) ? result : null;
};

export const calculateMoneyWeightedReturn = (
  history: readonly BacktestHistoryPoint[],
  daysPerYear: number = 365.25,
): number | null => {
  if (!Number.isFinite(daysPerYear) || daysPerYear <= 0) {
    throw new RangeError('The annualization year must contain a positive finite number of days.');
  }
  if (history.length < 2) return 0;

  let previousPrincipal = 0;
  const cashFlows: DatedCashFlow[] = [];
  for (const point of history) {
    const principalDelta = point.principal - previousPrincipal;
    if (Math.abs(principalDelta) > 1e-12) {
      cashFlows.push({ date: point.date, amount: -principalDelta });
    }
    previousPrincipal = point.principal;
  }
  const terminal = history.at(-1)!;
  if (cashFlows.length > 0 && cashFlows[0].date === terminal.date) return null;
  if (terminal.value > 0) cashFlows.push({ date: terminal.date, amount: terminal.value });

  return calculateXirr(cashFlows, daysPerYear);
};
