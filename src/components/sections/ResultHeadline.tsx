import { forwardRef, type ReactNode } from 'react';
import AnimatedCounter from '../common/AnimatedCounter';

interface ResultHeadlineProps {
  label: string;
  value: number;
  formatAmount: (value: number) => string;
  formatSecondary: (value: number) => string;
  align?: 'center' | 'start';
  /** Short context under the number, such as the assumptions it was calculated with. */
  children?: ReactNode;
}

/** The one number the page is about. Celebrations and the mobile result bar anchor to it. */
const ResultHeadline = forwardRef<HTMLDivElement, ResultHeadlineProps>(function ResultHeadline(
  { label, value, formatAmount, formatSecondary, align = 'center', children },
  ref,
) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-center text-center lg:items-start lg:text-left';
  return (
    <section aria-label={label} className={`flex w-full flex-col ${alignment}`}>
      <span className="mb-2 font-display text-caption-strong text-apple-ink-muted-48">{label}</span>
      <div ref={ref} className={`flex flex-col ${alignment}`}>
        <AnimatedCounter
          value={value}
          formatter={formatAmount}
          className="break-keep font-display text-3xl tracking-tight text-apple-primary sm:text-display-lg"
        />
        <AnimatedCounter
          value={value}
          formatter={formatSecondary}
          className="mt-1 font-display text-body-strong tracking-tight text-apple-ink-muted-48"
        />
      </div>
      {children}
    </section>
  );
});

export default ResultHeadline;
