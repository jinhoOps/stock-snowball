<!-- generated-by: gsd-doc-writer -->
# Codebase Concerns

**Analysis Date:** 2026-05-15 (Updated after Phase 12)

## Tech Debt

**Hardcoded Database Password:**
- Issue: `src/db/database.ts` contains a hardcoded password (`snowball-local-secret-key-2024`) for Dexie's encryption.
- Files: `src/db/database.ts`
- Impact: Security risk if the codebase is exposed. While it's a local-only PWA, proper key management is missing.
- Fix approach: Implement a dynamic key generation strategy using the Web Crypto API or allow user-defined passphrases.

**Magic Numbers for Calendar Logic:**
- Issue: Simulation logic still relies on `365` days per year and monthly approximations (`d % 30 === 0`).
- Files: `src/core/SnowballEngine.ts`, `src/core/BacktestEngine.ts`
- Impact: Drift in long-term simulations (e.g., 50+ years) and inconsistency with actual calendar leap years.
- Fix approach: Centralize calendar constants in `src/types/finance.ts` and migrate to date-aware stepping (e.g., using `date-fns` for month boundaries).

**Main Thread Simulation:**
- Issue: `simulateRange` performs thousands of `Decimal.js` operations (years * 365) synchronously on the main thread.
- Files: `src/core/SnowballEngine.ts`, `src/App.tsx`
- Impact: UI micro-stutters during parameter adjustments for long-term (50-100 year) simulations.
- Fix approach: Offload simulation logic to a Web Worker.

## Performance Bottlenecks

**Complex SVG Rendering with Animations:**
- Issue: High-fidelity charts (Snowball/Backtest) render thousands of data points and area ranges using SVG.
- Context: Frame rates may drop when Framer Motion spring animations are active alongside complex area path recalculations.
- Files: `src/components/charts/SnowballChart.tsx`, `src/components/charts/BacktestChart.tsx`
- Impact: Interaction lag on lower-end mobile devices during "comparison mode" transitions.
- Fix approach: Implement adaptive downsampling for mobile or transition to HTML5 Canvas for the main chart area.

**IRR Calculation Overhead:**
- Issue: `calculateIRR` in `BacktestEngine` uses iterative approximation.
- Impact: CPU spikes if recalculations are triggered too frequently (e.g., during slider dragging).
- Fix approach: Debounce or memoize the IRR calculation based on the input scenario parameters.

## PWA & Device Consistency

**Local-Only State (No Cloud Sync):**
- Issue: All simulation scenarios and settings are stored locally in IndexedDB (Dexie).
- Impact: Users cannot sync their investment plans between mobile and desktop devices.
- Consideration: Future implementation of a "Data Export/Import" or lightweight sync (e.g., Supabase/Firebase) is needed for professional use.

**Service Worker Cache Invalidation:**
- Issue: Aggressive PWA caching might lead to users seeing stale content after a new release.
- Fix approach: Ensure the "Update Available" toast is robust and forces a reload on user confirmation.

## Sharing & Browser Compatibility

**Image Generation Robustness:**
- Issue: `html-to-image` is sensitive to CSS filter effects (glassmorphism) and external font loading.
- Current Status: CORS `SecurityError` was resolved by using `skipFonts: true` and `cacheBust: true` (Phase 12).
- Remaining Risk: Edge cases in mobile Safari (iOS) where memory limits can cause image generation to fail for extremely long charts.
- Monitoring: Keep an eye on "Blank Share Card" reports on specific browser engines.

**CORS & External Assets:**
- Issue: Any external assets (like future stock logos) added to the shareable UI might re-introduce CORS issues.
- Recommendation: Proxy all external image assets or convert them to Base64 before rendering the share card.

## Financial Calculation Edge Cases

**Trading Day Density Mismatch:**
- Problem: `SnowballEngine` simulates 365 days/year, but historical data often contains only ~252 trading days.
- Files: `src/core/BacktestEngine.ts`
- Impact: Potential distortion when overlaying projection (calendar days) with backtest (trading days).
- Fix approach: Normalize all datasets to a standard 365-day calendar via interpolation.

**Value Averaging Step Drift:**
- Problem: Monthly triggers for VA strategy use `d % 30`.
- Impact: Drifts by ~5 days per year compared to actual calendar months.
- Fix approach: Use `date.getDate() === 1` or similar date-based logic within the simulation loop.

---

*Concerns audit: 2026-05-15 (Phase 12 Completed)*
