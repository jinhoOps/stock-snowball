// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import BacktestView, { type BacktestViewProps, type ComparisonAssetResult } from '../BacktestView';
import { prepareBacktestDisplayResult } from '../../../core/ValueBasis';
import { SnowballEngine } from '../../../core/SnowballEngine';

vi.mock('../../charts/BacktestChart', () => ({
  default: ({
    series,
    marketTrend,
  }: {
    series: Array<{ assetId: string; points: Array<{ value: number }> }>;
    marketTrend?: { benchmarkId: string; label: string };
  }) => (
    <>
      <output aria-label={`차트 최종값: ${series.map((item) => `${item.assetId} ${item.points.at(-1)?.value ?? 0}`).join(', ')}`} />
      {marketTrend && (
        <output data-testid="market-trend-legend">
          {marketTrend.benchmarkId}|{marketTrend.label}
        </output>
      )}
    </>
  ),
}));

const baseProps: BacktestViewProps = {
  primaryAsset: 'SPY',
  startDate: '2024-01-01',
  endDate: '2025-01-01',
  comparisonAssets: [],
  scenarioSeries: [],
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

const basisResult: ComparisonAssetResult = {
  status: 'success',
  assetId: 'SPY',
  targetMultiple: 1,
  portfolio: {
    history: [
      { date: '2024-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 121, principal: 100 },
    ],
    metrics: {
      totalReturn: 0.1, cagr: 0.1, irr: 0.1, mdd: 0, volatility: 0,
      finalValue: 110, totalPrincipal: 100, finalAnnualDividend: 0,
      estimatedTax: 11, totalFees: 0,
    },
  },
  product: {
    points: [{ date: '2024-01-01', value: 100 }, { date: '2025-01-01', value: 110 }],
    metrics: { cumulativeReturn: 0.1, cagr: 0.1, mdd: 0, volatility: 0 },
  },
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
  it('derives the optional market trend solely from the active primary asset', async () => {
    // Catches the production break where the market source ignores the active asset or bypasses the default-off toggle.
    const user = userEvent.setup();
    const props: BacktestViewProps = {
      ...baseProps,
      primaryAsset: 'QQQ',
      comparisonAssets: ['SPY'],
      results: [basisResult],
    };
    const { rerender } = render(<BacktestView {...props} />);

    expect(screen.queryByTestId('market-trend-legend')).toBeNull();
    await user.click(screen.getByRole('button', { name: '시장 추세' }));
    expect(screen.getByTestId('market-trend-legend').textContent).toBe('NASDAQ100|나스닥100');
    rerender(<BacktestView {...props} primaryAsset="SPY" comparisonAssets={['QQQ']} />);
    expect(screen.getByTestId('market-trend-legend').textContent).toBe('SP500|S&P 500');

    rerender(<BacktestView {...props} primaryAsset="KOSPI" comparisonAssets={['SPY']} />);
    expect(screen.getByTestId('market-trend-legend').textContent).toBe('KOSPI_INDEX|코스피');

    rerender(<BacktestView {...props} primaryAsset="AMD" comparisonAssets={['SPY']} />);
    expect(screen.queryByTestId('market-trend-legend')).toBeNull();
    expect(screen.queryByRole('button', { name: '시장 추세' })).toBeNull();
  });

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
      results: [basisResult],
      goldData: [
        { date: '2024-01-01', price: 2_000, dividendYield: 0 },
        { date: '2025-01-01', price: 2_100, dividendYield: 0 },
      ],
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
    render(<BacktestView
      {...baseProps}
      results={[basisResult]}
      goldBasisError="GOLD 데이터는 2000-08-30부터 사용할 수 있습니다."
    />);

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

  it('foregrounds product return, CAGR, and MDD with the selected period context', () => {
    render(<BacktestView {...baseProps} results={[basisResult]} />);

    const summary = screen.getByTestId('product-performance-summary');
    expect(summary.textContent).toContain('선택 기간 성과 비교');
    expect(summary.textContent).toContain('2024-01-01 ~ 2025-01-01');
    expect(summary.textContent).toContain('수익률·CAGR·MDD: 배당 재투자 포함 · 납입액 영향 제외');
    expect(summary.textContent).toContain('최종 자산: 납입 포함');

    const headings = screen.getAllByRole('columnheader').map((heading) => heading.textContent);
    expect(headings).toEqual([
      '자산',
      '누적수익률',
      '연평균수익률 (CAGR)',
      '최대낙폭 (MDD)',
      '포트폴리오 최종 자산 (납입 포함)',
      '변동성',
    ]);
  });

  it('uses the prepared REAL product metrics and portfolio principal in the primary strip', () => {
    const contributionResult: ComparisonAssetResult = {
      ...basisResult,
      portfolio: {
        ...basisResult.portfolio,
        history: [
          { date: '2024-01-01', value: 100, principal: 100 },
          { date: '2025-01-01', value: 133.1, principal: 121 },
        ],
        metrics: {
          ...basisResult.portfolio.metrics,
          finalValue: 121,
          totalPrincipal: 121,
        },
      },
    };
    const prepared = prepareBacktestDisplayResult(
      contributionResult.portfolio,
      contributionResult.product,
      'REAL',
      { inflationRate: 0.1, gold: [] },
    );
    const expectedPrincipal = SnowballEngine.formatBigNumber(
      prepared.portfolioHistory.at(-1)!.principal,
      'USD',
    );

    render(
      <BacktestView
        {...baseProps}
        results={[contributionResult]}
        valueBasis="REAL"
        inflationRate={0.1}
      />,
    );

    const metrics = screen.getByRole('region', { name: 'SPY 핵심 지표 · 실질 기준' });
    expect(metrics.textContent).toContain(expectedPrincipal);
    expect(metrics.textContent).not.toContain('$121');
    expect(metrics.textContent).toContain('-0.02%');
  });

  it('labels mobile product metrics independently from the contribution-inclusive portfolio value', () => {
    render(<BacktestView {...baseProps} results={[basisResult]} />);

    const mobileCard = screen.getByRole('article', { name: 'SPY 상품 성과' });
    expect(mobileCard.textContent).toContain('누적수익률');
    expect(mobileCard.textContent).toContain('CAGR');
    expect(mobileCard.textContent).toContain('MDD');
    expect(mobileCard.textContent).toContain('포트폴리오 IRR (납입 포함)');
    expect(mobileCard.textContent).toContain('포트폴리오 최종 자산 (납입 포함)');
    expect(screen.getByRole('table').textContent).toContain('포트폴리오 IRR 9.98%');
  });

  it('does not show an empty product-performance summary when calculation is unavailable', () => {
    render(<BacktestView {...baseProps} results={[]} />);

    expect(screen.queryByTestId('product-performance-summary')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: '투자 결과' })).toBeNull();
    expect(screen.queryByText('자산별 과거 성과 비교')).toBeNull();
    expect(screen.queryByLabelText(/차트 최종값/)).toBeNull();
    expect(screen.queryByText(/투자 결과에는 매수 수수료/)).toBeNull();
  });

  it('uses the same REAL portfolio series in the table, cards, and chart', () => {
    render(
      <BacktestView
        {...baseProps}
        results={[basisResult]}
        valueBasis="REAL"
        inflationRate={0.1}
      />,
    );

    expect(screen.getByLabelText(/차트 최종값: SPY 99\.980431/)).toBeTruthy();
    expect(screen.getAllByText('$100')).toHaveLength(3);
    expect(screen.getAllByText('-0.02%').length).toBeGreaterThanOrEqual(2);
  });

  it('uses the same GOLD-normalized product series in the table and chart', () => {
    render(
      <BacktestView
        {...baseProps}
        results={[basisResult]}
        valueBasis="GOLD"
        resultView="NORMALIZED"
        goldData={[
          { date: '2024-01-01', price: 2_000, dividendYield: 0 },
          { date: '2025-01-01', price: 2_200, dividendYield: 0 },
        ]}
      />,
    );

    expect(screen.getByLabelText(/차트 최종값: SPY (99\.999|100)/)).toBeTruthy();
    expect(screen.getAllByText('$100')).toHaveLength(3);
    expect(screen.getAllByText('0.00%').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('시작일 금 가치 기준')).toBeTruthy();
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

  it('keeps selected assets visible and collapses unselected individual assets', async () => {
    const user = userEvent.setup();
    render(
      <BacktestView
        {...baseProps}
        comparisonAssets={['QLD']}
        results={[basisResult]}
      />,
    );

    const picker = screen.getByRole('group', { name: '선택 자산' });
    expect(picker.textContent).toContain('SPY');
    expect(picker.textContent).toContain('QLD');

    const disclosure = screen.getByText('개별 종목 추가').closest('details');
    expect(disclosure?.hasAttribute('open')).toBe(false);
    expect(screen.queryByRole('button', { name: 'AMD 개별 자산 선택' })).toBeNull();

    await user.click(screen.getByText('개별 종목 추가'));
    expect(screen.getByRole('button', { name: 'AMD 개별 자산 선택' })).toBeTruthy();
  });

  it('keeps individual selection to three total assets', async () => {
    const user = userEvent.setup();
    const onComparisonAssetsChange = vi.fn();
    render(
      <BacktestView
        {...baseProps}
        primaryAsset="QQQ"
        comparisonAssets={['QLD', 'TQQQ']}
        results={[basisResult]}
        onComparisonAssetsChange={onComparisonAssetsChange}
      />,
    );

    await user.click(screen.getByText('개별 종목 추가'));
    const unavailableAsset = screen.getByRole('button', { name: 'AMD 개별 자산 선택' });
    expect(unavailableAsset.hasAttribute('disabled')).toBe(true);
    expect(unavailableAsset.getAttribute('title')).toContain('최대 3개');
    expect(unavailableAsset.getAttribute('aria-describedby')).toBe('asset-selection-limit');

    await user.click(unavailableAsset);

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
        results={[basisResult]}
        onComparisonAssetsChange={onComparisonAssetsChange}
        onResultViewChange={onResultViewChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'QLD 비교 자산 제거' }));
    await user.click(screen.getByRole('button', { name: '시작값 100' }));

    expect(onComparisonAssetsChange).toHaveBeenCalledWith(['TQQQ']);
    expect(onResultViewChange).toHaveBeenCalledWith('NORMALIZED');
  });

  it('orders summary metrics, controls, chart, detail, and sharing as one analysis flow', () => {
    render(
      <BacktestView
        {...baseProps}
        results={[basisResult]}
        onShare={vi.fn()}
      />,
    );

    const orderedNodes = [
      screen.getByRole('region', { name: 'SPY 핵심 지표 · 명목 기준' }),
      screen.getByRole('group', { name: '선택 자산' }),
      screen.getByRole('group', { name: '결과 보기' }),
      screen.getByRole('region', { name: '자산별 과거 성과 비교' }),
      screen.getByTestId('product-performance-summary'),
      screen.getByRole('button', { name: '공유(이미지)' }),
    ];

    for (let index = 0; index < orderedNodes.length - 1; index += 1) {
      expect(
        orderedNodes[index].compareDocumentPosition(orderedNodes[index + 1])
        & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });
});
