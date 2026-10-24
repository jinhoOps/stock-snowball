import type { ContributionCycle } from '../../types/finance';

/** How often a contribution is made, as it reads in a sentence ("매월 50만 원"). */
export const CYCLE_LABEL: Record<ContributionCycle, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
};
