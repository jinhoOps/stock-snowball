// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import BacktestView, { type BacktestViewProps, type ComparisonAssetResult } from '../BacktestView';

const baseProps: BacktestViewProps = {
  primaryAsset: 'SPY',
  comparisonAssets: [],
  results: [],
  leverageInsights: [],
  currency: 'USD',
  valueBasis: 'NOMINAL',
  resultView: 'PORTFOLIO',
  goldBasisError: null,
  onFamilySelect: vi.fn(),
  onComparisonAssetsChange: vi.fn(),
  onValueBasisChange: vi.fn(),
  onResultViewChange: vi.fn(),
};

afterEach(cleanup);

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterAll(() => vi.unstubAllGlobals());

describe('BacktestView', () => {
  it('selects the entire Nasdaq family from one accessible button', async () => {
    const user = userEvent.setup();
    const onFamilySelect = vi.fn();
    render(<BacktestView {...baseProps} onFamilySelect={onFamilySelect} />);

    await user.click(screen.getByRole('button', { name: '나스닥 레버리지 가족 선택' }));

    expect(onFamilySelect).toHaveBeenCalledWith('NASDAQ');
  });

  it('changes value basis without changing the nominal leverage insight', async () => {
    const user = userEvent.setup();
    const onValueBasisChange = vi.fn();
    const props: BacktestViewProps = {
      ...baseProps,
      primaryAsset: 'AMD',
      comparisonAssets: ['AMDL'],
      leverageInsights: [{
        assetId: 'AMDL',
        targetMultiple: 2,
        underlyingReturn: 0.40,
        actualReturn: 0.55,
        simpleReference: 0.80,
        difference: -0.25,
      }],
      resultView: 'NORMALIZED',
      onValueBasisChange,
    };
    const { rerender } = render(<BacktestView {...props} />);
    const nominalInsight = screen.getByTestId('leverage-insight').textContent;

    await user.click(screen.getByRole('button', { name: '금 기준' }));
    expect(onValueBasisChange).toHaveBeenCalledWith('GOLD');
    rerender(<BacktestView {...props} valueBasis="GOLD" />);

    expect(screen.getByRole('button', { name: '금 기준' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('leverage-insight').textContent).toBe(nominalInsight);
    expect(screen.getByText('명목 상품 성과')).toBeTruthy();
  });

  it('disables gold basis and exposes the coverage reason', () => {
    render(<BacktestView {...baseProps} goldBasisError="GOLD 데이터는 2000-08-30부터 사용할 수 있습니다." />);

    const goldButton = screen.getByRole('button', { name: '금 기준' });
    expect(goldButton.hasAttribute('disabled')).toBe(true);
    expect(goldButton.getAttribute('title')).toContain('2000-08-30');
    expect(screen.getByText(/GOLD 데이터는 2000-08-30부터/)).toBeTruthy();
  });

  it('falls back to nominal rendering when a selected gold basis loses coverage', () => {
    const result: ComparisonAssetResult = {
      status: 'success',
      assetId: 'SPY',
      targetMultiple: 1,
      portfolio: {
        history: [
          { date: '2024-01-02', value: 100, principal: 100 },
          { date: '2024-01-03', value: 110, principal: 100 },
        ],
        metrics: {
          totalReturn: 0.1, cagr: 0.1, irr: 0.1, mdd: 0, volatility: 0,
          finalValue: 110, totalPrincipal: 100, finalAnnualDividend: 0,
          estimatedTax: 0, totalFees: 0,
        },
      },
      product: {
        points: [{ date: '2024-01-02', value: 100 }, { date: '2024-01-03', value: 110 }],
        metrics: { cumulativeReturn: 0.1, cagr: 0.1, mdd: 0, volatility: 0 },
      },
    };

    render(<BacktestView {...baseProps} results={[result]} valueBasis="GOLD" goldBasisError="금 기준 범위를 벗어났습니다." />);

    expect(screen.getByRole('button', { name: '명목' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '금 기준' }).hasAttribute('disabled')).toBe(true);
  });

  it('uses the after-tax final value in table, mobile card, and chart data', () => {
    const result: ComparisonAssetResult = {
      status: 'success',
      assetId: 'SPY',
      targetMultiple: 1,
      portfolio: {
        history: [
          { date: '2024-01-02', value: 100, principal: 100 },
          { date: '2024-01-03', value: 121, principal: 100 },
        ],
        metrics: {
          totalReturn: 0.1, cagr: 0.1, irr: 0.1, mdd: 0, volatility: 0,
          finalValue: 110, totalPrincipal: 100, finalAnnualDividend: 0,
          estimatedTax: 11, totalFees: 0,
        },
      },
      product: {
        points: [{ date: '2024-01-02', value: 100 }, { date: '2024-01-03', value: 121 }],
        metrics: { cumulativeReturn: 0.21, cagr: 0.21, mdd: 0, volatility: 0 },
      },
    };

    render(<BacktestView {...baseProps} results={[result]} />);

    expect(screen.getAllByText('$110')).toHaveLength(2);
    expect(screen.queryByText('$121')).toBeNull();
    expect(screen.getByLabelText('차트 최종값: SPY 110')).toBeTruthy();
    expect(screen.getByText(/ISA 만기 세금 추정치가 포함됩니다/)).toBeTruthy();
  });

  it('shows an asset calculation error inline', () => {
    const result: ComparisonAssetResult = {
      status: 'error',
      assetId: 'AMDL',
      targetMultiple: 2,
      error: '선택 기간에 데이터가 부족합니다.',
    };

    render(<BacktestView {...baseProps} primaryAsset="AMD" comparisonAssets={['AMDL']} results={[result]} />);

    expect(screen.getByRole('alert').textContent).toContain('AMDL');
    expect(screen.getByRole('alert').textContent).toContain('선택 기간에 데이터가 부족합니다.');
  });

  it('keeps individual selection to three total assets', async () => {
    const user = userEvent.setup();
    const onComparisonAssetsChange = vi.fn();
    render(
      <BacktestView
        {...baseProps}
        primaryAsset="QQQ"
        comparisonAssets={['QLD', 'TQQQ']}
        onComparisonAssetsChange={onComparisonAssetsChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /AMD 개별 자산/ }));

    expect(onComparisonAssetsChange).not.toHaveBeenCalled();
  });

  it('removes a selected individual asset and changes the result view', async () => {
    const user = userEvent.setup();
    const onComparisonAssetsChange = vi.fn();
    const onResultViewChange = vi.fn();
    render(
      <BacktestView
        {...baseProps}
        primaryAsset="QQQ"
        comparisonAssets={['QLD', 'TQQQ']}
        onComparisonAssetsChange={onComparisonAssetsChange}
        onResultViewChange={onResultViewChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'QLD 개별 자산 선택됨' }));
    await user.click(screen.getByRole('button', { name: '시작값 100' }));

    expect(onComparisonAssetsChange).toHaveBeenCalledWith(['TQQQ']);
    expect(onResultViewChange).toHaveBeenCalledWith('NORMALIZED');
  });
});
