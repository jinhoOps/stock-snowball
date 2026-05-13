# Phase 07 Validation: UI/UX & Financial Precision Refinement

## Goal Verification
The goal of Phase 7 is to enhance user input convenience, implement automated currency conversion, and refine advanced settings for a more professional investment simulation experience.

## Success Criteria Checklist
- [ ] **Big Number Helper**: Subtle text guides (억/만, Million/Billion) appear in real-time under principal and contribution inputs.
- [ ] **Currency Conversion**: Automated and precise conversion between KRW and USD using `Decimal.js`.
- [ ] **Advanced Settings Entry**: Gear icon in the header replaces the bulky "Advanced Settings" button.
- [ ] **Dynamic Labels**: Input labels update dynamically (e.g., "Daily" vs "Monthly") based on user selection.
- [ ] **Numeric Input UX**: The "sticky 0" issue is resolved, allowing for a smooth editing experience.
- [ ] **Slider Scalability**: The investment period slider is capped at 30 years visually, while allowing higher values via direct input.

## Verification Details

### Financial Precision
- **Rounding Integrity**: Verification that `Banker's Rounding` is preserved during currency conversion.
- **Precision Preservation**: Ensuring KRW -> USD -> KRW cycles do not drift values due to floating-point errors.

### User Experience (UX)
- **Visual Feedback**: Real-time updates of unit labels as the user types.
- **Minimalist UI**: Clean header integration for settings as per Apple's HIG.
- **Input Responsiveness**: Testing the `NumericInput` on mobile devices to ensure '0' removal doesn't interfere with standard keyboard behavior.

## Evidence
- [ ] **Unit Tests**: Pass all tests in `src/core/__tests__/SnowballEngine.test.ts` (including new currency tests).
- [ ] **Manual Inspection**: Verified UI behaviors in both KRW and USD modes.
- [ ] **Version Bump**: `package.json` version updated for each wave completion.

## Verdict: PENDING
Phase 07 verification will be completed upon successful execution of all plans.
