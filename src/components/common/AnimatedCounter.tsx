import React, { useEffect, useRef, useState } from 'react';
import { useSpring, motion, useAnimation } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
}

/**
 * AnimatedCounter
 * 
 * 숫자가 변경될 때 부동 소수점 오차 없이 부드럽게 카운팅 애니메이션을 수행하는 컴포넌트입니다.
 * Apple 스타일의 감성적인 Spring physics와 값 변경 시의 미세한 스케일 바운스 효과를 적용합니다.
 */
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  formatter = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }),
  className 
}) => {
  const springValue = useSpring(value, {
    stiffness: 120, // 조금 더 통통 튀게
    damping: 20,
    restDelta: 0.001
  });

  const controls = useAnimation();
  const ref = useRef<HTMLSpanElement>(null);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    springValue.set(value);
    
    // 값이 변경될 때마다 살짝 커졌다가 돌아오는 효과
    if (value !== prevValue) {
      controls.start({
        scale: [1, 1.05, 1],
        transition: { type: 'spring', stiffness: 300, damping: 15 }
      });
      setPrevValue(value);
    }
  }, [value, springValue, controls, prevValue]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter(latest);
      }
    });
  }, [springValue, formatter]);

  return (
    <motion.span 
      ref={ref} 
      animate={controls}
      className={className}
      aria-live="polite"
      aria-atomic="true"
      style={{ display: 'inline-block', originX: 0.5, originY: 0.5 }}
    >
      {formatter(value)}
    </motion.span>
  );
};

export default AnimatedCounter;
