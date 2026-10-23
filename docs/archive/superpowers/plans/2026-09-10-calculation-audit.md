# Calculation reliability audit

**Goal:** Verify the projection and historical backtest end to end, correct reproducible calculation errors, and preserve the existing product scope.

**Architecture:** Keep the two engines and their existing public entry points. Preserve unrounded values through calculations, use dated cash flows for portfolio returns, and convert money consistently at presentation boundaries. No additional dependencies, trading features, or market-data refresh.

**Spec:** User request: “계산 로직 전체 점검, 백테스트랑 시뮬레이션 두개라 아무래도 신뢰도 챙겨야함”. Existing model limitations are documented in README.md.

## Validation baseline

- [x] Existing suite: 30 files, 215 tests passed before changes.
- [x] Identify live engine callers, product return metrics, real/gold basis transforms, scenario persistence, and monetary units.
- [x] Compare ex-date entitlement and cash-flow-adjusted returns against Investor.gov and CFA Institute references.

## Backtest arithmetic

- [x] Reproduce ex-date overpayment, erased fractional money, artificial liquidation, and daily-dividend annualization using hand-calculated fixtures.
- [x] Correct confirmed errors in `src/core/BacktestEngine.ts`; preserve the documented tax/fee scope.
- [x] Verify price-only, cash-dividend, reinvested dividend, fee, ISA, contribution calendar, and product-metric agreement.

## Projection arithmetic

- [x] Reproduce effective annual rate mismatch, one-day contribution delay, FX cost-basis inconsistency, fractional endpoint loss, and missing VA contributions.
- [x] Correct `src/core/SnowballEngine.ts` with point-in-time contributions and full-precision calculations.
- [x] Calculate portfolio IRR from daily dated cash flows independently of chart sampling.
- [x] Verify zero/negative growth, year boundaries, taxes/fees, and scenario ordering.

## Common metrics and application boundaries

- [x] Reproduce 50-year IRR overflow from 1975-01-01 to 2025-01-01 with principal 100 and terminal value `100 * 1.1 ** (18263 / 365.25)`; expected annual IRR 0.1.
- [x] Stabilize `MoneyWeightedReturn.ts` using scaled NPV in log-rate space, extend the representable search range, and distinguish non-annualizable results with `null`.
- [x] Verify historical total-return series and 252-return rolling annual estimates, including dividends.
- [x] Correct projection portfolio return display, USD ISA allowance, saved-scenario monetary conversion and applicable saved assumptions.
- [x] Add integration checks with real calculation engines for displayed monetary values and return rates.
- [x] Verify elapsed-date chart alignment, independent hover selection and out-of-coverage handling.
- [x] Add incremental split detection without refreshing committed market data.

## Completion

- [x] Complete final code review, including nullable IRR, effective settings, small/negative KRW values, and the shared VA target. Independent engine checks cover 18 projections, 84 backtests across all 14 assets, and 14 median estimates. Browser visual verification was unavailable; component/integration behavior checks passed.
- [x] Run full frontend suite (35 files, 282 tests), market-data offline validation, Python data tests (45), and production build; all passed.
- [x] Document calculation conventions, corrected examples, remaining deliberate model approximations, and final verification results in `docs/calculation-audit.md`.
