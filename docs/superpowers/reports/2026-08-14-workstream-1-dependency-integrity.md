# Workstream 1 dependency integrity verification

## Environment

- Repository: `stock-snowball@1.3.27`; verification date: 2026-08-14.
- Candidate dependency commit: `f9b2f62d96ef25e49db6e9c4d31da3275bbe30e7` (`chore: restore React 19 dependency integrity`).
- The development server was started with `npm run dev -- --host 127.0.0.1` at `http://127.0.0.1:5173/stock-snowball/`, then stopped after the browser attempt.
- The resumed check used the Orca built-in browser. The current Orca CLI documents `orca viewport --width <w> --height <h> [--mobile]`. It returned success for both required sizes, but after a page reload the inspected CSS viewport remained 881x838 at DPR 2 (and `navigator.maxTouchPoints` remained 0 for the mobile attempt). Thus the requested 1440x900 and 390x844 sizes were not actually applied to the page.

## Install and dependency graph

`npm ls --depth=0` exited 0. React and React DOM resolve at `19.2.8`; all eleven direct `@visx/*` packages resolve at `4.0.0`; no invalid peers or Visx peer-resolution errors were reported. Clean-install evidence is supplied by the preceding `b7ac583 ci: enforce clean dependency installation` gate.

## Tests and production build

`npm test` exited 0: 5 test files and 48 tests passed (531 ms). `npm run build` exited 0 after TypeScript and Vite processing; it generated `dist/manifest.webmanifest`, `dist/sw.js`, and `dist/workbox-9c191d2f.js`. The build emitted only the pre-existing large-chunk warning for `historical-data`.

## Audit delta

`npm audit --json` exited 1 as expected for deferred vulnerabilities: critical 0, high 4, moderate 1, low 1, total 6. No Visx peer-resolution error appeared.

The remaining direct affected packages are Vite 6.4.2 (GHSA-v6wh-96g9-6wx3 and GHSA-fx2h-pf6j-xcff) and RxDB 17.2.0, which is affected through `ws` (GHSA-58qx-3vcg-4xpx and GHSA-96hv-2xvq-fx4p). Remaining transitive advisories affect `@babel/core` (GHSA-4x5r-pxfx-6jf8), `brace-expansion` (GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895), and `fast-uri` (GHSA-v2hh-gcrm-f6hx, GHSA-7p8r-x3mc-p8w7, GHSA-4c8g-83qw-93j6), plus the stated `ws` advisories.

## Visx bundle delta

The build emitted `vendor-visx-DDVHAbEc.js` at 20.40 kB raw and 7.74 kB gzip. Against the 33.05 kB raw / 9.82 kB gzip baseline, this is -12.65 kB raw and -2.08 kB gzip.

## Desktop visual smoke test

Blocked at the required 1440x900 size: `orca viewport --width 1440 --height 900` reported success, but the reloaded page inspected at 881x838. At that actual viewport, the default projection rendered as a 791x387.5 SVG with grid, axes, year/value labels, and non-zero dimensions. An actual built-in-browser `mouse move` over its `rect.visx-bar` showed the `visx-tooltip` (`2031년 8월 18일`, scenario, invested amount, and range) and a vertical scrub line.

Activating `과거 백테스트 모드` set the backtest tab to `aria-pressed=true` and rendered the historical chart, date/YTD/1Y/5Y controls, asset selector, comparison table, and legend. Its interaction `rect.visx-bar` measured 687x315.5. Dispatching `PointerEvent` and `MouseEvent` with `clientX/clientY` 455/810 and 650/810, followed by official `orca mouse move`, produced visible tooltips for 2016-12-21 and 2020-12-11 respectively; the vertical scrub line moved from x=342.09 to x=537.05. No Visx, `ResizeObserver`, ESM-resolution, or React-peer console error was present. The dev console did contain the separate existing RxDB DVM1 scenario-initialization error.

## Mobile visual smoke test

Blocked. `orca viewport --width 390 --height 844 --mobile` returned `mobile: true`, but the reloaded page remained 881x838 at DPR 2 with `navigator.maxTouchPoints: 0`. Mobile layout, tooltip/scrub behavior, and console assertions at the required 390x844 remain unverified.

## Deferred findings

Vite 6.4.2 and RxDB 17.2.0 remain intentionally deferred; their direct and transitive audit findings are listed above. The visual smoke-test acceptance condition remains not passed solely because the actual browser viewport did not match either required target. The default and backtest Visx chart interactions now pass at the browser's actual 881x838 viewport. No alternative browser surface was used. The acceptable next gate is to use an Orca runtime where `window.innerWidth/innerHeight` prove 1440/900 and 390/844 after `orca viewport`, then repeat these same checks; CLI success output alone is insufficient.

## Rollback

The Workstream 1 dependency commit is `f9b2f62d96ef25e49db6e9c4d31da3275bbe30e7` (`chore: restore React 19 dependency integrity`). Reverting that commit restores the preceding lockfile state and changes dependency metadata only; it does not touch application data.
