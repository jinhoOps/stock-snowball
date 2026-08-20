import React, { useEffect, useRef, useState } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { Share2, Snowflake } from 'lucide-react';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

interface KPIGridProps {
  totalAsset: number;
  initialPrincipal: number;
  totalContribution: number;
  totalReturn: number;
  returnPercentage: number;
  cagr: number;
  cagrLabel?: string;
  currency: 'USD' | 'KRW';
  exchangeRate?: number;
  isMilestoneReached?: boolean;
  onShare?: () => void;
}

interface KPICardProps {
  label: string;
  value: number;
  formatter: (value: number) => string;
  subValue?: number;
  subFormatter?: (value: number) => string;
  index: number;
  isHighlighted?: boolean;
  currency: 'USD' | 'KRW';
  exchangeRate: number;
  isMilestoneReached?: boolean;
  prefersReducedMotion: boolean;
  onHoverChange: (index: number | null) => void;
}

const KPICard = ({ label, value, formatter, subValue, subFormatter, index, isHighlighted, currency, exchangeRate, isMilestoneReached, prefersReducedMotion, onHoverChange }: KPICardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const showRollingSnowball = !isHighlighted && index % 2 !== 0;
  const showSnowAccumulation = !isHighlighted && index % 2 === 0;

  const setHoverState = (nextIsHovered: boolean) => {
    setIsHovered(nextIsHovered);
    onHoverChange(nextIsHovered ? index : null);
  };

  return (
    <div
      data-kpi-index={index}
      className={`kpi-card bg-apple-surface-pearl/80 backdrop-blur-md border border-white/60 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:border-apple-primary/40 active:scale-[0.98] shadow-sm hover:shadow-md relative overflow-hidden group select-none ${isHighlighted ? 'ring-2 ring-apple-primary/30 bg-apple-surface-pearl' : ''}`}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
      onPointerDown={() => setHoverState(true)}
      onPointerCancel={() => setHoverState(false)}
      onPointerUp={() => setHoverState(false)}
    >
      {isHighlighted && (
        <div className={`kpi-hidden-snowflake absolute inset-0 flex items-center justify-center pointer-events-none text-apple-primary/10 ${prefersReducedMotion && isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <Snowflake size={150} strokeWidth={1} />
        </div>
      )}
      {showRollingSnowball && (
        <div className={`kpi-rolling-snowball absolute bottom-1.5 left-0 text-apple-primary/60 z-10 pointer-events-none ${prefersReducedMotion && isHovered ? 'opacity-100 translate-x-[450%]' : 'opacity-0'}`}>
          <Snowflake size={20} strokeWidth={2.5} />
        </div>
      )}
      {showSnowAccumulation && (
        <div className={`kpi-snow-overlay absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl ${prefersReducedMotion && isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {Array.from({ length: 6 }).map((_, particleIndex) => (
            <div key={particleIndex} className="kpi-snow-particle absolute w-1 h-1 bg-apple-primary/20 rounded-full blur-[0.5px]" style={{ top: prefersReducedMotion && isHovered ? '110%' : '-10%', left: `${10 + particleIndex * 15}%` }} />
          ))}
          <div className={`kpi-snow-base absolute bottom-0 left-0 right-0 ${prefersReducedMotion && isHovered ? 'h-8' : 'h-0'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 via-cyan-100/20 to-indigo-200/20 blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-apple-primary/10 to-transparent" />
          </div>
        </div>
      )}
      {isHighlighted && <div className="absolute top-0 left-0 w-full h-1 bg-apple-primary" />}
      <span className="text-caption-strong text-apple-ink-muted-48 mb-3 tracking-tight uppercase font-display relative z-20">{label}</span>
      <AnimatedCounter value={value} formatter={formatter} className={`text-xl sm:text-2xl font-semibold mb-1 tracking-tight font-display relative z-20 ${isHighlighted ? 'text-apple-primary' : 'text-apple-ink'}`} />
      <div className="relative z-10 w-full flex justify-center">
        <BigNumberHelper value={value} currency={currency} exchangeRate={exchangeRate} showDual onlyEstimate className="mb-3" />
      </div>
      {subValue !== undefined && subFormatter && (
        <div className="flex items-center gap-1 text-caption-strong text-apple-primary tracking-tight bg-apple-primary/5 px-3 py-1 rounded-pill relative z-10">
          <span>+</span><AnimatedCounter value={subValue} formatter={subFormatter} /><span>%</span>
        </div>
      )}
      {isHighlighted && isMilestoneReached && (
        <div className="kpi-milestone mt-3 bg-apple-primary text-apple-on-dark text-[10px] font-bold px-3 py-1 rounded-pill uppercase tracking-widest font-display relative z-10 shadow-sm">Milestone</div>
      )}
    </div>
  );
};

const KPIGrid: React.FC<KPIGridProps> = ({ totalAsset, initialPrincipal, totalContribution, totalReturn, returnPercentage, cagr, cagrLabel = '연복리 수익률 (CAGR)', currency, exchangeRate = 1450, isMilestoneReached, onShare }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion || !rootRef.current) return undefined;

    const scope = createScope({ root: rootRef.current });
    scope.add(() => {
      animate('.kpi-card', { opacity: [0, 1], translateY: [20, 0], duration: 600, delay: stagger(100), ease: 'out(3)' });
      animate('.kpi-share-button', { opacity: [0, 1], translateY: [10, 0], duration: 500, delay: 500, ease: 'out(3)' });
      if (hoveredCardIndex === null) return;

      const card = `.kpi-card[data-kpi-index="${hoveredCardIndex}"]`;
      animate(`${card} .kpi-hidden-snowflake`, { opacity: 1, scale: 1.5, rotate: 180, duration: 2000, delay: 3300, ease: 'out(3)' });
      animate(`${card} .kpi-rolling-snowball`, { translateX: ['0%', '450%'], rotate: [0, 720], opacity: [0, 1, 1, 0], duration: 2500, delay: 3300, ease: 'linear' });
      animate(`${card} .kpi-snow-overlay`, { opacity: 1, duration: 2000, delay: 3300, ease: 'out(3)' });
      animate(`${card} .kpi-snow-base`, { height: 32, duration: 3000, delay: 3300, ease: 'out(4)' });
      animate(`${card} .kpi-snow-particle`, { translateY: ['-10%', '110%'], translateX: [0, 10, -10, 0], duration: 3000, delay: (_target, index) => 3300 + (index ?? 0) * 500, loop: true, ease: 'linear' });
    });

    return () => scope.revert();
  }, [hoveredCardIndex, prefersReducedMotion]);

  const formatCurrency = (value: number) => currency === 'KRW' ? SnowballEngine.formatKoreanWon(Math.floor(value / 10000) * 10000) : SnowballEngine.formatUSD(value);
  const formatPercent = (value: number) => value.toFixed(2);
  const kpis = [
    { label: '최종 예상 자산', value: totalAsset, formatter: formatCurrency, isHighlighted: true },
    { label: '총 투자 원금', value: totalContribution, formatter: formatCurrency },
    { label: '누적 적립금', value: totalContribution - initialPrincipal, formatter: formatCurrency },
    { label: '총 수익금', value: totalReturn, formatter: formatCurrency, subValue: returnPercentage, subFormatter: formatPercent },
    { label: cagrLabel, value: cagr, formatter: (value: number) => `${formatPercent(value)}%` },
  ];

  return (
    <div ref={rootRef} className="flex flex-col items-center w-full max-w-[1000px] mt-12 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        {kpis.map((kpi, index) => <KPICard key={`${kpi.label}-${index}`} {...kpi} index={index} currency={currency} exchangeRate={exchangeRate} isMilestoneReached={isMilestoneReached} prefersReducedMotion={prefersReducedMotion} onHoverChange={setHoveredCardIndex} />)}
      </div>
      {onShare && (
        <button onClick={onShare} className="kpi-share-button mt-10 flex items-center gap-2 bg-apple-ink/90 backdrop-blur-md text-apple-on-dark px-8 py-3 rounded-pill font-semibold text-button-utility shadow-lg hover:bg-apple-ink active:scale-[0.98] transition-all group">
          <Share2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />공유(이미지)
        </button>
      )}
    </div>
  );
};

export default KPIGrid;
