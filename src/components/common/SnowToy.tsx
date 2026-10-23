import { useEffect, useRef } from 'react';
import { animate } from 'animejs/animation';
import { spring } from 'animejs/easings/spring';
import { blizzard, throwSnow } from '../../lib/celebration/effects';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

/** Taps closer together than this keep the combo going. */
export const COMBO_WINDOW_MS = 1200;
/** The combo that triggers a blizzard and starts over. */
export const MAX_COMBO = 10;
const MIN_TAP_GAP_MS = 80;

/**
 * A floating snowball people can throw whenever they like.
 * It is a toy, separate from milestone celebrations, and never blocks the simulator.
 */
export default function SnowToy() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ballRef = useRef<HTMLSpanElement>(null);
  const combo = useRef(0);
  const lastTapAt = useRef(-Infinity);
  const restTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(restTimer.current), []);

  const settle = () => {
    combo.current = 0;
    if (ballRef.current) animate(ballRef.current, { scale: 1, duration: 900, ease: spring({ bounce: 0.4 }) });
  };

  const handleThrow = () => {
    const now = performance.now();
    if (now - lastTapAt.current < MIN_TAP_GAP_MS) return;
    combo.current = now - lastTapAt.current < COMBO_WINDOW_MS ? combo.current + 1 : 1;
    lastTapAt.current = now;
    clearTimeout(restTimer.current);

    if (prefersReducedMotion) return;

    const ball = ballRef.current;
    const level = combo.current;
    if (ball) {
      // Squash on impact, then spring back a little bigger with each combo.
      animate(ball, {
        scaleX: [1.3, 1 + level * 0.05],
        scaleY: [0.75, 1 + level * 0.05],
        rotate: `+=${40 + level * 15}`,
        duration: 800,
        ease: spring({ bounce: 0.55 }),
      });
    }
    throwSnow(buttonRef.current, level);

    if (level >= MAX_COMBO) {
      blizzard();
      settle();
      return;
    }
    restTimer.current = setTimeout(settle, COMBO_WINDOW_MS);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleThrow}
      aria-label="눈 뭉치 던지기"
      title="눈 뭉치 던지기"
      className="snow-toy fixed bottom-4 right-4 z-toy flex h-14 w-14 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
    >
      <span ref={ballRef} aria-hidden="true" className="snow-toy-ball block h-11 w-11 rounded-full" />
    </button>
  );
}
