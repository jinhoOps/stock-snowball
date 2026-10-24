import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

interface MobileResultBarProps {
  /** The headline result; the bar shows only while it is out of view. */
  target: HTMLElement | null;
  label: string;
  value: number;
  formatAmount: (value: number) => string;
  returnPercentage: number | null;
}

/**
 * Keeps the result in sight on small screens while people scroll through inputs or details.
 * Tapping it brings the full result back into view.
 */
export default function MobileResultBar({ target, label, value, formatAmount, returnPercentage }: MobileResultBarProps) {
  const [targetVisible, setTargetVisible] = useState(true);

  useEffect(() => {
    if (!target || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);

  const visible = !targetVisible;

  return (
    <div
      aria-hidden={!visible}
      className={`mobile-result-bar fixed inset-x-0 bottom-0 z-dock border-t border-apple-hairline/70 bg-apple-surface-pearl/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden ${visible ? 'is-visible' : ''}`}
    >
      <button
        type="button"
        tabIndex={visible ? 0 : -1}
        onClick={() => target?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        aria-label={`${label} 결과로 이동`}
        className="mx-auto flex min-h-[64px] w-full max-w-content items-center gap-3 px-4 pr-20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apple-primary"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-fine-print text-apple-ink-muted-48">{label}</span>
          <AnimatedCounter value={value} formatter={formatAmount} announce={false} className="truncate font-display text-title-sm text-apple-primary" />
        </span>
        {returnPercentage !== null && Number.isFinite(returnPercentage) && (
          <span className="shrink-0 rounded-pill bg-apple-primary/10 px-3 py-1 text-caption-strong tabular-nums text-apple-primary">
            {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(1)}%
          </span>
        )}
        <ChevronUp size={18} aria-hidden="true" className="shrink-0 text-apple-ink-muted-48" />
      </button>
    </div>
  );
}
