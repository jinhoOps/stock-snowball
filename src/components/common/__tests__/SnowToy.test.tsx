// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import SnowToy, { AVALANCHE_COMBO, BLIZZARD_COMBO, COMBO_WINDOW_MS, FINALE_LOCK_MS, LEGEND_LOCK_MS, MAX_COMBO, comboTier, finaleKind } from '../SnowToy';

const throwSnow = vi.fn();
const blizzard = vi.fn();
const splat = vi.fn();
const flurry = vi.fn();
const avalanche = vi.fn();
const snowstorm = vi.fn();
const shakeScreen = vi.fn();
const pfft = vi.fn();
const legend = vi.fn();
vi.mock('../../../lib/celebration/effects', () => ({
  throwSnow: (...args: unknown[]) => throwSnow(...args),
  blizzard: () => blizzard(),
  flurry: () => flurry(),
  avalanche: () => avalanche(),
  snowstorm: () => snowstorm(),
  shakeScreen: (...args: unknown[]) => shakeScreen(...args),
  snowBurst: vi.fn(),
  snowfall: vi.fn(),
  buzz: vi.fn(),
  pfft: (...args: unknown[]) => pfft(...args),
  legend: (...args: unknown[]) => legend(...args),
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
  flurry.mockClear();
  avalanche.mockClear();
  snowstorm.mockClear();
  shakeScreen.mockClear();
  pfft.mockClear();
  legend.mockClear();
  localStorage.removeItem('snow_toy_finales');
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

  it('keeps the combo going past the ×10 blizzard', () => {
    render(<SnowToy />);
    for (let i = 0; i < BLIZZARD_COMBO; i++) tap();
    expect(blizzard).toHaveBeenCalledTimes(1);
    tap();
    expect(throwSnow).toHaveBeenLastCalledWith(expect.anything(), BLIZZARD_COMBO + 1);
  });

  it('adds a flurry every tenth tap, an avalanche at ×50 and a finale at ×100, then starts over', () => {
    const { container } = render(<SnowToy />);
    for (let i = 0; i < AVALANCHE_COMBO; i++) tap();
    expect(avalanche).toHaveBeenCalledTimes(1);
    expect(flurry).toHaveBeenCalledTimes(3); // ×20, ×30, ×40
    expect(shakeScreen).toHaveBeenCalledTimes(1);
    for (let i = AVALANCHE_COMBO; i < MAX_COMBO; i++) tap();
    expect(snowstorm).toHaveBeenCalledTimes(1);
    expect(flurry).toHaveBeenCalledTimes(7); // plus ×60 to ×90
    expect(blizzard).toHaveBeenCalledTimes(1);
    expect(shakeScreen).toHaveBeenCalledTimes(3); // ×50, the ball's flight, and its burst
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.querySelector('.snow-toy-root')?.getAttribute('style')).toContain('(0px, 0px');

    // The ball is away bursting: taps wait until it is back, then a new combo starts.
    const throws = throwSnow.mock.calls.length;
    tap();
    expect(throwSnow).toHaveBeenCalledTimes(throws);
    tap(FINALE_LOCK_MS);
    expect(throwSnow).toHaveBeenLastCalledWith(expect.anything(), 1);
  });

  it('counts every ×100 and lets the air out on the fifth', () => {
    localStorage.setItem('snow_toy_finales', '4');
    render(<SnowToy />);
    for (let i = 0; i < MAX_COMBO; i++) tap();
    expect(pfft).toHaveBeenCalledTimes(1);
    expect(snowstorm).not.toHaveBeenCalled();
    expect(localStorage.getItem('snow_toy_finales')).toBe('5');
  });

  it('puts on the grand show at the tenth ×100 and crowns the ball for good', () => {
    localStorage.setItem('snow_toy_finales', '9');
    const { container } = render(<SnowToy />);
    expect(container.textContent).not.toContain('👑');
    for (let i = 0; i < MAX_COMBO; i++) tap();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(legend).toHaveBeenCalledTimes(1);
    expect(snowstorm).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(LEGEND_LOCK_MS); });
    expect(container.textContent).toContain('👑');
    tap();
    expect(throwSnow).toHaveBeenLastCalledWith(expect.anything(), 1);
  });

  it('picks the finale by round: letdown on 5s, show on 10s, storm otherwise', () => {
    expect([1, 4, 5, 9, 10, 15, 20].map(finaleKind)).toEqual(['storm', 'storm', 'fizzle', 'storm', 'legend', 'fizzle', 'legend']);
  });

  it('steps the combo tier up at ×10, ×50 and ×100', () => {
    expect([9, 10, 49, 50, 99, 100].map(comboTier)).toEqual([0, 1, 1, 2, 2, 3]);
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
    const wrapper = container.querySelector('.snow-toy-root') as HTMLElement;
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
