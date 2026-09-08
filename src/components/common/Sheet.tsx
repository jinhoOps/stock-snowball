import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

const focusableSelector = 'a[href], area[href], button, input, select, textarea, iframe, [tabindex], [contenteditable="true"]';

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => {
    if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden], [inert]')) {
      return false;
    }

    for (let ancestor: HTMLElement | null = element; ancestor && ancestor !== dialog; ancestor = ancestor.parentElement) {
      const style = window.getComputedStyle(ancestor);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
        return false;
      }
    }

    return true;
  });
}

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const titleId = useId();
  const portalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!open || !portalRef.current || !dialogRef.current) return;

    const portal = portalRef.current;
    const dialog = dialogRef.current;
    const body = document.body;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = body.style.overflow;
    const previousOverflowPriority = body.style.getPropertyPriority('overflow');
    const background = Array.from(body.children)
      .filter((element) => element !== portal)
      .map((element) => ({ element, inert: element.getAttribute('inert') }));

    body.style.setProperty('overflow', 'hidden');
    background.forEach(({ element }) => element.setAttribute('inert', ''));

    const focusStart = () => (closeRef.current ?? dialog).focus({ preventScroll: true });
    focusStart();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusableElements = getFocusableElements(dialog);
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (!first || !last) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
      } else if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusStart();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      background.forEach(({ element, inert }) => {
        if (inert === null) element.removeAttribute('inert');
        else element.setAttribute('inert', inert);
      });
      body.style.setProperty('overflow', previousOverflow, previousOverflowPriority);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={portalRef}>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-overlay bg-apple-surface-black/30 backdrop-blur-sm"
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-dialog flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-card border border-apple-hairline bg-apple-surface-pearl text-left text-apple-ink shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:w-[420px] md:rounded-none md:rounded-l-card"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-apple-hairline p-4 md:p-6">
          <h2 id={titleId} className="text-title-md font-display">{title}</h2>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon"
            aria-label={`${title} 닫기`}
            onClick={onClose}
            className="shrink-0 bg-apple-surface-chip-translucent hover:bg-apple-surface-chip-translucent/80"
          >
            <X size={22} aria-hidden="true" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-apple-hairline p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}

export default Sheet;
