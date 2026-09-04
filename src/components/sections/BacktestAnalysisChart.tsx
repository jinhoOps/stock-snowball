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
    setScenarioPoint(null);
  }, [mode, valueBasis, currency, scenarioSeries]);

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
            marketTrend={showMarketTrend ? marketTrend ?? undefined : undefined}
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
              <div key={point.id} className="rounded-xl border border-white/60 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: point.color }} aria-hidden="true" />
                  <span className="truncate text-caption text-apple-gray">{point.name}</span>
                </div>
                <span className="text-body-strong font-bold text-apple-ink">
                  {SnowballEngine.formatBigNumber(point.value, currency)}
                </span>
                {point.pessimistic !== undefined && point.optimistic !== undefined ? (
                  <span className="mt-1 block text-fine-print text-apple-ink-muted-48">
                    {SnowballEngine.formatBigNumber(point.pessimistic, currency)} ~ {SnowballEngine.formatBigNumber(point.optimistic, currency)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default BacktestAnalysisChart;
