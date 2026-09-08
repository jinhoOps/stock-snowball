import { cloneElement, forwardRef, type AriaAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: AriaAttributes['aria-invalid'] }>;
}

/** A single input/select that forwards its native id and aria attributes. */
export const Field = ({ label, htmlFor, hint, error, className, children }: FieldProps) => {
  const description = [children.props['aria-describedby'], hint && `${htmlFor}-hint`, error && `${htmlFor}-error`].filter(Boolean).join(' ');
  return (
    <div className={clsx('ui-field', className)}>
      <div className="ui-field-label"><label htmlFor={htmlFor}>{label}</label></div>
      {cloneElement(children, {
        id: htmlFor,
        'aria-describedby': description || undefined,
        'aria-invalid': error ? true : children.props['aria-invalid'],
      })}
      {hint && <div id={`${htmlFor}-hint`} className="ui-field-hint">{hint}</div>}
      {error && <p id={`${htmlFor}-error`} className="text-caption text-apple-error" role="alert">{error}</p>}
    </div>
  );
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx('ui-input', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={clsx('ui-input', className)} {...props} />;
});
