<!-- generated-by: gsd-doc-writer -->
# Codebase Structure

**Current Version:** v1.3.25 (Phase 12 Completed)
**Last Updated:** 2024-05-20

## Directory Layout

```text
[project-root]/
├── .github/            # CI/CD Workflows (deployment to GitHub Pages)
├── .planning/          # Project management and comprehensive documentation
│   ├── codebase/       # Technical specifications (Architecture, Structure, etc.)
│   ├── phases/         # Phase-by-phase execution plans and summaries
│   ├── plans/          # High-level roadmap and phase definitions
│   ├── reports/        # Milestone summaries and verification reports
│   ├── research/       # Domain research and visualization strategies
│   └── migrated-from-ISF/ # Legacy resources for reference
├── public/             # Static assets (PWA icons, manifest)
├── src/
│   ├── components/     # UI Components (Apple-inspired design system)
│   │   ├── charts/     # Data visualizations (SnowballChart, BacktestChart)
│   │   ├── common/     # Atomic components (NumericInput, AnimatedCounter, ShareCard)
│   │   ├── layout/     # Structural components (GlobalNav)
│   │   └── sections/   # Major UI sections (SimulationControls, BacktestView, KPIGrid)
│   ├── core/           # Financial calculation engines
│   │   └── __tests__/  # Unit and integration tests for engine logic
│   ├── data/           # Market data (Indices JSON) and asset definitions
│   ├── db/             # Local persistence (RxDB configuration and schema)
│   ├── hooks/          # Custom React hooks (useScenarios for DB interaction)
│   ├── types/          # Shared TypeScript definitions (finance.ts)
│   ├── App.tsx         # Main application container
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles and Tailwind directives
├── tailwind.config.ts  # Design system tokens (Apple-style theme)
└── package.json        # Dependencies and scripts (v1.3.25)
```

## Core Directory Roles

### **src/core**
- **Role:** The mathematical "brain" of the application.
- **Responsibility:** Handles all complex financial simulations, including compound interest, inflation adjustment, tax calculations, and historical backtesting logic.
- **Key Files:** 
  - `SnowballEngine.ts`: Projection engine for the "Snowball" effect.
  - `BacktestEngine.ts`: Historical data simulation engine.

### **src/components**
- **Role:** User interface implementation following Apple-inspired design principles.
- **Sub-roles:**
  - **sections/**: High-level feature blocks like the control panel (`SimulationControls.tsx`) or data display (`KPIGrid.tsx`).
  - **charts/**: Visualization layer using Recharts to render simulation and backtest results.
  - **common/**: Reusable, low-level components like `NumericInput` with big-number support and `AnimatedCounter`.

### **src/db**
- **Role:** Offline-first data persistence.
- **Responsibility:** Manages the IndexedDB connection via RxDB, defines the scenario schema, and handles data migrations.
- **Key Files:** `database.ts`, `schema.ts`.

### **src/hooks**
- **Role:** Bridge between UI and logic/data.
- **Responsibility:** Provides clean interfaces for components to interact with the database and state.
- **Key Files:** `useScenarios.ts` (manages CRUD operations for simulation scenarios).

### **src/data**
- **Role:** Static asset and metadata provider.
- **Responsibility:** Stores historical market index data (JSON) and provides a registry of available assets for the simulation.
- **Key Files:** `historicalAssets.ts`, `indices/*.json`.

## The .planning Directory

The `.planning/` directory serves as the project's memory and roadmap, essential for agent-driven development.

- **codebase/**: Contains "Deep Context" for the technical stack, architecture, and coding conventions.
- **phases/**: Granular logs of what was planned and achieved in each development sprint (e.g., `10-ux-fix-refinement`).
- **plans/**: The blueprints for upcoming features and architectural shifts.
- **reports/**: Official records of milestone completions and verification results.
- **research/**: Exploratory documents on finance math, UI patterns, and technology choices.

## Naming Conventions

- **Components:** PascalCase (e.g., `BacktestChart.tsx`).
- **Engines/Hooks:** PascalCase for Classes, camelCase for hooks (e.g., `SnowballEngine.ts`, `useScenarios.ts`).
- **Tests:** `[Target].test.ts` located in `__tests__/` subdirectories.

## Where to Add New Code

1. **New Logic:** Add to `src/core/` and write corresponding tests in `src/core/__tests__/`.
2. **New UI Component:** Place in `src/components/common/` if generic, or `src/components/sections/` if feature-specific.
3. **New Data Source:** Add JSON to `src/data/indices/` and register in `src/data/historicalAssets.ts`.
4. **New State/DB Field:** Update `src/db/schema.ts` and handle migration in `src/db/database.ts`.

---
*Structure Analysis verified for Phase 12 (v1.3.25)*
