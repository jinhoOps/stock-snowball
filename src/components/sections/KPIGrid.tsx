import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs/animation';
import type { JSAnimation } from 'animejs';
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

type Decoration = 'pile' | 'roll' | 'twinkle';

interface KPICardProps {
  label: string;
  value: number | null;
  formatter: (value: number) => string;
  detail?: string;
  subValue?: number;
  subFormatter?: (value: number) => string;
  index: number;
  decoration: Decoration;
  className?: string;
}

/** Numbers below the headline count in one after another. */
export const KPI_STAGGER_MS = 80;
const KPI_FIRST_DELAY_MS = 100;

/**
 * Each card answers a hover or tap with its own small snow reaction:
 * deposits pile up and melt, earnings roll into a growing snowball, the yearly rate twinkles.
 */
function playDecoration(card: HTMLElement, decoration: Decoration): { animations: JSAnimation[]; endsAt: number } {
  const pick = (selector: string) => Array.from(card.querySelectorAll<HTMLElement>(selector));
  if (decoration === 'pile') {
    const flakes = pick('.kpi-flake');
    const pileDelay = 350;
    const pileDuration = 2000;
    // anime.js reports duration without delay, so track when the last delayed piece finishes ourselves.
    return { endsAt: Math.max((flakes.length - 1) * 90 + 1000, pileDelay + pileDuration), animations: [
      ...flakes.map((flake, index) => animate(flake, {
        translateY: [-6, card.clientHeight * 0.8],
        translateX: [0, index % 2 ? 6 : -6],
        opacity: [0, 1, 0],
        delay: index * 90,
        duration: 1000,
        ease: 'inQuad',
      })),
      ...pick('.kpi-snow-pile').map((pile) => animate(pile, { scaleY: [0, 1, 1, 1], opacity: [0, 1, 1, 0], delay: pileDelay, duration: pileDuration, ease: 'outCubic' })),
    ] };
  }
  if (decoration === 'roll') {
    return { endsAt: 1400, animations: pick('.kpi-roll').map((ball) => animate(ball, {
      translateX: [0, Math.max(card.clientWidth - 40, 40)],
      rotate: [0, 540],
      scale: [0.5, 1.6],
      opacity: [0, 1, 1, 0],
      duration: 1400,
      ease: 'inOutSine',
    })) };
  }
  return { endsAt: 1300, animations: pick('.kpi-twinkle').map((flake) => animate(flake, {
    rotate: [0, 180],
    scale: [0.6, 1.25, 1],
    opacity: [0, 1, 0.8, 0],
    duration: 1300,
    ease: 'outQuad',
  })) };
}

const KPICard = ({ label, value, formatter, detail, subValue, subFormatter, index, decoration, className = '' }: KPICardProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const running = useRef<JSAnimation[]>([]);
  const delay = KPI_FIRST_DELAY_MS + index * KPI_STAGGER_MS;

  const stop = () => {
    running.current.forEach((animation) => animation.revert());
    running.current = [];
  };
  useEffect(() => stop, []);

  const play = () => {
    if (prefersReducedMotion || !cardRef.current || running.current.length) return;
    const { animations, endsAt } = playDecoration(cardRef.current, decoration);
    running.current = animations;
    window.setTimeout(stop, endsAt + 50);
  };

  return (
    <MetricCard
      ref={cardRef}
      label={label}
      value={value === null ? <span aria-label="연환산 수익률 계산 불가">—</span> : <AnimatedCounter value={value} formatter={formatter} delay={delay} />}
      detail={detail}
      badge={subValue !== undefined && subFormatter ? (
        <span className="inline-flex items-center rounded-pill bg-apple-primary/5 px-3 py-1 text-caption-strong text-apple-primary">
          {subValue >= 0 ? '+' : ''}<AnimatedCounter value={subValue} formatter={subFormatter} delay={delay} />%
        </span>
      ) : undefined}
      data-kpi-index={index}
      data-decoration={decoration}
      className={`kpi-card animate-apple-rise transition-colors duration-300 motion-reduce:transition-none hover:border-apple-primary/40 ${className}`}
      onPointerEnter={play}
    >
      {!prefersReducedMotion && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-card">
          {decoration === 'pile' && (
            <>
              {[12, 30, 48, 66, 84].map((left) => (
                <span key={left} className="kpi-flake absolute top-0 h-1.5 w-1.5 rounded-full bg-apple-primary/25 opacity-0" style={{ left: `${left}%` }} />
              ))}
              <span className="kpi-snow-pile absolute inset-x-0 bottom-0 h-6 origin-bottom bg-gradient-to-t from-apple-primary/10 to-transparent opacity-0" />
            </>
          )}
          {decoration === 'roll' && (
            <span className="kpi-roll absolute bottom-3 left-3 h-4 w-4 rounded-full border border-apple-primary/30 bg-apple-surface-white opacity-0 shadow-sm" />
          )}
          {decoration === 'twinkle' && (
            <span className="kpi-twinkle absolute right-4 top-4 text-apple-primary/50 opacity-0"><Snowflake size={20} strokeWidth={2.25} /></span>
          )}
        </span>
      )}
    </MetricCard>
  );
};

/**
 * Supporting numbers under the headline result: what went in, what it earned, and the yearly rate.
 * The final amount itself lives in the headline, so it is not repeated here.
 */
const KPIGrid: React.FC<KPIGridProps> = ({ initialPrincipal, totalContribution, totalReturn, returnPercentage, cagr, cagrLabel = '연복리 수익률 (CAGR)', currency, onShare, isExporting, shareError }) => {
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
      decoration: 'pile' as const,
    },
    { label: '총 수익금', value: totalReturn, formatter: formatCurrency, subValue: returnPercentage, subFormatter: formatPercent, decoration: 'roll' as const },
    { label: cagrLabel, value: cagr, formatter: (value: number) => `${formatPercent(value)}%`, decoration: 'twinkle' as const },
  ];

  return (
    <div className="flex w-full max-w-content flex-col items-center">
      <dl className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {kpis.map((kpi, index) => <KPICard key={`${kpi.label}-${index}`} {...kpi} index={index} />)}
      </dl>
      {onShare && (
        <ShareImageButton onClick={onShare} isExporting={isExporting} error={shareError} className="kpi-share-button animate-apple-rise mt-8" />
      )}
    </div>
  );
};

export default KPIGrid;
