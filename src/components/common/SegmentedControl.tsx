import { useId } from 'react';
import clsx from 'clsx';

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
  return (
    <div className={clsx('flex min-w-0 flex-col gap-2', fullWidth && 'w-full')}>
      <div role="group" aria-label={label} className="ui-segmented">
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
