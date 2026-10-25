import confetti from 'canvas-confetti';

/**
 * Particle kinds that mix with the snow in the toy's bigger combos, so each reward looks different:
 * twinkling stars, tumbling ice shards, flipping coins and money, festive streamers and snowmen.
 * Shapes are drawn once on first use; where canvas shapes are unavailable they fall back to plain ones.
 */

type Origin = { x: number; y: number };

const SPARKLE_COLORS = ['#ffd60a', '#ffe9a8', '#ffffff', '#9fcfff'];
const ICE_COLORS = ['#ffffff', '#dceeff', '#9fcfff', '#5ac8fa'];
const FESTIVE_COLORS = ['#0066cc', '#5ac8fa', '#ffd60a', '#af52de', '#ff6b9a', '#ffffff'];

const cache = new Map<string, confetti.Shape[]>();
const shapes = (key: string, make: () => confetti.Shape[], fallback: confetti.Shape[]) => {
  const hit = cache.get(key);
  if (hit) return hit;
  let made: confetti.Shape[];
  try { made = make(); } catch { made = fallback; }
  cache.set(key, made);
  return made;
};

// A long thin diamond, like a splinter of ice.
const shardShapes = () => shapes('shard', () => [
  confetti.shapeFromPath({ path: 'M0 0 L3 10 L0 22 L-3 10 Z' }),
  confetti.shapeFromPath({ path: 'M0 0 L5 7 L0 14 L-5 7 Z' }),
], ['square']);

const EMOJI_SCALAR = 2.4;
const emoji = (key: string, glyphs: string[]) =>
  shapes(key, () => glyphs.map((text) => confetti.shapeFromText({ text, scalar: EMOJI_SCALAR })), ['circle']);
const moneyShapes = () => emoji('money', ['🪙', '💰', '💵', '📈']);
const snowmanShapes = () => emoji('snowman', ['⛄', '☃️', '🧣']);

/** Gold and white stars that tilt and twinkle as they drift. */
export function sparkles(origin: Origin, count = 30, velocity = 30) {
  confetti({
    shapes: ['star'],
    colors: SPARKLE_COLORS,
    particleCount: count,
    spread: 360,
    startVelocity: velocity,
    gravity: 0.35,
    decay: 0.92,
    scalar: 1.1,
    ticks: 220,
    origin,
    disableForReducedMotion: true,
  });
}

/** Ice shards that tumble outward and fall fast, like a snowball cracking. */
export function iceShards(origin: Origin, count = 40, velocity = 42) {
  confetti({
    shapes: shardShapes(),
    colors: ICE_COLORS,
    particleCount: count,
    spread: 360,
    startVelocity: velocity,
    gravity: 1.1,
    scalar: 1.3,
    ticks: 200,
    origin,
    disableForReducedMotion: true,
  });
}

/** Colourful paper streamers, for the moments that deserve a party. */
export function streamers(origin: Origin, count = 80, angle = 90, spread = 100, velocity = 50) {
  confetti({
    colors: FESTIVE_COLORS,
    particleCount: count,
    angle,
    spread,
    startVelocity: velocity,
    gravity: 0.9,
    scalar: 1,
    ticks: 280,
    origin,
    disableForReducedMotion: true,
  });
}

/** Coins, money bags and rising charts, flipping as they fly: the snowball has turned into money. */
export function money(origin: Origin, count = 14, angle = 90, spread = 70, velocity = 45) {
  confetti({
    shapes: moneyShapes(),
    particleCount: count,
    angle,
    spread,
    startVelocity: velocity,
    gravity: 0.8,
    scalar: EMOJI_SCALAR,
    ticks: 320,
    origin,
    disableForReducedMotion: true,
  });
}

/** A few snowmen and scarves tossed into the air. */
export function snowmen(origin: Origin, count = 6, angle = 90, spread = 80, velocity = 40) {
  confetti({
    shapes: snowmanShapes(),
    particleCount: count,
    angle,
    spread,
    startVelocity: velocity,
    gravity: 0.7,
    scalar: EMOJI_SCALAR,
    ticks: 320,
    origin,
    disableForReducedMotion: true,
  });
}

/** Money gently falling from the top edge, one or two pieces at a time. */
export function moneyDrop(count = 1) {
  confetti({
    shapes: moneyShapes(),
    particleCount: count,
    startVelocity: 0,
    gravity: 0.5 + Math.random() * 0.3,
    drift: Math.random() - 0.5,
    scalar: EMOJI_SCALAR,
    ticks: 420,
    origin: { x: Math.random(), y: -0.08 },
    disableForReducedMotion: true,
  });
}
