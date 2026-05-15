import React from 'react';
import { motion } from 'framer-motion';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { Share2 } from 'lucide-react';

interface KPIGridProps {
  totalAsset: number;
  initialPrincipal: number;
  totalContribution: number;
  totalReturn: number;
  returnPercentage: number;
  cagr: number;
  currency: 'USD' | 'KRW';
  exchangeRate?: number;
  isMilestoneReached?: boolean;
  onShare?: () => void;
}

const KPICard = ({ 
  label, 
  value, 
  formatter, 
  subValue, 
  subFormatter,
  index,
  isHighlighted,
  currency,
  exchangeRate
}: { 
  label: string; 
  value: number; 
  formatter: (v: number) => string;
  subValue?: number; 
  subFormatter?: (v: number) => string;
  index: number;
  isHighlighted?: boolean;
  currency: 'USD' | 'KRW';
  exchangeRate: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ 
      opacity: 1, 
      y: 0,
    }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    whileTap={{ scale: 0.98 }}
    className={`bg-apple-canvas border rounded-lg p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-apple-primary/30 shadow-sm relative overflow-hidden ${isHighlighted ? 'ring-2 ring-apple-primary/20' : 'border-apple-hairline'}`}
  >
    {isHighlighted && (
      <div className="absolute top-0 left-0 w-full h-1 bg-apple-primary" />
    )}
    <span className="text-caption-strong text-apple-ink-muted-48 mb-3 tracking-tight uppercase font-display">{label}</span>
    <AnimatedCounter 
      value={value} 
      formatter={formatter} 
      className={`text-xl sm:text-2xl font-semibold mb-1 tracking-tight font-display ${isHighlighted ? 'text-apple-primary' : 'text-apple-ink'}`}
    />
    
    <BigNumberHelper 
      value={value} 
      currency={currency} 
      exchangeRate={exchangeRate} 
      showDual={true} 
      onlyEstimate={true}
      className="mb-3"
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
  initialPrincipal,
  totalContribution,
  totalReturn,
  returnPercentage,
  cagr,
  currency,
  exchangeRate = 1450,
  isMilestoneReached,
  onShare
}) => {
  const formatCurrency = (val: number) => {
    if (currency === 'KRW') {
      // 만원 미만 단위 절삭 (미니멀을 위함)
      const truncated = Math.floor(val / 10000) * 10000;
      return SnowballEngine.formatKoreanWon(truncated);
    }
    return SnowballEngine.formatUSD(val);
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
      label: '누적 적립금',
      value: totalContribution - initialPrincipal,
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
      label: '연복리 수익률 (CAGR)',
      value: cagr,
      formatter: (v: number) => `${formatPercent(v)}%`,
    },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-[1000px] mt-12 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {kpis.map((kpi, i) => (
          <KPICard key={`${kpi.label}-${i}`} {...kpi} index={i} currency={currency} exchangeRate={exchangeRate} />
        ))}
      </div>
      
      {onShare && (
        <motion.button
          onClick={onShare}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-10 flex items-center gap-2 bg-apple-ink text-apple-on-dark px-8 py-3 rounded-pill font-semibold text-button-utility shadow-lg hover:bg-apple-ink/90 transition-all group"
        >
          <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          공유(이미지)
        </motion.button>
      )}
    </div>
  );
};

export default KPIGrid;
