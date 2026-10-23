// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SETTLE_MS, useMilestoneCelebration } from '../useMilestoneCelebration';

const celebrateMilestone = vi.fn();
vi.mock('../effects', () => ({ celebrateMilestone: (...args: unknown[]) => celebrateMilestone(...args) }));

const resultRef = createRef<HTMLElement>();
const render = (initial: number) => renderHook(
  ({ value }) => useMilestoneCelebration(value, resultRef),
  { initialProps: { value: initial } },
);

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  celebrateMilestone.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('useMilestoneCelebration', () => {
  it('does not celebrate a milestone that was already reached on load', () => {
    const { result, rerender } = render(131_000_000);
    act(() => result.current());
    rerender({ value: 140_000_000 });
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(celebrateMilestone).not.toHaveBeenCalled();
  });

  it('celebrates once after the user pushes the result past a new milestone and stops editing', () => {
    const { result, rerender } = render(90_000_000);
    act(() => result.current());
    rerender({ value: 120_000_000 });
    act(() => { vi.advanceTimersByTime(SETTLE_MS - 1); });
    expect(celebrateMilestone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(celebrateMilestone).toHaveBeenCalledTimes(1);
  });

  it('waits for a slider drag to settle and judges only the final value', () => {
    const { result, rerender } = render(90_000_000);
    for (const value of [110_000_000, 95_000_000, 130_000_000, 80_000_000]) {
      act(() => result.current());
      rerender({ value });
      act(() => { vi.advanceTimersByTime(100); });
    }
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(celebrateMilestone).not.toHaveBeenCalled();
  });

  it('celebrates each milestone only once per session, even after dipping below it', () => {
    const { result, rerender } = render(90_000_000);
    for (const value of [120_000_000, 90_000_000, 120_000_000]) {
      act(() => result.current());
      rerender({ value });
      act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    }
    expect(celebrateMilestone).toHaveBeenCalledTimes(1);
  });

  it('ignores changes the user did not make, such as a mode switch', () => {
    const { rerender } = render(90_000_000);
    rerender({ value: 520_000_000 });
    act(() => { vi.advanceTimersByTime(SETTLE_MS); });
    expect(celebrateMilestone).not.toHaveBeenCalled();
  });
});
