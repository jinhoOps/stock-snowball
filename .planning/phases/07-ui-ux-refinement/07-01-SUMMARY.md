# Phase 7 Plan 01: Currency & Big Number Helper Summary

**Date:** 2025-05-13
**Subsystem:** UI/UX & Engine
**Key Files:**
- `src/core/SnowballEngine.ts` (Modified)
- `src/components/common/BigNumberHelper.tsx` (Created)
- `src/components/sections/SimulationControls.tsx` (Modified)
- `src/App.tsx` (Modified)

## Key Decisions
- **Decimal.js based Currency Conversion**: Used `Decimal.js` to ensure precision when converting between KRW and USD. KRW is rounded to 0 decimal places, and USD to 2.
- **Subtle Unit Guide**: Implemented `BigNumberHelper` to provide real-time feedback for large numbers (e.g., "1억 2,500만 원" or "10.00 Million $").
- **State Lifting**: Lifted `currency` and `exchangeRate` state to `App.tsx` to ensure consistent formatting across the entire application (Chart, KPI Grid, Controls).

## Accomplishments
- Extended `SnowballEngine` with `convertCurrency`, `formatUSD`, and `formatBigNumber`.
- Created a reusable `BigNumberHelper` component for numeric inputs.
- Integrated currency toggle and big number guides into `SimulationControls`.
- Updated `App.tsx` and `KPIGrid` to support multiple currencies.

## Deviations from Plan
- **App.tsx Modification**: The plan didn't explicitly mention modifying `App.tsx`, but it was necessary to lift the currency state for app-wide consistency.

## Self-Check: PASSED
- [x] KRW -> USD -> KRW conversion preserves precision (within rounding rules).
- [x] '억/만' and 'Million/Billion' units appear correctly below inputs.
- [x] Simulation data updates immediately upon currency switch.
