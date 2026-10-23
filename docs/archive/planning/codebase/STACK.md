<!-- generated-by: gsd-doc-writer -->
# Technology Stack

**Analysis Date:** 2025-05-20
**Project Version:** v1.3.25

## Languages

**Primary:**
- TypeScript 6.0.3 - Used for entire application logic and components.

**Secondary:**
- CSS - Implemented via Tailwind CSS for styling.
- JSON - Used for historical market data in `src/data/indices/`.

## Runtime & Tooling

**Environment:**
- Browser (Modern evergreen browsers)
- Vite 6.0.11 - Development server and build tool.

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present.

## Frameworks & UI

**Core:**
- React 19.0.0 - Component-based UI framework.

**UI & Animation:**
- `framer-motion` 12.38.0 - Animation library for Apple-style UI transitions.
- `lucide-react` 0.474.0 - Icon library for consistent visual language.
- `tailwind-merge` / `clsx` - Utilities for dynamic class management.
- `canvas-confetti` 1.9.4 - Visual feedback for user achievements.

**Visualization:**
- `@visx/*` 3.12.0 - Low-level visualization primitives for asset growth and backtest charts.

## Key Dependencies

**Financial & Data:**
- `decimal.js` 10.6.0 - High-precision arithmetic for financial calculations (avoids floating-point errors).
- `rxdb` 17.2.0 - Local-first, reactive database for scenario storage.
- `dexie` 4.4.2 - IndexedDB wrapper used as the primary storage engine for RxDB.
- `rxjs` 7.8.2 - Reactive extensions for database observation and state streams.

**Utilities:**
- `html-to-image` 1.11.13 - Used for generating shareable images of simulation results.
- `crypto-js` 4.2.0 - Encryption for local database storage.

## Configuration & Deployment

**Deployment:**
- **GitHub Pages**: Automated deployment via GitHub Actions.
- **Base Path**: `/stock-snowball/` (configured in `vite.config.ts`).
- **PWA**: Configured via `vite-plugin-pwa` for offline capabilities.

**Build Pipeline:**
- `vite.config.ts` - Main build configuration including PWA and chunk splitting.
- `tailwind.config.ts` - Tailwind CSS theme and content paths.
- `tsconfig.json` / `tsconfig.node.json` - TypeScript compiler settings.
- `postcss.config.js` - CSS processing pipeline.

## Platform Requirements

**Development:**
- Node.js (Version compatible with Vite 6)
- npm

**Production:**
- Static Hosting (GitHub Pages)
- Modern Browser with IndexedDB support (for RxDB and PWA features)

---

*Stack analysis updated for v1.3.25*
