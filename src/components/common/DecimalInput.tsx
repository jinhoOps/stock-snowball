import React, { useEffect, useState, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface DecimalInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'onFocus' | 'onBlur'> {
  value: number;
  onChange: (value: number) => void;
  /** Most digits kept after the decimal point. */
  fractionDigits?: number;
  allowNegative?: boolean;
}

/** 7.000000000000001 shows as 7, 3.25 stays 3.25. */
export const formatDecimal = (value: number, fractionDigits: number) =>
  Number.isFinite(value) ? Number(value.toFixed(fractionDigits)).toString() : '0';

/**
 * Text input for a decimal such as a percentage.
 * While focused it keeps exactly what was typed ("", "7.", "-"), and reports a number only when the text is one.
 * On blur it shows the last reported value again, so an empty field never turns into 0.
 */
export const DecimalInput: React.FC<DecimalInputProps> = ({
  value, onChange, fractionDigits = 2, allowNegative = false, className, ...inputProps
}) => {
  const [text, setText] = useState(() => formatDecimal(value, fractionDigits));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) setText(formatDecimal(value, fractionDigits));
  }, [value, isFocused, fractionDigits]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value.replace(/,/g, '.');
    const negative = allowNegative && typed.trimStart().startsWith('-');
    const [whole = '', ...rest] = typed.replace(/[^0-9.]/g, '').split('.');
    const fraction = rest.join('').slice(0, fractionDigits);
    const next = `${negative ? '-' : ''}${whole}${rest.length > 0 && fractionDigits > 0 ? `.${fraction}` : ''}`;
    setText(next);
    if (/\d/.test(next)) onChange(Number(next.endsWith('.') ? next.slice(0, -1) : next));
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={clsx('ui-input tabular-nums', className)}
    />
  );
};
