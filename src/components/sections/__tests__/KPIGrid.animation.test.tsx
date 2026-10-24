// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KPIGrid from '../KPIGrid';

const { animate, revert } = vi.hoisted(() => ({
  animate: vi.fn(),
  revert: vi.fn(),
}));

vi.mock('animejs/animation', () => ({ animate }));

const baseProps = {
  initialPrincipal: 10_000,
  totalContribution: 50_000,
  totalReturn: 50_000,
  returnPercentage: 100,
  cagr: 7.5,
  currency: 'USD' as const,
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

describe('KPIGrid', () => {
  it('explains principal as initial plus accumulated deposits without repeating the final asset or a dollar estimate', () => {
    stubMotionPreference(true);
    render(<KPIGrid {...baseProps} currency="KRW" initialPrincipal={10_000_000} totalContribution={88_180_000} totalReturn={43_200_000} />);
    const principalCard = screen.getByText('투자 원금').closest('.kpi-card') as HTMLElement;
    expect(principalCard.textContent?.replace(/\u00a0/g, ' ')).toContain('초기 1,000만 원 + 적립 7,818만 원');
    expect(screen.queryByText(/최종/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/약 \$/);
  });

  it('preserves a small KRW balance and the monetary sign of a loss', () => {
    stubMotionPreference(true);
    render(<KPIGrid {...baseProps} currency="KRW" initialPrincipal={5000} totalContribution={5000} totalReturn={-5000} returnPercentage={-50} />);
    const assetCard = screen.getByText('투자 원금').closest('.kpi-card') as HTMLElement;
    const returnCard = screen.getByText('총 수익금').closest('.kpi-card') as HTMLElement;
    expect(assetCard.querySelector('dd [aria-live]')?.textContent).toBe('5,000원');
    expect(returnCard.querySelector('dd [aria-live]')?.textContent).toBe('-5,000원');
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

  it('gives each card its own snow reaction on hover and cleans it up', () => {
    animate.mockReturnValue({ revert, pause: vi.fn(), duration: 1000 });
    stubMotionPreference(false);

    const { unmount } = render(<KPIGrid {...baseProps} />);
    const cardFor = (label: string) => screen.getByText(label).closest('.kpi-card') as HTMLElement;
    const animatedClasses = () => animate.mock.calls.map(([target]) => (target as HTMLElement).className);

    fireEvent.pointerEnter(cardFor('투자 원금'));
    expect(animatedClasses().some((name) => name.includes('kpi-flake'))).toBe(true);
    expect(animatedClasses().some((name) => name.includes('kpi-snow-pile'))).toBe(true);

    animate.mockClear();
    fireEvent.pointerEnter(cardFor('총 수익금'));
    expect(animatedClasses()).toEqual([expect.stringContaining('kpi-roll')]);

    animate.mockClear();
    fireEvent.pointerEnter(cardFor('연복리 수익률 (CAGR)'));
    expect(animatedClasses()).toEqual([expect.stringContaining('kpi-twinkle')]);

    unmount();
    expect(revert).toHaveBeenCalled();
  });

  it('keeps the delayed snow pile until it has finished melting', () => {
    vi.useFakeTimers();
    try {
      animate.mockReturnValue({ revert, pause: vi.fn(), duration: 2000 });
      revert.mockClear();
      stubMotionPreference(false);
      render(<KPIGrid {...baseProps} />);
      fireEvent.pointerEnter(screen.getByText('투자 원금').closest('.kpi-card') as HTMLElement);

      vi.advanceTimersByTime(2200); // the pile starts 350ms late, so it is still fading here
      expect(revert).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(revert).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders no decorations and never animates when reduced motion is requested', () => {
    stubMotionPreference(true);
    render(<KPIGrid {...baseProps} />);
    fireEvent.pointerEnter(screen.getByText('총 수익금').closest('.kpi-card') as HTMLElement);
    expect(animate).not.toHaveBeenCalled();
    expect(document.querySelector('.kpi-roll, .kpi-flake, .kpi-twinkle')).toBeNull();
    const shareButton = screen.getByRole('button', { name: '공유(이미지)' });
    expect(shareButton.classList.contains('motion-reduce:transition-none')).toBe(true);
  });

  it('keeps the share button usable while cards react', () => {
    animate.mockReturnValue({ revert, pause: vi.fn(), duration: 1000 });
    stubMotionPreference(false);
    render(<KPIGrid {...baseProps} />);
    fireEvent.pointerEnter(screen.getByText('투자 원금').closest('.kpi-card') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '공유(이미지)' }));
    expect(baseProps.onShare).toHaveBeenCalledTimes(1);
  });
});
