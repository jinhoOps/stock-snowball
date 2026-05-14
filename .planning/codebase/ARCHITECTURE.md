<!-- refreshed: [YYYY-MM-DD] -->
# Architecture

**Analysis Date:** [YYYY-MM-DD]

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                       │
├──────────────────┬──────────────────┬───────────────────────┤
│    [Views]       │  [Components]    │      [Charts]         │
│ `src/App.tsx`    │ `src/components` │ `src/components/charts`│
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              State & Logic Bridge (Hooks)                   │
│        `src/hooks/useScenarios.ts`, `useState`              │
└────────┬───────────────────────────────────────┬────────────┘
         │                                       │
         ▼                                       ▼
┌───────────────────────────┐    ┌────────────────────────────┐
│      Core Engines         │    │       Persistence          │
│ `src/core/SnowballEngine` │    │     `src/db/database.ts`   │
│ `src/core/BacktestEngine` │    │         (RxDB/Dexie)       │
└────────┬──────────────────┘    └───────────────┬────────────┘
         │                                       │
         ▼                                       ▼
┌───────────────────────────┐    ┌────────────────────────────┐
│       Data Layer          │    │      Local Storage         │
│ `src/data/indices/*.json` │    │       (IndexedDB)          │
└───────────────────────────┘    └────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App Container | Main state management for active simulation, mode switching (PROJECTION vs BACKTEST) | `src/App.tsx` |
| SnowballEngine | High-precision projection calculations (compound interest, tax, inflation, exchange rate) | `src/core/SnowballEngine.ts` |
| BacktestEngine | Historical data-based simulation and metrics calculation (CAGR, MDD, Win Rate) | `src/core/BacktestEngine.ts` |
| useScenarios | React hook bridging RxDB queries to UI state, handling subscription and CRUD | `src/hooks/useScenarios.ts` |
| RxDB Setup | Database initialization, schema definition, and migration strategies | `src/db/database.ts` |
| Historical Assets | Providing historical market data (SPY, QQQ, etc.) for backtesting | `src/data/historicalAssets.ts` |

## Pattern Overview

**Overall:** Local-First PWA with Separated Pure-Logic Domain

**Key Characteristics:**
- **Local-First Persistence**: User scenarios are stored locally in the browser using IndexedDB via RxDB (`src/db/database.ts`). No backend dependency.
- **Pure Core Logic**: Complex financial calculations are fully isolated in `src/core/*` without any React dependencies.
- **Reactive State**: RxDB observables are mapped to React state via `useScenarios.ts`, ensuring UI is always in sync with local storage.
- **High Precision**: Financial math utilizes `decimal.js` with precision set to 40 to avoid floating-point errors.

## Layers

**UI Layer:**
- Purpose: Present data, capture user inputs, render visualizations.
- Location: `src/components/`, `src/App.tsx`
- Contains: React components, Framer Motion animations.
- Depends on: Hooks layer, Core layer (for pure calculations).
- Used by: User.

**Hooks Layer (State Bridge):**
- Purpose: Connect the asynchronous/reactive DB to React's component lifecycle.
- Location: `src/hooks/`
- Contains: Custom hooks (e.g., `useScenarios`).
- Depends on: Persistence layer (`src/db/`).
- Used by: UI Layer.

**Core Domain Layer:**
- Purpose: Execute stateless, mathematically rigorous financial simulations.
- Location: `src/core/`
- Contains: `SnowballEngine`, `BacktestEngine`.
- Depends on: Types, Static Data (`src/data/`).
- Used by: UI Layer, Tests.

**Persistence Layer:**
- Purpose: Provide schema-validated, encrypted, versioned local storage.
- Location: `src/db/`
- Contains: RxDB configuration, Dexie adapter.
- Depends on: IndexedDB API.
- Used by: Hooks Layer.

## Data Flow

### Primary Request Path (Saving a Scenario)

1. User clicks "Save" in UI (`src/App.tsx:handleSaveScenario`)
2. Hook function invoked (`src/hooks/useScenarios.ts:addScenario`)
3. DB insert operation (`src/db/database.ts`)
4. RxDB observable triggers `next` in subscription (`src/hooks/useScenarios.ts:useEffect`)
5. React state `scenarios` updates, UI re-renders.

### Simulation Path (Real-time Calculation)

1. User adjusts a slider or input (`src/App.tsx:handleUpdateParams`)
2. React state updates, triggering a re-eval of `useMemo` block (`src/App.tsx:activeSimulation` or `activeBacktest`)
3. `SnowballEngine.simulateRange` or `BacktestEngine.run` is called synchronously with new params.
4. Results are fed into chart components and KPI grids.

## Key Abstractions

**Simulation Engine (SnowballEngine):**
- Purpose: Encapsulates all future projection math.
- Examples: `src/core/SnowballEngine.ts`
- Pattern: Static Utility Class/Pure Functions.

**RxDB Setup:**
- Purpose: Abstract away IndexedDB complexity, add migrations and encryption.
- Examples: `src/db/database.ts`, `src/db/schema.ts`
- Pattern: Singleton (`getDatabase`), Reactive Collections.

## Entry Points

**React Entry:**
- Location: `src/main.tsx`, `src/App.tsx`
- Triggers: Page load.
- Responsibilities: Render React tree, initialize global styles.

**DB Initialization:**
- Location: `src/db/database.ts:createDatabase`
- Triggers: First call to `getDatabase()` from hooks.
- Responsibilities: Set up IndexedDB, run pending migrations.

## Architectural Constraints

- **No Backend**: The app must remain fully functional offline. All data is static or local.
- **Math Precision**: Native JS `Number` must not be used for compound interest calculations. `Decimal.js` is mandatory in `src/core/*`.
- **Pure Functions in Core**: `src/core/` files must not import React hooks or window-specific objects, to ensure they can be easily tested.

## Anti-Patterns

### Floating Point Math for Finance

**What happens:** Using native `*` or `+` for compounding over 365 days * 10 years.
**Why it's wrong:** Introduces micro-errors that compound into large discrepancies.
**Do this instead:** Use `Decimal.js` and `SnowballEngine.bankersRounding` (`src/core/SnowballEngine.ts`).

### Direct IndexedDB Access in Components

**What happens:** Calling Dexie or native IndexedDB APIs inside component `useEffect`.
**Why it's wrong:** Bypasses RxDB schema validation, migrations, and reactive updates.
**Do this instead:** Use the `useScenarios` hook or add a new method to it (`src/hooks/useScenarios.ts`).

## Error Handling

**Strategy:** Localized fallbacks and graceful degradation.
**Patterns:**
- Try/catch blocks in hook initialization.
- Fallback empty arrays/null objects if engine calculations fail.

## Cross-Cutting Concerns

**Persistence**: Handled globally via RxDB.
**Responsiveness**: Handled via Tailwind CSS.
**Animations**: Handled via Framer Motion at the UI layer boundary.

---

*Architecture analysis: [YYYY-MM-DD]*