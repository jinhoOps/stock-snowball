# Phase 10 Research: UX Fix & Refinement

## 1. NumericInput UX Refinement
### Current Issues
- `handleFocus` triggers `e.target.select()`, which selects all text on focus. This prevents users from clicking and inserting a digit at a specific position without deleting the entire content.
- `if (value === 0) setInputValue('');` clears the input when focusing a zero value, which can be jarring when the user just wants to place a cursor.

### Proposed Fixes
- **Selective Selection:** Remove `e.target.select()` on focus. Instead, use a "select on first focus but allow subsequent clicks to place cursor" approach or simply remove it to match standard behavior if the user finds it obstructive.
- **Improved Zero Handling:** Remove `setInputValue('')` on focus. Let the user delete if they want, or use `e.target.select()` only if the value is 0.
- **Cursor Persistence:** Ensure that clicking into the input places the cursor where expected.

## 2. Financial Formatting Logic (SnowballEngine)
### Requirement
- For amounts $\ge 100,000,000$ KRW, truncate units below $10,000$ KRW (e.g., 1억 2,345만 6,789원 $\rightarrow$ 1억 2,345만 원).

### Implementation Strategy
- Modify `SnowballEngine.formatKoreanWon`.
- Add a condition: `if (amount.gte(10^8)) simplified = true;` or specifically mask the remainder below 10,000 when above 100M.

## 3. KPI Grid & Share Card Expansion
### Requirement
- Add a dedicated card for "Contribution Amount" (매입액) showing the cycle (Daily/Weekly/Monthly).
- Support for "Daily/Weekly/Monthly" selection in the UI.

### Implementation Strategy
- **KPIGrid:** Add a new card. props must include `contribution` and `cycle`.
- **ShareCard:** Add a new stat card in the grid for contribution.
- **Visuals:** Ensure the "Daily/Weekly/Monthly" label is clear and matches Apple's "Tagline" or "Caption Strong" typography.

## 4. Image Saving Implementation
### Requirement
- Save the snowball chart/card as an image.

### Implementation Strategy
- Use `html-to-image` (already in `package.json`).
- Implement a `handleDownload` function in `ShareCard.tsx` or a dedicated wrapper.
- Use `toPng` or `toJpeg` and trigger a browser download.

## 5. Dollar Support Helper
### Requirement
- Helper to show applied exchange rate and KRW conversion for dollar inputs.

### Implementation Strategy
- Create/Update a helper component (e.g., `CurrencyConversionHelper`) that sits below `NumericInput`.
- It should show "약 145,000원 (환율 1,450원)" when the input is in USD.
- This should appear in `SimulationControls` or `AdvancedSettingsSheet` depending on where USD inputs are located.

## 6. Visual Effects & DESIGN.md Adherence
- **Transitions:** Use `framer-motion` for smoother entries in `KPIGrid` cards.
- **Colors:** strictly use `Frost Blue` (#0066cc) for emphasis.
- **Typography:** Ensure negative letter-spacing is applied to all headlines using the `font-display` utility class.
