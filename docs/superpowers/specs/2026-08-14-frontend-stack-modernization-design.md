# Frontend stack modernization and animation ownership

## Goal

Move Stock Snowball to current stable frontend dependencies through reversible, independently verifiable migrations. Adopt Anime.js as the sole JavaScript animation engine over time, use CSS and Tailwind for simple interaction states, and remove Motion after its React-specific behaviors have either been simplified or replaced.

## Current state

- The application uses React 19, TypeScript, Vite, Tailwind CSS, Visx, RxDB with Dexie storage, and `framer-motion`.
- A normal `npm install` fails because Visx 3 declares React peer support only through React 18 while the application uses React 19. The current lockfile can be installed only with `--legacy-peer-deps`.
- The current lockfile reports eight audit findings: six high, one moderate, and one low. Directly affected packages include Vite, PostCSS, and RxDB.
- The production build succeeds from the existing lockfile. The focused application suite passes 48 tests. The unscoped test command also discovers untracked `.agents/` skill tests and reports two files with no Vitest suite.
- `package.json` reports application version `1.3.27`, while the lockfile root metadata reports `1.0.48`.
- Motion is imported by 12 source files and currently owns presence transitions, shared layout indicators, spring-driven counters, hover/tap feedback, and decorative effects.
- RxDB persists encrypted scenario documents in IndexedDB. Its storage and encryption changes require preservation proof, not only compilation proof.

## Target platform

The stable target versions evaluated on 2026-08-14 are:

- Node.js 24 LTS for local development and CI. Node.js 26 remains a Current release and is not the production baseline.
- React and React DOM 19.2.8.
- Visx 4.0.0, with every `@visx/*` package kept on the same version.
- RxDB 17.4.0 and Dexie 4.4.4.
- Anime.js 4.5.0.
- Tailwind CSS 4.3.3.
- Vite 8.2.1 and `@vitejs/plugin-react` 6.0.5.
- TypeScript 7.0.2.
- Vitest 4.1.10.

These targets are a roadmap, not one atomic dependency update. The existing uv market-data design retains its Node 20 CI constraint until the dedicated runtime migration updates and re-verifies that workflow.

## Architecture decisions

### One animation owner

Anime.js becomes the only long-term JavaScript animation dependency. New Motion usage is prohibited once the Anime.js migration starts. The application does not maintain two permanent animation abstractions.

Animation ownership is divided as follows:

- CSS and Tailwind own hover, active, focus, simple opacity changes, and short one-element transitions.
- Anime.js owns timelines, staggered effects, SVG attributes and paths, numeric interpolation, coordinated decorative effects, and animations requiring imperative playback control.
- Motion remains only as a temporary compatibility layer until each existing use is removed.

The migration must not recreate all Motion conveniences as a custom framework. Non-essential exit animations are removed. Shared wrappers are introduced only when at least two remaining components require the same lifecycle behavior and a plain component-local effect would duplicate code.

### React lifecycle boundary

Every Anime.js integration is scoped to a component root with `createScope({ root })`. The component effect returns `scope.revert()` so unmounting restores styles and releases animation instances. Anime.js and Motion must never control the same element or the same transform property during the transition.

`animejs/waapi` is preferred for isolated opacity and transform effects. The JavaScript `animate()` engine is reserved for SVG, object values, complex timelines, large target sets, or callbacks not supported by WAAPI.

### Accessibility and performance

- Every animation path respects `prefers-reduced-motion` and presents the final state without delay when motion is reduced.
- Animation must not change keyboard focus order, accessible names, or the availability of controls.
- Decorative effects must not block interaction or trigger React state updates on every frame.
- Each migration records the production bundle delta. Anime.js is not accepted if the migrated slice leaves the Motion code in the same chunk while adding an unbounded second animation chunk.

### Stateful storage safety

RxDB and Dexie updates are isolated from unrelated build-tool or animation changes. Before changing either package, tests must create version-4 scenario documents using the old dependency set, reopen them using the candidate set, and verify every encrypted and unencrypted field. Rollback must restore the previous dependency lock without requiring users to clear IndexedDB.

The current CryptoJS wrapper and hard-coded database password remain a known security design problem. Replacing encryption is a separate data migration because changing the wrapper or key without a dual-read transition can make existing scenarios unreadable.

## Delivery decomposition

Each workstream produces a buildable, testable commit series and receives its own implementation plan.

### Workstream 1: Restore dependency integrity

- Upgrade all Visx packages from 3.12.0 to 4.0.0 to establish React 19 peer compatibility.
- Refresh React 19 patches and matching React type packages.
- Update non-breaking direct dependencies and PostCSS security patches where peer compatibility permits.
- Rebuild `package-lock.json` without `--legacy-peer-deps` and correct root version metadata.
- Restrict Vitest discovery to application tests so repository-local agent tooling cannot break the application test command.
- Preserve Vite 6, Tailwind 3, TypeScript 6, RxDB 17.2, Motion, and Node configuration in this workstream.

Acceptance: clean `npm install`, focused and default tests pass, production build passes, Visx charts receive visual smoke coverage, and remaining audit findings are explicitly recorded.

### Workstream 2: Preserve and update browser storage

- Add an old-write/new-read RxDB compatibility fixture for schema version 4.
- Upgrade RxDB to 17.4.0 and Dexie to 4.4.4.
- Remove direct `rxdb-encryption` if confirmed unused. Remove direct CryptoJS or Dexie declarations only when RxDB owns them transitively and the build proves no direct import requires them.
- Verify reload, create, update, delete, and migration behavior against existing encrypted scenarios.

Acceptance: old data remains readable, no IndexedDB reset is required, rollback to the previous lockfile remains possible, and RxDB-related audit findings are resolved or documented.

### Workstream 3: Introduce Anime.js and retire simple Motion usage

- Add Anime.js 4.5.0 and a minimal scoped React helper only if repeated lifecycle code appears.
- Pilot Anime.js in `KPIGrid` decorative effects.
- Move `ProductHero`, `GlobalNav`, and `BacktestView` simple interactions to Anime.js or CSS.
- Replace button hover and tap effects with CSS where no coordinated timeline is required.
- Record bundle, reduced-motion, and visual behavior before expanding the migration.

Acceptance: the pilot has no mixed ownership on a DOM element, cleanup is proven on unmount, reduced motion is tested, and Motion imports decrease without a regression.

### Workstream 4: Remove React-specific Motion dependencies

- Replace `AnimatedCounter` with Anime.js numeric interpolation that updates a ref without per-frame React renders.
- Simplify tooltip and chart exit effects where immediate removal is acceptable.
- Replace `layoutId` indicators with CSS positioning or Anime.js layout animation.
- Replace only essential sheet and application presence transitions with scoped Anime.js completion handling.
- Remove `framer-motion` after its import count reaches zero.

Acceptance: zero Motion imports, no Motion package, equivalent control availability, passing accessibility checks, and no custom general-purpose presence framework.

### Workstream 5: Upgrade styling and build tooling

- Migrate Tailwind 3 to Tailwind 4 with its Vite integration and CSS-first theme configuration.
- Validate all custom Apple design tokens, `@apply` usage, Preflight changes, and supported browser floors through screenshot comparison.
- Migrate Vite 6 through the documented Rolldown compatibility path to Vite 8, then update the React plugin.
- Verify PWA generation, service-worker updates, `manualChunks`, static historical data, and GitHub Pages base paths.

Acceptance: visual baselines pass, PWA install and offline reload work, production chunks remain intentional, and Vite/PostCSS audit findings are resolved.

### Workstream 6: Upgrade TypeScript and runtime policy

- Remove TypeScript 6 deprecation suppressions and deprecated compiler options before installing TypeScript 7.
- Make `rootDir`, global `types`, and path resolution explicit where TypeScript 7 defaults differ.
- Pin Node.js 24 LTS and matching Node type declarations in package metadata and CI.
- Reconcile the Node runtime constraint in the uv market-data workflow.

Acceptance: TypeScript 6 compiles without `ignoreDeprecations`, TypeScript 7 produces the same application diagnostics, Node 24 LTS runs every Node and Python-assisted CI task, and documented local setup matches CI.

## Verification strategy

Every workstream uses the same minimum gates:

1. Install from a clean dependency directory without compatibility flags.
2. Run the focused unit suite and the default repository test command.
3. Run TypeScript checking and the production PWA build.
4. Exercise the changed browser behavior in development and production preview modes.
5. Compare dependency audit output and production chunk sizes with the previous workstream.
6. For visual changes, capture desktop and mobile screenshots and test reduced-motion mode.

Stateful storage and service-worker changes add dedicated upgrade and rollback exercises. Passing compilation alone is not sufficient for either.

## Rollback

- Each workstream is committed separately and can be reverted without reverting later independent workstreams.
- Lockfile changes never span two major tool migrations.
- RxDB rollback restores the previous package set while retaining the same schema version and stored documents.
- Anime.js migration commits remove Motion ownership component by component; a failed component migration can revert without removing the Anime.js pilot.
- Tailwind, Vite, and TypeScript majors are never combined in one rollback unit.

## Non-goals

- Updating every dependency in one command.
- Rewriting charts while upgrading Visx.
- Building a replacement animation framework around Anime.js.
- Changing financial calculations or historical data semantics.
- Changing the RxDB schema or encryption key during a dependency-only storage update.
- Supporting browsers below the eventually approved Tailwind 4 and Vite 8 browser floors.

## Final acceptance

The modernization is complete when clean installation requires no peer override, audit findings are resolved or explicitly accepted, existing encrypted scenarios survive upgrades and rollback, Motion is removed, Anime.js and CSS have non-overlapping ownership, Tailwind 4 and Vite 8 preserve the visual and PWA experience, TypeScript 7 passes, and Node.js 24 LTS is the documented and enforced runtime.
