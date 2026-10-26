/**
 * Small, seeded Monte Carlo helpers for projection ranges.
 * The seed is fixed so the same inputs always give the same range, and nearby inputs give nearby ranges.
 */

/** Must be even: paths are drawn in antithetic pairs. */
export const MONTE_CARLO_PATHS = 4000;
export const MONTE_CARLO_SEED = 0x5eed2026;
/** The longest market step between random draws; contributions inside a step grow at the median rate. */
export const MONTE_CARLO_STEP_DAYS = 30;
/**
 * The range shows the 10th to 90th percentile (8 in 10 outcomes). A 5–95% range is mathematically fine but,
 * with lognormal returns over decades, its top edge runs to several times the median and reads as a promise.
 */
export const RANGE_LOWER_QUANTILE = 0.1;
export const RANGE_UPPER_QUANTILE = 0.9;
/** Neighbouring sample points on each side averaged into a band edge, to remove sampling jitter. */
export const BAND_SMOOTHING_RADIUS = 2;

/** mulberry32: a fast 32-bit PRNG with good enough statistics for a chart range. */
const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Standard normal draws (Box–Muller), produced in a fixed order from a fixed seed. */
export const createNormalSource = (seed = MONTE_CARLO_SEED) => {
  const uniform = mulberry32(seed);
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const u1 = Math.max(uniform(), Number.MIN_VALUE);
    const u2 = uniform();
    const radius = Math.sqrt(-2 * Math.log(u1));
    spare = radius * Math.sin(2 * Math.PI * u2);
    return radius * Math.cos(2 * Math.PI * u2);
  };
};

/** Uniform draws in [0, 1), produced in a fixed order from a fixed seed. */
export const createUniformSource = (seed = MONTE_CARLO_SEED) => mulberry32(seed);

/** Trading days in a historical year; a projection year of 365 calendar days draws this many returns. */
export const TRADING_DAYS_PER_YEAR = 252;
/** Historical returns are resampled in one-year runs, so a crash and its rebound stay together. */
export const BOOTSTRAP_BLOCK_DAYS = 252;

/**
 * Circular block bootstrap over a daily return history.
 * Each path walks one block of consecutive historical days from a random start, then jumps to a new block.
 * `draw(path, days)` returns the next `days` log returns summed, centred on zero:
 * the history supplies how far and how long prices swing and fall, the caller supplies the growth rate.
 */
export const createBlockBootstrap = (dailyReturns: readonly number[], paths: number, seed = MONTE_CARLO_SEED) => {
  const count = dailyReturns.length;
  if (count === 0) throw new RangeError('A bootstrap needs at least one historical return.');
  if (dailyReturns.some((value) => !Number.isFinite(value) || value <= -1)) {
    throw new RangeError('Historical returns must be finite and above -100%.');
  }
  const logs = dailyReturns.map((value) => Math.log1p(value));
  const mean = logs.reduce((sum, value) => sum + value, 0) / count;
  // prefix[i] = sum of the first i centred log returns.
  const prefix = new Float64Array(count + 1);
  logs.forEach((value, index) => { prefix[index + 1] = prefix[index] + value - mean; });
  const runSum = (start: number, length: number) => (start + length <= count
    ? prefix[start + length] - prefix[start]
    : prefix[count] - prefix[start] + prefix[start + length - count]);

  const blockDays = Math.min(BOOTSTRAP_BLOCK_DAYS, count);
  const position = new Int32Array(paths);
  const left = new Int32Array(paths);
  const uniform = createUniformSource(seed);

  return (path: number, days: number) => {
    let sum = 0;
    let remaining = days;
    while (remaining > 0) {
      if (left[path] === 0) {
        position[path] = Math.min(count - 1, Math.floor(uniform() * count));
        left[path] = blockDays;
      }
      const take = Math.min(remaining, left[path]);
      sum += runSum(position[path], take);
      position[path] = (position[path] + take) % count;
      left[path] -= take;
      remaining -= take;
    }
    return sum;
  };
};

/** Linear-interpolated quantile of values that are already sorted ascending. */
export const sortedQuantile = (sorted: Float64Array, quantile: number) => {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * quantile;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

/**
 * Centered moving average in log space. The window shrinks symmetrically near the ends,
 * so the first and last points stay exactly as sampled. Zero stays zero.
 */
export const smoothInLogSpace = (values: readonly number[], radius: number) => values.map((value, index) => {
  const reach = Math.min(radius, index, values.length - 1 - index);
  if (reach === 0 || value <= 0) return value;
  let sum = 0;
  for (let offset = -reach; offset <= reach; offset++) {
    const neighbour = values[index + offset];
    if (neighbour <= 0) return value;
    sum += Math.log(neighbour);
  }
  return Math.exp(sum / (2 * reach + 1));
});

