# Technology Stack

**Analysis Date:** 2025-05-15

## Languages

**Primary:**
- TypeScript 6.0.3 - Used for entire application logic and components.

**Secondary:**
- CSS - Implemented via Tailwind CSS for styling.
- JSON - Used for historical market data in `src/data/indices/`.

## Runtime

**Environment:**
- Browser (Modern evergreen browsers)
- Vite 6.0.11 - Development server and build tool.

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present.

## Frameworks

**Core:**
- React 19.0.0 - Component-based UI framework.

**Testing:**
- Vitest 4.1.6 - Unit and integration testing framework.

**Build/Dev:**
- Vite 6.0.11 - Fast build tool and dev server.
- TypeScript 6.0.3 - Static type checking.
- PostCSS 8.5.1 / Autoprefixer 10.4.20 - CSS transformation.

## Key Dependencies

**Critical:**
- `rxdb` 17.2.0 - Local-first database for scenario storage.
- `decimal.js` 10.6.0 - High-precision arithmetic for financial calculations.
- `framer-motion` 12.38.0 - Animation library for Apple-style UI transitions.
- `@visx/*` 3.12.0 - Data visualization components for asset growth and backtest charts.

**Infrastructure:**
- `dexie` 4.4.2 - IndexedDB wrapper used as storage engine for RxDB.
- `rxjs` 7.8.2 - Reactive extensions for database observation.
- `crypto-js` 4.2.0 - Encryption for local database storage.

## Configuration

**Environment:**
- Configured via Vite environment variables (`.env` files not committed, using defaults).
- `base: '/stock-snowball/'` for GitHub Pages deployment.

**Build:**
- `vite.config.ts` - Main build configuration including PWA and chunk splitting.
- `tailwind.config.ts` - Tailwind CSS theme and content paths.
- `tsconfig.json` / `tsconfig.node.json` - TypeScript compiler settings.
- `postcss.config.js` - CSS processing pipeline.

## Platform Requirements

**Development:**
- Node.js (Version compatible with Vite 6)
- npm

**Production:**
- Static Hosting (e.g., GitHub Pages)
- Browser with IndexedDB support (for RxDB)

---

*Stack analysis: 2025-05-15*
