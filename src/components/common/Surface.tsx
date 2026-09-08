import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'default' | 'compact' | 'none';
}

const paddingClasses = {
  default: 'ui-surface-default',
  compact: 'ui-surface-compact',
  none: 'ui-surface-none',
};

const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface({ padding = 'default', className, ...props }, ref) {
  return <div ref={ref} className={clsx('ui-surface', paddingClasses[padding], className)} {...props} />;
});

export default Surface;
