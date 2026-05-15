import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string | React.ReactNode;
  children?: React.ReactNode;
  iconSize?: number;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Premium Tooltip Component
 * - DESIGN.md 준수: Frosted Glass (backdrop-blur), Apple Typography
 * - 모바일 친화적: Click/Tap 기반 토글 지원 (바깥 영역 클릭 시 닫힘)
 * - 데스크탑: Hover 지원
 */
export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  iconSize = 14, 
  position = 'top',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [xOffset, setXOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const padding = 16; // 안전 여백
      let offset = 0;
      if (rect.left < padding) {
        offset = padding - rect.left;
      } else if (rect.right > window.innerWidth - padding) {
        offset = window.innerWidth - padding - rect.right;
      }
      setXOffset(offset);
    } else {
      setXOffset(0);
    }
  }, [isVisible]);

  // 모바일/클릭 환경을 위해 바깥 영역 클릭 시 닫히도록 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  const toggleVisibility = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsVisible(!isVisible);
  };

  const positionClasses = position === 'top' 
    ? 'bottom-full left-1/2 mb-2 origin-bottom'
    : 'top-full left-1/2 mt-2 origin-top';

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`} 
      ref={containerRef}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={toggleVisibility}
    >
      {children ? (
        children
      ) : (
        <button 
          className="text-apple-ink-muted-48 hover:text-apple-primary transition-colors focus:outline-none focus:ring-2 focus:ring-apple-primary/30 rounded-full p-0.5"
          aria-label="정보 보기"
        >
          <Info size={iconSize} strokeWidth={2.5} />
        </button>
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: position === 'top' ? 4 : -4, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: `calc(-50% + ${xOffset}px)`, scale: 1 }}
            exit={{ opacity: 0, y: position === 'top' ? 4 : -4, x: '-50%', scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className={`absolute z-50 w-max max-w-[250px] sm:max-w-[300px] ${positionClasses}`}
            onClick={(e) => e.stopPropagation()} // 툴팁 내부 클릭 시 닫히지 않음
          >
            <div className="bg-apple-canvas-parchment/80 backdrop-blur-md border border-apple-hairline shadow-md rounded-lg p-3">
              <p className="text-caption text-apple-ink text-left font-text whitespace-pre-wrap break-keep">
                {content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
