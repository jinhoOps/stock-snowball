import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import Button from './Button';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

interface TooltipProps {
  content: string | React.ReactNode;
  children?: React.ReactNode;
  iconSize?: number;
  position?: 'top' | 'bottom';
  className?: string;
}

/** Hover and focus reveal help; click/tap pins it until dismissed. */
export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  iconSize = 14, 
  position = 'top',
  className = '' 
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isVisible = !isDismissed && (isHovered || isFocused || isPinned);
  const tooltipId = useId();
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
        setIsPinned(false);
        setIsDismissed(true);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
      // Hover help may be open while focus is elsewhere; dismiss before the Sheet.
      event.preventDefault();
      event.stopPropagation();
      setIsPinned(false);
      setIsDismissed(true);
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [isVisible]);

  const togglePinned = () => {
    // Hover/focus may already reveal the tooltip before a first click arrives.
    setIsPinned(!isPinned);
    setIsDismissed(isPinned);
  };

  const describedBy = isVisible ? tooltipId : undefined;
  const customTrigger = React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)
    && children.type !== React.Fragment
    ? React.cloneElement(children, {
      'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
    })
    : children;

  const positionClasses = position === 'top' 
    ? 'bottom-full left-1/2 pb-2 origin-bottom'
    : 'top-full left-1/2 pt-2 origin-top';

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`} 
      ref={containerRef}
      onMouseEnter={() => { setIsHovered(true); setIsDismissed(false); }}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => { setIsFocused(true); setIsDismissed(false); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
          setIsPinned(false);
        }
      }}
      onClick={togglePinned}
    >
      {children ? (
        customTrigger
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="정보 보기"
          aria-describedby={describedBy}
        >
          <Info size={iconSize} strokeWidth={2.5} aria-hidden="true" />
        </Button>
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            initial={prefersReducedMotion ? false : { opacity: 0, y: position === 'top' ? 4 : -4, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: `calc(-50% + ${xOffset}px)`, scale: 1 }}
            exit={{ opacity: 0, y: position === 'top' ? 4 : -4, x: '-50%', scale: 0.95 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className={`absolute z-50 w-max max-w-[250px] sm:max-w-[300px] ${positionClasses}`}
            onClick={(e) => e.stopPropagation()} // 툴팁 내부 클릭 시 닫히지 않음
          >
            <div className="bg-apple-canvas-parchment/80 backdrop-blur-md border border-apple-hairline rounded-lg p-3">
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
