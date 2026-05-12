import React from 'react';
import { motion } from 'framer-motion';
import { SnowballEngine } from '../../core/SnowballEngine';

interface KPIGridProps {
  totalAsset: number;
  totalContribution: number;
  totalReturn: number;
  returnPercentage: number;
  cagr: number;
  currency: 'USD' | 'KRW';
}

const KPICard = ({ label, value, subValue, index }: { label: string; value: string; subValue?: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileTap={{ scale: 0.96 }}
    className="bg-apple-canvas-parchment border border-apple-hairline rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-apple-primary/30"
  >
    <span className="text-caption-strong text-apple-ink-muted-48 mb-2 tracking-[-0.224px]">{label}</span>
    <span className="text-body-strong text-apple-ink mb-1 tracking-[-0.374px]">{value}</span>
    {subValue && <span className="text-caption text-apple-ink-muted-48 tracking-[-0.224px]">{subValue}</span>}
  </motion.div>
);

const KPIGrid: React.FC<KPIGridProps> = ({
  totalAsset,
  totalContribution,
  totalReturn,
  returnPercentage,
  cagr,
  currency,
}) => {
  const formatValue = (val: number) => {
    if (currency === 'KRW') {
      return SnowballEngine.formatKoreanWon(val);
    }
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const kpis = [
    {
      label: '최종 예상 자산',
      value: formatValue(totalAsset),
    },
    {
      label: '총 투자 원금',
      value: formatValue(totalContribution),
    },
    {
      label: '총 수익금',
      value: formatValue(totalReturn),
      subValue: `+${returnPercentage.toFixed(2)}%`,
    },
    {
      label: '연평균 수익률 (CAGR)',
      value: `${cagr.toFixed(2)}%`,
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
