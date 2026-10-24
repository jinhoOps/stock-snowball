import React from 'react';
import { SnowballEngine } from '../../core/SnowballEngine';

interface BigNumberHelperProps {
  value: number;
  currency: 'KRW' | 'USD';
  exchangeRate?: number;
  showDual?: boolean;
  onlyEstimate?: boolean;
  showExchangeRate?: boolean;
  /** false keeps amounts under 1억 exact (3만 4,000원), for echoing what was typed. */
  simplified?: boolean;
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
  onlyEstimate = false,
  showExchangeRate = false,
  simplified = true,
  className = ''
}) => {
  const formatted = showDual 
    ? SnowballEngine.formatDualCurrency(value, currency, exchangeRate, simplified, onlyEstimate)
    : SnowballEngine.formatBigNumber(value, currency, simplified);

  return (
    <div className={`text-fine-print leading-relaxed text-apple-ink-muted-48 mt-1 ${className}`}>
      {formatted && <div>{formatted}</div>}
      {showExchangeRate && currency === 'USD' && (
        <div className="text-fine-print leading-relaxed text-apple-primary mt-0.5 font-medium">
          적용 환율: {exchangeRate.toLocaleString()}원
        </div>
      )}
    </div>
  );
};
