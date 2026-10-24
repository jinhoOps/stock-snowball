import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { animate } from 'animejs/animation';
import { spring } from 'animejs/easings/spring';
import type { JSAnimation } from 'animejs';
import { blizzard, splat, throwSnow } from '../../lib/celebration/effects';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

/** Taps closer together than this keep the combo going. */
export const COMBO_WINDOW_MS = 1200;
/** The combo that triggers a blizzard and starts over. */
export const MAX_COMBO = 10;
/** Combos from this count show a "×N" badge. */
export const COMBO_BADGE_FROM = 3;
const MIN_TAP_GAP_MS = 80;
/** Movement beyond this turns a press into a drag. */
const DRAG_THRESHOLD_PX = 8;
const HINT_KEY = 'snow_toy_hint_seen';
const HINT_DELAY_MS = 5000;
const HINT_VISIBLE_MS = 6000;
const EDGE_PX = 32;

interface SnowToyProps {
  /** 0–1. The ball grows as the simulated result grows — a snowball, after all. */
  growth?: number;
}

type Sample = { x: number; y: number; t: number };

const readHintSeen = () => {
  try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return true; }
};
const markHintSeen = () => {
  try { localStorage.setItem(HINT_KEY, '1'); } catch { /* storage blocked: the hint may show again */ }
};

/** Three ways the ball can react to a tap, picked at random so repeated taps stay lively. */
const TAP_REACTIONS = [
  (level: number) => ({ scaleX: [1.3, 1], scaleY: [0.75, 1], rotate: `+=${40 + level * 15}` }),
  (level: number) => ({ translateY: [0, -14 - level, 0], scaleY: [0.85, 1.1, 1], rotate: `-=${30 + level * 10}` }),
  () => ({ translateX: [0, -5, 5, -3, 0], scale: [1.12, 1] }),
];

/**
 * A floating snowball people can play with whenever they like: tap to throw snow (quick taps build a combo),
 * or drag and fling it across the screen. It is a toy, separate from milestone celebrations, and never blocks the simulator.
 */
export default function SnowToy({ growth = 0 }: SnowToyProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ballRef = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const combo = useRef(0);
  const lastTapAt = useRef(-Infinity);
  const restTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [badge, setBadge] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const played = useRef(false);

  // Drag state lives in refs: it changes every pointer move and never needs a render.
  const offset = useRef({ x: 0, y: 0 });
  const press = useRef<{ startX: number; startY: number; dragging: boolean; samples: Sample[] } | null>(null);
  const suppressClick = useRef(false);
  const flight = useRef<JSAnimation | null>(null);

  useEffect(() => () => clearTimeout(restTimer.current), []);

  useEffect(() => {
    if (prefersReducedMotion || readHintSeen()) return undefined;
    let hide: ReturnType<typeof setTimeout>;
    const show = setTimeout(() => {
      if (played.current) return;
      markHintSeen();
      setHintVisible(true);
      hide = setTimeout(() => setHintVisible(false), HINT_VISIBLE_MS);
    }, HINT_DELAY_MS);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!badge || prefersReducedMotion || !badgeRef.current) return;
    animate(badgeRef.current, { scale: [0.6, 1], opacity: [0, 1], duration: 500, ease: spring({ bounce: 0.6 }) });
  }, [badge, prefersReducedMotion]);

  const applyOffset = () => {
    if (wrapperRef.current) wrapperRef.current.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
  };

  const settle = () => {
    combo.current = 0;
    setBadge(0);
    if (ballRef.current) animate(ballRef.current, { scale: 1, scaleX: 1, scaleY: 1, translateY: 0, duration: 900, ease: spring({ bounce: 0.4 }) });
  };

  const showFace = () => {
    if (faceRef.current) animate(faceRef.current, { opacity: [0, 1, 1, 0], duration: 1800, ease: 'linear' });
  };

  const notePlayed = () => {
    if (!played.current) markHintSeen();
    played.current = true;
    setHintVisible(false);
  };

  const handleThrow = () => {
    notePlayed();
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const now = performance.now();
    if (now - lastTapAt.current < MIN_TAP_GAP_MS) return;
    combo.current = now - lastTapAt.current < COMBO_WINDOW_MS ? combo.current + 1 : 1;
    lastTapAt.current = now;
    clearTimeout(restTimer.current);

    if (prefersReducedMotion) return;

    const level = combo.current;
    const ball = ballRef.current;
    if (ball) {
      const reaction = TAP_REACTIONS[Math.floor(Math.random() * TAP_REACTIONS.length)](level);
      animate(ball, { ...reaction, duration: 800, ease: spring({ bounce: 0.55 }) });
    }
    throwSnow(buttonRef.current, level);
    setBadge(level >= COMBO_BADGE_FROM ? level : 0);

    if (level >= MAX_COMBO) {
      blizzard();
      showFace();
      settle();
      return;
    }
    restTimer.current = setTimeout(settle, COMBO_WINDOW_MS);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || event.button !== 0) return;
    flight.current?.pause();
    // Capture now: a fast flick leaves the 56px ball before the first move event arrives.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    press.current = {
      startX: event.clientX - offset.current.x,
      startY: event.clientY - offset.current.y,
      dragging: false,
      samples: [{ x: event.clientX, y: event.clientY, t: performance.now() }],
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = press.current;
    if (!current) return;
    const x = event.clientX - current.startX;
    const y = event.clientY - current.startY;
    if (!current.dragging) {
      if (Math.hypot(x - offset.current.x, y - offset.current.y) < DRAG_THRESHOLD_PX) return;
      current.dragging = true;
      notePlayed();
      if (ballRef.current) animate(ballRef.current, { scale: 1.15, duration: 300, ease: 'outQuad' });
    }
    offset.current = { x, y };
    applyOffset();
    current.samples = [...current.samples, { x: event.clientX, y: event.clientY, t: performance.now() }].slice(-6);
  };

  const flyHome = () => {
    flight.current = animate(offset.current, {
      x: 0,
      y: 0,
      delay: 350,
      ease: spring({ bounce: 0.35, duration: 900 }),
      onUpdate: applyOffset,
    });
  };

  const isAway = () => offset.current.x !== 0 || offset.current.y !== 0;

  const handlePointerCancel = () => {
    const current = press.current;
    press.current = null;
    // No click follows a cancel, so leave suppressClick alone; just bring the ball back.
    if (current && isAway()) flyHome();
  };

  const handlePointerUp = () => {
    const current = press.current;
    press.current = null;
    if (!current) return;
    if (!current.dragging) {
      // A tap mid-flight paused the flight on pointerdown; send the ball home instead of leaving it parked.
      if (isAway()) flyHome();
      return;
    }
    if (!wrapperRef.current || !buttonRef.current) return;
    suppressClick.current = true;

    // Fling with the speed of the last few moves, then splash where it lands.
    const first = current.samples[0];
    const last = current.samples[current.samples.length - 1];
    const elapsed = Math.max(last.t - first.t, 16);
    const velocity = { x: (last.x - first.x) / elapsed, y: (last.y - first.y) / elapsed };
    const speed = Math.hypot(velocity.x, velocity.y);

    const rect = buttonRef.current.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const landing = {
      x: clamp(center.x + velocity.x * 320, EDGE_PX, window.innerWidth - EDGE_PX),
      y: clamp(center.y + velocity.y * 320, EDGE_PX, window.innerHeight - EDGE_PX),
    };
    const power = clamp(speed / 1.5, 0.3, 2);

    if (ballRef.current) {
      animate(ballRef.current, { rotate: `+=${Math.round(180 + speed * 240)}`, scale: 1, duration: 520, ease: 'outQuad' });
    }
    flight.current = animate(offset.current, {
      x: offset.current.x + landing.x - center.x,
      y: offset.current.y + landing.y - center.y,
      duration: speed > 0.2 ? 480 : 1,
      ease: 'outQuad',
      onUpdate: applyOffset,
      onComplete: () => {
        splat(landing.x, landing.y, power);
        if (ballRef.current) animate(ballRef.current, { scaleX: [1.35, 1], scaleY: [0.7, 1], duration: 700, ease: spring({ bounce: 0.6 }) });
        flyHome();
      },
    });
  };

  const baseScale = 1 + Math.min(Math.max(growth, 0), 1) * 0.3;

  return (
    <div ref={wrapperRef} className="fixed bottom-4 right-4 z-toy sm:bottom-6 sm:right-6">
      {hintVisible && (
        <span aria-hidden="true" className="snow-toy-hint pointer-events-none absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-pill border border-apple-hairline bg-apple-surface-white px-3 py-2 text-caption text-apple-ink shadow-sm">
          눌러서 던지고, 끌어서 날려보세요
        </span>
      )}
      <span
        ref={badgeRef}
        aria-hidden="true"
        className={`pointer-events-none absolute -left-3 -top-2 z-10 rounded-pill bg-apple-primary px-2 py-0.5 text-fine-print font-semibold tabular-nums text-apple-on-primary ${badge ? '' : 'invisible'}`}
      >
        ×{badge}
      </span>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleThrow}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="눈 뭉치 던지기"
        title="눈 뭉치 던지기 · 끌어서 날리기"
        className="snow-toy flex h-14 w-14 touch-none select-none items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2"
      >
        <span className="snow-toy-size block" style={{ transform: `scale(${baseScale})` }}>
          <span ref={ballRef} aria-hidden="true" className="snow-toy-ball relative block h-11 w-11 rounded-full">
            <span ref={faceRef} className="snow-toy-face absolute inset-0 opacity-0"><i /><i /></span>
          </span>
        </span>
      </button>
    </div>
  );
}
