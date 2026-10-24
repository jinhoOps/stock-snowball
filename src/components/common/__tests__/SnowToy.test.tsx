// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import SnowToy, { COMBO_WINDOW_MS, MAX_COMBO } from '../SnowToy';

const throwSnow = vi.fn();
const blizzard = vi.fn();
const splat = vi.fn();
vi.mock('../../../lib/celebration/effects', () => ({
  throwSnow: (...args: unknown[]) => throwSnow(...args),
  blizzard: () => blizzard(),
  splat: (...args: unknown[]) => splat(...args),
}));
// Finish every animation at once so flights land immediately (unless a test holds them mid-air).
let holdAnimations = false;
vi.mock('animejs/animation', () => ({
  animate: vi.fn((target: Record<string, unknown>, params: Record<string, unknown>) => {
    if (holdAnimations) return { pause: vi.fn(), revert: vi.fn() };
    if (!(target instanceof Element)) {
      for (const key of ['x', 'y']) if (typeof params[key] === 'number') target[key] = params[key];
    }
    (params.onUpdate as (() => void) | undefined)?.();
    (params.onComplete as (() => void) | undefined)?.();
    return { pause: vi.fn(), revert: vi.fn() };
  }),
}));

let reducedMotion = false;
beforeEach(() => {
  reducedMotion = false;
  holdAnimations = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') && reducedMotion,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.useFakeTimers();
  throwSnow.mockClear();
  blizzard.mockClear();
  splat.mockClear();
  localStorage.setItem('snow_toy_hint_seen', '1');
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

  it('shows a combo badge from the third quick tap', () => {
    const { container } = render(<SnowToy />);
    tap(); tap();
    expect(container.textContent).not.toContain('×2');
    expect(container.querySelector('.invisible')).not.toBeNull();
    tap();
    expect(container.textContent).toContain('×3');
  });

  it('flings the ball when dragged, splashes where it lands and does not also throw', () => {
    render(<SnowToy />);
    const button = screen.getByRole('button', { name: '눈 뭉치 던지기' });
    fireEvent.pointerDown(button, { button: 0, clientX: 300, clientY: 300, pointerId: 1 });
    vi.advanceTimersByTime(20);
    fireEvent.pointerMove(button, { clientX: 250, clientY: 260, pointerId: 1 });
    vi.advanceTimersByTime(20);
    fireEvent.pointerMove(button, { clientX: 200, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button);
    expect(splat).toHaveBeenCalledTimes(1);
    expect(throwSnow).not.toHaveBeenCalled();
  });

  const drag = (button: HTMLElement) => {
    fireEvent.pointerDown(button, { button: 0, clientX: 300, clientY: 300, pointerId: 1 });
    vi.advanceTimersByTime(20);
    fireEvent.pointerMove(button, { clientX: 250, clientY: 260, pointerId: 1 });
    vi.advanceTimersByTime(20);
    fireEvent.pointerMove(button, { clientX: 200, clientY: 220, pointerId: 1 });
  };

  it('still throws on the next tap after the system cancels a drag', () => {
    render(<SnowToy />);
    const button = screen.getByRole('button', { name: '눈 뭉치 던지기' });
    drag(button);
    fireEvent.pointerCancel(button, { pointerId: 1 });
    tap();
    expect(throwSnow).toHaveBeenCalledTimes(1);
  });

  it('flies home when tapped mid-flight instead of staying parked', () => {
    const { container } = render(<SnowToy />);
    const wrapper = container.firstElementChild as HTMLElement;
    const button = screen.getByRole('button', { name: '눈 뭉치 던지기' });
    drag(button);
    holdAnimations = true;
    fireEvent.pointerUp(button, { pointerId: 1 });
    expect(wrapper.style.transform).not.toContain('(0px, 0px');

    holdAnimations = false;
    fireEvent.pointerDown(button, { button: 0, clientX: 200, clientY: 220, pointerId: 2 });
    fireEvent.pointerUp(button, { pointerId: 2 });
    expect(wrapper.style.transform).toBe('translate3d(0px, 0px, 0)');
  });

  it('shows a one-time hint on a first visit', () => {
    localStorage.removeItem('snow_toy_hint_seen');
    render(<SnowToy />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('눌러서 던지고, 끌어서 날려보세요')).toBeTruthy();
    expect(localStorage.getItem('snow_toy_hint_seen')).toBe('1');
  });

  it('stays still for people who prefer reduced motion', () => {
    reducedMotion = true;
    render(<SnowToy />);
    tap();
    expect(throwSnow).not.toHaveBeenCalled();
  });
});
