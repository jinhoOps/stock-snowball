# Codebase Structure

**Analysis Date:** [YYYY-MM-DD]

## Directory Layout

```text
[project-root]/
├── .github/            # CI/CD Workflows (deployment to GitHub Pages)
├── .planning/          # Project roadmaps, phase plans, and codebase documentation
├── public/             # Static assets (PWA icons, manifests)
├── src/
│   ├── components/     # UI Components (Apple-inspired design)
│   │   ├── charts/     # Recharts-based data visualizations
│   │   ├── common/     # Reusable atomic components (inputs, buttons)
│   │   ├── layout/     # Structural components (Nav, Footer)
│   │   └── sections/   # Feature-specific composite components
│   ├── core/           # Financial engines (Simulation logic)
│   │   └── __tests__/  # Unit and integration tests for core logic
│   ├── data/           # Static market data and indices
│   │   └── indices/    # Historical price data (JSON)
│   ├── db/             # RxDB configuration and schema definitions
│   ├── hooks/          # Custom React hooks (Data fetching, DB interaction)
│   ├── styles/         # Global styles and Tailwind overrides
│   ├── types/          # TypeScript interface/type definitions
│   ├── App.tsx         # Main application container
│   ├── main.tsx        # Application entry point
│   └── vite-env.d.ts   # Vite environment types
├── package.json        # Dependencies and scripts
├── tailwind.config.ts  # Design system configuration (Colors, Typography)
└── tsconfig.json       # TypeScript configuration
```

## Directory Purposes

**src/core:**
- Purpose: Mathematical heart of the application.
- Contains: Logic for compound interest, backtesting, tax calculation, and inflation adjustment.
- Key files: `src/core/SnowballEngine.ts`, `src/core/BacktestEngine.ts`.

**src/db:**
- Purpose: Local persistence layer configuration.
- Contains: Schema definitions, RxDB plugin registration, and migration logic.
- Key files: `src/db/database.ts`, `src/db/schema.ts`.

**src/components/sections:**
- Purpose: High-level UI blocks that compose the main view.
- Contains: Product Hero, Simulation Controls, KPI Grids, Advanced Settings.
- Key files: `src/sections/SimulationControls.tsx`, `src/sections/AdvancedSettingsSheet.tsx`.

**src/data:**
- Purpose: Source of truth for historical market performance.
- Contains: JSON files with historical index data and helpers to extract metrics like CAGR.
- Key files: `src/data/historicalAssets.ts`, `src/data/indices/*.json`.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Initializes React and mounts the App.
- `src/App.tsx`: Orchestrates the main simulation flow and global state.

**Configuration:**
- `tailwind.config.ts`: Defines the "Apple-style" design system (custom colors like `apple-canvas`, `apple-primary`).
- `src/db/database.ts`: Manages IndexedDB connection and migrations.

**Core Logic:**
- `src/core/SnowballEngine.ts`: Core projection engine.
- `src/core/BacktestEngine.ts`: Historical backtesting engine.

**Testing:**
- `src/core/__tests__/`: Contains critical financial integrity tests.

## Naming Conventions

**Files:**
- Components: PascalCase (`SimulationControls.tsx`)
- Logic/Hooks: camelCase (`useScenarios.ts`, `SnowballEngine.ts`)
- Config: kebab-case or camelCase (`tailwind.config.ts`, `package.json`)

**Directories:**
- Feature folders: kebab-case or simple names (`components`, `core`, `db`).

## Where to Add New Code

**New Calculation Logic:**
- Implementation: `src/core/` (Create a new class or add to existing engines).
- Tests: `src/core/__tests__/` (Mandatory for financial logic).

**New UI Feature:**
- Reusable UI component: `src/components/common/`.
- Major section: `src/components/sections/`.
- Integration into main view: `src/App.tsx`.

**New Historical Asset:**
- Data: Add JSON file to `src/data/indices/`.
- Registration: Update `src/data/historicalAssets.ts` to include the new asset mapping.

**New Database Field:**
- Schema: Update `src/db/schema.ts`.
- Migration: Add a new migration strategy in `src/db/database.ts`.

## Special Directories

**.planning:**
- Purpose: Internal project management and documentation.
- Generated: No (Maintained by agents).
- Committed: Yes.

**dist:**
- Purpose: Production build output.
- Generated: Yes.
- Committed: No.

---

*Structure analysis: [YYYY-MM-DD]*