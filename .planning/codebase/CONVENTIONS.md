<!-- generated-by: gsd-doc-writer -->
# Coding Conventions

**Analysis Date:** 2026-05-13 (Updated for Phase 12)

## 🌍 Global Standards (Mandatory)

- **Language**: All comments, documentation, and UI strings must use **Korean (한국어)** with polite honorifics (존댓말).
- **Encoding**: All files must be saved in **UTF-8** encoding.
- **Consistency**: Maintain financial integrity (no truncation in intermediate steps) and follow Apple-inspired design principles.

## 📁 Naming Patterns

**Files:**
- **React Components**: `PascalCase.tsx` (e.g., `src/components/common/NumericInput.tsx`)
- **Logic/Classes**: `PascalCase.ts` (e.g., `src/core/SnowballEngine.ts`)
- **Tests**: `PascalCase.test.ts` (e.g., `src/core/__tests__/SnowballEngine.test.ts`)
- **Types**: `kebab-case.ts` (e.g., `src/types/finance.ts`) or context-based.
- **Hooks**: `useCamelCase.ts` (e.g., `src/hooks/useScenarios.ts`)

**Functions:**
- **Logic functions**: `camelCase` (e.g., `calculateDailyCompound`)
- **Event handlers**: `handle` prefix (e.g., `handleCurrencyToggle`)
- **Hook functions**: `use` prefix (e.g., `useScenarios`)

**Variables:**
- **General**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `PRESET_SCENARIOS`)
- **Component props**: `PascalCaseProps` (e.g., `SimulationControlsProps`)

**Types:**
- **Interfaces/Types**: `PascalCase` (e.g., `SimulationResult`)

## 🎨 Apple-Inspired UI Guidelines

**Visual Language:**
- **Color Palette**: 
  - Canvas: `bg-apple-canvas-parchment` (`#f5f5f7`) or `bg-apple-canvas` (`#f0f2f5`)
  - Ink: `text-apple-ink` (`#1d1d1f`)
  - Accent: `text-apple-primary` (`#0066cc`)
  - Muted: `text-apple-ink-muted-48` (`#7a7a7a`)
- **Shapes**: 
  - Rounded Pill: `rounded-pill` (`9999px`)
  - Large Card: `rounded-lg` (`18px`)
  - Medium Button: `rounded-md` (`11px`)
- **Typography**: 
  - Font: **SF Pro Display** (Headings) / **SF Pro Text** (Body)
  - Scale: `text-hero`, `text-display-lg`, `text-body-strong`, `text-caption`.
- **Borders**: Hairline borders (`border-apple-hairline`, `#e0e0e0`).

**✨ Glassmorphism (Frosted Glass):**
- **Implementation**: Use `.frosted-glass` or `.frosted-glass-dark` utility classes.
- **Style**: `background-color: rgba(255, 255, 255, 0.8)` with `backdrop-filter: blur(20px) saturate(180%)`.
- **Usage**: Use for navigation bars, overlay sheets, and floating cards to create depth.

**Interaction & Motion:**
- **Animations**: Use `framer-motion` for state transitions.
- **Springs**: Prefer spring-based physics for active markers and modals.

## 🔢 Financial Precision & Big Numbers

**Precision Standards:**
- **Library**: `decimal.js` (Mandatory for ALL financial calculations).
- **Settings**: `Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN })`.
- **Rounding Strategy**: Always use **Banker's Rounding** (`ROUND_HALF_EVEN`) to minimize cumulative errors.

**Big Number Handling:**
- **Helper**: Use `BigNumberHelper` component for displaying large values.
- **KRW Units**: Use '조', '억', '만' units. For values ≥ 100M KRW, truncate units below 10k ('만') as per user preference.
- **USD Units**: Use 'Billion $', 'Million $' units. For values < 1M USD, display as integers.
- **Dual Currency**: Always provide an estimate in the alternate currency (e.g., "약 120만 원") using `SnowballEngine.formatDualCurrency`.

## 🎣 React Hook Patterns

- **State Management**: Prefer custom hooks (e.g., `useScenarios`) for data persistence and complex state logic.
- **Persistence**: Use `RxDB` or similar local DB via hooks to ensure PWA-compliant data persistence.
- **Subscription**: Use `useEffect` with RxJS observables for real-time data synchronization.
- **Error Handling**: Hooks should provide `loading` and `error` states where applicable.

## 🏗️ Import Organization

**Order:**
1. React and standard libraries
2. External packages (`framer-motion`, `decimal.js`, `rxdb`, etc.)
3. Internal types/interfaces
4. Internal components
5. Internal hooks
6. Styles/Assets

## 💬 Comments & Documentation

- **JSDoc**: Required for core engine methods and complex hooks.
- **Language**: All comments MUST be in **Korean (한국어)**.
- **UTF-8**: Strictly enforced for all files.

## ⚙️ Function Design

- **Size**: Keep functions small and focused.
- **Parameters**: Use object parameters for functions with > 3 arguments.
- **Purity**: Core engine methods should be pure functions returning `Decimal` objects.

---

*Convention analysis: 2026-05-13 (Updated for Phase 12 completion)*
