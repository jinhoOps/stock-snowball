# Frontend Consistency Implementation Plan

> **For agentic workers:** Execute each unchecked task and verify its consumer behavior. Independent token/document and modal work may use `superpowers:dispatching-parallel-agents`; integrate shared UI changes in order.

**Status:** Completed. Commands, results and visual evidence are recorded in [the QA report](../../design-qa/2026-09-08-frontend-consistency.md).

**Goal:** Make Stock Snowball's design document, generated styles, shared controls and screens agree.

**Architecture:** Keep the current Frost Blue, pale surfaces and rounded shape. Centralize visual tokens in CSS variables consumed by Tailwind, share small UI components, and render modal layers outside page layout. Preserve financial calculations and persisted data.

**Tech Stack:** React 19, TypeScript, Tailwind 3, Framer Motion, Vitest/Testing Library, existing Playwright E2E, Orca browser.

**Spec:** The user approved the audit's complete remediation on 2026-09-08 ("전부 진행"); final product rules live in `DESIGN.md`.

## Global Constraints

- Preserve the existing financial engines, scenario persistence and chart data semantics.
- Keep Frost Blue, light backgrounds and rounded controls; no new brand direction.
- Interactive controls have at least 44px height; field height is 48px.
- Single-choice groups share a named group and `aria-pressed` buttons; disabled reasons remain available.
- Body text, secondary text, title and numeric metrics must resolve to generated CSS.
- Default and wide content widths are 1000px and 1200px with consistent gutters.
- Portal the modal, label it, contain focus, support Escape and return focus on close.
- No new runtime dependencies. Preserve reduced-motion behavior.

## Task 1: Tokens and current-product documentation

**Files:** `DESIGN.md`, `tailwind.config.ts`, `src/index.css`, `scripts/check-design-tokens.mjs`, `package.json`.

- [x] Capture the failing baseline by generating Tailwind CSS and checking currently used named tokens, including `text-title-md` and `text-apple-error`.
- [x] Define color variables once and consume them with opacity support:

```ts
primary: 'rgb(var(--color-primary) / <alpha-value>)'
```

- [x] Add title/metric typography, default/wide widths, field/control dimensions, radii and overlay levels. Preserve existing token names when they already have consumers.
- [x] Rewrite `DESIGN.md` around the actual simulation, backtest, settings, scenarios and sharing surfaces, with component APIs and exceptions.
- [x] Add `npm run design:check` to fail when used semantic Tailwind classes do not generate rules. Validate the check against an injected unknown class as well as the real source.

## Task 2: Accessible shared sheet

**Files:** `src/components/common/Sheet.tsx`, `src/components/common/__tests__/Sheet.test.tsx`.

**Interface:** `Sheet({open, onClose, title, children, footer?})` owns portal, stacking, focus, body lock, header/close control and scrolling; content owns draft settings.

- [x] Write failing tests for the modal focus lifecycle, Escape, Tab/Shift+Tab wrapping and restoring pre-existing body overflow.

```tsx
await user.click(screen.getByRole('button', { name: 'Open settings' }));
expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
await user.keyboard('{Escape}');
expect(document.activeElement).toBe(opener);
```

- [x] Implement with `createPortal(..., document.body)`, dialog semantics, an inert page background and cleanup that restores prior state.
- [x] Verify tests including unmount cleanup; keep 44px close target and mobile bottom-sheet behavior.

## Task 3: Shared controls and form migration

**Files:** `src/components/common/{Button,Field,Surface,Notice,SegmentedControl,NumericInput}.tsx`, `src/styles/components.css`, `src/components/sections/{SimulationControls,AdvancedSettingsSheet}.tsx`, relevant component tests.

**Interfaces:** `Button` wraps native button props with `variant` and `size`; `Field` owns label/help/error association; `Surface` owns card border/radius/padding; `Notice` owns status/error rendering; existing `SegmentedControl` retains its API and adds layout sizing/option accessible labels.

- [x] Replace source-string layout assertions with real consumer tests for mode/currency/cycle changes and named date fields.
- [x] Implement controls without changing numerical input normalization or calculation callbacks.

```tsx
<SegmentedControl label="납입 주기" value={params.cycle}
  options={[{ value: 'DAILY', label: '일' }, { value: 'WEEKLY', label: '주' }, { value: 'MONTHLY', label: '월' }]}
  onChange={(cycle) => onUpdate({ cycle })} />
```

- [x] Migrate all repeated selection and field patterns in both forms; replace inline tiny cycle controls with an accessible full-height row.
- [x] Use shared Sheet in AdvancedSettingsSheet and verify draft/cancel/apply behavior with real interaction tests.

## Task 4: Results, scenarios and layout consistency

**Files:** `src/App.tsx`, `src/components/{layout/GlobalNav,sections/ProductHero,sections/KPIGrid,sections/BacktestPrimaryMetrics,sections/BacktestView,sections/BacktestAnalysisChart,common/ScenarioPresetPicker,common/ShareCard}.tsx`.

- [x] Use default/wide width tokens consistently; remove duplicate inner gutters.
- [x] Share metric card surface/label/value presentation while preserving individual metrics and animation hooks.
- [x] Use common buttons/notices in presets, comparison, scenario saving and detail panels. Keep chart series distinguishable.
- [x] Label icon-only controls and scenario inputs; make scenario selection keyboard-operable without nesting buttons.
- [x] Keep percentage metrics free of currency helper text; preserve signed returns.
- [x] Verify existing scenario, backtest and KPI behavior tests.

## Task 5: Integrated verification and visual review

- [x] Run `npm run design:check`, `npm test`, `npm run build` and existing/new E2E tests.
- [x] Capture desktop and mobile projection, backtest and settings after changes; inspect each screenshot.
- [x] Assert no horizontal overflow, aligned controls, 44px targets, readable metrics and an unobscured modal close button.
- [x] Review diff for unwanted engine/data changes, invalid tokens and stale document rules; fix substantive findings.
- [x] Record commands, outcomes and screenshots in `docs/design-qa/2026-09-08-frontend-consistency.md` and complete this checklist.
