// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import BacktestPrimaryMetrics from '../BacktestPrimaryMetrics';

afterEach(cleanup);

describe('BacktestPrimaryMetrics', () => {
  it('shows the four approved metrics and their context', () => {
    render(
      <BacktestPrimaryMetrics
        assetId="SPY"
        valueBasis="REAL"
        cumulativeReturn={1.2345}
        cagr={0.1234}
        mdd={0.337}
        investedPrincipal={115_660_000}
        currency="KRW"
      />,
    );

    expect(screen.getByRole('heading', { name: 'SPY 핵심 지표 · 실질 기준' })).toBeTruthy();
    expect(screen.getByText('누적수익률').parentElement?.textContent).toContain('123.45%');
    expect(screen.getByText('연평균수익률 (CAGR)').parentElement?.textContent).toContain('12.34%');
    expect(screen.getByText('최대낙폭 (MDD)').parentElement?.textContent).toContain('-33.70%');
    expect(screen.getByText('투자원금').parentElement?.textContent).toContain('1억 1,566만 원');
    expect(screen.queryByText(/최종.*자산/)).toBeNull();
    expect(screen.queryByText(/IRR/)).toBeNull();
  });

  it('names nominal and gold-relative bases explicitly', () => {
    const props = {
      assetId: 'QQQ' as const,
      cumulativeReturn: 0,
      cagr: 0,
      mdd: 0,
      investedPrincipal: 100,
      currency: 'USD' as const,
    };
    const { rerender } = render(<BacktestPrimaryMetrics {...props} valueBasis="NOMINAL" />);
    expect(screen.getByRole('heading', { name: 'QQQ 핵심 지표 · 명목 기준' })).toBeTruthy();
    expect(screen.getByText('최대낙폭 (MDD)').parentElement?.textContent).toContain('0.00%');
    expect(screen.getByText('최대낙폭 (MDD)').parentElement?.textContent).not.toContain('-0.00%');
    rerender(<BacktestPrimaryMetrics {...props} valueBasis="GOLD" />);
    expect(screen.getByRole('heading', { name: 'QQQ 핵심 지표 · 금 기준' })).toBeTruthy();
  });
});
