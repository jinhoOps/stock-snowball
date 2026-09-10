// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KPIGrid from '../KPIGrid';

const { animate, createScope, revert } = vi.hoisted(() => ({
  animate: vi.fn(),
  createScope: vi.fn(),
  revert: vi.fn(),
}));

vi.mock('animejs/waapi', () => ({
  waapi: { animate },
}));

vi.mock('animejs/scope', () => ({
  createScope,
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
  it('preserves a small KRW balance and the monetary sign of a loss', () => {
    stubMotionPreference(true);
    render(<KPIGrid {...baseProps} currency="KRW" totalAsset={5000} totalReturn={-5000} returnPercentage={-50} />);
    const assetCard = screen.getByText('최종 예상 자산').closest('.kpi-card') as HTMLElement;
    const returnCard = screen.getByText('총 수익금').closest('.kpi-card') as HTMLElement;
    expect(assetCard.querySelector('dd')?.textContent).toBe('5,000원');
    expect(returnCard.querySelector('dd')?.textContent).toBe('-5,000원');
  });

  it('shows an unavailable annualized return without inventing a zero percent return', () => {
    stubMotionPreference(true);
    render(<KPIGrid {...baseProps} cagr={null} cagrLabel="내부수익률 (IRR)" />);
    const rateCard = screen.getByText('내부수익률 (IRR)').closest('.kpi-card') as HTMLElement;
    expect(rateCard.textContent).toContain('—');
    expect(rateCard.textContent).not.toContain('0.00%');
  });

  it('shows a percentage without a currency estimate and keeps a negative return sign', () => {
    stubMotionPreference(true);
    render(<KPIGrid {...baseProps} returnPercentage={-10} />);
    const rateCard = screen.getByText('연복리 수익률 (CAGR)').closest('.kpi-card') as HTMLElement;
    expect(rateCard.textContent).toContain('7.50%');
    expect(rateCard.textContent).not.toMatch(/약|원|\$/);
    const returnCard = screen.getByText('총 수익금').closest('.kpi-card') as HTMLElement;
    expect(returnCard.textContent).toContain('-10.00%');
    expect(returnCard.textContent).not.toContain('+-');
  });

  it('scopes decorative Anime.js to the grid root and reverts on unmount', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    const { unmount } = render(<KPIGrid {...baseProps} />);
    fireEvent.mouseEnter(screen.getByText('총 투자 원금').closest('.kpi-card') as HTMLElement);

    expect(createScope).toHaveBeenCalledTimes(1);
    expect(createScope.mock.calls[0][0].root).toBeInstanceOf(HTMLDivElement);
    expect(animate).toHaveBeenCalled();

    unmount();

    expect(revert).toHaveBeenCalledTimes(1);
  });

  it('uses immediate decorative final states and disables transitions when reduced motion is requested', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    stubMotionPreference(true);

    render(<KPIGrid {...baseProps} />);

    const rollingSnowballCard = screen.getByText('총 투자 원금').closest('.kpi-card') as HTMLElement;
    const snowAccumulationCard = screen.getByText('누적 적립금').closest('.kpi-card') as HTMLElement;
    fireEvent.mouseEnter(rollingSnowballCard);
    fireEvent.mouseEnter(snowAccumulationCard);

    expect(createScope).not.toHaveBeenCalled();
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByText('Milestone')).toBeTruthy();
    expect(rollingSnowballCard.querySelector('.kpi-rolling-snowball')?.classList.contains('opacity-100')).toBe(true);
    expect(rollingSnowballCard.querySelector('.kpi-rolling-snowball')?.classList.contains('translate-x-[450%]')).toBe(true);
    expect(snowAccumulationCard.querySelector('.kpi-snow-overlay')?.classList.contains('opacity-100')).toBe(true);
    expect(snowAccumulationCard.querySelector('.kpi-snow-particle')?.getAttribute('style')).toContain('top: 110%');
    expect(snowAccumulationCard.querySelector('.kpi-snow-base')?.classList.contains('h-8')).toBe(true);
    expect(rollingSnowballCard.classList.contains('motion-reduce:transition-none')).toBe(true);
    const shareButton = screen.getByRole('button', { name: '공유(이미지)' });
    expect(shareButton.classList.contains('motion-reduce:transition-none')).toBe(true);
    expect(shareButton.querySelector('svg')?.classList.contains('motion-reduce:transition-none')).toBe(true);
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

  it('uses CSS instead of Anime.js for grid entrance states', () => {
    createScope.mockImplementation(() => ({ add: vi.fn((callback: () => void) => callback()), revert }));
    animate.mockReturnValue({ revert: vi.fn(), restart: vi.fn(), cancel: vi.fn() });
    stubMotionPreference(false);

    render(<KPIGrid {...baseProps} />);

    expect(animate.mock.calls.filter(([target]) => target === '.kpi-card')).toHaveLength(0);
    expect(animate.mock.calls.filter(([target]) => target === '.kpi-share-button')).toHaveLength(0);
  });
});
