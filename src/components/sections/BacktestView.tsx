import React from 'react';
import { motion } from 'framer-motion';
import { BacktestResult } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';
import BacktestChart from '../charts/BacktestChart';

interface BacktestViewProps {
  result: BacktestResult;
  assetName: string;
}

const MetricCard = ({ 
  label, 
  value, 
  formatter, 
  subValue, 
  subFormatter,
  index,
  isNegative
}: { 
  label: string; 
  value: number; 
  formatter: (v: number) => string;
  subValue?: number; 
  subFormatter?: (v: number) => string;
  index: number;
  isNegative?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-apple-canvas border border-apple-hairline rounded-lg p-5 flex flex-col items-center justify-center text-center shadow-sm"
  >
    <span className="text-micro-legal font-semibold text-apple-ink-muted-48 mb-2 tracking-widest uppercase">{label}</span>
    <AnimatedCounter 
      value={value} 
      formatter={formatter} 
      className={`text-tagline font-semibold mb-1 tracking-tight font-display ${isNegative ? 'text-apple-error' : 'text-apple-ink'}`}
    />
    {subValue !== undefined && subFormatter && (
      <div className={`text-fine-print font-semibold px-2 py-0.5 rounded-pill ${isNegative ? 'bg-apple-error/10 text-apple-error' : 'bg-apple-primary/10 text-apple-primary'}`}>
        <AnimatedCounter 
          value={subValue} 
          formatter={subFormatter} 
        />
        <span>%</span>
      </div>
    )}
  </motion.div>
);

const BacktestView: React.FC<BacktestViewProps> = ({ result, assetName }) => {
  const { metrics, history } = result;

  const formatCurrency = (val: number) => SnowballEngine.formatKoreanWon(val);

  const kpis = [
    {
      label: '최종 자산',
      value: metrics.finalValue,
      formatter: formatCurrency,
    },
    {
      label: '총 투자 원금',
      value: metrics.totalPrincipal,
      formatter: formatCurrency,
    },
    {
      label: '누적 수익률',
      value: metrics.totalReturn * 100,
      formatter: (v: number) => `${v.toFixed(2)}%`,
      isNegative: metrics.totalReturn < 0
    },
    {
      label: '연평균 수익률 (CAGR)',
      value: metrics.cagr * 100,
      formatter: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      label: '내부 수익률 (IRR)',
      value: metrics.irr * 100,
      formatter: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      label: '최대 낙폭 (MDD)',
      value: metrics.mdd * 100,
      formatter: (v: number) => `-${v.toFixed(2)}%`,
      isNegative: true
    },
  ];

  return (
    <div className="flex flex-col items-center w-full gap-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full max-w-[1200px] px-4">
        {kpis.map((kpi, i) => (
          <MetricCard key={kpi.label} {...kpi} index={i} />
        ))}
      </div>

      {/* Chart Section */}
      <div className="w-full h-[450px] bg-apple-canvas border border-apple-hairline rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-6 left-8 z-10">
          <h3 className="text-body-strong font-semibold text-apple-ink flex items-center gap-2">
            <span className="w-1 h-5 bg-apple-primary rounded-full" />
            {assetName} 과거 성과 추이
          </h3>
          <p className="text-fine-print text-apple-ink-muted-48 font-medium">
            {history[0].date} ~ {history[history.length - 1].date}
          </p>
        </div>
        <BacktestChart history={history} assetName={assetName} />
      </div>
    </div>
  );
};

export default BacktestView;
