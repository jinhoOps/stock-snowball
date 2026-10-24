import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'default' | 'compact' | 'none';
  /** raised: the result itself (charts). default: ordinary cards. quiet: cards inside other cards and side details. */
  tone?: 'raised' | 'default' | 'quiet';
}

const paddingClasses = {
  default: 'ui-surface-default',
  compact: 'ui-surface-compact',
  none: 'ui-surface-none',
};

const toneClasses = {
  raised: 'ui-surface-raised',
  default: undefined,
  quiet: 'ui-surface-quiet',
};

const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface({ padding = 'default', tone = 'default', className, ...props }, ref) {
  return <div ref={ref} className={clsx('ui-surface', paddingClasses[padding], toneClasses[tone], className)} {...props} />;
});

export default Surface;
