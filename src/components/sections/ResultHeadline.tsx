import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { animate } from 'animejs/animation';
import AnimatedCounter from '../common/AnimatedCounter';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

interface ResultHeadlineProps {
  label: string;
  value: number;
  formatAmount: (value: number) => string;
  formatSecondary: (value: number) => string;
  align?: 'center' | 'start';
  /** Changing this (e.g. the display currency) moves the delta baseline without showing a change. */
  resetKey?: string;
  /** A milestone just reached ("1억 돌파"), shown as a sticker on the number for a moment. */
  milestone?: { id: number; label: string } | null;
  onMilestoneDone?: () => void;
  /** Short context under the number, such as the assumptions it was calculated with. */
  children?: ReactNode;
}

/** Wait for a slider drag or typing burst to pause before showing how much the result moved. */
export const DELTA_SETTLE_MS = 260;
const DELTA_VISIBLE_MS = 1800;

/** "+1,240만 원" or "−300만 원", floating next to the label for a moment after the result changes. */
function DeltaChip({ delta, format, onDone }: { delta: number; format: (value: number) => string; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) {
      const timer = setTimeout(() => onDoneRef.current(), DELTA_VISIBLE_MS);
      return () => clearTimeout(timer);
    }
    const rising = delta > 0;
    const motion = animate(ref.current, {
      opacity: [0, 1, 1, 0],
      translateY: rising ? [8, 0, 0, -10] : [-8, 0, 0, 10],
      scale: [0.9, 1, 1, 0.96],
      duration: DELTA_VISIBLE_MS,
      ease: 'inOutQuad',
      onComplete: () => onDoneRef.current(),
    });
    return () => { motion.pause(); };
  }, [delta, prefersReducedMotion]);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-testid="result-delta"
      className={clsx(
        'pointer-events-none inline-flex whitespace-nowrap rounded-pill px-2 py-0.5 text-fine-print font-semibold tabular-nums',
        delta > 0 ? 'bg-apple-success/10 text-apple-success' : 'bg-apple-canvas-parchment text-apple-secondary',
      )}
    >
      {delta > 0 ? '+' : '−'}{format(Math.abs(delta))}
    </span>
  );
}

const MILESTONE_VISIBLE_MS = 2800;

/** A small sticker that pops onto the number's corner, wobbles, and peels away. */
function MilestoneSticker({ label, onDone }: { label: string; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (prefersReducedMotion || !ref.current) {
      const timer = setTimeout(() => onDoneRef.current(), MILESTONE_VISIBLE_MS);
      return () => clearTimeout(timer);
    }
    const pop = animate(ref.current, {
      scale: [0, 1.15, 1, 1, 0.8],
      rotate: [-20, 10, 6, 6, 14],
      opacity: [0, 1, 1, 1, 0],
      duration: MILESTONE_VISIBLE_MS,
      ease: 'outQuad',
      onComplete: () => onDoneRef.current(),
    });
    return () => { pop.pause(); };
  }, [prefersReducedMotion]);

  return (
    <span
      ref={ref}
      role="status"
      className="pointer-events-none absolute -bottom-3 -right-1 z-10 rotate-6 whitespace-nowrap rounded-pill bg-apple-primary px-3 py-1 text-caption-strong text-apple-on-primary shadow-sm sm:-right-10"
    >
      {label}
    </span>
  );
}

/** The one number the page is about. Celebrations and the mobile result bar anchor to it. */
const ResultHeadline = forwardRef<HTMLDivElement, ResultHeadlineProps>(function ResultHeadline(
  { label, value, formatAmount, formatSecondary, align = 'center', resetKey, milestone, onMilestoneDone, children },
  ref,
) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-center text-center lg:items-start lg:text-left';
  const [chip, setChip] = useState<{ id: number; delta: number } | null>(null);
  const baseline = useRef(value);
  const baselineKey = useRef(resetKey);

  useEffect(() => {
    if (baselineKey.current !== resetKey) {
      baselineKey.current = resetKey;
      baseline.current = value;
      setChip(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      const delta = value - baseline.current;
      baseline.current = value;
      // Ignore rounding-level moves that would read as "+0원".
      if (delta === 0 || Math.abs(delta) < Math.abs(value) * 0.0005) return;
      setChip({ id: performance.now(), delta });
    }, DELTA_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [value, resetKey]);

  return (
    <section aria-label={label} className={`flex w-full flex-col ${alignment}`}>
      <span className="relative mb-2 font-display text-caption-strong text-apple-ink-muted-48">
        {label}
        <span className="absolute flex max-sm:bottom-full max-sm:left-1/2 max-sm:mb-1 max-sm:-translate-x-1/2 sm:left-full sm:top-1/2 sm:ml-2 sm:-translate-y-1/2">
          {chip && <DeltaChip key={chip.id} delta={chip.delta} format={formatAmount} onDone={() => setChip(null)} />}
        </span>
      </span>
      <div ref={ref} className={`relative flex flex-col ${alignment}`}>
        {milestone && <MilestoneSticker key={milestone.id} label={milestone.label} onDone={() => onMilestoneDone?.()} />}
        <AnimatedCounter
          value={value}
          formatter={formatAmount}
          nudge
          duration={480}
          className="break-keep font-display text-3xl font-semibold tracking-tight text-apple-primary sm:text-display-lg"
        />
        <AnimatedCounter
          value={value}
          formatter={formatSecondary}
          delay={60}
          className="mt-1 font-display text-body-strong tracking-tight text-apple-ink-muted-48"
        />
      </div>
      {children}
    </section>
  );
});

export default ResultHeadline;
