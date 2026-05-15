import React from 'react';
import { SnowballEngine } from '../../core/SnowballEngine';

interface BigNumberHelperProps {
  value: number;
  currency: 'KRW' | 'USD';
  exchangeRate?: number;
  showDual?: boolean;
  showExchangeRate?: boolean;
  className?: string;
}

/**
 * BigNumberHelper: 대형 숫자를 읽기 쉬운 단위(억/만, M/B)로 변환하여 표시하는 도우미 컴포넌트
 */
export const BigNumberHelper: React.FC<BigNumberHelperProps> = ({ 
  value, 
  currency,
  exchangeRate = 1450,
  showDual = true,
  showExchangeRate = false,
  className = ''
}) => {
  const formatted = SnowballEngine.formatBigNumber(value, currency);
  const dualFormatted = showDual 
    ? SnowballEngine.formatDualCurrency(value, currency, exchangeRate)
    : formatted;

  return (
    <div className={`text-fine-print text-apple-ink-muted-48 mt-1 transition-all duration-300 ${className}`}>
      <div>{dualFormatted}</div>
      {showExchangeRate && currency === 'USD' && (
        <div className="text-[10px] text-apple-primary/80 mt-0.5 font-medium">
          적용 환율: {exchangeRate.toLocaleString()}원
        </div>
      )}
    </div>
  );
};
