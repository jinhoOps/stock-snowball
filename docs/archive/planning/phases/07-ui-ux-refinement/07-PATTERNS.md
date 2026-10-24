# Phase 07 Patterns: UI/UX & Financial Precision

Phase 7 introduces several patterns aimed at improving financial precision and user experience within the Apple-inspired design system.

## 1. Currency-Aware State Management
When handling multiple currencies (KRW/USD), we use a pattern where the underlying numeric state is converted only upon a currency toggle event, while real-time formatting remains decoupled.

- **Storage**: Store principal and contribution amounts in the currently selected currency's scale.
- **Conversion**: Use `SnowballEngine.convertCurrency` which leverages `Decimal.js` for precise scaling.
- **Rounding**: KRW is always floored/rounded to an integer, while USD preserves 2 decimal places.

## 2. Subtle Visual Unit Helpers (Big Number Helper)
To reduce cognitive load for large financial numbers, a subtle text guide is provided immediately below the input field.

- **Logic**: A dedicated `BigNumberHelper` component formats values into human-friendly units (e.g., '억/만' for KRW, 'Million/Billion' for USD).
- **Styling**: Uses `apple-ink-muted-48` and `fine-print` typography to maintain a minimal, non-distracting presence.

## 3. Improved Numeric Input UX (Sticky Zero Fix)
Standard `input type="number"` often retains a '0' that users must manually delete before typing. The `NumericInput` pattern solves this:

- **Behavior**:
  - `onFocus`: If the value is `0`, clear the input to allow immediate typing.
  - `onChange`: Sanitize input to allow only valid numeric characters (digits and a single decimal point).
  - `onBlur`: If the input is empty, restore the value to `0`.

## 4. Visual Slider Capping (Fixed Scale Mapping)
For investment periods, a 30-year span is identified as the most common interactive range.

- **Pattern**:
  - The visual slider (`range` input) is capped at a `max` of 30.
  - If the numeric value (via direct input) exceeds 30, the slider handle stays at the 100% (30y) position.
  - This preserves UI resolution for the most common use case while allowing flexibility for ultra-long-term simulations.

## 5. Context-Aware Dynamic Labeling
To maintain a clean UI without redundant text, input labels are dynamically updated based on the selected 'Contribution Cycle'.

- **Example**: Changing cycle from 'Daily' to 'Monthly' updates the label from "일 납입액" to "월 납입액".
- **Implementation**: Labels are derived from the `cycle` state within `SimulationControls`.
