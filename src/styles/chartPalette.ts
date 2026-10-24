/**
 * The one series palette for every chart. Frost Blue leads so the main result always wears the brand color;
 * the rest are distinct hues that pass 3:1 against white and stay apart from each other.
 * JS keeps the hex values because series colors are compared for distance at runtime.
 */
export const SERIES_PALETTE = [
  '#0066cc', // Frost Blue (apple-primary)
  '#b42318', // vermilion
  '#007a6e', // teal
  '#6d28d9', // violet
  '#b45309', // amber
  '#4d7c0f', // green
  '#a21caf', // magenta
] as const;
