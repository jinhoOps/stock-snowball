import React from 'react';
import { motion } from 'framer-motion';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';

interface KPIGridProps {
  totalAsset: number;
  totalContribution: number;
  totalReturn: number;
  returnPercentage: number;
  cagr: number;
  currency: 'USD' | 'KRW';
  isMilestoneReached?: boolean;
}

const KPICard = ({ 
  label, 
  value, 
  formatter, 
  subValue, 
  subFormatter,
  index,
  isHighlighted
}: { 
  label: string; 
  value: number; 
  formatter: (v: number) => string;
  subValue?: number; 
  subFormatter?: (v: number) => string;
  index: number;
  isHighlighted?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ 
      opacity: 1, 
      y: 0,
    }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileTap={{ scale: 0.98 }}
    className={`bg-apple-canvas border rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-apple-primary/30 shadow-sm relative overflow-hidden ${isHighlighted ? 'ring-2 ring-apple-primary/20' : 'border-apple-hairline'}`}
  >
    {isHighlighted && (
      <div className="absolute top-0 left-0 w-full h-1 bg-apple-primary" />
    )}
    <span className="text-caption-strong text-apple-ink-muted-48 mb-3 tracking-tight uppercase font-display">{label}</span>
    <AnimatedCounter 
      value={value} 
      formatter={formatter} 
      className={`text-2xl font-semibold mb-2 tracking-tight font-display ${isHighlighted ? 'text-apple-primary' : 'text-apple-ink'}`}
    />
    {subValue !== undefined && subFormatter && (
      <div className="flex items-center gap-1 text-caption-strong text-apple-primary tracking-tight bg-apple-primary/5 px-3 py-1 rounded-pill">
        <span>+</span>
        <AnimatedCounter 
          value={subValue} 
          formatter={subFormatter} 
        />
        <span>%</span>
      </div>
    )}
    {isHighlighted && (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mt-3 bg-apple-primary text-apple-on-dark text-[10px] font-bold px-3 py-1 rounded-pill uppercase tracking-widest font-display"
      >
        Milestone
      </motion.div>
    )}
  </motion.div>
);

const KPIGrid: React.FC<KPIGridProps> = ({
  totalAsset,
  totalContribution,
  totalReturn,
  returnPercentage,
  cagr,
  currency,
  isMilestoneReached
}) => {
  const formatCurrency = (val: number) => {
    if (currency === 'KRW') {
      return SnowballEngine.formatKoreanWon(val);
    }
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (val: number) => val.toFixed(2);

  const kpis = [
    {
      label: '최종 예상 자산',
      value: totalAsset,
      formatter: formatCurrency,
      isHighlighted: isMilestoneReached
    },
    {
      label: '총 투자 원금',
      value: totalContribution,
      formatter: formatCurrency,
    },
    {
      label: '총 수익금',
      value: totalReturn,
      formatter: formatCurrency,
      subValue: returnPercentage,
      subFormatter: formatPercent,
    },
    {
      label: '연평균 수익률 (CAGR)',
      value: cagr,
      formatter: (v: number) => `${formatPercent(v)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-[1000px] mt-12 px-4">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.label} {...kpi} index={i} />
      ))}
    </div>
  );
};

export default KPIGrid;
