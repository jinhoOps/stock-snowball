# Workstream 3 Anime.js Motion Pilot Report

## Summary

- Branch: `jinhoOps/anime-motion-pilot`
- Scope: Anime.js 4.5.0 pilot plus Motion removal from KPIGrid, ProductHero, GlobalNav, and BacktestView.
- Deferred: framer-motion package removal and remaining Motion imports for Workstream 4.

## Dependency Result

- `animejs`: 4.5.0
- `framer-motion`: 12.38.0 retained

## Motion Import Result

Command: `rg -n "from 'framer-motion'|from \"framer-motion\"" src`

```text
src/App.tsx:2:import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
src/components/common/Tooltip.tsx:2:import { motion, AnimatePresence } from 'framer-motion';
src/components/common/ScenarioPresetPicker.tsx:2:import { motion, AnimatePresence } from 'framer-motion';
src/components/common/AnimatedCounter.tsx:2:import { useSpring, motion, useAnimation } from 'framer-motion';
src/components/sections/SimulationControls.tsx:3:import { motion } from 'framer-motion';
src/components/sections/AdvancedSettingsSheet.tsx:2:import { motion, AnimatePresence } from 'framer-motion';
src/components/charts/SnowballChart.tsx:13:import { AnimatePresence } from 'framer-motion';
src/components/charts/BacktestChart.tsx:11:import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
```

Remaining file count: 8. No Motion imports remain in `KPIGrid.tsx`, `ProductHero.tsx`, `GlobalNav.tsx`, or `BacktestView.tsx`.

## Verification

- `npm test`: passed — 22 test files and 133 tests passed.
- `npm run build`: passed — TypeScript, Vite production build, and PWA generation completed.
- `npm audit --json`: exited 1 with 6 known vulnerabilities: 1 low, 1 moderate, 4 high, 0 critical. Affected packages are `@babel/core`, `brace-expansion`, `fast-uri`, `rxdb`, `vite`, and `ws`; `animejs` is absent, so the pilot added no direct vulnerability.
- Reduced-motion evidence: `src/index.css` has `prefers-reduced-motion` rules and `usePrefersReducedMotion` has dedicated tests; `KPIGrid.animation.test.tsx` also covers the media query.

## Bundle Result

The exact Workstream 2 baseline is unavailable because Workstream 2 was skipped. Per controller ruling, `origin/main` (`24c1365`) was built as the **temporary baseline** using the same installed dependency tree plus the current pilot's extra Anime.js package. This makes the JavaScript delta attributable to the source/pilot rather than a dependency-install variation.

Current production build:

```text
historical-data-C4-30s6d.js 1939.40 kB 459.22 kB gzip
index-DZ-dWnd_.js 108.71 kB 31.65 kB gzip
vendor-BVTr40FY.js 570.02 kB 195.13 kB gzip
vendor-framer-CHZ-_77X.js 34.24 kB 11.85 kB gzip
vendor-rxdb-CTpFvg_L.js 230.87 kB 73.26 kB gzip
vendor-visx-CnVp8PQD.js 19.92 kB 7.56 kB gzip
TOTAL_JS 2903.15 kB 778.68 kB gzip
```

Temporary `origin/main` baseline:

```text
historical-data-C4-30s6d.js 1939.40 kB 459.22 kB gzip
index-lJbiOyky.js 108.18 kB 31.17 kB gzip
vendor-CudybJAD.js 530.46 kB 179.98 kB gzip
vendor-framer-CNV4uZtT.js 34.24 kB 11.85 kB gzip
vendor-rxdb-BH-ZtAeh.js 230.87 kB 73.26 kB gzip
vendor-visx-5lXaaz9W.js 19.92 kB 7.56 kB gzip
TOTAL_JS 2863.06 kB 763.04 kB gzip
```

Temporary-baseline delta: +40.09 kB raw and +15.64 KiB gzip. The temporary Workstream 3 bundle limit did **not** pass: +15.64 KiB exceeds the +12 KiB limit by 3.64 KiB. This remains a Workstream 4 / release-gate concern until a Workstream 2 baseline and remediation decision are available.

## Browser Smoke

- Orca internal browser dev server: `http://127.0.0.1:5173/stock-snowball/`.
- Actual Orca desktop viewport: 961 x 838. Viewport control was not available in this runtime, so exact 390/1440 verification was not claimed.
- Static mobile evidence: `KPIGrid.tsx` uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`; `BacktestView.tsx` provides an `md:hidden` mobile result layout alongside its `md:block` desktop layout; its comparison card grid moves to `sm:grid-cols-2`.
- Exercised: hovered all KPI cards, clicked `공유(이미지)`, opened Advanced Settings, switched to historical backtest, and confirmed the rendered comparison table and chart (`과거 백테스트 결과 다중 자산 비교 차트`).
- Console: no messages after page load and after exercised interactions; no Anime.js, ResizeObserver, Visx, or React peer errors observed.

## Rollback

Revert the Workstream 3 commits in reverse order:

1. `refactor: retire simple motion usage`
2. `feat: pilot animejs in kpi grid`
3. `feat: add animejs motion foundation`

Rollback restores Motion ownership for the migrated components and removes Anime.js if no later workstream depends on it.

## Workstream 4 Handoff

Remaining Motion owners: App presence, AnimatedCounter, Tooltip, ScenarioPresetPicker, SimulationControls, BacktestChart, SnowballChart, and AdvancedSettingsSheet.

Keep `framer-motion` 12.38.0 installed; package removal is deferred. Before release, reconcile the temporary +15.64 KiB gzip result against the proper Workstream 2 baseline and resolve the +3.64 KiB budget overage.
