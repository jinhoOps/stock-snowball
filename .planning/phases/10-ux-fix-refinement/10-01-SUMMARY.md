# Task Summary: Phase 10 Wave 1 (10-01-PLAN.md)

## Status
- **Date**: 2026-05-15
- **Status**: ✅ Completed
- **Version**: 1.3.4
- **Branch**: main

## Key Changes

### 1. Input UX Improvements (NumericInput.tsx)
- Removed `auto-select` and `clear-on-zero` behavior from `NumericInput`.
- Focus now preserves the existing value (including 0) and places the cursor at the clicked position.
- This allows for much more intuitive editing of numeric values.

### 2. Financial Engine Refinement (SnowballEngine.ts & BacktestEngine.ts)
- **100M KRW Truncation**: For amounts >= 100,000,000 KRW, units below 10,000 KRW are now automatically truncated to improve readability of large numbers.
- **Contribution Cycles**: Added support for 'Daily', 'Weekly', and 'Monthly' contribution cycles. 
- Removed hardcoded '21.75' (monthly working days) assumptions. The engines now directly use the amount specified for the chosen cycle.

### 3. UI & Persistence (App.tsx & SimulationControls.tsx)
- **Rebranding**: Changed "미래 예측" (Future Prediction) to **"스노우볼" (Snowball)** across the application.
- **Persistence**: Added `currency` and `exchangeRate` to `localStorage` caching. User preferences are now preserved across sessions.
- **Cycle Selection**: Added a Segmented Control (Pill UI) for choosing the contribution cycle.
- **USD Conversion Helper**: USD inputs now show a conversion to KRW below the field, including the applied exchange rate.
- **Layout Adjustments**: Moved the scenario saving block to be just above the "Saved Scenarios" section for better flow.

### 4. Sharing & Visualization (KPIGrid.tsx & ShareCard.tsx)
- **Total Contribution**: Both the result grid and the sharing card now explicitly show the "Total Contribution" (cumulative principal).
- **Save as Image**: Implemented the "이미지로 저장" (Save as Image) feature using `html-to-image`. Users can now download a high-quality Apple-style result card as a PNG.

### 5. Polish (AdvancedSettingsSheet.tsx)
- Updated reference asset labels from "%/year" to "CAGR".
- Cleaned up visual clutter in the settings sheet.

## Verification Results
- [x] NumericInput focus/cursor behavior verified.
- [x] 100M+ KRW truncation logic verified with tests.
- [x] Contribution cycles (Daily/Weekly/Monthly) reflect correctly in results.
- [x] Image saving functionality confirmed (PNG download).
- [x] LocalStorage persistence verified.

## Next Steps
- Phase 10 is complete. Proceed to final verification and closure.
