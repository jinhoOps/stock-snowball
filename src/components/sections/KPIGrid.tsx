import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { Share2, Snowflake } from 'lucide-react';

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
  exchangeRate,
  isMilestoneReached
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
  isMilestoneReached?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Easter Egg A: Rolling Snowball
  const showRollingSnowball = !isHighlighted && index % 2 !== 0;
  // Easter Egg B: Snow Accumulation
  const showSnowAccumulation = !isHighlighted && index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, type: 'spring', stiffness: 100 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTapStart={() => setIsHovered(true)}
      onTap={() => setIsHovered(false)}
      onTapCancel={() => setIsHovered(false)}
      className={`bg-apple-surface-pearl/80 backdrop-blur-md border border-white/60 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:border-apple-primary/40 shadow-sm hover:shadow-md relative overflow-hidden group select-none ${isHighlighted ? 'ring-2 ring-apple-primary/30 bg-apple-surface-pearl' : ''}`}
    >
      {/* Easter Egg C: Hidden Snowflake for Highlighted Card */}
      {isHighlighted && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none text-apple-primary/10"
          animate={{ 
            opacity: isHovered ? 1 : 0, 
            scale: isHovered ? 1.5 : 1, 
            rotate: isHovered ? 180 : 0 
          }}
          transition={{ 
            opacity: { delay: isHovered ? 3.3 : 0, duration: 1.5 },
            scale: { delay: isHovered ? 3.3 : 0, duration: 2 },
            rotate: { duration: 5, ease: 'linear', repeat: Infinity }
          }}
        >
          <Snowflake size={150} strokeWidth={1} />
        </motion.div>
      )}

      {/* Easter Egg A: Rolling Snowball */}
      {showRollingSnowball && (
        <motion.div
          className="absolute bottom-1.5 left-0 text-apple-primary/60 z-10 pointer-events-none"
          initial={{ x: "-20%", rotate: 0, opacity: 0 }}
          animate={isHovered ? { 
            x: ["0%", "450%"], 
            rotate: [0, 720], 
            opacity: [0, 1, 1, 0] 
          } : { x: "-20%", rotate: 0, opacity: 0 }}
          transition={{ 
            delay: isHovered ? 3.3 : 0, 
            duration: 2.5, 
            ease: "linear" 
          }}
        >
          <Snowflake size={20} strokeWidth={2.5} />
        </motion.div>
      )}

      {/* Easter Egg B: Snow Accumulation (Aurora Edition) */}
      {showSnowAccumulation && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ 
            delay: isHovered ? 3.3 : 0, 
            duration: isHovered ? 2.0 : 1.5 
          }}
        >
          {/* Falling Snow Particles */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-apple-primary/20 rounded-full blur-[0.5px]"
              initial={{ top: "-10%", left: `${10 + i * 15}%` }}
              animate={isHovered ? { top: "100%", x: [0, 10, -10, 0] } : { top: "-10%" }}
              transition={{
                top: { delay: isHovered ? 3.3 + (i * 0.5) : 0, duration: 2.5 + (i * 0.2), repeat: Infinity, ease: "linear" },
                x: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          ))}

          {/* Accumulated Snow at the bottom */}
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            initial={{ height: 0 }}
            animate={{ height: isHovered ? 32 : 0 }}
            transition={{ 
              height: { delay: isHovered ? 3.3 : 0, duration: 3.0, ease: "circOut" }
            }}
          >
            {/* Highly Transparent Aurora Base */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 via-cyan-100/20 to-indigo-200/20 blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
            
            {/* Very Subtle Top Edge */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-apple-primary/10 to-transparent" />
          </motion.div>
        </motion.div>
      )}

      {isHighlighted && (
        <div className="absolute top-0 left-0 w-full h-1 bg-apple-primary" />
      )}
      
      <span className="text-caption-strong text-apple-ink-muted-48 mb-3 tracking-tight uppercase font-display relative z-20">{label}</span>
      <AnimatedCounter 
        value={value} 
        formatter={formatter} 
        className={`text-xl sm:text-2xl font-semibold mb-1 tracking-tight font-display relative z-20 ${isHighlighted ? 'text-apple-primary' : 'text-apple-ink'}`}
      />
      
      <div className="relative z-10 w-full flex justify-center">
        <BigNumberHelper 
          value={value} 
          currency={currency} 
          exchangeRate={exchangeRate} 
          showDual={true} 
          onlyEstimate={true}
          className="mb-3"
        />
      </div>

      {subValue !== undefined && subFormatter && (
        <div className="flex items-center gap-1 text-caption-strong text-apple-primary tracking-tight bg-apple-primary/5 px-3 py-1 rounded-pill relative z-10">
          <span>+</span>
          <AnimatedCounter 
            value={subValue} 
            formatter={subFormatter} 
          />
          <span>%</span>
        </div>
      )}
      
      <AnimatePresence>
        {isHighlighted && isMilestoneReached && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mt-3 bg-apple-primary text-apple-on-dark text-[10px] font-bold px-3 py-1 rounded-pill uppercase tracking-widest font-display relative z-10 shadow-sm"
          >
            Milestone
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

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
      isHighlighted: true // 항상 하이라이트 되도록 변경 (기존 로직과 유사)
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
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } },
          hidden: {}
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full"
      >
        {kpis.map((kpi, i) => (
          <KPICard 
            key={`${kpi.label}-${i}`} 
            {...kpi} 
            index={i} 
            currency={currency} 
            exchangeRate={exchangeRate} 
            isMilestoneReached={isMilestoneReached}
          />
        ))}
      </motion.div>
      
      {onShare && (
        <motion.button
          onClick={onShare}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-10 flex items-center gap-2 bg-apple-ink/90 backdrop-blur-md text-apple-on-dark px-8 py-3 rounded-pill font-semibold text-button-utility shadow-lg hover:bg-apple-ink transition-all group"
        >
          <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          공유(이미지)
        </motion.button>
      )}
    </div>
  );
};

export default KPIGrid;
