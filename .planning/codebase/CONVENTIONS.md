# Coding Conventions

**Analysis Date:** 2026-05-13

## Naming Patterns

**Files:**
- React Components: `PascalCase.tsx` (e.g., `src/components/common/NumericInput.tsx`)
- Logic/Classes: `PascalCase.ts` (e.g., `src/core/SnowballEngine.ts`)
- Tests: `PascalCase.test.ts` (e.g., `src/core/__tests__/SnowballEngine.test.ts`)
- Types: `kebab-case.ts` (e.g., `src/types/finance.ts`) or context-based.

**Functions:**
- Logic functions: `camelCase` (e.g., `calculateDailyCompound`)
- Event handlers: `handle` prefix (e.g., `handleCurrencyToggle`)
- Hook functions: `use` prefix (e.g., `useScenarios`)

**Variables:**
- General: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (e.g., `PRESET_SCENARIOS`)
- Component props: `PascalCaseProps` (e.g., `SimulationControlsProps`)

**Types:**
- Interfaces/Types: `PascalCase` (e.g., `SimulationResult`)

## Code Style

**Formatting:**
- **Tailwind CSS**: Utility-first styling. Use custom theme extensions for "Apple-inspired" UI.
- **Prettier/ESLint**: Standard Vite-React configuration.

**Financial Precision Standards:**
- **Library**: `decimal.js` (Must use for ALL financial calculations)
- **Settings**: `Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN })`
- **Rounding Strategy**: Always use **Banker's Rounding** (`ROUND_HALF_EVEN`) to minimize cumulative errors in long-term simulations.
- **Unit Integrity**: Keep currency values in their respective base units until formatting for display.

## Apple-Inspired UI Guidelines

**Visual Language:**
- **Color Palette**: 
  - Canvas: `bg-apple-canvas-parchment` (`#f5f5f7`)
  - Ink: `text-apple-ink` (`#1d1d1f`)
  - Translucency: `bg-apple-surface-chip-translucent` (`rgba(210, 210, 215, 0.64)`)
- **Shapes**: 
  - Rounded Pill: `rounded-pill` (`9999px`)
  - Standard Card: `rounded-lg` (`18px`)
- **Typography**: 
  - Font: SF Pro Display / Text (fallback to Inter)
  - Scale: Semantic classes like `text-hero`, `text-display-lg`, `text-caption-strong`.
- **Borders**: Thin hairline borders (`border-apple-hairline`, `#e0e0e0`).

**Interaction & Motion:**
- **Animations**: Use `framer-motion` for state transitions and layout changes.
- **Transitions**: Spring physics for active tab markers and modal transitions.

## Import Organization

**Order:**
1. React and standard libraries
2. External packages (`framer-motion`, `decimal.js`, etc.)
3. Internal types/interfaces
4. Internal components
5. Styles/Assets

## Error Handling

**Patterns:**
- Use TypeScript for compile-time safety.
- Optional chaining and nullish coalescing for deep object access.
- Defensive checks in core engines (e.g., checking for zero rates before division).

## Logging

**Framework:** `console` (minimal usage)

## Comments

**Guidelines:**
- Use JSDoc for complex logic in `core/` engines.
- Language: **Korean (한국어)** for descriptive comments and documentation within the code.

## Function Design

**Size:** Keep functions small and focused. Core engine methods should be pure functions where possible.

**Parameters:** Prefer object parameters for functions with more than 3 arguments.

**Return Values:** Core engines return `Decimal` objects to maintain precision for subsequent operations.

---

*Convention analysis: 2026-05-13*
