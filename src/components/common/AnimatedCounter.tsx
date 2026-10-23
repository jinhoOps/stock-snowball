import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate } from 'animejs/animation';
import { spring } from 'animejs/easings/spring';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

interface AnimatedCounterProps {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
  /** Set false for duplicate displays of a value that is already announced elsewhere. */
  announce?: boolean;
  /** Wait before counting, so related numbers can react one after another. */
  delay?: number;
  duration?: number;
  /** Nudge the number up when it grows and down when it shrinks. */
  nudge?: boolean;
}

const defaultFormatter = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const AnimatedCounter = ({
  value,
  formatter = defaultFormatter,
  className,
  announce = true,
  delay = 0,
  duration = 420,
  nudge = false,
}: AnimatedCounterProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const displayedValue = useRef(value);
  const formatterRef = useRef(formatter);

  useLayoutEffect(() => {
    formatterRef.current = formatter;
    if (visualRef.current) visualRef.current.textContent = formatter(displayedValue.current);
  }, [formatter]);

  useEffect(() => {
    const paint = (next: number) => {
      displayedValue.current = next;
      if (visualRef.current) visualRef.current.textContent = formatterRef.current(next);
    };

    const from = displayedValue.current;
    if (prefersReducedMotion || from === value) {
      paint(value);
      return undefined;
    }

    // Count from whatever is on screen now, so rapid edits never jump back to an old value.
    // outCubic settles without overshooting, which matters for money.
    const counter = { value: from };
    const count = animate(counter, {
      value,
      delay,
      duration,
      ease: 'outCubic',
      onUpdate: () => paint(counter.value),
      onComplete: () => paint(value),
    });

    const root = rootRef.current;
    const lift = nudge && root
      ? animate(root, { translateY: [value > from ? 6 : -6, 0], delay, duration: 700, ease: spring({ bounce: 0.45 }) })
      : undefined;

    return () => {
      count.pause();
      if (lift) {
        lift.pause();
        root!.style.transform = '';
      }
    };
  }, [value, prefersReducedMotion, delay, duration, nudge]);

  return (
    <span ref={rootRef} className={className} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}>
      <span ref={visualRef} aria-hidden={announce ? 'true' : undefined} />
      {announce && <span className="sr-only" aria-live="polite" aria-atomic="true">{formatter(value)}</span>}
    </span>
  );
};

export default AnimatedCounter;
