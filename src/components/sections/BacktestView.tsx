import React, { useMemo, useState } from 'react';
import { BacktestResult, HistoricalAssetType, HISTORICAL_ASSET_IDS, LeverageFamilyId, LeverageInsight, ProductPerformanceResult, ValueBasis } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';
import { IndexPoint } from '../../data/historicalAssets';
import { LEVERAGE_FAMILIES, type LeverageFamily } from '../../data/leverageFamilies';
import { getMarketBenchmarkData, getMarketBenchmarkForAsset } from '../../data/marketBenchmarks';
import { buildMarketTrendOverlay } from '../../core/MarketTrend';
import { prepareBacktestDisplayResult, type PreparedBacktestDisplayResult } from '../../core/ValueBasis';
import type { SnowballScenarioData } from '../charts/SnowballChart';
import { type BacktestDisplaySeries } from '../charts/BacktestChart';
import { resolveBacktestSeriesColors } from '../charts/backtestSeriesColors';
import SegmentedControl from '../common/SegmentedControl';
import BacktestPrimaryMetrics from './BacktestPrimaryMetrics';
import BacktestAnalysisChart from './BacktestAnalysisChart';
import { Share2 } from 'lucide-react';

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
  onComparisonAssetsChange: (assets: HistoricalAssetType[]) => void;
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

const percentage = (value: number) => `${(value * 100).toFixed(2)}%`;
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
    };
  }), [successfulResults, inflationRate, goldData, displayBasis]);
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
    if (asset === primaryAsset) return;
    if (comparisonAssets.includes(asset)) {
      onComparisonAssetsChange(comparisonAssets.filter((selected) => selected !== asset));
    } else if (comparisonAssets.length < 2) {
      onComparisonAssetsChange([...comparisonAssets, asset]);
    }
  };

  return (
    <section className="flex w-full flex-col items-center gap-6" aria-label="과거 자산 비교">
      {primaryPreparedResult && primaryPortfolioPoint ? (
        <div className="w-full max-w-[1200px] px-4">
          <BacktestPrimaryMetrics
            assetId={primaryAsset}
            valueBasis={displayBasis}
            cumulativeReturn={primaryPreparedResult.productMetrics.cumulativeReturn}
            cagr={primaryPreparedResult.productMetrics.cagr}
            mdd={primaryPreparedResult.productMetrics.mdd}
            investedPrincipal={primaryPortfolioPoint.principal}
            currency={currency}
          />
        </div>
      ) : null}

      <div className="flex w-full max-w-[1200px] flex-col items-center gap-4 px-4">
        <div className="text-center">
          <p className="text-caption-strong text-apple-ink">레버리지 가족</p>
          <p className="mt-1 text-fine-print text-apple-ink-muted-48">같은 기초자산의 실제 상장 상품을 한 번에 비교합니다.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {(Object.keys(LEVERAGE_FAMILIES) as LeverageFamilyId[]).map((familyId) => {
            const family = LEVERAGE_FAMILIES[familyId];
            const selected = completeFamily?.id === familyId;
            return (
              <button
                key={familyId}
                type="button"
                aria-label={`${family.label} 레버리지 가족 선택`}
                aria-pressed={selected}
                onClick={() => onFamilySelect(familyId)}
                className={`rounded-pill border px-4 py-2 text-caption-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 ${selected
                  ? 'border-apple-surface-black bg-apple-surface-black text-apple-on-dark'
                  : 'border-white/60 bg-apple-surface-pearl text-apple-ink hover:border-apple-primary/40'}`}
              >
                <span>{family.members.map((member) => member.assetId).join(' · ')}</span>
              </button>
            );
          })}
        </div>
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
        <details
          className="w-full rounded-xl border border-apple-hairline bg-apple-surface-pearl px-4 py-3"
          onToggle={(event) => setIsIndividualPickerOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-caption-strong text-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary">
            개별 종목 추가
          </summary>
          {isIndividualPickerOpen && <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="개별 자산 선택">
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
          </div>}
        </details>
        <p id="asset-selection-limit" className="text-fine-print text-apple-ink-muted-48">비교할 자산을 최대 3개까지 선택할 수 있습니다.</p>
      </div>

      {successfulResults.length > 0 && <div className="flex w-full max-w-[1200px] flex-col justify-between gap-3 px-4 sm:flex-row sm:items-start">
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
        <p className="-mt-5 w-full max-w-[1200px] px-4 text-right text-fine-print text-apple-ink-muted-48">시작일 금 가치 기준</p>
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
        className="w-full max-w-[1200px] px-4 text-center sm:text-left"
      >
        <h3 className="font-display text-body-strong text-apple-ink">선택 기간 성과 비교</h3>
        <p className="mt-1 text-fine-print text-apple-ink-muted-48">
          {startDate} ~ {endDate} · 수익률·CAGR·MDD: 배당 재투자 포함 · 납입액 영향 제외
        </p>
        <p className="mt-1 text-fine-print text-apple-ink-muted-48">최종 자산: 납입 포함</p>
      </div>}

      {preparedResults.length > 0 && <div className="hidden w-full max-w-[1200px] px-4 md:block">
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-apple-surface-pearl shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-apple-hairline bg-apple-canvas-parchment/50">
              {['자산', '누적수익률', '연평균수익률 (CAGR)', '최대낙폭 (MDD)', '포트폴리오 최종 자산 (납입 포함)', '변동성'].map((heading, index) => (
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
                  <td className="p-4 text-center font-display font-bold text-apple-ink">{percentage(result.productMetrics.cagr)}</td>
                  <td className="p-4 text-center font-display font-bold text-apple-ink">{drawdownPercentage(result.productMetrics.mdd)}</td>
                  <td className="p-4 font-display font-semibold text-apple-ink">
                    <span className="block">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</span>
                    <span className="mt-1 block text-fine-print font-normal text-apple-ink-muted-48">
                      포트폴리오 IRR {percentage(result.portfolioIrr)}
                    </span>
                  </td>
                  <td className="p-4 text-center font-display text-apple-ink-muted-64">{percentage(result.productMetrics.volatility)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {preparedResults.length > 0 && <div className="grid w-full max-w-[1200px] grid-cols-1 gap-3 px-4 md:hidden">
        {preparedResults.map((result) => (
          <article
            key={result.assetId}
            aria-label={`${result.assetId} 상품 성과`}
            className="rounded-lg border border-white/60 bg-apple-surface-pearl p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-body-strong text-apple-ink">{result.assetId}</h3>
              <MetricBadge multiple={result.targetMultiple} />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-caption">
              <div><dt className="text-apple-ink-muted-48">누적수익률</dt><dd className="font-display font-bold text-apple-ink">{percentage(result.productMetrics.cumulativeReturn)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">CAGR</dt><dd className="font-display font-bold text-apple-ink">{percentage(result.productMetrics.cagr)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">MDD</dt><dd className="font-display font-bold text-apple-ink">{drawdownPercentage(result.productMetrics.mdd)}</dd></div>
            </dl>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-apple-hairline pt-3 text-caption">
              <div><dt className="text-apple-ink-muted-48">포트폴리오 IRR (납입 포함)</dt><dd className="font-semibold text-apple-ink">{percentage(result.portfolioIrr)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">포트폴리오 최종 자산 (납입 포함)</dt><dd className="font-semibold text-apple-ink">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">변동성</dt><dd className="font-semibold text-apple-ink-muted-64">{percentage(result.productMetrics.volatility)}</dd></div>
            </dl>
          </article>
        ))}
      </div>}

      {preparedResults.length > 0 && <p className="w-full max-w-[1200px] px-4 text-fine-print leading-relaxed text-apple-ink-muted-48">
        투자 결과에는 매수 수수료와 ISA 만기 세금 추정치가 포함됩니다. 매도 수수료, 배당소득세, 일반계좌 양도소득세는 포함되지 않습니다.
      </p>}

      {results.some((result) => result.status === 'error') && (
        <div className="w-full max-w-[1200px] space-y-2 px-4">
          {results.filter((result): result is Extract<ComparisonAssetResult, { status: 'error' }> => result.status === 'error').map((result) => (
            <p key={result.assetId} role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-caption text-red-700">
              <strong>{result.assetId}</strong> 계산 실패: {result.error}
            </p>
          ))}
        </div>
      )}

      {successfulResults.length > 0 && completeFamily && leverageInsights.length > 0 && (
        <aside data-testid="leverage-insight" className="w-full max-w-[1200px] rounded-2xl border border-apple-hairline bg-white/70 p-5 sm:p-6">
          <h3 className="text-body-strong text-apple-ink">명목 상품 성과</h3>
          <p className="mt-2 text-caption text-apple-ink-muted-80">2배·3배는 하루의 목표이며, 전체 기간 수익률의 약속이 아닙니다.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {leverageInsights.map((insight) => (
              <div key={insight.assetId} className="rounded-lg bg-apple-canvas-parchment p-4">
                <div className="mb-3 flex items-center gap-2 font-display text-body-strong text-apple-ink">{insight.assetId}<MetricBadge multiple={insight.targetMultiple} /></div>
                <dl className="grid grid-cols-2 gap-3 text-caption">
                  <div><dt className="text-apple-ink-muted-48">기초자산</dt><dd className="font-semibold">{percentage(insight.underlyingReturn)}</dd></div>
                  <div><dt className="text-apple-ink-muted-48">실제 상품</dt><dd className="font-semibold">{percentage(insight.actualReturn)}</dd></div>
                  <div><dt className="text-apple-ink-muted-48">단순 {insight.targetMultiple}× 참고값</dt><dd className="font-semibold">{percentage(insight.simpleReference)}</dd></div>
                  <div><dt className="text-apple-ink-muted-48">차이</dt><dd className="font-semibold">{(insight.difference * 100).toFixed(2)}%p</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </aside>
      )}

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
    </section>
  );
};

export default BacktestView;
