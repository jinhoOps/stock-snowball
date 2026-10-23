import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface DisclosureProps {
  title: ReactNode;
  /** Short state shown under the title, e.g. the current selection, so it stays visible while collapsed. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  headingLevel?: 'h3' | 'h4';
  className?: string;
  children: ReactNode;
}

/** The one expand/collapse pattern for optional sections. */
export default function Disclosure({ title, summary, defaultOpen = false, icon, headingLevel = 'h3', className, children }: DisclosureProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const Heading = headingLevel;
  return (
    <section aria-labelledby={`${id}-title`} className={clsx('ui-disclosure', className)}>
      <Heading className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={() => setOpen((value) => !value)}
          className="ui-disclosure-trigger"
        >
          {icon && <span aria-hidden="true" className="shrink-0 text-apple-ink-muted-48">{icon}</span>}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span id={`${id}-title`} className="text-caption-strong text-apple-ink">{title}</span>
            {summary && <span className="text-fine-print leading-relaxed text-apple-primary">{summary}</span>}
          </span>
          <ChevronDown size={18} aria-hidden="true" className={clsx('ui-disclosure-chevron', open && 'rotate-180')} />
        </button>
      </Heading>
      <div id={`${id}-content`} hidden={!open} className="pb-1 pt-3">
        {children}
      </div>
    </section>
  );
}
