import type { ContributionCycle } from '../../types/finance';

const clean = (value: number) => Number(value.toFixed(10));

/**
 * Moves one step up or down and lands on a multiple of `step`,
 * so 32,500 goes to 35,000 or 30,000 rather than 37,500 or 27,500.
 */
export const stepOnGrid = (value: number, step: number, direction: 1 | -1) => {
  const ratio = value / step;
  const base = direction > 0 ? Math.floor(ratio + 1e-9) : Math.ceil(ratio - 1e-9);
  return clean((base + direction) * step);
};

/** About a tenth of the amount, rounded down to 1·2·5 × 10ⁿ, and never below `minimum`. */
export const amountStep = (amount: number, minimum: number) => {
  const tenth = amount / 10;
  if (!(tenth > minimum)) return minimum;
  const magnitude = 10 ** Math.floor(Math.log10(tenth));
  const lead = tenth / magnitude;
  return Math.max(minimum, (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * magnitude);
};

/** The smallest step per currency: 1,000원 or $1. */
export const minimumAmountStep = (currency: 'KRW' | 'USD') => (currency === 'KRW' ? 1_000 : 1);

/**
 * One tap of a money stepper. The step scales with the amount (about 10%), so 3만 moves by 2천 and 100만 by 10만.
 * Going down uses the step of the amount just below, so up then down returns to the same place.
 */
export const stepAmount = (amount: number, direction: 1 | -1, currency: 'KRW' | 'USD') => {
  const minimum = minimumAmountStep(currency);
  if (direction < 0 && amount <= 0) return 0;
  const reference = direction > 0 ? amount : amount * (1 - 1e-9);
  return Math.max(0, stepOnGrid(amount, amountStep(reference, minimum), direction));
};

/** Common contribution amounts per cycle; these are one-tap shortcuts, not limits. */
export const CONTRIBUTION_PRESETS: Record<'KRW' | 'USD', Record<ContributionCycle, number[]>> = {
  KRW: {
    DAILY: [10_000, 30_000, 50_000, 100_000],
    WEEKLY: [50_000, 100_000, 200_000, 500_000],
    MONTHLY: [500_000, 1_000_000, 2_000_000],
  },
  USD: {
    DAILY: [10, 20, 50, 100],
    WEEKLY: [50, 100, 200, 500],
    MONTHLY: [200, 500, 1_000, 2_000],
  },
};

/** Short chip text: 30000 → "3만", 1000 (USD) → "$1,000". */
export const presetAmountLabel = (amount: number, currency: 'KRW' | 'USD') =>
  currency === 'KRW' ? `${(amount / 10_000).toLocaleString('ko-KR')}만` : `$${amount.toLocaleString('en-US')}`;
