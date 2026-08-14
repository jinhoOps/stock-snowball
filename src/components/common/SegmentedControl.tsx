export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}

const SegmentedControl = <T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) => (
  <div className="flex flex-col gap-1.5">
    <span className="sr-only">{label}</span>
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-pill border border-apple-hairline bg-apple-canvas-parchment p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            title={option.disabledReason}
            onClick={() => onChange(option.value)}
            className={`rounded-pill px-3 py-2 text-fine-print font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 sm:px-4 ${
              selected
                ? 'bg-apple-surface-black text-apple-on-dark shadow-sm'
                : 'text-apple-ink-muted-80 hover:bg-white'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
    {options.map((option) => option.disabled && option.disabledReason ? (
      <span key={option.value} className="text-fine-print text-apple-ink-muted-48" role="status">
        {option.disabledReason}
      </span>
    ) : null)}
  </div>
);

export default SegmentedControl;
