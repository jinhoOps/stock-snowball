import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate } from 'animejs/animation';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';
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
  const contentRef = useRef<HTMLDivElement>(null);
  const toggled = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Opening grows the content from nothing and fades it in. Closing hides at once, so nothing lingers.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!open || !toggled.current || prefersReducedMotion || !content || !content.scrollHeight) return undefined;
    const reveal = animate(content, {
      height: [0, content.scrollHeight],
      opacity: [0, 1],
      translateY: [-4, 0],
      duration: 320,
      ease: 'outCubic',
      onComplete: () => { content.style.height = ''; content.style.overflow = ''; },
    });
    content.style.overflow = 'hidden';
    return () => { reveal.revert(); content.style.overflow = ''; };
  }, [open, prefersReducedMotion]);
  return (
    <section aria-labelledby={`${id}-title`} className={clsx('ui-disclosure', className)}>
      <Heading className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={() => { toggled.current = true; setOpen((value) => !value); }}
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
      <div ref={contentRef} id={`${id}-content`} hidden={!open} className="pb-1 pt-3">
        {children}
      </div>
    </section>
  );
}
