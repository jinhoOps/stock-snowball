import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

interface AnimatedCounterProps {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
}

const defaultFormatter = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const AnimatedCounter = ({ value, formatter = defaultFormatter, className }: AnimatedCounterProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
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

    if (prefersReducedMotion || displayedValue.current === value) {
      paint(value);
      return;
    }

    const from = displayedValue.current;
    const startedAt = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 360, 1);
      // A bounded ease-out avoids overshooting financial values and settles on time.
      paint(progress === 1 ? value : from + (value - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, prefersReducedMotion]);

  return (
    <span className={className} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}>
      <span ref={visualRef} aria-hidden="true" />
      <span className="sr-only" aria-live="polite" aria-atomic="true">{formatter(value)}</span>
    </span>
  );
};

export default AnimatedCounter;
