# Phase 5 — UI Review

**Audited:** 2025-03-24
**Baseline:** DESIGN.md (Apple-inspired Design System)
**Screenshots:** Not captured (No dev server)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Aesthetics & Brand | 4/4 | Strong "Apple-like" feel with consistent use of pill shapes and clean layout. |
| 2. Typography & Hierarchy | 3/4 | Good use of display hierarchy, but arbitrary small sizes (10px/11px) in charts. |
| 3. Color & Contrast | 2/4 | Significant hardcoded hex values in chart components bypassing theme tokens. |
| 4. Layout & Spacing | 3/4 | Consistent max-widths and gutters, but arbitrary margins in chart SVGs. |
| 5. Motion & Interaction | 4/4 | Excellent Framer Motion implementation with Apple-standard easing. |
| 6. Accessibility | 1/4 | Blocker: Zero aria-labels found; interactive charts are opaque to screen readers. |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Color Tokenization (Pillar 3)** — `BacktestChart.tsx` uses hardcoded `#007AFF` (System Blue) instead of the brand's "Frost Blue" (`#0066cc`). Replace all hex codes in SVGs with `theme('colors.apple...')` via Tailwind or CSS variables.
2. **Accessibility Compliance (Pillar 6)** — Add `aria-label` to all buttons and interactive chart regions. Interactive components like `SimulationControls` and `BacktestChart` currently provide no semantic cues for assistive tech.
3. **Typography Alignment (Pillar 2)** — Standardize arbitrary font sizes (e.g., `text-[11px]` in `BacktestView.tsx`) to defined tokens like `text-fine-print` (12px) to maintain a cohesive reading rhythm.

---

## Detailed Findings

### Pillar 1: Aesthetics & Brand (4/4)
- **Finding**: `ProductHero.tsx` successfully implements the "Invisible UI, Visible Growth" philosophy with a clean `min-h-[90vh]` and centered display typography.
- **Finding**: Use of `bg-apple-canvas` and `rounded-pill` creates a high-premium aesthetic consistent with the "Snowy" brand identity.

### Pillar 2: Typography & Hierarchy (3/4)
- **Finding**: `tracking-tight` is consistently applied to headlines, achieving the "Apple tight" look.
- **Warning**: `BacktestView.tsx:36` uses `text-[10px]` which is below the defined `micro-legal` (10px) token's usage context.
- **Warning**: `BacktestView.tsx:40` uses `font-bold` for metrics, whereas `DESIGN.md` mandates `weight 600` for headlines and strong body.

### Pillar 3: Color & Contrast (2/4)
- **BLOCKER**: `BacktestChart.tsx` contains 15+ hardcoded hex values. 
  - Line 130: `from="#007AFF"` (Incorrect primary color)
  - Line 142: `fill="#8e8e93"` (Hardcoded gray)
  - Line 162: `stroke="#8e8e93"`
- **Finding**: `SnowballChart.tsx` also bypasses Tailwind tokens for SVG elements (`stroke="#f0f0f0"`).

### Pillar 4: Layout & Spacing (3/4)
- **Finding**: Consistent content width (`max-w-[1000px]` and `max-w-[1200px]`) used across sections.
- **Issue**: Chart components use hardcoded margins: `margin = { top: 60, right: 30, bottom: 50, left: 70 }` in `BacktestChart.tsx:55`. These should ideally align with the 8px base unit.

### Pillar 5: Motion & Interaction (4/4)
- **Finding**: `SimulationControls.tsx` uses `layoutId="active-tab"` for the sliding background effect, providing a fluid, high-quality feel.
- **Finding**: `AnimatedCounter.tsx` is used across all KPI grids, making data changes feel "alive."
- **Finding**: Apple-standard easing `[0.22, 1, 0.36, 1]` is correctly implemented in `ProductHero.tsx`.

### Pillar 6: Accessibility (1/4)
- **BLOCKER**: A `grep` search for `aria-label` returned zero results in the `src/components` directory.
- **Issue**: `SimulationControls.tsx` inputs lack `id` and `label` association via `htmlFor`.
- **Issue**: The `Bar` component in `SnowballChart.tsx` used for interaction has no keyboard accessibility or descriptive label.

---

## Files Audited
- `src/components/charts/SnowballChart.tsx`
- `src/components/charts/BacktestChart.tsx`
- `src/components/sections/ProductHero.tsx`
- `src/components/sections/SimulationControls.tsx`
- `src/components/sections/KPIGrid.tsx`
- `src/components/sections/BacktestView.tsx`
- `src/components/sections/AdvancedSettingsSheet.tsx`
