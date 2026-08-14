# Workstream 1 dependency integrity verification

## Environment

- Repository: `stock-snowball@1.3.27`; verification date: 2026-08-14.
- Candidate dependency commit: `f9b2f62d96ef25e49db6e9c4d31da3275bbe30e7` (`chore: restore React 19 dependency integrity`).
- The development server was started with `npm run dev -- --host 127.0.0.1` at `http://127.0.0.1:5173/stock-snowball/`, then stopped after the browser attempt.

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

Blocked. The required in-app-browser runtime selection for the local URL returned `No browser is available`; the required availability check returned `[]`. Consequently, the 1440x900 projection and backtest chart layout, labels, axes, legend, controls, tooltip/scrub behavior, and console could not be observed in a real browser.

## Mobile visual smoke test

Blocked for the same unavailable required browser backend. The 390x844 projection and backtest chart layout, labels, axes, legend, controls, tooltip/scrub behavior, and console could not be observed in a real browser.

## Deferred findings

Vite 6.4.2 and RxDB 17.2.0 remain intentionally deferred; their direct and transitive audit findings are listed above. The visual smoke-test acceptance condition remains unavailable, not passed: no alternative browser surface was used. Reconnect an in-app browser and rerun both viewport checks before accepting Workstream 1.

## Rollback

The Workstream 1 dependency commit is `f9b2f62d96ef25e49db6e9c4d31da3275bbe30e7` (`chore: restore React 19 dependency integrity`). Reverting that commit restores the preceding lockfile state and changes dependency metadata only; it does not touch application data.
