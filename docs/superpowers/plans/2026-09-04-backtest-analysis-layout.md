# Backtest Analysis Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated backtest chart and legacy KPI grid with one detailed-analysis surface that keeps the final asset headline and foregrounds cumulative return, CAGR, MDD, and invested principal.

**Architecture:** Keep projection mode's `SnowballChart` and `KPIGrid` unchanged. In backtest mode, `BacktestView` becomes the single analysis owner: it derives the primary product metrics from the already prepared value-basis result, renders a focused four-metric strip, and delegates the sole chart slot to a new `BacktestAnalysisChart` that switches between asset analysis and saved-scenario comparison without mounting two charts at once.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 3, Visx 4, Framer Motion 12, Vitest 4, Testing Library, Playwright 1.62, Vite 6.

**Spec:** `docs/superpowers/reports/2026-09-04-backtest-page-design-audit.md`

## Scope Check

This is one cohesive backtest-layout workstream. The metric hierarchy, chart ownership, selector density, and browser coverage all change the same `BacktestView` composition and must land in that dependency order; no unrelated subsystem is included.

## Global Constraints

- Keep `백테스트 최종 자산` as the standalone contribution-inclusive, after-tax headline.
- The four backtest primary metrics are exactly `누적수익률`, `연평균수익률 (CAGR)`, `최대낙폭 (MDD)`, and `투자원금`.
- Product return, CAGR, and MDD exclude contributions and come from the prepared primary product series.
- Invested principal includes contributions and comes from the final prepared primary portfolio-history point.
- Keep contribution-aware portfolio IRR in the detailed desktop table and mobile cards; do not promote it into the four-metric strip.
- Apply nominal, real, and gold value bases consistently to the primary metrics, table, and chart.
- Keep asset selection, leverage insights, calculation errors, result view, value basis, market trend, sharing, scenario saving, and saved-scenario comparison available in backtest mode.
- Show one chart at a time in backtest mode; asset analysis is the default.
- Keep the market index, SMA20, and SMA60 available but hidden by default behind a labeled `시장 추세` toggle.
- Preserve the selected start and end dates whenever the selected assets have coverage; keep the existing explicit range notice when correction is required.
- Keep projection mode behavior and appearance unchanged.
- Use existing Apple-style colors, spacing tokens, focus rings, pressed states, and reduced-motion behavior.
- Add no dependency and make no market-data or calculation-engine change.
- Use TDD for production changes and commit after each independently reviewable task.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/sections/BacktestPrimaryMetrics.tsx` | Render the four backtest-only primary metrics with asset and value-basis context. |
| `src/components/sections/__tests__/BacktestPrimaryMetrics.test.tsx` | Verify exact labels, formatting, negative MDD, basis context, and absence of final asset/IRR. |
| `src/components/sections/BacktestAnalysisChart.tsx` | Own the one-chart-at-a-time switch and optional market-trend overlay. |
| `src/components/sections/__tests__/BacktestAnalysisChart.test.tsx` | Verify default asset chart, overlay toggle, scenario chart switch, and single mounted chart. |
| `src/components/charts/SnowballChart.tsx` | Export its scenario and selection types so the analysis wrapper can consume existing scenario data without duplicating contracts. |
| `src/components/sections/BacktestView.tsx` | Compose metrics, compact selectors, controls, table, one chart slot, insights, errors, and share action. |
| `src/components/sections/__tests__/BacktestView.test.tsx` | Verify prepared primary metric sources, content order, compact selector behavior, and detailed-analysis preservation. |
| `src/App.tsx` | Render the legacy chart/KPI path only for projection and pass saved-scenario series into `BacktestView`. |
| `src/__tests__/App.integration.test.tsx` | Verify projection/backtest branching, date stability, family selection, value basis, and scenario-series wiring. |
| `e2e/backtest-analysis-layout.spec.ts` | Exercise the complete desktop/mobile backtest flow and save visual-review screenshots. |
| `e2e/leverage-comparison.spec.ts` | Run unchanged as regression coverage for directly visible family shortcuts and basis controls. |
| `e2e/market-trend-overlay.spec.ts` | Enable the market overlay before asserting the existing index/SMA behavior. |

---

### Task 1: Add the backtest primary metric strip

**Files:**
- Create: `src/components/sections/BacktestPrimaryMetrics.tsx`
- Create: `src/components/sections/__tests__/BacktestPrimaryMetrics.test.tsx`
- Modify: `src/components/sections/BacktestView.tsx:87-125`
- Modify: `src/components/sections/BacktestView.tsx:135-331`
- Modify: `src/components/sections/__tests__/BacktestView.test.tsx`

**Interfaces:**
- Produces: `BacktestPrimaryMetricsProps { assetId, valueBasis, cumulativeReturn, cagr, mdd, investedPrincipal, currency }`.
- Consumes: the primary successful prepared result already calculated inside `BacktestView`.
- Keeps: product metrics contribution-free and invested principal contribution-inclusive.

- [ ] **Step 0: Lock the calculation baseline before changing presentation**

Run:

```bash
npm test -- src/core/__tests__/ProductPerformance.test.ts src/core/__tests__/ValueBasis.test.ts src/core/__tests__/Integrity.test.ts src/core/__tests__/SnowballEngine.test.ts
```

Expected: PASS. These tests pin calendar-day CAGR, cumulative return, positive-magnitude MDD, daily/long-horizon compounding, and nominal/real/gold transformations. If any fail before UI work, stop and diagnose that calculation failure as a separate change instead of masking it in layout code.

- [ ] **Step 1: Write focused component tests that define the four-metric contract**

Create `BacktestPrimaryMetrics.test.tsx` with this fixture and assertions:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BacktestPrimaryMetrics from '../BacktestPrimaryMetrics';

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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestPrimaryMetrics.test.tsx
```

Expected: FAIL because `BacktestPrimaryMetrics.tsx` does not exist.

- [ ] **Step 3: Implement the metric strip**

Create the component with the exact public contract:

```tsx
import type { HistoricalAssetType, ValueBasis } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';

export interface BacktestPrimaryMetricsProps {
  assetId: HistoricalAssetType;
  valueBasis: ValueBasis;
  cumulativeReturn: number;
  cagr: number;
  mdd: number;
  investedPrincipal: number;
  currency: 'KRW' | 'USD';
}

const BASIS_LABEL: Record<ValueBasis, string> = {
  NOMINAL: '명목',
  REAL: '실질',
  GOLD: '금',
};

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const drawdown = (value: number) => {
  const magnitude = Math.abs(value);
  return magnitude === 0 ? '0.00%' : `-${percent(magnitude)}`;
};

const BacktestPrimaryMetrics = ({
  assetId,
  valueBasis,
  cumulativeReturn,
  cagr,
  mdd,
  investedPrincipal,
  currency,
}: BacktestPrimaryMetricsProps) => {
  const metrics = [
    { label: '누적수익률', value: percent(cumulativeReturn) },
    { label: '연평균수익률 (CAGR)', value: percent(cagr) },
    { label: '최대낙폭 (MDD)', value: drawdown(mdd) },
    { label: '투자원금', value: SnowballEngine.formatBigNumber(investedPrincipal, currency) },
  ];

  return (
    <section className="w-full" aria-labelledby="backtest-primary-metrics-heading">
      <h2 id="backtest-primary-metrics-heading" className="mb-4 text-title-sm text-apple-ink font-display">
        {assetId} 핵심 지표 · {BASIS_LABEL[valueBasis]} 기준
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/60 bg-apple-surface-pearl p-4 shadow-sm">
            <dt className="text-fine-print text-apple-ink-muted-48">{metric.label}</dt>
            <dd className="mt-2 text-title-md font-semibold text-apple-ink font-display">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default BacktestPrimaryMetrics;
```

- [ ] **Step 4: Wire prepared primary metrics into `BacktestView` and test the data source**

In `BacktestView`, derive the primary result after `preparedResults`:

```tsx
const primaryPreparedResult = preparedResults.find((result) => result.assetId === primaryAsset);
const primaryPortfolioPoint = primaryPreparedResult?.portfolioHistory.at(-1);
```

Render `BacktestPrimaryMetrics` only when both values exist:

```tsx
{primaryPreparedResult && primaryPortfolioPoint ? (
  <BacktestPrimaryMetrics
    assetId={primaryAsset}
    valueBasis={displayBasis}
    cumulativeReturn={primaryPreparedResult.productMetrics.cumulativeReturn}
    cagr={primaryPreparedResult.productMetrics.cagr}
    mdd={primaryPreparedResult.productMetrics.mdd}
    investedPrincipal={primaryPortfolioPoint.principal}
    currency={currency}
  />
) : null}
```

Add this `BacktestView.test.tsx` case. Import `prepareBacktestDisplayResult` and `SnowballEngine` at the top of the test file:

```tsx
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
```

Keep the existing six detailed-table headers so the table does not gain another narrow column:

```tsx
expect(headings).toEqual([
  '자산',
  '누적수익률',
  '연평균수익률 (CAGR)',
  '최대낙폭 (MDD)',
  '포트폴리오 최종 자산 (납입 포함)',
  '변동성',
]);
```

Replace the desktop final-asset cell with a value plus a secondary IRR line:

```tsx
<td className="p-4 font-display font-semibold text-apple-ink">
  <span className="block">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</span>
  <span className="mt-1 block text-fine-print font-normal text-apple-ink-muted-48">
    포트폴리오 IRR {percentage(result.portfolioIrr)}
  </span>
</td>
```

Insert this mobile detail immediately before the final-asset detail; retain the two-column grid so the third item wraps instead of compressing the labels:

```tsx
<div>
  <dt className="text-apple-ink-muted-48">포트폴리오 IRR (납입 포함)</dt>
  <dd className="font-semibold text-apple-ink">{percentage(result.portfolioIrr)}</dd>
</div>
```

Extend the mobile-card test with:

```tsx
expect(mobileCard.textContent).toContain('포트폴리오 IRR (납입 포함)');
expect(screen.getByRole('table').textContent).toContain('포트폴리오 IRR 10.00%');
```

For the detailed table and mobile cards, add the same zero-safe helper next to `percentage`:

```tsx
const drawdownPercentage = (value: number) => {
  const magnitude = Math.abs(value);
  return magnitude === 0 ? '0.00%' : `-${percentage(magnitude)}`;
};
```

Replace both `-{percentage(result.productMetrics.mdd)}` expressions with `drawdownPercentage(result.productMetrics.mdd)`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestPrimaryMetrics.test.tsx src/components/sections/__tests__/BacktestView.test.tsx
```

Expected: both test files PASS.

- [ ] **Step 6: Commit the metric strip**

```bash
git add src/components/sections/BacktestPrimaryMetrics.tsx src/components/sections/__tests__/BacktestPrimaryMetrics.test.tsx src/components/sections/BacktestView.tsx src/components/sections/__tests__/BacktestView.test.tsx
git commit -m "feat: foreground backtest return and risk metrics"
```

---

### Task 2: Create one backtest chart slot

**Files:**
- Create: `src/components/sections/BacktestAnalysisChart.tsx`
- Create: `src/components/sections/__tests__/BacktestAnalysisChart.test.tsx`
- Modify: `src/components/charts/SnowballChart.tsx:16-39`
- Modify: `src/components/sections/BacktestView.tsx:22-39`
- Modify: `src/components/sections/BacktestView.tsx:87-121`
- Modify: `src/components/sections/BacktestView.tsx:272-299`

**Interfaces:**
- Exports from `SnowballChart.tsx`: `SnowballScenarioPoint`, `SnowballScenarioData`, and `SnowballChartSelection`.
- Produces: `BacktestAnalysisMode = 'ASSET' | 'SCENARIO'`.
- Produces: `BacktestAnalysisChartProps { primaryAsset, assetSeries, scenarioSeries, currency, resultView, valueBasis, marketTrend }`.
- Guarantees: exactly one of `BacktestChart` or `SnowballChart` is mounted.
- Owns: saved-scenario point selection and detail rendering inside the shared chart slot, so `App` keeps point-detail state only for projection mode.

- [ ] **Step 1: Export the existing Snowball chart data contracts**

Replace the private chart types with exported equivalents without changing runtime behavior:

```tsx
export interface SnowballScenarioPoint {
  date: Date;
  value: number;
  realValue?: number;
  pessimistic?: number;
  optimistic?: number;
  contribution?: number;
}

export interface SnowballScenarioData {
  id: string;
  name: string;
  color: string;
  points: SnowballScenarioPoint[];
}

export interface SnowballChartSelection {
  date: Date;
  points: Array<{
    name: string;
    value: number;
    realValue?: number;
    color: string;
    pessimistic?: number;
    optimistic?: number;
  }>;
}

export interface SnowballChartProps {
  scenarios: SnowballScenarioData[];
  mode: SimulationMode;
  comparisonMode?: boolean;
  showRealValue?: boolean;
  onShowRealValueChange?: (show: boolean) => void;
  onPointSelect?: (data: SnowballChartSelection) => void;
  onPointHover?: (data: SnowballChartSelection | null) => void;
}
```

Rename every internal `DataPoint` reference to `SnowballScenarioPoint` and every internal `ScenarioData` reference to `SnowballScenarioData`. This is a type-only rename; do not change chart calculations, rendering, or callback invocation.

- [ ] **Step 2: Write the failing one-chart and market-toggle tests**

Create `BacktestAnalysisChart.test.tsx` with complete fixtures and the two chart mocks:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BacktestAnalysisChart from '../BacktestAnalysisChart';
import type { BacktestDisplaySeries } from '../../charts/BacktestChart';
import type { SnowballScenarioData } from '../../charts/SnowballChart';
import type { MarketTrendOverlay } from '../../../core/MarketTrend';

vi.mock('../../charts/BacktestChart', () => ({
  default: ({ marketTrend }: { marketTrend?: MarketTrendOverlay }) => (
    <div data-testid="asset-chart" data-market-trend={marketTrend ? 'on' : 'off'} />
  ),
}));

vi.mock('../../charts/SnowballChart', () => ({
  default: ({ onPointSelect }: { onPointSelect?: (selection: {
    date: Date;
    points: Array<{ name: string; value: number; color: string }>;
  }) => void }) => (
    <div data-testid="scenario-chart">
      <button
        type="button"
        onClick={() => onPointSelect?.({
          date: new Date('2024-01-01T00:00:00Z'),
          points: [{ name: '저장 백테스트', value: 120, color: '#1d1d1f' }],
        })}
      >
        시나리오 포인트 선택
      </button>
    </div>
  ),
}));

afterEach(cleanup);

const assetSeries: BacktestDisplaySeries[] = [{
  assetId: 'SPY',
  targetMultiple: 1,
  color: '#1d1d1f',
  points: [{ date: '2024-01-01', value: 100, principal: 100 }],
}];

const scenarioSeries: SnowballScenarioData[] = [
  { id: 'active', name: '현재 백테스트', color: '#0066cc', points: [{ date: new Date('2024-01-01T00:00:00Z'), value: 100 }] },
  { id: 'saved', name: '저장 백테스트', color: '#1d1d1f', points: [{ date: new Date('2024-01-01T00:00:00Z'), value: 120 }] },
];

const marketTrend: MarketTrendOverlay = {
  benchmarkId: 'SP500',
  ticker: '^GSPC',
  label: 'S&P 500',
  currency: 'USD',
  points: [{
    date: '2024-01-01',
    sourceDate: '2023-12-29',
    close: 100,
    sma20: null,
    sma60: null,
    indexedClose: 100,
    indexedSma20: null,
    indexedSma60: null,
  }],
};

const renderChart = (scenarios: SnowballScenarioData[] = scenarioSeries) => render(
  <BacktestAnalysisChart
    primaryAsset="SPY"
    assetSeries={assetSeries}
    scenarioSeries={scenarios}
    currency="USD"
    resultView="PORTFOLIO"
    valueBasis="NOMINAL"
    marketTrend={marketTrend}
  />,
);

describe('BacktestAnalysisChart', () => {
  it('shows the asset chart alone and keeps market trend off by default', async () => {
    const user = userEvent.setup();
    renderChart();

    expect(screen.getByTestId('asset-chart').dataset.marketTrend).toBe('off');
    expect(screen.queryByTestId('scenario-chart')).toBeNull();
    expect(screen.getByRole('button', { name: '시장 추세' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('거치식과 적립식이 섞인 투자 결과 · 명목 기준')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '시장 추세' }));

    expect(screen.getByTestId('asset-chart').dataset.marketTrend).toBe('on');
    expect(screen.getByRole('button', { name: '시장 추세' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('replaces the asset chart with the saved-scenario chart', async () => {
    const user = userEvent.setup();
    renderChart();

    await user.click(screen.getByRole('button', { name: '저장 시나리오 비교' }));

    expect(screen.queryByTestId('asset-chart')).toBeNull();
    expect(screen.getByTestId('scenario-chart')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '시장 추세' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '시나리오 포인트 선택' }));
    expect(screen.getByRole('heading', { name: '경과 개월수 기준 상세' })).toBeTruthy();
    expect(screen.getByText('저장 백테스트').parentElement?.textContent).toContain('$120');
  });

  it('does not offer scenario comparison when only the active scenario exists', () => {
    renderChart(scenarioSeries.slice(0, 1));

    expect(screen.queryByRole('button', { name: '저장 시나리오 비교' })).toBeNull();
    expect(screen.getByTestId('asset-chart')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestAnalysisChart.test.tsx
```

Expected: FAIL because `BacktestAnalysisChart.tsx` does not exist.

- [ ] **Step 4: Implement the chart-slot state machine**

Create `BacktestAnalysisChart.tsx` with these imports and exact public contract:

```tsx
import { useEffect, useState } from 'react';
import type { MarketTrendOverlay } from '../../core/MarketTrend';
import { SnowballEngine } from '../../core/SnowballEngine';
import type { HistoricalAssetType, ValueBasis } from '../../types/finance';
import BacktestChart, { type BacktestDisplaySeries } from '../charts/BacktestChart';
import SnowballChart, {
  type SnowballChartSelection,
  type SnowballScenarioData,
} from '../charts/SnowballChart';
import SegmentedControl from '../common/SegmentedControl';

export type BacktestAnalysisMode = 'ASSET' | 'SCENARIO';

export interface BacktestAnalysisChartProps {
  primaryAsset: HistoricalAssetType;
  assetSeries: BacktestDisplaySeries[];
  scenarioSeries: SnowballScenarioData[];
  currency: 'KRW' | 'USD';
  resultView: 'PORTFOLIO' | 'NORMALIZED';
  valueBasis: ValueBasis;
  marketTrend?: MarketTrendOverlay | null;
}

const BASIS_LABEL: Record<ValueBasis, string> = {
  NOMINAL: '명목',
  REAL: '실질',
  GOLD: '금',
};

const BacktestAnalysisChart = ({
  primaryAsset,
  assetSeries,
  scenarioSeries,
  currency,
  resultView,
  valueBasis,
  marketTrend,
}: BacktestAnalysisChartProps) => {
  const [mode, setMode] = useState<BacktestAnalysisMode>('ASSET');
  const [showMarketTrend, setShowMarketTrend] = useState(false);
  const [scenarioPoint, setScenarioPoint] = useState<SnowballChartSelection | null>(null);
  const hasScenarioComparison = scenarioSeries.length > 1;

  useEffect(() => {
    if (!hasScenarioComparison) setMode('ASSET');
  }, [hasScenarioComparison]);

  useEffect(() => {
    if (mode !== 'SCENARIO') setScenarioPoint(null);
  }, [mode]);

  return (
    <section className="w-full rounded-lg border border-white/60 bg-apple-surface-pearl p-4 shadow-sm" aria-labelledby="backtest-chart-heading">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 id="backtest-chart-heading" className="text-title-sm text-apple-ink font-display">
            {mode === 'ASSET' ? '자산별 과거 성과 비교' : '저장 시나리오 비교'}
          </h3>
          <p className="mt-1 text-fine-print text-apple-ink-muted-48">
            {mode === 'ASSET'
              ? `${resultView === 'PORTFOLIO' ? '거치식과 적립식이 섞인 투자 결과' : '기여금 없는 실제 상품 총수익'} · ${BASIS_LABEL[valueBasis]} 기준`
              : `${BASIS_LABEL[valueBasis]} 기준`}
          </p>
          {mode === 'ASSET' && marketTrend ? (
            <p className="mt-1 text-fine-print text-apple-ink-muted-48">
              주 자산 {primaryAsset} 대응 · {marketTrend.label} 시장 추세
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasScenarioComparison ? (
            <SegmentedControl
              label="백테스트 차트 종류"
              value={mode}
              options={[
                { value: 'ASSET', label: '종목 상세' },
                { value: 'SCENARIO', label: '저장 시나리오 비교' },
              ]}
              onChange={setMode}
            />
          ) : null}
          {mode === 'ASSET' && marketTrend ? (
            <button
              type="button"
              aria-pressed={showMarketTrend}
              onClick={() => setShowMarketTrend((value) => !value)}
              className={`rounded-pill border px-4 py-2 text-caption-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 ${showMarketTrend
                ? 'border-apple-surface-black bg-apple-surface-black text-apple-on-dark'
                : 'border-apple-hairline bg-apple-canvas-parchment text-apple-ink hover:border-apple-primary/40'}`}
            >
              시장 추세
            </button>
          ) : null}
        </div>
      </div>
      <div className="h-[360px] sm:h-[480px]">
        {mode === 'ASSET' ? (
          <BacktestChart
            series={assetSeries}
            currency={currency}
            resultView={resultView}
            marketTrend={showMarketTrend ? marketTrend : undefined}
          />
        ) : (
          <SnowballChart
            scenarios={scenarioSeries}
            mode="BACKTEST"
            comparisonMode
            onPointHover={(selection) => {
              if (selection) setScenarioPoint(selection);
            }}
            onPointSelect={setScenarioPoint}
          />
        )}
      </div>
      {mode === 'SCENARIO' && scenarioPoint ? (
        <div className="mt-4 rounded-lg border border-white/60 bg-white/80 p-4 shadow-inner">
          <div className="mb-4 flex items-center justify-between border-b border-apple-hairline pb-2">
            <h4 className="text-body-strong text-apple-ink font-display">경과 개월수 기준 상세</h4>
            <button
              type="button"
              onClick={() => setScenarioPoint(null)}
              className="text-caption text-apple-ink-muted-48 transition-colors hover:text-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary"
            >
              닫기
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {scenarioPoint.points.map((point) => (
              <div key={point.name} className="rounded-xl border border-white/60 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: point.color }} aria-hidden="true" />
                  <span className="truncate text-caption text-apple-gray">{point.name}</span>
                </div>
                <span className="text-body-strong font-bold text-apple-ink">
                  {SnowballEngine.formatBigNumber(point.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default BacktestAnalysisChart;
```

Do not persist either local view state.

- [ ] **Step 5: Replace the direct `BacktestChart` render in `BacktestView`**

Replace the chart import and add the metric/share imports:

```tsx
- import BacktestChart, { BacktestDisplaySeries } from '../charts/BacktestChart';
+ import type { SnowballScenarioData } from '../charts/SnowballChart';
+ import { type BacktestDisplaySeries } from '../charts/BacktestChart';
+ import BacktestAnalysisChart from './BacktestAnalysisChart';
+ import BacktestPrimaryMetrics from './BacktestPrimaryMetrics';
+ import { Share2 } from 'lucide-react';
```

Extend `BacktestViewProps`:

```tsx
scenarioSeries: SnowballScenarioData[];
onShare?: () => void;
```

Add `scenarioSeries` and `onShare` to the component destructuring, and add `scenarioSeries: []` to `baseProps` in `BacktestView.test.tsx`.

Replace the direct `BacktestChart` call at the current detailed-chart location with:

```tsx
<BacktestAnalysisChart
  primaryAsset={primaryAsset}
  assetSeries={chartSeries}
  scenarioSeries={scenarioSeries}
  currency={currency}
  resultView={resultView}
  valueBasis={displayBasis}
  marketTrend={marketTrend}
/>
```

After the leverage-insight block, render the share action with the same styling previously owned by `KPIGrid`:

```tsx
{onShare ? (
  <button
    type="button"
    onClick={onShare}
    className="flex items-center gap-2 rounded-pill bg-apple-ink/90 px-8 py-3 text-button-utility font-semibold text-apple-on-dark shadow-lg transition-all hover:bg-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none"
  >
    <Share2 className="h-4 w-4" aria-hidden="true" />
    공유(이미지)
  </button>
) : null}
```

Update the existing market-source test so it accounts for the new default-off behavior:

```tsx
it('derives the optional market trend solely from the active primary asset', async () => {
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
```

- [ ] **Step 6: Run the chart-slot and view tests**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestAnalysisChart.test.tsx src/components/sections/__tests__/BacktestView.test.tsx src/components/charts/__tests__/BacktestChart.test.tsx
```

Expected: all tests PASS; existing keyboard-slider and tooltip tests remain green.

- [ ] **Step 7: Commit the single chart slot**

```bash
git add src/components/charts/SnowballChart.tsx src/components/sections/BacktestAnalysisChart.tsx src/components/sections/__tests__/BacktestAnalysisChart.test.tsx src/components/sections/BacktestView.tsx src/components/sections/__tests__/BacktestView.test.tsx
git commit -m "feat: unify backtest charts in one analysis slot"
```

---

### Task 3: Branch projection and backtest layouts in the application shell

**Files:**
- Modify: `src/App.tsx:90-123`
- Modify: `src/App.tsx:404-540`
- Modify: `src/App.tsx:664-777`
- Modify: `src/__tests__/App.integration.test.tsx:34-181`
- Modify: `src/__tests__/App.integration.test.tsx`

**Interfaces:**
- Passes: `chartScenarios` as `scenarioSeries` to `BacktestView`.
- Passes: the existing share callback to `BacktestView`.
- Guarantees: `SnowballChart` and `KPIGrid` in the application shell render only when `mode === 'PROJECTION'`.
- Preserves: the standalone final-asset headline in both modes.

- [ ] **Step 1: Make the application mocks expose layout ownership**

Wrap the existing `SnowballChart` mock body so its value/color assertions remain available while its layout ownership becomes observable:

```tsx
vi.mock('../components/charts/SnowballChart', () => ({
  default: ({
    scenarios,
    onShowRealValueChange,
  }: {
    scenarios: Array<{
      name: string;
      color: string;
      points: Array<{ value: number; contribution?: number }>;
    }>;
    onShowRealValueChange?: (show: boolean) => void;
  }) => (
    <div data-testid="projection-chart">
      <output data-testid="chart-scenarios">
        {scenarios.map((scenario) => {
          const last = scenario.points.at(-1);
          return `${scenario.name}:${last?.value.toFixed(6)}:${last?.contribution?.toFixed(6) ?? '-'}`;
        }).join('|')}
      </output>
      <output data-testid="chart-colors">{scenarios.map((scenario) => scenario.color).join('|')}</output>
      {onShowRealValueChange ? (
        <button type="button" onClick={() => onShowRealValueChange(true)}>legacy real toggle</button>
      ) : null}
    </div>
  ),
}));

vi.mock('../components/sections/KPIGrid', () => ({
  default: ({ totalAsset, cagr, cagrLabel }: {
    totalAsset: number;
    cagr: number;
    cagrLabel?: string;
  }) => (
    <div data-testid="projection-kpis">
      <output data-testid="kpi-values">{totalAsset.toFixed(6)}|{cagr.toFixed(6)}</output>
      <output data-testid="kpi-rate-label">{cagrLabel}</output>
    </div>
  ),
}));
```

Add `scenarioSeries` to the existing `BacktestView` mock parameter and prop type:

```tsx
scenarioSeries,
```

```tsx
scenarioSeries: Array<{
  name: string;
  color: string;
  points: Array<{ value: number; contribution?: number }>;
}>;
```

Change the mock component from an expression body to a block body, derive `primaryResult` before `return`, and place the outputs inside its returned fragment:

```tsx
}) => {
  const primaryResult = results.find((result) => result.status === 'success');
  const display = primaryResult?.display;

  return (
    <>
      {display ? (
        <output data-testid="backtest-metric-values">
          {display.portfolioHistory.at(-1)?.value.toFixed(6)}|{display.productMetrics.cagr.toFixed(6)}
        </output>
      ) : null}
      <output data-testid="backtest-scenario-series">
        {scenarioSeries.map((scenario) => {
          const last = scenario.points.at(-1);
          return `${scenario.name}:${last?.value.toFixed(6)}:${last?.contribution?.toFixed(6) ?? '-'}`;
        }).join('|')}
      </output>
      <output data-testid="backtest-scenario-colors">
        {scenarioSeries.map((scenario) => scenario.color).join('|')}
      </output>
    </>
  );
},
```

Keep the mock's current selection, date, family, basis, normalized-view, and invalid-comparison controls inside the same returned fragment.

Extend the existing mocked `results` display type with `productMetrics: { cagr: number }` so this fixture compiles.

- [ ] **Step 2: Write failing projection/backtest layout tests**

Add this complete test in `describe('App backtest selection', ...)`:

```tsx
it('moves chart, metrics, and saved scenarios to the backtest analysis surface', async () => {
  render(<App />);

  expect(screen.getByTestId('projection-chart')).toBeTruthy();
  expect(screen.getByTestId('projection-kpis')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));

  await waitFor(() => expect(screen.getByTestId('backtest-selection')).toBeTruthy());
  expect(screen.queryByTestId('projection-chart')).toBeNull();
  expect(screen.queryByTestId('projection-kpis')).toBeNull();
  expect(screen.getByText('백테스트 최종 자산')).toBeTruthy();
  expect(screen.getByTestId('backtest-scenario-series').textContent).toContain('기본 시나리오');
});
```

Keep the existing date-boundary assertions and family-selection tests in the file so layout restructuring cannot reintroduce date resets.

Replace the obsolete backtest `KPIGrid` assertions as follows:

```tsx
// "stops calculating ..." case
expect(screen.queryByTestId('backtest-metric-values')).toBeNull();
// after applying the common range
expect(screen.getByTestId('backtest-metric-values')).toBeTruthy();

// rename the IRR test to:
it('uses product CAGR in the backtest metric strip for both result views', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));

  await waitFor(() => {
    expect(screen.getByTestId('backtest-metric-values').textContent).toBe('110.000000|0.210000');
  });

  fireEvent.click(screen.getByRole('button', { name: 'show normalized' }));
  await waitFor(() => {
    expect(screen.getByTestId('backtest-metric-values').textContent).toBe('110.000000|0.210000');
  });
});
```

Apply these assertion substitutions in the named tests:

| Test | Old locator | New locator | Expected value |
| --- | --- | --- | --- |
| nominal alignment | `kpi-values` | `backtest-metric-values` | contains `110.000000\|0.210000` |
| nominal alignment | `chart-scenarios` | `backtest-scenario-series` | contains `기본 시나리오:110.000000:100.000000` |
| real alignment | `kpi-values` | `backtest-metric-values` | contains `99.980431\|-0.000195` |
| real alignment | `chart-scenarios` | `backtest-scenario-series` | contains `기본 시나리오:99.980431:100.000000` |
| gold alignment | `kpi-values` | `backtest-metric-values` | contains `${expectedGoldValue.toFixed(6)}\|` |
| gold alignment | `chart-scenarios` | `backtest-scenario-series` | contains ``기본 시나리오:${expectedGoldValue.toFixed(6)}:${expectedGoldPrincipal.toFixed(6)}`` |
| saved ISA comparison | `chart-scenarios` | `backtest-scenario-series` | contains `saved ISA:99.980431:100.000000` |
| GOLD fallback | `chart-scenarios` | `backtest-scenario-series` | contains `pre-GOLD QQQ:110.000000:100.000000` |
| palette contract | `chart-colors` | `backtest-scenario-colors` | equals `#0066cc\|#1d1d1f` and excludes `#FF9500`/`#34C759` |

- [ ] **Step 3: Run the integration test and verify RED**

Run:

```bash
npm test -- src/__tests__/App.integration.test.tsx
```

Expected: FAIL because the legacy chart and KPI grid still render in backtest mode and `BacktestView` does not receive scenario series.

- [ ] **Step 4: Restrict legacy chart interactions to projection mode**

Apply these three opening-condition substitutions without changing the nested JSX:

```tsx
- {!backtestRangeError && <div className="w-full max-w-[1000px] mb-8 h-[360px] sm:h-[480px] bg-apple-surface-pearl border border-white/60 rounded-lg p-2 sm:p-6 shadow-sm">
+ {mode === 'PROJECTION' && !backtestRangeError && <div className="w-full max-w-[1000px] mb-8 h-[360px] sm:h-[480px] bg-apple-surface-pearl border border-white/60 rounded-lg p-2 sm:p-6 shadow-sm">

- {!backtestRangeError && <AnimatePresence>
+ {mode === 'PROJECTION' && !backtestRangeError && <AnimatePresence>

- {!backtestRangeError && <div className="w-full max-w-[1000px]">
+ {mode === 'PROJECTION' && !backtestRangeError && <div className="w-full max-w-[1000px]">
```

Add this cleanup next to the other mode-sensitive effects so a projection selection cannot leak across mode changes:

```tsx
useEffect(() => {
  if (mode === 'BACKTEST') setSelectedPoint(null);
}, [mode]);
```

- [ ] **Step 5: Pass scenario and action ownership into `BacktestView`**

Update the backtest render:

```tsx
<BacktestView
  primaryAsset={backtestParams.assetType as HistoricalAssetType}
  startDate={backtestParams.startDate!}
  endDate={backtestParams.endDate!}
  comparisonAssets={comparisonAssets}
  results={preparedComparisonResults}
  leverageInsights={leverageInsights}
  scenarioSeries={chartScenarios}
  onShare={handleShare}
  onComparisonAssetsChange={handleComparisonAssetsChange}
  onFamilySelect={handleFamilySelect}
  currency={currency}
  valueBasis={valueBasis}
  resultView={backtestResultView}
  goldBasisError={goldBasisError}
  goldData={goldData}
  inflationRate={backtestParams.inflationRate}
  onValueBasisChange={setValueBasis}
  onResultViewChange={setBacktestResultView}
/>
```

Change the wrapper exactly from `className="w-full max-w-[1200px] mt-12"` to `className="w-full max-w-[1200px]"`. Keep the range-error panel above `BacktestView` and do not render incomplete analysis when `backtestRangeError` is true.

- [ ] **Step 6: Run integration and component tests**

Run:

```bash
npm test -- src/__tests__/App.integration.test.tsx src/components/sections/__tests__/BacktestView.test.tsx src/components/sections/__tests__/BacktestAnalysisChart.test.tsx
```

Expected: all tests PASS, including existing family-selection date preservation and real/gold basis assertions.

- [ ] **Step 7: Commit the mode-specific layout**

```bash
git add src/App.tsx src/__tests__/App.integration.test.tsx
git commit -m "refactor: make backtest own its analysis layout"
```

---

### Task 4: Compact asset selection without removing detailed analysis

**Files:**
- Modify: `src/components/sections/BacktestView.tsx:135-271`
- Modify: `src/components/sections/__tests__/BacktestView.test.tsx`

**Interfaces:**
- Keeps: `onFamilySelect(familyId)` unchanged.
- Keeps: `onComparisonAssetsChange(assets)` unchanged.
- Produces: a visible `선택 자산` chip group and a native `details` disclosure named `개별 종목 추가`.
- Guarantees: the primary asset cannot be removed and total selected assets cannot exceed three.

- [ ] **Step 1: Write failing selector-density and keyboard tests**

Add this complete test to `BacktestView.test.tsx`:

```tsx
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
```

Update the existing removal test to click `QLD 비교 자산 제거`. In the three-asset limit test, click `개별 종목 추가` before querying `AMD 개별 자산 선택`; retain the assertions for the disabled state, title, and `aria-describedby="asset-selection-limit"`.

- [ ] **Step 2: Run the view test and verify RED**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestView.test.tsx
```

Expected: FAIL because all individual asset buttons are always visible and no selected-assets group exists.

- [ ] **Step 3: Render family shortcuts, selected chips, and the collapsed picker**

Keep the four family buttons visible. Replace the always-visible individual list with:

```tsx
<div role="group" aria-label="선택 자산" className="flex flex-wrap justify-center gap-2">
  {selectedAssets.map((asset) => {
    const isPrimary = asset === primaryAsset;
    return (
      <button
        key={asset}
        type="button"
        disabled={isPrimary}
        aria-label={`${asset} ${isPrimary ? '주 자산' : '비교 자산 제거'}`}
        onClick={() => toggleAsset(asset)}
        className="rounded-pill bg-apple-surface-black px-4 py-2 text-apple-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-100"
      >
        {asset} <MetricBadge multiple={targetMultipleOf(asset)} />
      </button>
    );
  })}
</div>

<details className="w-full rounded-xl border border-apple-hairline bg-apple-surface-pearl px-4 py-3">
  <summary className="cursor-pointer text-caption-strong text-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary">
    개별 종목 추가
  </summary>
  <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="개별 자산 선택">
    {ASSET_OPTIONS.filter((asset) => !selectedAssets.includes(asset)).map((asset) => {
      const limitReached = selectedAssets.length >= 3;
      return (
        <button
          key={asset}
          type="button"
          aria-label={`${asset} 개별 자산 선택`}
          aria-describedby={limitReached ? 'asset-selection-limit' : undefined}
          disabled={limitReached}
          title={limitReached ? '비교 자산은 최대 3개까지 선택할 수 있습니다.' : undefined}
          onClick={() => toggleAsset(asset)}
          className="rounded-pill border border-apple-hairline bg-apple-surface-pearl px-4 py-2 text-caption-strong text-apple-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {asset} <MetricBadge multiple={targetMultipleOf(asset)} />
        </button>
      );
    })}
  </div>
</details>
```

Do not render a duplicate button for a selected asset inside the disclosure. Keep the existing maximum-selection title and live explanatory text.

- [ ] **Step 4: Reorder the detailed surface**

First add this DOM-order regression test:

```tsx
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
```

Then mechanically move the existing top-level JSX blocks into this exact order; do not rewrite their inner copy or metric calculations:

```text
BacktestPrimaryMetrics
family shortcut container
selected-assets role="group"
details/summary individual picker
result-view and value-basis SegmentedControl container
gold-basis explanatory paragraph
BacktestAnalysisChart
product-performance-summary
desktop performance table
mobile performance cards
fee disclosure paragraph
per-asset role="alert" block
leverage-insight aside
share button
```

Change the root class from `gap-8` to `gap-6`. Remove no detail row, explanatory sentence, error/status role, or responsive desktop/mobile representation.

- [ ] **Step 5: Run component tests and verify GREEN**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestView.test.tsx src/components/sections/__tests__/BacktestPrimaryMetrics.test.tsx src/components/sections/__tests__/BacktestAnalysisChart.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the compact detailed-analysis layout**

```bash
git add src/components/sections/BacktestView.tsx src/components/sections/__tests__/BacktestView.test.tsx
git commit -m "refactor: compact backtest analysis controls"
```

---

### Task 5: Verify the complete browser flow and visual hierarchy

**Files:**
- Create: `e2e/backtest-analysis-layout.spec.ts`
- Modify: `e2e/market-trend-overlay.spec.ts:40-111`

**Interfaces:**
- Exercises only public roles, labels, and visible copy.
- Writes visual evidence under `test-results/visual-review/`.

- [ ] **Step 1: Add the failing end-to-end layout test**

Create `backtest-analysis-layout.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
});

test('backtest foregrounds four metrics and one chart while preserving dates', async ({ page }, testInfo) => {
  await expect(page.getByText('백테스트 최종 자산', { exact: true })).toBeVisible();
  const primaryMetrics = page.getByRole('region', { name: /SPY 핵심 지표 · 명목 기준/ });
  for (const label of ['누적수익률', '연평균수익률 (CAGR)', '최대낙폭 (MDD)', '투자원금']) {
    await expect(primaryMetrics.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(primaryMetrics.getByText(/최종.*자산/)).toHaveCount(0);
  await expect(page.getByRole('img', { name: /과거 백테스트 결과 다중 자산 비교 차트/ })).toHaveCount(1);

  const start = page.locator('input[type="date"]').first();
  const end = page.locator('input[type="date"]').last();
  await expect(start).toHaveValue('2010-01-01');
  await expect(end).toHaveValue('2024-01-01');

  await page.getByText('개별 종목 추가').click();
  await page.getByRole('button', { name: 'QQQ 개별 자산 선택' }).click();
  await expect(start).toHaveValue('2010-01-01');
  await expect(end).toHaveValue('2024-01-01');

  await page.getByRole('button', { name: '실질' }).click();
  await expect(page.getByRole('heading', { name: /핵심 지표 · 실질 기준/ })).toBeVisible();
  await expect(start).toHaveValue('2010-01-01');
  await expect(end).toHaveValue('2024-01-01');

  await expect(page.getByText('S&P 500 (^GSPC)')).toHaveCount(0);
  await page.getByRole('button', { name: '시장 추세' }).click();
  await expect(page.getByText('S&P 500 (^GSPC)')).toBeVisible();

  await page.getByPlaceholder('시나리오 이름 (예: 나스닥 100 적립)').fill('E2E 백테스트 비교안');
  await page.getByRole('button', { name: '저장 및 비교' }).click();
  await expect(page.getByText('E2E 백테스트 비교안', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '비교하기' }).click();
  await page.getByRole('button', { name: '저장 시나리오 비교' }).click();
  await expect(page.getByRole('region', { name: '저장 시나리오 비교' })).toBeVisible();
  await expect(page.getByRole('img', { name: /과거 백테스트 결과 다중 자산 비교 차트/ })).toHaveCount(0);
  await page.getByRole('button', { name: '종목 상세' }).click();
  await expect(page.getByRole('img', { name: /과거 백테스트 결과 다중 자산 비교 차트/ })).toHaveCount(1);

  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  await page.screenshot({
    path: `test-results/visual-review/backtest-analysis-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
```

- [ ] **Step 2: Update existing market-overlay flows for the new default**

Insert the same activation line at these three exact points in `market-trend-overlay.spec.ts`:

```ts
// Nasdaq test: immediately after clicking "나스닥 레버리지 가족 선택"
await page.getByRole('button', { name: '시장 추세' }).click();

// S&P 500 test: immediately after selectPrimaryAsset(page, 'SPY')
await page.getByRole('button', { name: '시장 추세' }).click();

// KOSPI test: immediately after selectPrimaryAsset(page, 'KOSPI')
await page.getByRole('button', { name: '시장 추세' }).click();
```

In the unmapped AMD case, add this assertion after selecting AMD:

```ts
await expect(page.getByRole('button', { name: '시장 추세' })).toHaveCount(0);
```

Keep every existing assertion for the mapped index, SMA paths, closest-prior keyboard tooltip, no runtime provider requests, and horizontal overflow. Run `leverage-comparison.spec.ts` unchanged: its family buttons remain directly available and it does not select an individual asset.

- [ ] **Step 3: Run desktop Playwright and verify the intended RED/GREEN transition**

Run:

```bash
npx playwright test e2e/backtest-analysis-layout.spec.ts e2e/leverage-comparison.spec.ts e2e/market-trend-overlay.spec.ts --project=chromium
```

Expected after Tasks 1-4: PASS. Before the production changes, the new layout test fails because the old KPI grid and simultaneous chart layout remain.

- [ ] **Step 4: Run the full automated verification suite**

Run:

```bash
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected:

- Vitest: all tests PASS.
- Playwright: all configured desktop/mobile projects PASS with no horizontal overflow.
- Build: TypeScript and Vite production build complete successfully.
- Diff check: no whitespace errors.

- [ ] **Step 5: Perform a final Orca in-app browser review**

At the actual Orca desktop viewport, verify this sequence:

1. Open backtest mode and confirm the headline plus all four primary metrics appear before the chart.
2. Confirm only the detailed asset chart is visible by default.
3. Select the Nasdaq family and confirm the dates remain or an explicit coverage adjustment notice appears.
4. Toggle `시작값 100`, `실질`, and `금 기준`; confirm the active state remains visible next to the chart and values update consistently.
5. Enable `시장 추세`; confirm the index and SMA legend appears, then disable it and confirm the chart returns to product/principal lines only.
6. Save and select a backtest scenario; confirm `저장 시나리오 비교` replaces the asset chart in the same slot.
7. Use keyboard focus and arrow keys on the chart date slider and confirm the live tooltip updates.
8. Inspect the browser console and require no new React, Visx, or accessibility errors.

Save accepted screenshots to `test-results/visual-review/final-backtest-analysis/`.

- [ ] **Step 6: Commit browser coverage**

```bash
git add e2e/backtest-analysis-layout.spec.ts e2e/market-trend-overlay.spec.ts
git commit -m "test: cover unified backtest analysis flow"
```

---

## Completion Gate

The implementation is complete only when:

- the four approved primary metrics appear directly below the final-asset headline;
- the final asset is not duplicated in the primary metric strip;
- the backtest page mounts one visible chart at a time;
- saved-scenario comparison still works in the shared chart slot;
- market trend remains available and is off by default;
- nominal, real, and gold basis changes update metrics, table, and chart consistently;
- family and individual asset changes preserve the selected range when coverage permits;
- the detailed performance table, leverage insights, errors, sharing, and scenario saving remain present;
- all Vitest, Playwright, build, and diff checks pass;
- the final Orca screenshots show a shorter, clearer backtest hierarchy on desktop and mobile.
