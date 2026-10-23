import type { HTMLAttributes, ReactNode, Ref } from 'react';
import clsx from 'clsx';
import Surface from './Surface';

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  badge?: ReactNode;
  highlighted?: boolean;
  /** Size override for dense grids, e.g. four metrics in a narrow column. */
  valueClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export default function MetricCard({ label, value, detail, badge, highlighted, valueClassName, className, children, ...props }: MetricCardProps) {
  return (
    <Surface padding="compact" className={clsx('ui-metric', highlighted && 'ui-metric-highlighted', className)} {...props}>
      {children}
      <dt className="ui-metric-label">{label}</dt>
      <dd className={clsx('ui-metric-value', highlighted && 'text-apple-primary', valueClassName)}>{value}</dd>
      {detail && <dd className="ui-metric-detail">{detail}</dd>}
      {badge && <dd className="relative z-10 mt-3">{badge}</dd>}
    </Surface>
  );
}
