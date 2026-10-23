import React, { useState, useEffect, useLayoutEffect, useRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'onFocus' | 'onBlur'> {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  'aria-label'?: string;
}

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Caret index in `formatted` that sits right after the `digitCount`-th digit. */
const caretAfterDigits = (formatted: string, digitCount: number) => {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted[index]) && ++seen === digitCount) return index + 1;
  }
  return formatted.length;
};

/**
 * Whole-number input that shows thousands separators while typing.
 * It may be empty while focused, so typing over a lone "0" does not leave it stuck.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className,
  id,
  placeholder,
  'aria-label': ariaLabel,
  ...inputProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [digits, setDigits] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync with external value changes (like currency conversion)
  useEffect(() => {
    if (!isFocused) {
      setDigits(value.toString());
    }
  }, [value, isFocused]);

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    const caret = e.target.selectionStart ?? typed.length;
    let digitsBeforeCaret = typed.slice(0, caret).replace(/[^0-9]/g, '').length;
    let rawValue = typed.replace(/[^0-9]/g, '');

    // Backspace over a separator removes the digit in front of it.
    const deletedOnlySeparator = rawValue === digits && typed.length < groupDigits(digits).length;
    if (deletedOnlySeparator && digitsBeforeCaret > 0) {
      rawValue = rawValue.slice(0, digitsBeforeCaret - 1) + rawValue.slice(digitsBeforeCaret);
      digitsBeforeCaret -= 1;
    }

    // Drop leading zeros so typing next to "0" gives "5", not "05", and "1,000" minus "1" gives "0".
    const leadingZeros = rawValue.length - rawValue.replace(/^0+(?=\d)/, '').length;
    rawValue = rawValue.slice(leadingZeros);
    digitsBeforeCaret = Math.max(0, digitsBeforeCaret - leadingZeros);

    setDigits(rawValue);
    pendingCaret.current = caretAfterDigits(groupDigits(rawValue), digitsBeforeCaret);

    if (rawValue !== '') {
      onChange(Number(rawValue));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (digits === '' || isNaN(Number(digits))) {
      setDigits('0');
      onChange(0);
    } else {
      const numericValue = Number(digits);
      setDigits(numericValue.toString());
      onChange(numericValue);
    }
  };

  return (
    <input
      {...inputProps}
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={groupDigits(digits)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={clsx('ui-input tabular-nums', className)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
};
