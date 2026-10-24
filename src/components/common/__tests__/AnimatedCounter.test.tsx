// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AnimatedCounter from '../AnimatedCounter';

// anime.js runs on its own clock, so these tests wait in real time.
let reduceMotion = false;
let preferenceChanged: (event: { matches: boolean }) => void = () => undefined;
const format = (value: number) => value.toFixed(0);
const displayed = (container: HTMLElement) => Number(container.querySelector('[aria-hidden="true"]')?.textContent);
const wait = (milliseconds: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

beforeEach(() => {
  reduceMotion = false;
  vi.stubGlobal('matchMedia', () => ({
    matches: reduceMotion,
    addEventListener: (_: string, callback: typeof preferenceChanged) => { preferenceChanged = callback; },
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('continues from the visible value on rapid changes without flashing the target or overshooting', async () => {
  const { container, rerender } = render(<AnimatedCounter value={100} formatter={format} duration={400} />);
  rerender(<AnimatedCounter value={200} formatter={format} duration={400} />);
  expect(displayed(container)).toBe(100);
  await wait(120);
  const intermediate = displayed(container);
  expect(intermediate).toBeGreaterThan(100);
  expect(intermediate).toBeLessThan(200);
  rerender(<AnimatedCounter value={-50} formatter={format} duration={400} />);
  expect(displayed(container)).toBe(intermediate);
  await wait(120);
  expect(displayed(container)).toBeLessThan(intermediate);
  expect(displayed(container)).toBeGreaterThan(-50);
  await wait(500);
  expect(displayed(container)).toBe(-50);
});

it('waits for its delay before counting', async () => {
  const { container, rerender } = render(<AnimatedCounter value={0} formatter={format} delay={200} duration={200} />);
  rerender(<AnimatedCounter value={100} formatter={format} delay={200} duration={200} />);
  await wait(100);
  expect(displayed(container)).toBe(0);
  await wait(400);
  expect(displayed(container)).toBe(100);
});

it('announces only the target and applies a new formatter without restarting the count', async () => {
  const { container, rerender } = render(<AnimatedCounter value={100} formatter={format} duration={400} />);
  rerender(<AnimatedCounter value={200} formatter={format} duration={400} />);
  expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('200');
  await wait(120);
  rerender(<AnimatedCounter value={200} formatter={(value) => `$${value.toFixed(0)}`} duration={400} />);
  expect(container.querySelector('[aria-hidden="true"]')?.textContent).toMatch(/^\$1\d\d$/);
  await wait(500);
  expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('$200');
  expect(screen.getByText('$200', { selector: '[aria-live="polite"]' })).toBeTruthy();
});

it('immediately settles when reduced motion is enabled', async () => {
  const { container, rerender } = render(<AnimatedCounter value={100} formatter={format} />);
  rerender(<AnimatedCounter value={200} formatter={format} />);
  await wait(60);
  act(() => preferenceChanged({ matches: true }));
  expect(displayed(container)).toBe(200);
  reduceMotion = true;
  rerender(<AnimatedCounter value={0} formatter={format} />);
  expect(displayed(container)).toBe(0);
  await wait(100);
  expect(displayed(container)).toBe(0);
});
