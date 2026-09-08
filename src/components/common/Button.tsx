import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'compact' | 'icon';
}

const variantClasses = {
  primary: 'ui-button-primary',
  secondary: 'ui-button-secondary',
  ghost: 'ui-button-ghost',
  danger: 'ui-button-danger',
};

const sizeClasses = {
  default: '',
  compact: 'ui-button-compact',
  icon: 'ui-button-icon',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'secondary', size = 'default', type = 'button', className, ...props
}, ref) {
  return <button ref={ref} type={type} className={clsx('ui-button', variantClasses[variant], sizeClasses[size], className)} {...props} />;
});

export default Button;
