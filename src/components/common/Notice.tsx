import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'error';
}

const toneClasses = {
  info: 'ui-notice-info',
  error: 'ui-notice-error',
};

export default function Notice({ tone = 'info', className, role, ...props }: NoticeProps) {
  return <div role={role ?? (tone === 'error' ? 'alert' : 'status')} className={clsx('ui-notice', toneClasses[tone], className)} {...props} />;
}
