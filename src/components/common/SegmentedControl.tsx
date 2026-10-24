import { useId, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { animate } from 'animejs/animation';
import { spring } from 'animejs/easings/spring';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'default' | 'compact';
  fullWidth?: boolean;
}

const SegmentedControl = <T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'default',
  fullWidth = false,
}: SegmentedControlProps<T>) => {
  const id = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const groupRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const [hasIndicator, setHasIndicator] = useState(false);

  // One blue pill slides to the selected option. Until it can be measured (or without layout, as in tests),
  // the selected button paints its own background.
  useLayoutEffect(() => {
    const group = groupRef.current;
    const indicator = indicatorRef.current;
    if (!group || !indicator) return undefined;

    const place = (glide: boolean) => {
      const selected = group.querySelector<HTMLElement>('.ui-segment[aria-pressed="true"]');
      if (!selected || !selected.offsetWidth) {
        setHasIndicator(false);
        placed.current = false;
        return;
      }
      const target = { translateX: selected.offsetLeft, translateY: selected.offsetTop, width: selected.offsetWidth, height: selected.offsetHeight };
      if (glide && placed.current && !prefersReducedMotion) {
        animate(indicator, { ...target, ease: spring({ bounce: 0.2, duration: 420 }) });
      } else {
        indicator.style.transform = `translate(${target.translateX}px, ${target.translateY}px)`;
        indicator.style.width = `${target.width}px`;
        indicator.style.height = `${target.height}px`;
      }
      placed.current = true;
      setHasIndicator(true);
    };

    place(true);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => place(false));
    observer.observe(group);
    return () => observer.disconnect();
  }, [value, prefersReducedMotion]);

  return (
    <div className={clsx('flex min-w-0 flex-col gap-2', fullWidth && 'w-full')}>
      <div ref={groupRef} role="group" aria-label={label} className="ui-segmented" data-indicator={hasIndicator ? '' : undefined}>
        <span ref={indicatorRef} aria-hidden="true" className="ui-segment-indicator" />
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              aria-label={option.ariaLabel}
              aria-describedby={option.disabled && option.disabledReason ? `${id}-${option.value}` : undefined}
              disabled={option.disabled}
              title={option.disabledReason}
              onClick={() => onChange(option.value)}
              className={clsx('ui-segment', size === 'compact' && 'px-3', fullWidth && 'flex-1')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {options.map((option) => option.disabled && option.disabledReason ? (
        <span key={option.value} id={`${id}-${option.value}`} className="text-fine-print leading-relaxed text-apple-ink-muted-48" role="status">
          {option.disabledReason}
        </span>
      ) : null)}
    </div>
  );
};

export default SegmentedControl;
