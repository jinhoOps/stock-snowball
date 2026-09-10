import type { ProductPeriodMetric } from '../../core/ProductPerformance';
import type { HistoricalAssetType, ValueBasis } from '../../types/finance';
import MetricCard from '../common/MetricCard';
import { SnowballEngine } from '../../core/SnowballEngine';

export interface BacktestPrimaryMetricsProps {
  assetId: HistoricalAssetType;
  valueBasis: ValueBasis;
  cumulativeReturn: number;
  cagr: number | null;
  periodMetric?: ProductPeriodMetric;
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
  periodMetric,
  mdd,
  investedPrincipal,
  currency,
}: BacktestPrimaryMetricsProps) => {
  const period = periodMetric ?? { kind: 'CAGR', value: cagr };
  const metrics = [
    { label: '누적수익률', value: percent(cumulativeReturn) },
    { label: period.kind === 'RECOVERY' ? '최저점 대비 회복률' : '연평균수익률 (CAGR)', value: period.value === null ? '—' : percent(period.value), detail: period.kind === 'RECOVERY' ? '1년 미만 · 최저점에서 종료일까지의 상품 반등률' : period.value === null ? '산출 불가' : undefined },
    { label: '최대낙폭 (MDD)', value: drawdown(mdd) },
    { label: '투자원금', value: SnowballEngine.formatBigNumber(investedPrincipal, currency) },
  ];

  return (
    <section className="w-full" aria-labelledby="backtest-primary-metrics-heading">
      <h2 id="backtest-primary-metrics-heading" className="mb-4 text-left text-title-sm text-apple-ink font-display">
        {assetId} 핵심 지표 · {BASIS_LABEL[valueBasis]} 기준
      </h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
        ))}
      </dl>
    </section>
  );
};

export default BacktestPrimaryMetrics;
