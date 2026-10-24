import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { celebrateMilestone } from './effects';

/** KRW amounts worth celebrating. */
export const MILESTONES_KRW = [100_000_000, 500_000_000, 1_000_000_000, 5_000_000_000, 10_000_000_000];

/** Wait for a slider drag or typing burst to stop before judging the result. */
export const SETTLE_MS = 700;

const STORAGE_KEY = 'celebrated_milestones';

export const milestoneLevel = (valueKrw: number) =>
  MILESTONES_KRW.findLast((milestone) => valueKrw >= milestone) ?? 0;

const readCelebrated = (): number[] => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === 'number') : [];
  } catch {
    return [];
  }
};

const markCelebrated = (milestone: number) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...readCelebrated(), milestone]));
  } catch {
    // Storage can be unavailable (private mode); celebrating twice is harmless.
  }
};

/**
 * Celebrates only when the user's own input pushes the result past a new milestone.
 * Page load, mode switches, loaded scenarios and currency changes move the baseline silently.
 * Each milestone is celebrated at most once per browser session.
 *
 * Bigger milestones get bigger celebrations (see `celebrationTier`).
 *
 * Returns `noteUserEdit`, to call whenever the user edits a simulation input, and `moveBaselineSilently`,
 * to call before a change the user did not make by editing (loading a scenario, switching mode or currency).
 * The second one matters when such a change lands while an edit is still settling.
 */
export function useMilestoneCelebration(
  valueKrw: number,
  resultRef: RefObject<HTMLElement | null>,
  onCelebrate?: (milestoneKrw: number) => void,
) {
  const onCelebrateRef = useRef(onCelebrate);
  onCelebrateRef.current = onCelebrate;
  const baselineLevel = useRef(milestoneLevel(valueKrw));
  const latestValue = useRef(valueKrw);
  const userChangePending = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    latestValue.current = valueKrw;
    if (!userChangePending.current) baselineLevel.current = milestoneLevel(valueKrw);
  }, [valueKrw]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const moveBaselineSilently = useCallback(() => {
    clearTimeout(settleTimer.current);
    userChangePending.current = false;
    baselineLevel.current = milestoneLevel(latestValue.current);
  }, []);

  const noteUserEdit = useCallback(() => {
    userChangePending.current = true;
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      userChangePending.current = false;
      const level = milestoneLevel(latestValue.current);
      const previous = baselineLevel.current;
      baselineLevel.current = level;
      if (level > previous && !readCelebrated().includes(level)) {
        markCelebrated(level);
        celebrateMilestone(resultRef.current, level);
        onCelebrateRef.current?.(level);
      }
    }, SETTLE_MS);
  }, [resultRef]);

  return { noteUserEdit, moveBaselineSilently };
}
