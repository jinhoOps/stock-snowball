# Phase 8: 'What-If' Backtest Evolution & Future Projection Range - Task 08-02 Summary

## Completed Tasks

### Task 08-02-01: Implement Median CAGR Logic
- Implemented `calculateMedianCAGR` in `src/data/historicalAssets.ts`.
- Uses a rolling 1-year window to calculate the median annual return from historical data.
- Provides a statistically grounded base rate for future projections.

### Task 08-02-02: Upgrade SnowballEngine for Range Generation
- Implemented `SnowballEngine.simulateRange` which calculates three scenarios simultaneously: Pessimistic, Average, and Optimistic.
- Applied the time-dependent variance formula: `±0.25% * n_years` from the median.
- Updated `SnowballEngine.simulate` to maintain backward compatibility by returning the average scenario.
- Verified the logic with new unit tests in `SnowballEngine.test.ts`.

### Task 08-02-03: Refine Daily Contribution with Business Day Logic
- Implemented `isBusinessDay` helper to skip weekends.
- Updated the contribution logic to distribute monthly amounts across approximately 21.75 business days per month (261 days/year).
- Verified that total annual contributions match the expected monthly budget within a tight margin.

## Verification Results
- **Unit Tests**: All 12 tests in `SnowballEngine.test.ts` passed.
- **CAGR Accuracy**: Median calculation verified against historical price series.
- **Range Consistency**: Pessimistic < Average < Optimistic relationship holds true over long durations.

## Next Steps
- Proceed to **Task 08-03 (Backtest Engine Precision Enhancement)**.
- Port advanced tax, fee, and contribution cycle logic to `BacktestEngine`.
