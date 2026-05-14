# Phase 8: 'What-If' Backtest Evolution & Future Projection Range - Wave 1 Summary

## Completed Tasks

### Task 08-01-01: Define SimulationParams and Refactor App State
- Defined a unified `SimulationParams` interface in `src/types/finance.ts`.
- Refactored `App.tsx` to use decoupled state objects: `projectionParams` and `backtestParams`.
- Implemented `handleUpdateParams` using the `Partial<SimulationParams>` pattern for cleaner updates.
- Ensured `activeSimulation` and `activeBacktest` consume mode-specific parameters.

### Task 08-01-02: Refactor SimulationControls to be Mode-Aware
- Updated `SimulationControlsProps` to use `onUpdate` with `Partial` support.
- Implemented conditional rendering for Backtest-specific inputs (Date Range, Preset Picker).
- Verified that switching modes preserves independent parameter sets.

### Task 08-01-03: Implement ScenarioPresetPicker UI
- Created `ScenarioPresetPicker` with Apple-style chip layout.
- Integrated historical presets: Dot-com Crash, Financial Crisis (GFC), and COVID-19.
- Verified that clicking a preset correctly updates the `startDate` and `endDate` in Backtest mode.

## Verification Results
- **Build**: `npm run build` successful.
- **Tests**: `npm test` passed (44 tests).
- **Manual Verification**:
  - Mode switching correctly isolates `principal` and other params.
  - Historical presets apply correct dates.
  - UI follows the Apple Design System (Action Blue, Rounded Pills).

## Next Steps
- Proceed to **Wave 2: Task 08-02 (Future Projection Engine Enhancement)**.
- Implement Median CAGR calculation and "Cone of Uncertainty" logic in `SnowballEngine`.
