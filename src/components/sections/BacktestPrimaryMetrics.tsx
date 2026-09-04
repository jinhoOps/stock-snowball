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
