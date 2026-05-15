# Phase 10: UX Fix & Input Refinement

## Domain
Input UX, State Persistence, and Financial Logic Refinement (Leverage Variance).

## Decisions
### 1. Input UX & Persistence
- **NumericInput**: Select all text on focus for easier overwriting.
- **Immediate Caching**: Store `principal` and `contribution` in `localStorage` on every change.
- **Deferred Persistence**: Sync to RxDB only when explicit "Save" or "Apply" actions occur.
- **Defaults**:
  - Initial Principal: 10,000,000 KRW
  - Contribution Cycle: `DAILY`
  - Daily Contribution: 30,000 KRW

### 2. Advanced Settings Sheet
- **Snapshot Pattern**: Copy parent state to local state on open.
- **Confirmation UX**: Show "Cancel" and "Confirm" buttons at the bottom when local state differs from snapshot.
- **Scroll Logic**: The action bar appears at the bottom of the sheet after changes are made.

### 3. Financial Engine & Data Display
- **CAGR Label**: Show `calculateMedianCAGR(asset)` results explicitly (e.g., "약 12.3%/년").
- **Leverage Variance**:
  - 2x Asset (QLD): 4x variance multiplier.
  - 3x Asset (TQQQ): 8x variance multiplier.

## Canonical Refs
- [SnowballEngine.ts](file:///d:/jhkSandBox/CODE/stock-snowball/src/core/SnowballEngine.ts)
- [NumericInput.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/common/NumericInput.tsx)
- [AdvancedSettingsSheet.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/sections/AdvancedSettingsSheet.tsx)
- [App.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/App.tsx)
