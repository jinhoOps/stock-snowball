// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KPIGrid from '../KPIGrid';

const { animate, createScope, revert } = vi.hoisted(() => ({
  animate: vi.fn(),
  createScope: vi.fn(),
  revert: vi.fn(),
}));

vi.mock('animejs', () => ({
  animate,
  createScope,
  stagger: (amount: number) => (_target: Element, index: number) => index * amount,
}));

const baseProps = {
  totalAsset: 100_000,
  initialPrincipal: 10_000,
  totalContribution: 50_000,
  totalReturn: 50_000,
  returnPercentage: 100,
  cagr: 7.5,
  currency: 'USD' as const,
  exchangeRate: 1450,
  isMilestoneReached: true,
  onShare: vi.fn(),
};

const stubMotionPreference = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('KPIGrid Anime.js migration', () => {
  it('scopes Anime.js to the grid root and reverts on unmount', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    const { unmount } = render(<KPIGrid {...baseProps} />);

    expect(createScope).toHaveBeenCalledTimes(1);
    expect(createScope.mock.calls[0][0].root).toBeInstanceOf(HTMLDivElement);
    expect(animate).toHaveBeenCalled();

    unmount();

    expect(revert).toHaveBeenCalledTimes(1);
  });

  it('skips Anime.js animation calls when reduced motion is requested', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    stubMotionPreference(true);

    render(<KPIGrid {...baseProps} />);

    expect(createScope).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByText('Milestone')).toBeTruthy();
  });

  it('keeps controls usable after replacing Motion hover and tap handlers', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    render(<KPIGrid {...baseProps} />);
    fireEvent.mouseEnter(screen.getByText('총 투자 원금').closest('.kpi-card') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '공유(이미지)' }));

    expect(baseProps.onShare).toHaveBeenCalledTimes(1);
  });

  it('does not replay entrance animations when a card is hovered', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    render(<KPIGrid {...baseProps} />);
    fireEvent.mouseEnter(screen.getByText('총 투자 원금').closest('.kpi-card') as HTMLElement);

    expect(animate.mock.calls.filter(([target]) => target === '.kpi-card')).toHaveLength(1);
    expect(animate.mock.calls.filter(([target]) => target === '.kpi-share-button')).toHaveLength(1);
  });
});
