# Phase 8: 'What-If' Backtest Evolution - Context

## Overview
Phase 8 focuses on evolving the backtesting system into a high-precision 'What-if' simulation environment. The goal is to allow users to compare their current projection strategies against historical worst-case and best-case scenarios, emphasizing long-term resilience.

## Architectural Decisions

### D-08-01: Parameter State Decoupling
To avoid "State Leakage" where changing projection parameters affects backtest settings unintentionally, `App.tsx` will be refactored to maintain separate state objects for each mode.
- `projectionParams`: For future-oriented simulations.
- `backtestParams`: For historical-based simulations.
- A central `activeParams` selector will provide the correct context to UI components based on the active `mode`.

### D-08-02: Engine Precision Parity
The `BacktestEngine` will be upgraded to match the financial precision of the `SnowballEngine`. This includes:
- Support for multiple contribution cycles (`DAILY`, `WEEKLY`, `MONTHLY`).
- Porting of buy fees and ISA-specific tax logic.
- Robust handling of missing dividend data through historical averages or zero-fallback.

### D-08-03: Unified Comparison Visualization (visx)
A new "Comparison Mode" will be introduced in the chart using **visx**. Since Projection and Backtest have different time scales (years vs. specific calendar dates), they will be synchronized using "Months Elapsed" as a common x-axis.
- **visx** components (LinePath, Axis) will be used to ensure high performance and strict adherence to the project's design tokens.

## Scenario Presets
Pre-defined historical markers will be provided to the user (per 08-RESEARCH.md):
- **Dot-com Crash**: 2000-03-24 to 2002-10-09
- **Financial Crisis (GFC)**: 2007-10-09 to 2009-03-09
- **COVID-19 Crash**: 2020-02-19 to 2020-03-23
- **April 2025 (Hypothetical)**: High-inflation/Tariff shock scenario.

## Key Constraints
- **Banker's Rounding**: Must be maintained across all engine calculations.
- **Apple UI Standards**: All new UI elements (presets picker, mode toggles) must follow `DESIGN.md` guidelines (Action Blue, 44px targets, SF font).
- **Library Consistency**: NO use of Recharts; only **visx** for all visualization tasks.
