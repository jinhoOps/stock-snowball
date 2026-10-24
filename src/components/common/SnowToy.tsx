import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { animate } from 'animejs/animation';
import { spring } from 'animejs/easings/spring';
import type { JSAnimation } from 'animejs';
import { stagger } from 'animejs/utils';
import { avalanche, blizzard, buzz, flurry, shakeScreen, snowBurst, snowfall, snowstorm, splat, throwSnow } from '../../lib/celebration/effects';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

/** Taps closer together than this keep the combo going. */
export const COMBO_WINDOW_MS = 1200;
/** Combo rewards: a blizzard at ×10, an avalanche at ×50, and a finale at ×100 that starts the combo over. */
export const BLIZZARD_COMBO = 10;
export const AVALANCHE_COMBO = 50;
export const MAX_COMBO = 100;
/** How long the ×100 badge stays up before the toy rests. */
const FINALE_REST_MS = 2600;
/** The ×100 ball flies to the middle of the screen and bursts; taps and drags wait until it is back. */
export const FINALE_LOCK_MS = 1600;
const FINALE_FLIGHT_MS = 600;
/** The last few taps before ×50 and ×100 make the ball tremble, building up to the reward. */
const CHARGE_TAPS = 5;
const BANNER_LABELS: Record<number, string> = { [AVALANCHE_COMBO]: '눈사태!', [MAX_COMBO]: '눈폭풍!!' };
/** Combos from this count show a "×N" badge. */
export const COMBO_BADGE_FROM = 3;
const MIN_TAP_GAP_MS = 80;
/** Movement beyond this turns a press into a drag. */
const DRAG_THRESHOLD_PX = 8;
const HINT_KEY = 'snow_toy_hint_seen';
const HINT_DELAY_MS = 5000;
const HINT_VISIBLE_MS = 6000;
const EDGE_PX = 32;

/** 0 below ×10, 1 after the blizzard, 2 after the avalanche, 3 at the finale. Drives the badge and ball glow. */
export const comboTier = (combo: number) =>
  combo >= MAX_COMBO ? 3 : combo >= AVALANCHE_COMBO ? 2 : combo >= BLIZZARD_COMBO ? 1 : 0;

const isCharging = (combo: number) =>
  [AVALANCHE_COMBO, MAX_COMBO].some((goal) => combo >= goal - CHARGE_TAPS && combo < goal);

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
  const frostRef = useRef<HTMLSpanElement>(null);
  const flashRef = useRef<HTMLSpanElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busyUntil = useRef(0);
  const [banner, setBanner] = useState<{ level: number; id: number } | null>(null);
  // While the ×100 ball flies over the page it sits above the snow canvas.
  const [onStage, setOnStage] = useState(false);
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

  useEffect(() => () => {
    clearTimeout(restTimer.current);
    timers.current.forEach(clearTimeout);
  }, []);

  const later = (ms: number, run: () => void) => { timers.current.push(setTimeout(run, ms)); };

  // The big "×50 눈사태!" title: slams in, holds, then blows up and fades. At ×100 each character drops in on its own.
  useEffect(() => {
    const element = bannerRef.current;
    if (!banner || !element) return;
    const finale = banner.level >= MAX_COMBO;
    const duration = finale ? 2600 : 1800;
    animate(element, {
      opacity: [0, 1, 1, 1, 0],
      scale: [0.2, 1.15, 1, 1, 1.5],
      rotate: [finale ? 0 : -10, 0, 0, 0, 0],
      duration,
      ease: 'outQuad',
      onComplete: () => setBanner(null),
    });
    const chars = element.querySelectorAll('.snow-toy-banner-char');
    if (chars.length) {
      animate(chars, { translateY: [-90, 0], rotate: [() => (Math.random() - 0.5) * 60, 0], scale: [2, 1], duration: 700, delay: stagger(70), ease: spring({ bounce: 0.55 }) });
    }
  }, [banner]);

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
    const milestone = badge === BLIZZARD_COMBO || badge === AVALANCHE_COMBO || badge === MAX_COMBO;
    const pop = milestone ? 1 + comboTier(badge) * 0.35 : 1;
    animate(badgeRef.current, { scale: [0.6, pop, 1], opacity: [0, 1], rotate: milestone ? [-12, 0] : 0, duration: milestone ? 900 : 500, ease: spring({ bounce: 0.6 }) });
  }, [badge, prefersReducedMotion]);

  const applyOffset = () => {
    if (wrapperRef.current) wrapperRef.current.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
  };

  const settle = () => {
    combo.current = 0;
    setBadge(0);
    if (ballRef.current) animate(ballRef.current, { scale: 1, scaleX: 1, scaleY: 1, translateY: 0, duration: 900, ease: spring({ bounce: 0.4 }) });
  };

  const showFace = (duration = 1800) => {
    if (faceRef.current) animate(faceRef.current, { opacity: [0, 1, 1, 0], duration, ease: 'linear' });
  };

  /** A frosty glow around the screen edges that fades in and out. */
  const frost = (strength: number, duration: number) => {
    if (frostRef.current) animate(frostRef.current, { opacity: [0, strength, strength, 0], duration, ease: 'inOutSine' });
  };

  const flash = (strength: number, duration = 450) => {
    if (flashRef.current) animate(flashRef.current, { opacity: [0, strength, 0], duration, ease: 'outQuad' });
  };

  /** Shockwave rings spreading out from the ball. */
  const rings = (count: number) => {
    ringRefs.current.slice(0, count).forEach((ring, index) => {
      if (ring) animate(ring, { scale: [0.6, 10 + index * 4], opacity: [0.95, 0], duration: 1000 + index * 250, delay: index * 140, ease: 'outExpo' });
    });
  };

  const showBanner = (level: number) => setBanner({ level, id: performance.now() });

  /** ×100: the ball flies to the middle of the screen, swells, and bursts into a storm before popping back home. */
  const finale = (ball: HTMLElement | null) => {
    busyUntil.current = performance.now() + FINALE_LOCK_MS;
    buzz([100, 60, 100, 60, 320]);
    frost(1, 4200);
    showFace(3400);
    const button = buttonRef.current;
    const burst = (x: number, y: number) => {
      flash(0.9, 600);
      shakeScreen(18, 900);
      snowBurst(x, y);
      snowstorm();
      snowfall(3600, 3);
      rings(3);
      showBanner(MAX_COMBO);
    };
    if (!button) {
      burst(window.innerWidth / 2, window.innerHeight / 2);
      return;
    }
    flight.current?.pause();
    setOnStage(true);
    shakeScreen(5, FINALE_FLIGHT_MS);
    const rect = button.getBoundingClientRect();
    const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const to = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (ball) animate(ball, { scale: [1, 5], rotate: '+=900', duration: FINALE_FLIGHT_MS, ease: 'inQuad' });
    flight.current = animate(offset.current, {
      x: offset.current.x + to.x - from.x,
      y: offset.current.y + to.y - from.y,
      duration: FINALE_FLIGHT_MS,
      ease: 'inOutQuad',
      onUpdate: applyOffset,
      onComplete: () => {
        burst(to.x, to.y);
        if (ball) animate(ball, { scale: 0, duration: 200, ease: 'outQuad' });
        later(900, () => {
          offset.current = { x: 0, y: 0 };
          applyOffset();
          setOnStage(false);
          if (ball) animate(ball, { scale: [0, 1.4, 1], duration: 900, ease: spring({ bounce: 0.6 }) });
        });
      },
    });
  };

  const celebrate = (level: number, ball: HTMLElement | null) => {
    if (level === MAX_COMBO) {
      finale(ball);
      return;
    }
    if (level === AVALANCHE_COMBO) {
      buzz([70, 40, 160]);
      flash(0.55);
      shakeScreen(10, 700);
      rings(2);
      showBanner(AVALANCHE_COMBO);
      avalanche();
      snowfall(2400, 2);
      frost(0.75, 2600);
      showFace();
      if (ball) animate(ball, { rotate: '+=720', scale: [1, 2, 1], duration: 1200, ease: spring({ bounce: 0.5 }) });
      return;
    }
    if (level === BLIZZARD_COMBO) {
      blizzard();
      showFace();
      return;
    }
    if (level % 10 === 0) flurry();
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
    if (now < busyUntil.current) return;
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
    celebrate(level, ball);

    if (level >= MAX_COMBO) {
      // Start over right away, but keep the ×100 badge up for a moment.
      combo.current = 0;
      restTimer.current = setTimeout(settle, FINALE_REST_MS);
      return;
    }
    restTimer.current = setTimeout(settle, COMBO_WINDOW_MS);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || event.button !== 0 || performance.now() < busyUntil.current) return;
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

  const tier = comboTier(badge);
  const bannerText = banner ? `×${banner.level}` : '';

  return (<>
    {/* Outside the wrapper: the wrapper's transform would pin a fixed child to the ball instead of the screen. */}
    <span ref={frostRef} aria-hidden="true" className="snow-toy-frost pointer-events-none fixed inset-0 z-toy opacity-0" />
    <span ref={flashRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-toy-stage bg-apple-surface-white opacity-0" />
    <div ref={wrapperRef} data-tier={tier} data-charging={isCharging(badge) || undefined} className={`snow-toy-root fixed bottom-4 right-4 sm:bottom-6 sm:right-6 ${onStage ? 'z-toy-stage' : 'z-toy'}`}>
      {[0, 1, 2].map((index) => (
        <span key={index} ref={(element) => { ringRefs.current[index] = element; }} aria-hidden="true" className="snow-toy-ring pointer-events-none absolute inset-0 rounded-full opacity-0" />
      ))}
      {hintVisible && (
        <span aria-hidden="true" className="snow-toy-hint pointer-events-none absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-pill border border-apple-hairline bg-apple-surface-white px-3 py-2 text-caption text-apple-ink shadow-sm">
          눌러서 던지고, 끌어서 날려보세요
        </span>
      )}
      <span
        ref={badgeRef}
        aria-hidden="true"
        className={`snow-toy-badge pointer-events-none absolute -left-3 -top-2 z-10 rounded-pill bg-apple-primary px-2 py-0.5 text-fine-print font-semibold tabular-nums text-apple-on-primary ${badge ? '' : 'invisible'}`}
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
    <div ref={bannerRef} aria-hidden="true" data-finale={banner && banner.level >= MAX_COMBO ? true : undefined}
      className="snow-toy-banner pointer-events-none fixed inset-0 z-toy-stage flex flex-col items-center justify-center opacity-0">
      {banner && <>
        <span key={banner.id} className="snow-toy-banner-count">
          {banner.level >= MAX_COMBO
            ? [...bannerText].map((char, index) => <span key={index} className="snow-toy-banner-char inline-block">{char}</span>)
            : bannerText}
        </span>
        <span className="snow-toy-banner-label">{BANNER_LABELS[banner.level]}</span>
      </>}
    </div>
  </>);
}
