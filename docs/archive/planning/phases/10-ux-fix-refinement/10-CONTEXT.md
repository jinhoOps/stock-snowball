# Phase 10: UX Fix & Input Refinement

## Domain
Input UX, State Persistence, Financial Logic Refinement, and Sharing Features.

## Decisions
### 1. Input UX & Persistence
- **NumericInput**: 
  - Remove auto-select on focus to allow cursor placement (unless value is 0).
  - Do not clear 0 on focus; allow manual deletion.
- **Immediate Caching**: Store `principal` and `contribution` in `localStorage` on every change.
- **Currency Helper**: Show KRW conversion and exchange rate below USD inputs.

### 2. Contribution Cycle
- **New Feature**: Add a "Contribution Cycle" selector (Daily/Weekly/Monthly).
- **KPI Card**: Add a dedicated card in `KPIGrid` showing the contribution amount and cycle.

### 3. Financial Engine & Data Display
- **Formatting Rule**: For amounts $\ge 100M$ KRW, truncate units below $10,000$ KRW.
- **CAGR Label**: Show `calculateMedianCAGR(asset)` results explicitly.

### 4. Image Saving
- **Feature**: Add a "Save as Image" button to the result view.
- **Implementation**: Use `html-to-image` to capture the `ShareCard` or the main result area.

### 5. Branding & UI Layout
- **Rebranding**: Change "미래 예측" (Future Prediction) to "스노우볼" (Snowball).
- **Advanced Settings**: Reference assets should display "CAGR" instead of "%/year" and remove color indicators for a cleaner look.
- **Scenario Input**: Move the scenario name input and "Add to Comparison" button block to just above the "Saved Scenarios" section.
- **Comparison Logic**: Scenario comparison is primarily for the "Snowball" (Future Prediction) mode. Backtesting already provides asset-based comparison.

## Canonical Refs
- [SnowballEngine.ts](file:///d:/jhkSandBox/CODE/stock-snowball/src/core/SnowballEngine.ts)
- [NumericInput.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/common/NumericInput.tsx)
- [KPIGrid.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/sections/KPIGrid.tsx)
- [ShareCard.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/common/ShareCard.tsx)
- [SimulationControls.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/sections/SimulationControls.tsx)
- [AdvancedSettingsSheet.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/components/sections/AdvancedSettingsSheet.tsx)
- [App.tsx](file:///d:/jhkSandBox/CODE/stock-snowball/src/App.tsx)
