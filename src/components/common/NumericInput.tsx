import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  'aria-label'?: string;
}

/**
 * NumericInput provides a smoother numeric input experience than standard HTML5 number inputs.
 * It solves the '0' stickiness issue by allowing the input to be empty while focused.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  className,
  id,
  placeholder,
  'aria-label': ariaLabel,
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync with external value changes (like currency conversion)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;

    // Remove non-numeric characters (except for the first zero if it's the only character)
    rawValue = rawValue.replace(/[^0-9]/g, '');

    // Prevent multiple leading zeros
    if (rawValue.length > 1 && rawValue.startsWith('0')) {
      rawValue = rawValue.replace(/^0+/, '');
      if (rawValue === '') rawValue = '0';
    }

    setInputValue(rawValue);

    if (rawValue !== '') {
      onChange(Number(rawValue));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value === 0) {
      setInputValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue === '' || isNaN(Number(inputValue))) {
      setInputValue('0');
      onChange(0);
    } else {
      const numericValue = Number(inputValue);
      setInputValue(numericValue.toString());
      onChange(numericValue);
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
};
