import React, { useEffect, useRef } from 'react';
import { useSpring } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
}

/**
 * AnimatedCounter
 * 
 * 숫자가 변경될 때 부동 소수점 오차 없이 부드럽게 카운팅 애니메이션을 수행하는 컴포넌트입니다.
 * Apple 스타일의 감성적인 Spring physics를 적용합니다.
 */
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  formatter = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  className 
}) => {
  const springValue = useSpring(value, {
    stiffness: 80,
    damping: 24,
    restDelta: 0.001
  });

  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter(latest);
      }
    });
  }, [springValue, formatter]);

  return (
    <span 
      ref={ref} 
      className={className}
      aria-live="polite"
      aria-atomic="true"
    >
      {formatter(value)}
    </span>
  );
};

export default AnimatedCounter;
