import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BacktestResult, HistoricalAssetType, HISTORICAL_ASSET_IDS, LeverageFamilyId, LeverageInsight, ProductPerformanceMetrics, ProductPerformanceResult, ValueBasis } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';
import { IndexPoint } from '../../data/historicalAssets';
import { LEVERAGE_FAMILIES, type LeverageFamily } from '../../data/leverageFamilies';
import { reconcilePortfolioHistoryFinalValue, transformPortfolioHistory, transformProductSeries } from '../../core/ValueBasis';
import BacktestChart, { BacktestDisplaySeries } from '../charts/BacktestChart';
import SegmentedControl from '../common/SegmentedControl';

interface ComparisonAssetBase {
  assetId: HistoricalAssetType;
  targetMultiple: 1 | 2 | 3;
}

export type ComparisonAssetResult = ComparisonAssetBase & (
  | { status: 'success'; portfolio: BacktestResult; product: ProductPerformanceResult; error?: never }
  | { status: 'error'; error: string; portfolio?: never; product?: never }
);

export interface BacktestViewProps {
  primaryAsset: HistoricalAssetType;
  comparisonAssets: HistoricalAssetType[];
  results: ComparisonAssetResult[];
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
}

const ASSET_OPTIONS: HistoricalAssetType[] = [...HISTORICAL_ASSET_IDS];
const SERIES_STYLE = {
  1: { color: '#1d1d1f' },
  2: { color: '#0066cc' },
  3: { color: '#5ac8fa', strokeDasharray: '7,5' },
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

const metricsFromPoints = (points: readonly { date: string; value: number }[]): ProductPerformanceMetrics => {
  if (points.length < 2) return { cumulativeReturn: 0, cagr: 0, mdd: 0, volatility: 0 };
  const first = points[0];
  const last = points.at(-1)!;
  const cumulativeReturn = last.value / first.value - 1;
  const days = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
  const dailyReturns = points.slice(1).map((point, index) => point.value / points[index].value - 1);
  const mean = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
  const variance = dailyReturns.length < 2 ? 0 : dailyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (dailyReturns.length - 1);
  let peak = first.value;
  let mdd = 0;
  for (const point of points) {
    peak = Math.max(peak, point.value);
    mdd = Math.max(mdd, (peak - point.value) / peak);
  }
  return {
    cumulativeReturn,
    cagr: days > 0 ? (last.value / first.value) ** (365.25 / days) - 1 : 0,
    mdd,
    volatility: Math.sqrt(variance) * Math.sqrt(252),
  };
};

const MetricBadge = ({ multiple }: { multiple: 1 | 2 | 3 }) => (
  <span className="rounded-sm bg-apple-canvas px-1.5 py-0.5 text-micro-legal font-bold text-apple-ink">
    {multiple}×
  </span>
);

const BacktestView: React.FC<BacktestViewProps> = ({
  primaryAsset,
  comparisonAssets,
  results,
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
}) => {
  const reduceMotion = useReducedMotion();
  const displayBasis: ValueBasis = valueBasis === 'GOLD' && goldBasisError ? 'NOMINAL' : valueBasis;
  const selectedAssets = useMemo(() => [primaryAsset, ...comparisonAssets], [primaryAsset, comparisonAssets]);
  const completeFamily = completeFamilyFor(selectedAssets);
  const successfulResults = useMemo(() => results.filter(
    (result): result is Extract<ComparisonAssetResult, { status: 'success' }> => result.status === 'success',
  ), [results]);
  const preparedResults = useMemo(() => successfulResults.map((result) => {
    const options = { inflationRate, gold: goldData };
    const afterTaxHistory = reconcilePortfolioHistoryFinalValue(
      result.portfolio.history,
      result.portfolio.metrics.finalValue,
    );
    const portfolioHistory = transformPortfolioHistory(afterTaxHistory, displayBasis, options);
    const productPoints = transformProductSeries(result.product.points, displayBasis, options);
    return {
      ...result,
      portfolioHistory,
      productPoints,
      productMetrics: metricsFromPoints(productPoints),
    };
  }), [successfulResults, inflationRate, goldData, displayBasis]);
  const chartSeries: BacktestDisplaySeries[] = useMemo(() => preparedResults.map((result) => {
    const style = SERIES_STYLE[result.targetMultiple];
    return {
      assetId: result.assetId,
      targetMultiple: result.targetMultiple,
      color: style.color,
      strokeDasharray: 'strokeDasharray' in style ? style.strokeDasharray : undefined,
      points: resultView === 'PORTFOLIO' ? result.portfolioHistory : result.productPoints,
    };
  }), [preparedResults, resultView]);

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
    <section className="flex w-full flex-col items-center gap-8" aria-label="과거 자산 비교">
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
        <div className="flex flex-wrap justify-center gap-2" aria-label="개별 자산 선택">
          {ASSET_OPTIONS.map((asset) => {
            const isPrimary = asset === primaryAsset;
            const isSelected = isPrimary || comparisonAssets.includes(asset);
            const multiple = targetMultipleOf(asset);
            return (
              <button
                key={asset}
                type="button"
                aria-label={`${asset} 개별 자산 ${isSelected ? '선택됨' : '선택'}`}
                aria-pressed={isSelected}
                onClick={() => toggleAsset(asset)}
                disabled={isPrimary}
                className={`flex items-center gap-2 rounded-pill border px-3 py-2 text-caption-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 ${isSelected
                  ? 'border-apple-surface-black bg-apple-surface-black text-apple-on-dark'
                  : 'border-white/60 bg-apple-surface-pearl text-apple-ink hover:border-apple-primary/40'} ${isPrimary ? 'cursor-default' : ''}`}
              >
                {asset}<MetricBadge multiple={multiple} />
              </button>
            );
          })}
        </div>
        <p className="text-fine-print text-apple-ink-muted-48">비교할 자산을 최대 3개까지 선택할 수 있습니다.</p>
      </div>

      <div className="flex w-full max-w-[1200px] flex-col justify-between gap-3 px-4 sm:flex-row sm:items-start">
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
      </div>

      {displayBasis === 'GOLD' && !goldBasisError && (
        <p className="-mt-5 w-full max-w-[1200px] px-4 text-right text-fine-print text-apple-ink-muted-48">시작일 금 가치 기준</p>
      )}

      {results.some((result) => result.status === 'error') && (
        <div className="w-full max-w-[1200px] space-y-2 px-4">
          {results.filter((result): result is Extract<ComparisonAssetResult, { status: 'error' }> => result.status === 'error').map((result) => (
            <p key={result.assetId} role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-caption text-red-700">
              <strong>{result.assetId}</strong> 계산 실패: {result.error}
            </p>
          ))}
        </div>
      )}

      <div className="hidden w-full max-w-[1200px] px-4 md:block">
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-apple-surface-pearl shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead><tr className="border-b border-apple-hairline bg-apple-canvas-parchment/50">
              {['자산', '최종 자산', '상품 누적 수익률', '상품 CAGR', 'MDD', '변동성'].map((heading, index) => (
                <th key={heading} className={`p-4 text-micro-legal font-bold uppercase tracking-widest text-apple-ink-muted-48 ${index > 1 ? 'text-center' : ''}`}>{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {preparedResults.map((result, index) => (
                <motion.tr
                  key={result.assetId}
                  initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : index * 0.04 }}
                  className="border-b border-apple-hairline last:border-0"
                >
                  <td className="p-4">
                    <span className="flex items-center gap-2 font-display font-semibold text-apple-ink">
                      <span>{result.assetId}</span>
                      <MetricBadge multiple={result.targetMultiple} />
                    </span>
                  </td>
                  <td className="p-4 font-display font-bold text-apple-ink">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</td>
                  <td className="p-4 text-center font-display font-semibold text-apple-ink">{percentage(result.productMetrics.cumulativeReturn)}</td>
                  <td className="p-4 text-center font-display text-apple-ink">{percentage(result.productMetrics.cagr)}</td>
                  <td className="p-4 text-center font-display text-apple-ink">-{percentage(result.productMetrics.mdd)}</td>
                  <td className="p-4 text-center font-display text-apple-ink-muted-64">{percentage(result.productMetrics.volatility)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid w-full max-w-[1200px] grid-cols-1 gap-3 px-4 md:hidden">
        {preparedResults.map((result) => (
          <article key={result.assetId} className="rounded-lg border border-white/60 bg-apple-surface-pearl p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-body-strong text-apple-ink">{result.assetId}</h3>
              <MetricBadge multiple={result.targetMultiple} />
            </div>
            <p className="font-display text-lead font-semibold text-apple-ink">{formatCurrency(result.portfolioHistory.at(-1)?.value ?? 0)}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-caption">
              <div><dt className="text-apple-ink-muted-48">누적 수익률</dt><dd className="font-semibold text-apple-ink">{percentage(result.productMetrics.cumulativeReturn)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">CAGR</dt><dd className="font-semibold text-apple-ink">{percentage(result.productMetrics.cagr)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">MDD</dt><dd className="font-semibold text-apple-ink">-{percentage(result.productMetrics.mdd)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">변동성</dt><dd className="font-semibold text-apple-ink">{percentage(result.productMetrics.volatility)}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <p className="w-full max-w-[1200px] px-4 text-fine-print leading-relaxed text-apple-ink-muted-48">
        투자 결과에는 매수 수수료와 ISA 만기 세금 추정치가 포함됩니다. 매도 수수료, 배당소득세, 일반계좌 양도소득세는 포함되지 않습니다.
      </p>

      {completeFamily && leverageInsights.length > 0 && (
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

      <div className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-white/60 bg-apple-surface-pearl p-3 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute left-6 top-5 z-10 sm:left-8">
          <h3 className="text-body-strong font-semibold text-apple-ink">자산별 과거 성과 비교</h3>
          <p className="mt-1 text-fine-print text-apple-ink-muted-48">{resultView === 'PORTFOLIO' ? '거치식과 적립식이 섞인 투자 결과' : '기여금 없는 실제 상품 총수익'}</p>
        </div>
        <BacktestChart series={chartSeries} currency={currency} resultView={resultView} />
      </div>
    </section>
  );
};

export default BacktestView;
