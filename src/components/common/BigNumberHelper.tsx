import React from 'react';
import { SnowballEngine } from '../../core/SnowballEngine';

interface BigNumberHelperProps {
  value: number;
  currency: 'KRW' | 'USD';
  className?: string;
}

/**
 * BigNumberHelper: 대형 숫자를 읽기 쉬운 단위(억/만, M/B)로 변환하여 표시하는 도우미 컴포넌트
 */
export const BigNumberHelper: React.FC<BigNumberHelperProps> = ({ 
  value, 
  currency,
  className = ''
}) => {
  // 0일 경우 표시하지 않거나 0으로 표시 (기획에 따라 결정, 여기서는 0일 때도 표시)
  const formatted = SnowballEngine.formatBigNumber(value, currency);

  return (
    <div className={`text-fine-print text-apple-ink-muted-48 mt-1 transition-all duration-300 ${className}`}>
      {formatted}
    </div>
  );
};
