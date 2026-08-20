// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

type Listener = (event: MediaQueryListEvent) => void;

const renderProbe = () => {
  const Probe = () => (
    <span data-testid="motion-pref">{usePrefersReducedMotion() ? 'reduce' : 'no-preference'}</span>
  );
  return render(<Probe />);
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('usePrefersReducedMotion', () => {
  it('reads the initial media query state', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    renderProbe();

    expect(screen.getByTestId('motion-pref').textContent).toBe('reduce');
  });

  it('updates when the media query changes', () => {
    const listeners = new Set<Listener>();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_event: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_event: string, listener: Listener) => listeners.delete(listener),
    }));

    renderProbe();
    expect(screen.getByTestId('motion-pref').textContent).toBe('no-preference');

    act(() => {
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(screen.getByTestId('motion-pref').textContent).toBe('reduce');
  });

  it('falls back to no-preference when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    renderProbe();

    expect(screen.getByTestId('motion-pref').textContent).toBe('no-preference');
  });
});
