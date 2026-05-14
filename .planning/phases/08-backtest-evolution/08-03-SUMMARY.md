# Phase 8: 'What-If' Backtest Evolution & Future Projection Range - Task 08-03 Summary

## Completed Tasks

### Task 08-03-01: Add Cycle Support (D/W/M) with Business Day Logic
- Refactored `BacktestEngine.run` to support `DAILY`, `WEEKLY`, and `MONTHLY` investment cycles.
- Implemented business day check to ensure `DAILY` contributions only occur on weekdays.
- Adjusted budget distribution: `DAILY` uses `monthlyAmount / 21`, `WEEKLY` uses `monthlyAmount / 4`.

### Task 08-03-02: Implement Fee and ISA Tax Logic in Backtest
- Ported buy fee calculation: applied to both initial principal and each recurring installment.
- Implemented ISA-specific tax logic: tracks cumulative gains and applies a reduced tax rate (e.g., 9.5%) on gains exceeding the tax-free limit (e.g., 2M KRW) at the end of the simulation.
- Verified financial parity with `SnowballEngine` through unit tests.

### Task 08-03-03: Dividend Handling and Historical Fallback
- Added a fallback mechanism for missing `dividendYield` data, using the last known yield for the asset.
- Ensured `Total Return` (TR) index calculation remains robust even with sparse dividend data.

## Verification Results
- **Unit Tests**: All 11 tests in `BacktestEngine.test.ts` passed.
- **Cycle Consistency**: Verified that `DAILY` cycle correctly distributes a fixed monthly budget over 21 days.
- **Tax/Fee Accuracy**: Confirmed that buy fees and ISA taxes are deducted accurately in multi-year backtests.

## Next Steps
- Proceed to **Wave 3: Task 08-04 (Advanced Visualization & Comparison Mode)**.
- Implement the "Cone of Uncertainty" (Range Area) and synchronized "Months Elapsed" axis in `SnowballChart.tsx`.
