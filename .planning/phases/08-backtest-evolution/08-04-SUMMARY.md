# Phase 8: 'What-If' Backtest Evolution & Future Projection Range - Final Summary

## Phase 8 Overview
Phase 8 expanded the Stock Snowball platform from a single-line projection tool into a robust "What-if" simulation environment. We implemented time-dependent uncertainty ranges for future projections and high-precision historical backtesting with full tax/fee parity.

## Major Accomplishments

### 1. Future Projection Range (Cone of Uncertainty)
- **Engine Logic**: `SnowballEngine` now calculates three concurrent scenarios: Optimistic, Average (Median), and Pessimistic.
- **Variance Formula**: Uncertainty grows over time at a rate of `±0.25% * n_years` from the statistical median CAGR.
- **Visualization**: `SnowballChart` uses `visx/Area` to render a semi-transparent "cone" that visually communicates risk and potential.

### 2. High-Precision Backtesting
- **Engine Upgrade**: `BacktestEngine` now supports `DAILY`, `WEEKLY`, and `MONTHLY` contribution cycles.
- **Realistic Business Days**: Daily contributions are distributed across ~21.75 business days per month, skipping weekends.
- **Tax/Fee Parity**: Integrated brokerage buy fees and ISA-specific tax benefits (tax-free limits and reduced rates) into the backtest loop.
- **Robust Dividends**: Implemented a fallback mechanism for historical points with missing dividend data.

### 3. Advanced Visualization & UX
- **Comparison Mode**: Enabled direct comparison between historical scenarios and future projections using a shared "Months Elapsed" X-axis.
- **State Isolation**: Decoupled `projectionParams` and `backtestParams` in `App.tsx` to prevent accidental state leakage between modes.
- **Statistically Grounded Rates**: Automatically applies Median CAGR calculated from historical price series (e.g., SPY, QQQ) when an asset is selected.

## Verification
- **Unit Tests**: 12 tests in `SnowballEngine.test.ts` and 11 tests in `BacktestEngine.test.ts` passed.
- **Build**: `npm run build` successful with all assets bundled correctly.
- **Metadata**: Version bumped to `1.0.40`.

## Next Steps
- **Phase 9**: PDF Report Export or RxDB Cloud Sync for cross-device persistence.
- **UI Polish**: Refine the scenario card layout to accommodate the new range data.
