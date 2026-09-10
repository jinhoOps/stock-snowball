import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BacktestResult, HistoricalAssetType, HISTORICAL_ASSET_IDS, LeverageFamilyId, LeverageInsight, ProductPerformanceResult, ValueBasis } from '../../types/finance';
import { getProductPeriodMetric } from '../../core/ProductPerformance';
import { SnowballEngine } from '../../core/SnowballEngine';
import { IndexPoint } from '../../data/historicalAssets';
import { LEVERAGE_FAMILIES, type LeverageFamily } from '../../data/leverageFamilies';
import { getMarketBenchmarkData, getMarketBenchmarkForAsset } from '../../data/marketBenchmarks';
import { buildMarketTrendOverlay } from '../../core/MarketTrend';
import { prepareBacktestDisplayResult, type PreparedBacktestDisplayResult } from '../../core/ValueBasis';
import type { SnowballScenarioData } from '../charts/SnowballChart';
import { type BacktestDisplaySeries } from '../charts/BacktestChart';
import { resolveBacktestSeriesColors } from '../charts/backtestSeriesColors';
import Button from '../common/Button';
import Notice from '../common/Notice';
import SegmentedControl from '../common/SegmentedControl';
import Surface from '../common/Surface';
import BacktestPrimaryMetrics from './BacktestPrimaryMetrics';
import BacktestAnalysisChart from './BacktestAnalysisChart';
import { Check, Share2, X } from 'lucide-react';

interface ComparisonAssetBase {
  assetId: HistoricalAssetType;
  targetMultiple: 1 | 2 | 3;
}

export type ComparisonAssetResult = ComparisonAssetBase & (
  | { status: 'success'; portfolio: BacktestResult; product: ProductPerformanceResult; display?: PreparedBacktestDisplayResult; error?: never }
  | { status: 'error'; error: string; portfolio?: never; product?: never }
);

export interface BacktestViewProps {
  primaryAsset: HistoricalAssetType;
  startDate: string;
  endDate: string;
  comparisonAssets: HistoricalAssetType[];
  results: ComparisonAssetResult[];
  scenarioSeries: SnowballScenarioData[];
  leverageInsights: LeverageInsight[];
  currency: 'KRW' | 'USD';
  valueBasis: ValueBasis;
  resultView: 'PORTFOLIO' | 'NORMALIZED';
  goldBasisError: string | null;
  goldData?: readonly IndexPoint[];
  inflationRate?: number;
  onFamilySelect: (familyId: LeverageFamilyId) => void;
  onComparisonAssetsChange: (assets: HistoricalAssetType[], primaryAsset?: HistoricalAssetType) => void;
  onValueBasisChange: (basis: ValueBasis) => void;
  onResultViewChange: (view: 'PORTFOLIO' | 'NORMALIZED') => void;
  onShare?: () => void;
}

const ASSET_OPTIONS: HistoricalAssetType[] = [...HISTORICAL_ASSET_IDS];
const SERIES_LINE_STYLE = {
  1: {},
  2: {},
  3: { strokeDasharray: '7,5' },
} as const;

const families: readonly LeverageFamily[] = Object.values(LEVERAGE_FAMILIES);

const familyMember = (assetId: HistoricalAssetType) => families
  .flatMap((family) => family.members)
  .find((member) => member.assetId === assetId);

const targetMultipleOf = (assetId: HistoricalAssetType): 1 | 2 | 3 =>
  familyMember(assetId)?.targetMultiple ?? 1;

const completeFamilyFor = (selectedAssets: readonly HistoricalAssetType[]) => families
  .find((family) => family.members.length === selectedAssets.length
    && family.members.every((member) => selectedAssets.includes(member.assetId)));

const percentage = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(2)}%`;
const drawdownPercentage = (value: number) => {
  const magnitude = Math.abs(value);
  return magnitude === 0 ? '0.00%' : `-${percentage(magnitude)}`;
};

const MetricBadge = ({ multiple }: { multiple: 1 | 2 | 3 }) => (
  <span className="rounded-sm bg-apple-canvas px-1.5 py-0.5 text-micro-legal font-bold text-apple-ink">
    {multiple}×
  </span>
);

const BacktestView: React.FC<BacktestViewProps> = ({
  primaryAsset,
  startDate,
  endDate,
  comparisonAssets,
  results,
  scenarioSeries,
  leverageInsights,
  currency,
  valueBasis,
  resultView,
  goldBasisError,
  goldData = [],
  inflationRate = 0,
  onFamilySelect,
  onComparisonAssetsChange,
  onValueBasisChange,
  onResultViewChange,
  onShare,
}) => {
  const [isIndividualPickerOpen, setIsIndividualPickerOpen] = useState(false);
  const displayBasis: ValueBasis = valueBasis === 'GOLD' && goldBasisError ? 'NOMINAL' : valueBasis;
  const successfulResults = useMemo(() => results.filter(
    (result): result is Extract<ComparisonAssetResult, { status: 'success' }> => result.status === 'success',
  ), [results]);
  const marketTrend = useMemo(() => {
    if (successfulResults.length === 0) return null;
    const benchmarkId = getMarketBenchmarkForAsset(primaryAsset);
    return benchmarkId
      ? buildMarketTrendOverlay(getMarketBenchmarkData(benchmarkId), startDate, endDate)
      : null;
  }, [primaryAsset, startDate, endDate, successfulResults.length]);
  const selectedAssets = useMemo(() => [primaryAsset, ...comparisonAssets], [primaryAsset, comparisonAssets]);
  const chartColors = useMemo(() => resolveBacktestSeriesColors(selectedAssets), [selectedAssets]);
  const selectedGroupRef = useRef<HTMLDivElement>(null);
  const focusAfterSelection = useRef<HistoricalAssetType | null>(null);
  useLayoutEffect(() => {
    const asset = focusAfterSelection.current;
    if (asset) {
      selectedGroupRef.current?.querySelector<HTMLElement>(`[data-selected-asset="${asset}"]`)?.focus();
      focusAfterSelection.current = null;
    }
  }, [selectedAssets]);
  const completeFamily = completeFamilyFor(selectedAssets);
  const preparedResults = useMemo(() => successfulResults.map((result) => {
    const display = result.display ?? prepareBacktestDisplayResult(
      result.portfolio,
      result.product,
      displayBasis,
      { inflationRate, gold: goldData },
    );
    return {
      ...result,
      ...display,
      periodMetric: getProductPeriodMetric(display.productPoints, display.productMetrics),
    };
  }), [successfulResults, inflationRate, goldData, displayBasis]);
  const allRecovery = preparedResults.length > 0 && preparedResults.every((result) => result.periodMetric.kind === 'RECOVERY');
  const mixedPeriodMetrics = !allRecovery && preparedResults.some((result) => result.periodMetric.kind === 'RECOVERY');
  const periodHeading = allRecovery ? '최저점 대비 회복률' : mixedPeriodMetrics ? '기간 성과 (종목별)' : '연평균수익률 (CAGR)';
  const primaryPreparedResult = preparedResults.find((result) => result.assetId === primaryAsset);
  const primaryPortfolioPoint = primaryPreparedResult?.portfolioHistory.at(-1);
  const chartSeries: BacktestDisplaySeries[] = useMemo(() => preparedResults.map((result) => {
    const style = SERIES_LINE_STYLE[result.targetMultiple];
    return {
      assetId: result.assetId,
      targetMultiple: result.targetMultiple,
      color: chartColors.get(result.assetId) ?? '#1d1d1f',
      strokeDasharray: 'strokeDasharray' in style ? style.strokeDasharray : undefined,
      points: resultView === 'PORTFOLIO' ? result.portfolioHistory : result.productPoints,
    };
  }), [preparedResults, resultView, chartColors]);

  const formatCurrency = (value: number) => currency === 'KRW'
    ? SnowballEngine.formatKoreanWon(Math.floor(value / 10_000) * 10_000)
    : SnowballEngine.formatUSD(value);
  const toggleAsset = (asset: HistoricalAssetType) => {
    if (asset === primaryAsset) {
      if (comparisonAssets.length > 0) onComparisonAssetsChange(comparisonAssets.slice(1), comparisonAssets[0]);
      return;
    }
    if (comparisonAssets.includes(asset)) {
      onComparisonAssetsChange(comparisonAssets.filter((selected) => selected !== asset));
    } else if (comparisonAssets.length < 2) {
      onComparisonAssetsChange([...comparisonAssets, asset]);
    }
  };

  return (
    <section className="flex w-full flex-col items-center gap-6" aria-label="과거 자산 비교">
      {primaryPreparedResult && primaryPortfolioPoint ? (
        <div className="w-full max-w-analysis">
          <BacktestPrimaryMetrics
            assetId={primaryAsset}
            valueBasis={displayBasis}
            cumulativeReturn={primaryPreparedResult.productMetrics.cumulativeReturn}
            cagr={primaryPreparedResult.productMetrics.cagr}
            periodMetric={primaryPreparedResult.periodMetric}
            mdd={primaryPreparedResult.productMetrics.mdd}
            investedPrincipal={primaryPortfolioPoint.principal}
            currency={currency}
          />
        </div>
      ) : null}

      <Surface className="w-full max-w-analysis">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-body font-semibold text-apple-ink">비교 종목</h3>
          <span className="text-caption text-apple-secondary">{selectedAssets.length} / 3개 선택</span>
        </div>
        <p id="asset-selection-limit" className="mt-2 text-fine-print leading-relaxed text-apple-secondary">최대 3개를 비교합니다. 기준 종목이 핵심 지표와 시장 지표의 기준이 됩니다. 마지막 1개는 유지합니다.</p>
        <div role="group" aria-label="선택 자산" ref={selectedGroupRef} className="mt-4 grid gap-3 sm:grid-cols-3">
          {selectedAssets.map((asset) => {
            const isPrimary = asset === primaryAsset;
            return <div key={asset} data-selected-asset={asset} tabIndex={-1} role="group" aria-label={`${asset} ${isPrimary ? '기준 종목' : '비교 종목'}`} className="rounded-card border border-apple-hairline bg-apple-canvas p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">{asset} <MetricBadge multiple={targetMultipleOf(asset)} /></span>
                <Button variant="ghost" size="icon" disabled={selectedAssets.length === 1}
                  aria-label={`${asset} ${isPrimary ? '기준 자산 제거' : '비교 자산 제거'}`}
                  aria-describedby={selectedAssets.length === 1 ? 'asset-selection-limit' : undefined}
                  onClick={() => { focusAfterSelection.current = isPrimary ? comparisonAssets[0] : primaryAsset; toggleAsset(asset); }}><X size={16} aria-hidden="true" /></Button>
              </div>
              {isPrimary ? <span className="flex min-h-control items-center gap-1 text-caption font-semibold text-apple-primary"><Check size={16} aria-hidden="true" />기준 종목</span>
                : <Button variant="ghost" size="compact" aria-label={`${asset} 기준으로 설정`}
                    onClick={() => { focusAfterSelection.current = asset; onComparisonAssetsChange(selectedAssets.filter((selected) => selected !== asset), asset); }}>기준으로 설정</Button>}
            </div>;
          })}
        </div>
        <div className="mt-5 border-t border-apple-hairline pt-5">
          <h4 className="text-caption-strong text-apple-ink">레버리지 가족으로 한 번에 선택</h4>
          <p className="mt-1 text-fine-print leading-relaxed text-apple-secondary">현재 선택을 같은 기초자산의 상품 묶음으로 바꿉니다. 선택된 가족을 다시 누르면 기준 종목만 남습니다.</p>
          <div role="group" aria-label="레버리지 가족" className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {(Object.keys(LEVERAGE_FAMILIES) as LeverageFamilyId[]).map((familyId) => {
              const family = LEVERAGE_FAMILIES[familyId];
              const selected = completeFamily?.id === familyId;
              return <Button key={familyId} variant={selected ? 'primary' : 'secondary'}
                aria-label={`${family.label} 레버리지 가족 선택`} aria-pressed={selected}
                className="h-auto flex-col items-start rounded-card px-4 py-3 text-left"
                onClick={() => selected ? onComparisonAssetsChange([]) : onFamilySelect(familyId)}>
                <span className="flex w-full items-center justify-between gap-2">{family.label}{selected && <Check size={16} aria-hidden="true" />}</span>
                <span className="text-fine-print font-normal">{family.members.map((member) => member.assetId).join(' · ')}</span>
              </Button>;
            })}
          </div>
        </div>
        <details className="mt-4 border-t border-apple-hairline pt-2"
          onToggle={(event) => setIsIndividualPickerOpen(event.currentTarget.open)}>
          <summary className="min-h-control cursor-pointer rounded-sm py-3 text-caption-strong text-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2">개별 종목 추가</summary>
          {isIndividualPickerOpen && <>
            <p className="mb-3 text-fine-print text-apple-secondary">선택된 종목을 다시 누르면 해제됩니다. 기준 종목을 해제하면 다음 종목이 기준이 됩니다.</p>
            <div role="group" className="flex flex-wrap gap-2" aria-label="개별 자산 선택">
              {ASSET_OPTIONS.map((asset) => {
                const selected = selectedAssets.includes(asset);
                const limitReached = !selected && selectedAssets.length >= 3;
                const lastAsset = selected && selectedAssets.length === 1;
                return <Button key={asset} variant={selected ? 'primary' : 'secondary'} size="compact"
                  aria-pressed={selected} aria-label={`${asset} 개별 자산 ${selected ? '해제' : '선택'}`}
                  aria-describedby={limitReached || lastAsset ? 'asset-selection-limit' : undefined}
                  disabled={limitReached || lastAsset}
                  title={limitReached ? '비교 자산은 최대 3개까지 선택할 수 있습니다.' : lastAsset ? '최소 1개 종목을 유지해야 합니다.' : undefined}
                  onClick={() => toggleAsset(asset)}>
                  {selected && <Check size={14} aria-hidden="true" />}{asset} <MetricBadge multiple={targetMultipleOf(asset)} />
                </Button>;
              })}
            </div>
          </>}
        </details>
      </Surface>

      {successfulResults.length > 0 && <div className="flex w-full max-w-analysis flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <SegmentedControl
          label="결과 보기"
          value={resultView}
          options={[{ value: 'PORTFOLIO', label: '투자 결과' }, { value: 'NORMALIZED', label: '시작값 100' }]}
          onChange={onResultViewChange}
        />
        <SegmentedControl
          label="가치 기준"
          value={displayBasis}
          options={[
            { value: 'NOMINAL', label: '명목' },
            { value: 'REAL', label: '실질' },
            { value: 'GOLD', label: '금 기준', disabled: Boolean(goldBasisError), disabledReason: goldBasisError ?? undefined },
          ]}
          onChange={onValueBasisChange}
        />
      </div>}

      {successfulResults.length > 0 && displayBasis === 'GOLD' && !goldBasisError && (
        <p className="-mt-5 w-full max-w-analysis text-right text-fine-print text-apple-ink-muted-48">시작일 금 가치 기준</p>
      )}

      {preparedResults.length > 0 ? (
        <BacktestAnalysisChart
          primaryAsset={primaryAsset}
          assetSeries={chartSeries}
          scenarioSeries={scenarioSeries}
          currency={currency}
          resultView={resultView}
          valueBasis={displayBasis}
          marketTrend={marketTrend}
        />
      ) : null}

      {preparedResults.length > 0 && <div
        data-testid="product-performance-summary"
        className="w-full max-w-analysis text-center sm:text-left"
      >
        <h3 className="font-display text-body-strong text-apple-ink">선택 기간 성과 비교</h3>
        <p className="mt-1 text-fine-print text-apple-ink-muted-48">
          {startDate} ~ {endDate} · 수익률·CAGR·MDD: 배당 재투자 포함 · 납입액 영향 제외
          {preparedResults.some((result) => result.productMetrics.cagr === null) && <span className="mt-2 block">1년 미만은 CAGR 대신 최저점 대비 회복률(상품의 최저점 → 종료일)을 표시합니다. 원금 회복률과 다릅니다. 단기 또는 산출 불가 IRR은 —로 표시합니다.</span>}
        </p>
        <p className="mt-1 text-fine-print text-apple-ink-muted-48">최종 자산: 납입 포함</p>
      </div>}

      {preparedResults.length > 0 && <div className="hidden w-full max-w-analysis md:block">
        <Surface padding="none" className="overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-apple-hairline bg-apple-canvas-parchment/50">
              {['자산', '누적수익률', periodHeading, '최대낙폭 (MDD)', '포트폴리오 최종 자산 (납입 포함)', '변동성'].map((heading, index) => (
                <th key={heading} className={`p-4 text-micro-legal font-bold uppercase tracking-widest text-apple-ink-muted-48 ${index > 0 ? 'text-center' : ''}`}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {preparedResults.map((result, index) => (
                <tr
                  key={result.assetId}
                  className="animate-table-row-rise border-b border-apple-hairline last:border-0"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <td className="p-4">
                    <span className="flex items-center gap-2 font-display font-semibold text-apple-ink">
                      <span>{result.assetId}</span>
                      <MetricBadge multiple={result.targetMultiple} />
                    </span>
                  </td>
                  <td className="p-4 text-center font-display font-bold text-apple-ink">{percentage(result.productMetrics.cumulativeReturn)}</td>
                  <td className="p-4 text-center font-display font-bold text-apple-ink">{percentage(result.periodMetric.value)}{mixedPeriodMetrics && <span className="block text-fine-print font-normal">{result.periodMetric.kind === 'RECOVERY' ? '최저점 대비 회복률' : 'CAGR'}</span>}</td>
                  <td className="p-4 text-center font-display font-bold text-apple-ink">{drawdownPercentage(result.productMetrics.mdd)}</td>
                  <td className="p-4 font-display font-semibold text-apple-ink">
                    <span className="block">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</span>
                    <span className="mt-1 block text-fine-print font-normal text-apple-ink-muted-48">
                      포트폴리오 IRR {percentage(result.productMetrics.cagr === null ? null : result.portfolioIrr)}
                    </span>
                  </td>
                  <td className="p-4 text-center font-display text-apple-ink-muted-64">{percentage(result.productMetrics.volatility)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      </div>}

      {preparedResults.length > 0 && <div className="grid w-full max-w-analysis grid-cols-1 gap-3 md:hidden">
        {preparedResults.map((result) => (
          <article
            key={result.assetId}
            aria-label={`${result.assetId} 상품 성과`}
            className="ui-surface ui-surface-compact"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-body-strong text-apple-ink">{result.assetId}</h3>
              <MetricBadge multiple={result.targetMultiple} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-caption">
              <div><dt className="text-apple-ink-muted-48">누적수익률</dt><dd className="font-display font-bold text-apple-ink">{percentage(result.productMetrics.cumulativeReturn)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">{result.periodMetric.kind === 'RECOVERY' ? '최저점 대비 회복률' : 'CAGR'}</dt><dd className="font-display font-bold text-apple-ink">{percentage(result.periodMetric.value)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">MDD</dt><dd className="font-display font-bold text-apple-ink">{drawdownPercentage(result.productMetrics.mdd)}</dd></div>
            </dl>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-apple-hairline pt-3 text-caption">
              <div><dt className="text-apple-ink-muted-48">포트폴리오 IRR (납입 포함)</dt><dd className="font-semibold text-apple-ink">{percentage(result.productMetrics.cagr === null ? null : result.portfolioIrr)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">포트폴리오 최종 자산 (납입 포함)</dt><dd className="font-semibold text-apple-ink">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">변동성</dt><dd className="font-semibold text-apple-ink-muted-64">{percentage(result.productMetrics.volatility)}</dd></div>
            </dl>
          </article>
        ))}
      </div>}

      {preparedResults.length > 0 && <p className="w-full max-w-analysis text-fine-print leading-relaxed text-apple-ink-muted-48">
        투자 결과에는 매수 수수료와 ISA 만기 세금 추정치가 포함됩니다. 매도 수수료, 배당소득세, 일반계좌 양도소득세는 포함되지 않습니다.
      </p>}

      {results.some((result) => result.status === 'error') && (
        <div className="w-full max-w-analysis space-y-2">
          {results.filter((result): result is Extract<ComparisonAssetResult, { status: 'error' }> => result.status === 'error').map((result) => (
            <Notice key={result.assetId} tone="error">
              <strong>{result.assetId}</strong> 계산 실패: {result.error}
            </Notice>
          ))}
        </div>
      )}

      {successfulResults.length > 0 && completeFamily && leverageInsights.length > 0 && (
        <aside data-testid="leverage-insight" className="ui-surface ui-surface-default w-full max-w-analysis">
          <h3 className="text-body-strong text-apple-ink">명목 상품 성과</h3>
          <p className="mt-2 text-caption text-apple-ink-muted-80">2배·3배는 하루의 목표이며, 전체 기간 수익률의 약속이 아닙니다.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {leverageInsights.map((insight) => (
              <Surface key={insight.assetId} padding="compact" className="bg-apple-canvas-parchment">
                <div className="mb-3 flex items-center gap-2 font-display text-body-strong text-apple-ink">{insight.assetId}<MetricBadge multiple={insight.targetMultiple} /></div>
                <dl className="grid grid-cols-2 gap-3 text-caption">
                  <div><dt className="text-apple-ink-muted-48">기초자산</dt><dd className="font-semibold">{percentage(insight.underlyingReturn)}</dd></div>
                  <div><dt className="text-apple-ink-muted-48">실제 상품</dt><dd className="font-semibold">{percentage(insight.actualReturn)}</dd></div>
                  <div><dt className="text-apple-ink-muted-48">단순 {insight.targetMultiple}× 참고값</dt><dd className="font-semibold">{percentage(insight.simpleReference)}</dd></div>
                  <div><dt className="text-apple-ink-muted-48">차이</dt><dd className="font-semibold">{(insight.difference * 100).toFixed(2)}%p</dd></div>
                </dl>
              </Surface>
            ))}
          </div>
        </aside>
      )}

      {onShare ? (
        <Button
          variant="primary"
          onClick={onShare}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          공유(이미지)
        </Button>
      ) : null}
    </section>
  );
};

export default BacktestView;
