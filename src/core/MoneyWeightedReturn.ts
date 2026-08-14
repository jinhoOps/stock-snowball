import type { BacktestHistoryPoint } from '../types/finance';

const MS_PER_DAY = 86_400_000;
const MIN_RATE = -0.999999999;
const MAX_SEARCH_RATE = 1_000_000;

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

const calculateXirr = (cashFlows: readonly DatedCashFlow[]): number => {
  const flows = aggregateCashFlows(cashFlows);
  if (!flows.some((flow) => flow.amount < 0)) return 0;
  if (!flows.some((flow) => flow.amount > 0)) return -1;
  if (flows.length < 2 || flows[0].date === flows.at(-1)!.date) return 0;

  const startDate = flows[0].date;
  const netPresentValue = (rate: number): number => flows.reduce((sum, flow) => {
    const years = calendarDays(startDate, flow.date) / 365.25;
    return sum + flow.amount / ((1 + rate) ** years);
  }, 0);

  const atZero = netPresentValue(0);
  if (Math.abs(atZero) < 1e-9) return 0;

  let low = MIN_RATE;
  let high = 1;
  let lowValue = netPresentValue(low);
  let highValue = netPresentValue(high);
  while (lowValue * highValue > 0 && high < MAX_SEARCH_RATE) {
    high = high * 2 + 1;
    highValue = netPresentValue(high);
  }
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) {
    return 0;
  }

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const middle = (low + high) / 2;
    const middleValue = netPresentValue(middle);
    if (Math.abs(middleValue) < 1e-10) return middle;
    if (lowValue * middleValue <= 0) {
      high = middle;
      highValue = middleValue;
    } else {
      low = middle;
      lowValue = middleValue;
    }
  }

  const result = (low + high) / 2;
  return Number.isFinite(result) ? result : 0;
};

export const calculateMoneyWeightedReturn = (
  history: readonly BacktestHistoryPoint[],
): number => {
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
  if (terminal.value > 0) cashFlows.push({ date: terminal.date, amount: terminal.value });

  return calculateXirr(cashFlows);
};
