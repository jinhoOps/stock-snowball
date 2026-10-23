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

/** A milestone the user reached on purpose: the result number pops and confetti bursts from it. */
export function celebrateMilestone(resultElement: HTMLElement | null) {
  if (prefersReducedMotion()) return;
  if (resultElement) {
    animate(resultElement, { scale: [1, 1.08, 1], duration: 700, ease: spring({ bounce: 0.5 }) });
  }
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 32,
    scalar: 0.9,
    ticks: 160,
    origin: originOf(resultElement),
    colors: ['#0066cc', '#5ac8fa', '#ffffff'],
    disableForReducedMotion: true,
  });
}

/** Snow thrown from the toy. Bigger combos throw more, wider and faster. */
export function throwSnow(fromElement: HTMLElement | null, combo: number) {
  confetti({
    particleCount: 14 + combo * 9,
    spread: 45 + combo * 7,
    startVelocity: 20 + combo * 2.5,
    angle: 115,
    gravity: 0.7,
    drift: -0.2,
    scalar: 0.7 + combo * 0.04,
    ticks: 220,
    shapes: ['circle'],
    colors: SNOW_COLORS,
    origin: originOf(fromElement, { x: 0.92, y: 0.92 }),
    disableForReducedMotion: true,
  });
}

/** Full-combo reward: a short blizzard across the whole page. */
export function blizzard() {
  for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    confetti({
      particleCount: 40,
      spread: 120,
      startVelocity: 8,
      angle: 270,
      gravity: 0.35,
      drift: 0.4,
      scalar: 0.8,
      ticks: 400,
      shapes: ['circle'],
      colors: SNOW_COLORS,
      origin: { x, y: -0.05 },
      disableForReducedMotion: true,
    });
  }
}
