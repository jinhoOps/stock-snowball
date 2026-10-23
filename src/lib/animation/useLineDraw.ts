import { useLayoutEffect, type RefObject } from 'react';
import { animate } from 'animejs/animation';
import { createDrawable } from 'animejs/svg';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Solid result lines opt in with this class. Dashed lines keep their own dash pattern. */
export const DRAW_CLASS = 'chart-draw';

/**
 * Draws result lines from left to right when the chart's shape changes (new period, assets or length).
 * Small value edits with the same shape morph through the CSS `d` transition instead (`.chart-morph`).
 */
export function useLineDraw(containerRef: RefObject<SVGElement | null>, signature: string, ready = true) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Layout effect: start hidden in the same frame, so the full line never flashes before drawing.
  useLayoutEffect(() => {
    if (!ready || prefersReducedMotion || !containerRef.current) return undefined;
    const paths = containerRef.current.querySelectorAll<SVGPathElement>(`path.${DRAW_CLASS}`);
    if (!paths.length || typeof (paths[0] as SVGGeometryElement).getTotalLength !== 'function') return undefined;
    const drawing = animate(createDrawable(paths), { draw: ['0 0', '0 1'], duration: 1100, ease: 'inOutCubic' });
    return () => { drawing.revert(); };
  }, [signature, ready, prefersReducedMotion, containerRef]);
}
