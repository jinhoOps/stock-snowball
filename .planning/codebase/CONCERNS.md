# Codebase Concerns

**Analysis Date:** 2024-03-22

## Tech Debt

**Hardcoded Database Password:**
- Issue: `src/db/database.ts` contains a hardcoded password for the local database.
- Files: `src/db/database.ts`
- Impact: Security risk if the codebase is exposed, though it's a local database.
- Fix approach: Use Web Crypto API to generate a dynamic key or allow user input for encryption.

**Magic Numbers for Calendar Logic:**
- Issue: Several magic numbers are used to approximate business days and months (21, 21.75, 30.42, 30.4375).
- Files: `src/core/SnowballEngine.ts`, `src/core/BacktestEngine.ts`, `src/hooks/useScenarios.ts`
- Impact: Inconsistency between different modules and potential drift in long-term simulations.
- Fix approach: Centralize calendar constants in `src/types/finance.ts` or a dedicated utility.

**Linear Scenario Variance:**
- Issue: The "Pessimistic" and "Optimistic" scenarios are calculated using a simple linear drag/premium applied daily.
- Files: `src/core/SnowballEngine.ts`
- Impact: Does not accurately represent market volatility (cone of uncertainty) which should typically grow with the square root of time.
- Fix approach: Implement a more statistically sound volatility model (e.g., standard deviation based).

## Performance Bottlenecks

**Heavy Chart Rendering:**
- Issue: Rendering thousands of data points (e.g., 50 years of daily data) using SVG and Monotone curves can be slow.
- Files: `src/components/charts/SnowballChart.tsx`, `src/components/charts/BacktestChart.tsx`
- Impact: UI stuttering during interactions (hover/tooltip) and slow initial load for long-term simulations.
- Fix approach: Downsample data for visualization (e.g., weekly or monthly points instead of daily) or use Canvas for rendering.

**Main Thread Simulation:**
- Issue: `simulateRange` runs a heavy loop for `years * 365` iterations with complex `Decimal` operations.
- Files: `src/core/SnowballEngine.ts`
- Impact: UI blocking during calculation for large year inputs.
- Fix approach: Offload simulation to a Web Worker.

**IRR Calculation Complexity:**
- Issue: `calculateIRR` uses a bisection method with 60 iterations of power functions.
- Files: `src/core/BacktestEngine.ts`
- Impact: Significant CPU usage if called frequently in the render cycle.
- Fix approach: Ensure result is memoized or use a faster approximation method if absolute precision isn't required for display.

## Security Considerations

**Unencrypted Local Storage:**
- Risk: Sensitive financial simulation data (scenarios) is stored in the local database.
- Files: `src/db/database.ts`
- Current mitigation: Hardcoded password used for Dexie's encryption (if enabled).
- Recommendations: Implement proper key management using Web Crypto API.

## Financial Calculation Edge Cases

**Trading Day vs. Calendar Day Mismatch:**
- Problem: Simulation loops 365 times per year, but historical data (`HISTORICAL_DAILY_RETURNS`) may only contain trading days (~252 per year).
- Files: `src/core/SnowballEngine.ts`, `src/data/historicalAssets.ts`
- Cause: Mismatch in data density.
- Improvement path: Adjust simulation loop to match data density or interpolate missing days in historical data.

**CAGR Calculation Drift:**
- Problem: `calculateMedianCAGR` assumes exactly 365 data points represent one year.
- Files: `src/data/historicalAssets.ts`
- Impact: Underestimates CAGR if data points are only trading days (365 points ≈ 1.4 years).
- Fix approach: Calculate time difference between start and end date of the window using actual date strings.

**Value Averaging Step Drift:**
- Problem: `VALUE_AVERAGING` strategy uses `d % 30 === 0` to identify months.
- Files: `src/core/SnowballEngine.ts`
- Impact: Drifts from actual calendar months over long periods.
- Fix approach: Use date-based logic to trigger monthly contributions.

## Test Coverage Gaps

**Edge Case Testing:**
- What's not tested: Zero interest rates, negative interest rates, extremely long periods (100+ years), and leap years.
- Files: `src/core/__tests__/SnowballEngine.test.ts`
- Risk: Potential division by zero or overflows in `Decimal.js` (though unlikely with current precision).
- Priority: Medium

---

*Concerns audit: 2024-03-22*
