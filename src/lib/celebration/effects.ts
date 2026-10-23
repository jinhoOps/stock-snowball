import confetti from 'canvas-confetti';
import { animate } from 'animejs/animation';
import { spring } from 'animejs/easings/spring';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Viewport-relative center of an element, or a fallback when it is scrolled out of view. */
const originOf = (element: Element | null | undefined, fallback = { x: 0.5, y: 0.35 }) => {
  if (!element || typeof window === 'undefined') return fallback;
  const rect = element.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < window.innerHeight;
  if (!visible) return fallback;
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
};

const SNOW_COLORS = ['#ffffff', '#dceeff', '#9fcfff', '#5ac8fa', '#0066cc'];
const MILESTONE_COLORS = ['#0066cc', '#5ac8fa', '#ffffff'];

/** Snowflake glyphs drawn once and reused. Falls back to plain dots where canvas text is unavailable. */
let snowShapes: confetti.Shape[] | null = null;
const snowflakes = (): confetti.Shape[] => {
  if (snowShapes) return snowShapes;
  try {
    snowShapes = [
      confetti.shapeFromText({ text: '❄', scalar: 2, color: '#9fcfff' }),
      confetti.shapeFromText({ text: '❅', scalar: 2, color: '#5ac8fa' }),
      'circle',
    ];
  } catch {
    snowShapes = ['circle'];
  }
  return snowShapes;
};

/** Shared settings for snow: flat (no paper flutter), mixed flakes and dots. */
const snow = (options: confetti.Options): confetti.Options => ({
  shapes: snowflakes(),
  colors: SNOW_COLORS,
  flat: true,
  disableForReducedMotion: true,
  ...options,
});

/** How big a milestone is: 1 for 1억·5억, 2 for 10억·50억, 3 for 100억 and up. */
export const celebrationTier = (milestoneKrw: number) =>
  milestoneKrw >= 10_000_000_000 ? 3 : milestoneKrw >= 1_000_000_000 ? 2 : 1;

/** A milestone the user reached on purpose: the result number pops and confetti bursts from it, bigger for bigger goals. */
export function celebrateMilestone(resultElement: HTMLElement | null, milestoneKrw = 0) {
  if (prefersReducedMotion()) return;
  const tier = celebrationTier(milestoneKrw);
  if (resultElement) {
    animate(resultElement, { scale: [1, 1 + 0.05 * tier + 0.03, 1], duration: 700, ease: spring({ bounce: 0.5 }) });
  }
  const origin = originOf(resultElement);
  confetti({
    particleCount: 70 + tier * 30,
    spread: 60 + tier * 15,
    startVelocity: 28 + tier * 5,
    scalar: 0.9,
    ticks: 160 + tier * 30,
    origin,
    colors: MILESTONE_COLORS,
    disableForReducedMotion: true,
  });
  if (tier >= 2) {
    // Side cannons aimed at the number.
    for (const [x, angle] of [[0, 60], [1, 120]] as const) {
      confetti({ particleCount: 60, angle, spread: 55, startVelocity: 55, origin: { x, y: 0.75 }, colors: MILESTONE_COLORS, ticks: 220, disableForReducedMotion: true });
    }
  }
  if (tier >= 3) blizzard();
}

/** Snow thrown from the toy. Bigger combos throw more, wider and faster. */
export function throwSnow(fromElement: HTMLElement | null, combo: number) {
  confetti(snow({
    particleCount: 12 + combo * 8,
    spread: 45 + combo * 7,
    startVelocity: 20 + combo * 2.5,
    angle: 115,
    gravity: 0.6,
    drift: -0.2,
    scalar: 0.8 + combo * 0.05,
    ticks: 240,
    origin: originOf(fromElement, { x: 0.92, y: 0.92 }),
  }));
}

/** A thrown snowball hitting the screen: a round splash where it lands. */
export function splat(clientX: number, clientY: number, power = 1) {
  if (typeof window === 'undefined') return;
  confetti(snow({
    particleCount: Math.round(30 + power * 30),
    spread: 360,
    startVelocity: 12 + power * 10,
    gravity: 0.8,
    scalar: 0.9,
    ticks: 160,
    origin: { x: clientX / window.innerWidth, y: clientY / window.innerHeight },
  }));
}

/** Full-combo reward: a short blizzard across the whole page. */
export function blizzard() {
  for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    confetti(snow({
      particleCount: 36,
      spread: 120,
      startVelocity: 8,
      angle: 270,
      gravity: 0.35,
      drift: 0.4,
      scalar: 1,
      ticks: 420,
      origin: { x, y: -0.05 },
    }));
  }
}
