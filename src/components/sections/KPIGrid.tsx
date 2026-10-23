import React, { useEffect, useRef, useState } from 'react';
import { waapi } from 'animejs/waapi';
import { createScope } from 'animejs/scope';
import { SnowballEngine } from '../../core/SnowballEngine';
import AnimatedCounter from '../common/AnimatedCounter';
import MetricCard from '../common/MetricCard';
import ShareImageButton from '../common/ShareImageButton';
import { Snowflake } from 'lucide-react';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';
import { keepUnitTogether } from '../../lib/format/keepUnitTogether';

interface KPIGridProps {
  initialPrincipal: number;
  totalContribution: number;
  totalReturn: number;
  returnPercentage: number;
  cagr: number | null;
  cagrLabel?: string;
  currency: 'USD' | 'KRW';
  onShare?: () => void;
  isExporting?: boolean;
  shareError?: string | null;
}

interface KPICardProps {
  label: string;
  value: number | null;
  formatter: (value: number) => string;
  detail?: string;
  subValue?: number;
  subFormatter?: (value: number) => string;
  index: number;
  className?: string;
  prefersReducedMotion: boolean;
  onHoverChange: (index: number | null) => void;
}

const KPICard = ({ label, value, formatter, detail, subValue, subFormatter, index, className = '', prefersReducedMotion, onHoverChange }: KPICardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const showRollingSnowball = index % 2 !== 0;
  const showSnowAccumulation = index % 2 === 0;

  const setHoverState = (nextIsHovered: boolean) => {
    setIsHovered(nextIsHovered);
    onHoverChange(nextIsHovered ? index : null);
  };

  return (
    <MetricCard
      label={label}
      value={value === null ? <span aria-label="연환산 수익률 계산 불가">—</span> : <AnimatedCounter value={value} formatter={formatter} />}
      detail={detail}
      badge={subValue !== undefined && subFormatter ? (
        <span className="inline-flex items-center rounded-pill bg-apple-primary/5 px-3 py-1 text-caption-strong text-apple-primary">
          {subValue >= 0 ? '+' : ''}<AnimatedCounter value={subValue} formatter={subFormatter} />%
        </span>
      ) : undefined}
      data-kpi-index={index}
      className={`kpi-card animate-apple-rise transition-colors duration-300 motion-reduce:transition-none hover:border-apple-primary/40 ${className}`}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
      onPointerDown={() => setHoverState(true)}
      onPointerCancel={() => setHoverState(false)}
      onPointerUp={() => setHoverState(false)}
    >
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
    </MetricCard>
  );
};

/**
 * Supporting numbers under the headline result: what went in, what it earned, and the yearly rate.
 * The final amount itself lives in the headline, so it is not repeated here.
 */
const KPIGrid: React.FC<KPIGridProps> = ({ initialPrincipal, totalContribution, totalReturn, returnPercentage, cagr, cagrLabel = '연복리 수익률 (CAGR)', currency, onShare, isExporting, shareError }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion || !rootRef.current || hoveredCardIndex === null) return undefined;

    const scope = createScope({ root: rootRef.current });
    scope.add(() => {
      const card = `.kpi-card[data-kpi-index="${hoveredCardIndex}"]`;
      waapi.animate(`${card} .kpi-rolling-snowball`, { translateX: ['0%', '450%'], rotate: [0, 720], opacity: [0, 1, 1, 0], duration: 2500, delay: 3300, ease: 'linear' });
      waapi.animate(`${card} .kpi-snow-overlay`, { opacity: 1, duration: 2000, delay: 3300, ease: 'ease-out' });
      waapi.animate(`${card} .kpi-snow-base`, { height: 32, duration: 3000, delay: 3300, ease: 'ease-out' });
      waapi.animate(`${card} .kpi-snow-particle`, { translateY: ['-10%', '110%'], translateX: [0, 10, -10, 0], duration: 3000, delay: (_target, index) => 3300 + (index ?? 0) * 500, loop: true, ease: 'linear' });
    });

    return () => scope.revert();
  }, [hoveredCardIndex, prefersReducedMotion]);

  const formatCurrency = (value: number) => keepUnitTogether(SnowballEngine.formatBigNumber(value, currency, currency === 'KRW'));
  const formatPercent = (value: number) => value.toFixed(2);
  const formatShort = (value: number) => SnowballEngine.formatBigNumber(value, currency, true);
  const accumulated = totalContribution - initialPrincipal;
  const kpis = [
    {
      label: '투자 원금',
      value: totalContribution,
      formatter: formatCurrency,
      detail: accumulated > 0 ? `초기 ${formatShort(initialPrincipal)} + 적립 ${formatShort(accumulated)}` : undefined,
      className: 'col-span-2 sm:col-span-1',
    },
    { label: '총 수익금', value: totalReturn, formatter: formatCurrency, subValue: returnPercentage, subFormatter: formatPercent },
    { label: cagrLabel, value: cagr, formatter: (value: number) => `${formatPercent(value)}%` },
  ];

  return (
    <div ref={rootRef} className="flex w-full max-w-content flex-col items-center">
      <dl className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {kpis.map((kpi, index) => <KPICard key={`${kpi.label}-${index}`} {...kpi} index={index} prefersReducedMotion={prefersReducedMotion} onHoverChange={setHoveredCardIndex} />)}
      </dl>
      {onShare && (
        <ShareImageButton onClick={onShare} isExporting={isExporting} error={shareError} className="kpi-share-button animate-apple-rise mt-8" />
      )}
    </div>
  );
};

export default KPIGrid;
