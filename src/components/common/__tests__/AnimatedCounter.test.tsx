// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AnimatedCounter from '../AnimatedCounter';

let time = 0;
let id = 0;
let frames: Map<number, FrameRequestCallback>;
let reduceMotion = false;
let preferenceChanged: (event: { matches: boolean }) => void = () => undefined;
const format = (value: number) => value.toFixed(0);
const displayed = (container: HTMLElement) => Number((container.querySelector('[aria-hidden="true"]') ?? container.firstElementChild)?.textContent);

function advance(milliseconds: number) {
  act(() => {
    time += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(time));
  });
}

beforeEach(() => {
  time = 0;
  frames = new Map();
  reduceMotion = false;
  vi.spyOn(performance, 'now').mockImplementation(() => time);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
  vi.stubGlobal('matchMedia', () => ({
    matches: reduceMotion,
    addEventListener: (_: string, callback: typeof preferenceChanged) => { preferenceChanged = callback; },
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('continues from the visible value on rapid changes without flashing the target or overshooting', () => {
  const { container, rerender, unmount } = render(<AnimatedCounter value={100} formatter={format} />);
  rerender(<AnimatedCounter value={200} formatter={format} />);
  expect(displayed(container)).toBe(100);
  advance(100);
  const intermediate = displayed(container);
  expect(intermediate).toBeGreaterThan(100);
  expect(intermediate).toBeLessThan(200);
  rerender(<AnimatedCounter value={-50} formatter={format} />);
  expect(displayed(container)).toBe(intermediate);
  advance(100);
  expect(displayed(container)).toBeLessThan(intermediate);
  expect(displayed(container)).toBeGreaterThan(-50);
  advance(1000);
  expect(displayed(container)).toBe(-50);
  rerender(<AnimatedCounter value={500} formatter={format} />);
  unmount();
  expect(frames.size).toBe(0);
});

it('announces only the target and applies a new formatter without restarting the count', () => {
  const { container, rerender } = render(<AnimatedCounter value={100} formatter={format} />);
  rerender(<AnimatedCounter value={200} formatter={format} />);
  expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('200');
  advance(100);
  rerender(<AnimatedCounter value={200} formatter={value => `$${value.toFixed(0)}`} />);
  expect(container.querySelector('[aria-hidden="true"]')?.textContent).toMatch(/^\$1\d\d$/);
  advance(1000);
  expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('$200');
  expect(screen.getByText('$200', { selector: '[aria-live="polite"]' })).toBeTruthy();
});

it('immediately settles and cancels pending frames when reduced motion is enabled', () => {
  const { container, rerender } = render(<AnimatedCounter value={100} formatter={format} />);
  rerender(<AnimatedCounter value={200} formatter={format} />);
  advance(100);
  act(() => preferenceChanged({ matches: true }));
  expect(displayed(container)).toBe(200);
  expect(frames.size).toBe(0);
  rerender(<AnimatedCounter value={0} formatter={format} />);
  expect(displayed(container)).toBe(0);
  expect(frames.size).toBe(0);
});
