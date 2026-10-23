// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SnowToy, { COMBO_WINDOW_MS, MAX_COMBO } from '../SnowToy';

const throwSnow = vi.fn();
const blizzard = vi.fn();
vi.mock('../../../lib/celebration/effects', () => ({
  throwSnow: (...args: unknown[]) => throwSnow(...args),
  blizzard: () => blizzard(),
}));
vi.mock('animejs/animation', () => ({ animate: vi.fn() }));

let reducedMotion = false;
beforeEach(() => {
  reducedMotion = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') && reducedMotion,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.useFakeTimers();
  throwSnow.mockClear();
  blizzard.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tap = (gapMs = 200) => {
  vi.advanceTimersByTime(gapMs);
  fireEvent.click(screen.getByRole('button', { name: '눈 뭉치 던지기' }));
};

describe('SnowToy', () => {
  it('throws more snow as quick taps build a combo, and resets after a pause', () => {
    render(<SnowToy />);
    tap(); tap(); tap();
    expect(throwSnow.mock.calls.map(([, combo]) => combo)).toEqual([1, 2, 3]);

    tap(COMBO_WINDOW_MS + 1);
    expect(throwSnow).toHaveBeenLastCalledWith(expect.anything(), 1);
  });

  it('turns a full combo into a blizzard and starts over', () => {
    render(<SnowToy />);
    for (let i = 0; i < MAX_COMBO; i++) tap();
    expect(blizzard).toHaveBeenCalledTimes(1);
    tap();
    expect(throwSnow).toHaveBeenLastCalledWith(expect.anything(), 1);
  });

  it('stays still for people who prefer reduced motion', () => {
    reducedMotion = true;
    render(<SnowToy />);
    tap();
    expect(throwSnow).not.toHaveBeenCalled();
  });
});
