# Dependency Integrity Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a normal npm install on React 19, move the Visx package family to its React-19-compatible stable release, and make application tests and deployment run without peer-dependency overrides.

**Architecture:** This workstream changes only dependency resolution and its verification boundary. It upgrades the complete Visx family atomically, refreshes compatible patches, scopes Vitest to application source, and removes the CI escape hatch; later storage, animation, styling, Vite, TypeScript, and runtime migrations remain untouched.

**Tech Stack:** npm lockfile v3, React 19.2.8, Visx 4.0.0, Vitest 4.1.10, Vite 6, GitHub Actions

## Global Constraints

- Keep Vite on major 6, Tailwind CSS on major 3, TypeScript on major 6, RxDB at 17.2.0, Dexie at 4.4.2, `framer-motion` at 12.38.0, and the existing Node configuration.
- Do not change application behavior, chart implementation, RxDB schema, encryption, animation ownership, financial calculations, historical data, PWA configuration, or browser support.
- Set every installed `@visx/*` direct dependency to `^4.0.0`; never mix Visx major versions.
- Set React and React DOM to `^19.2.8`, `@types/react` to `^19.2.18`, and `@types/react-dom` to `^19.2.4`.
- Set PostCSS to `^8.5.26`, Autoprefixer to `^10.5.4`, and Vitest to `^4.1.10`.
- Move `@types/canvas-confetti` from runtime dependencies to dev dependencies without changing its version.
- Do not use `--legacy-peer-deps`, `--force`, npm overrides, or peer-dependency suppression.
- Preserve unrelated untracked `.agents/` and `skills-lock.json` content; never stage them.
- Baseline evidence: focused application tests pass 48/48, production build passes, default tests fail on two `.agents/` files, `npm install` fails on Visx 3 versus React 19, and audit reports 8 findings.

---

### Task 1: Scope the default test command to application source

**Files:**
- Modify: `package.json:6-10`

**Interfaces:**
- Consumes: existing `src/**/*.test.ts` Vitest suites
- Produces: `npm test`, which runs only tests located under `src/`

- [ ] **Step 1: Run the current default test command to prove the discovery failure**

Run:

```bash
npm test
```

Expected: exit 1; the 48 application tests pass, but Vitest reports `No test suite found` for `.agents/skills/caveman-explore/tests/skill-file.test.mjs` and `.agents/skills/caveman-learn/tests/skill-file.test.mjs`.

- [ ] **Step 2: Restrict the test script to application source**

Change only the `test` script in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run src"
  }
}
```

- [ ] **Step 3: Run the default test command to prove the boundary**

Run:

```bash
npm test
```

Expected: exit 0 with `Test Files 5 passed` and `Tests 48 passed`; no `.agents/` path appears.

- [ ] **Step 4: Confirm the focused invocation still works**

Run:

```bash
npm test -- src/core
```

Expected: exit 0 with `Test Files 5 passed` and `Tests 48 passed`.

- [ ] **Step 5: Commit the test boundary**

```bash
git add package.json
git commit -m "test: scope vitest to application source"
```

### Task 2: Align the React and Visx dependency graph

**Files:**
- Modify: `package.json:20-60`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: React 19 chart imports from package-root `@visx/*` entry points
- Produces: a lockfile npm can resolve and install without compatibility flags

- [ ] **Step 1: Reproduce the current peer-resolution failure without changing the lockfile**

Run:

```bash
npm install --package-lock=false --ignore-scripts
```

Expected: exit 1 with `ERESOLVE could not resolve` and a peer conflict showing `@visx/axis@3.12.0` does not accept React 19.

- [ ] **Step 2: Update the exact manifest boundaries**

Apply these dependency changes to `package.json`; leave every unlisted dependency unchanged:

```json
{
  "dependencies": {
    "@visx/axis": "^4.0.0",
    "@visx/curve": "^4.0.0",
    "@visx/event": "^4.0.0",
    "@visx/gradient": "^4.0.0",
    "@visx/grid": "^4.0.0",
    "@visx/group": "^4.0.0",
    "@visx/responsive": "^4.0.0",
    "@visx/scale": "^4.0.0",
    "@visx/shape": "^4.0.0",
    "@visx/tooltip": "^4.0.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "autoprefixer": "^10.5.4",
    "postcss": "^8.5.26",
    "vitest": "^4.1.10"
  }
}
```

Remove `@types/canvas-confetti` from `dependencies`. Preserve `@types/node`, `@vitejs/plugin-react`, Tailwind CSS, TypeScript, Vite, RxDB, Dexie, Motion, and all other declared ranges exactly.

- [ ] **Step 3: Rebuild the lockfile without installing packages**

Run:

```bash
npm install --package-lock-only --ignore-scripts
```

Expected: exit 0 without `ERESOLVE`; `package-lock.json` root version becomes `1.3.27`, all direct Visx packages resolve to `4.0.0`, and the React packages resolve to `19.2.8`.

- [ ] **Step 4: Verify manifest and lockfile invariants with an executable assertion**

Run:

```bash
node --input-type=module -e '
import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const expected = {
  "@visx/axis": "4.0.0",
  "@visx/curve": "4.0.0",
  "@visx/event": "4.0.0",
  "@visx/gradient": "4.0.0",
  "@visx/grid": "4.0.0",
  "@visx/group": "4.0.0",
  "@visx/responsive": "4.0.0",
  "@visx/scale": "4.0.0",
  "@visx/shape": "4.0.0",
  "@visx/tooltip": "4.0.0",
  "react": "19.2.8",
  "react-dom": "19.2.8",
  "@types/react": "19.2.18",
  "@types/react-dom": "19.2.4",
  "autoprefixer": "10.5.4",
  "postcss": "8.5.26",
  "vitest": "4.1.10"
};
if (lock.packages[""].version !== pkg.version) throw new Error("lock root version mismatch");
if (pkg.dependencies["@types/canvas-confetti"]) throw new Error("runtime type dependency remains");
if (pkg.devDependencies["@types/canvas-confetti"] !== "^1.9.0") throw new Error("type dependency missing from devDependencies");
for (const [name, version] of Object.entries(expected)) {
  const actual = lock.packages[`node_modules/${name}`]?.version;
  if (actual !== version) throw new Error(`${name}: expected ${version}, got ${actual}`);
}
console.log("dependency invariants pass");
'
```

Expected: exit 0 and `dependency invariants pass`.

- [ ] **Step 5: Perform a clean install without peer overrides**

Run:

```bash
npm ci
```

Expected: exit 0 without `ERESOLVE`, `--legacy-peer-deps`, or invalid peer warnings.

- [ ] **Step 6: Prove the installed dependency graph is valid**

Run:

```bash
npm ls react react-dom @visx/axis @visx/curve @visx/event @visx/gradient @visx/grid @visx/group @visx/responsive @visx/scale @visx/shape @visx/tooltip
```

Expected: exit 0; React and React DOM are 19.2.8, every listed direct Visx package is 4.0.0, and no package is marked `invalid`.

- [ ] **Step 7: Run application tests and production build**

Run:

```bash
npm test
npm run build
```

Expected: tests report 5 files and 48 tests passed; TypeScript and Vite build exit 0. The existing historical-data chunk warning may remain, but no new Visx compile or module-resolution error is accepted.

- [ ] **Step 8: Commit the dependency graph**

```bash
git add package.json package-lock.json
git commit -m "chore: restore React 19 dependency integrity"
```

### Task 3: Remove the deployment peer override and enforce tests

**Files:**
- Modify: `.github/workflows/deploy.yml:27-33`

**Interfaces:**
- Consumes: the clean lockfile and scoped `npm test` from Tasks 1 and 2
- Produces: a deployment build that uses normal npm peer resolution and blocks on application test failures

- [ ] **Step 1: Change the install command and add the test gate**

Replace the install and build sequence with:

```yaml
      - name: Install dependencies
        run: npm ci

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Verify no peer override remains in tracked project files**

Run:

```bash
if git grep -nE -- '--legacy-peer-deps|--force' -- ':!docs/**' ':!package-lock.json'; then
  exit 1
fi
```

Expected: exit 0 with no output.

- [ ] **Step 3: Reproduce the CI command sequence locally**

Run:

```bash
npm ci
npm test
npm run build
```

Expected: all three commands exit 0; tests report 48 passed; the build produces the PWA service worker and manifest.

- [ ] **Step 4: Check the workflow diff for syntax and scope**

Run:

```bash
git diff --check
git diff -- .github/workflows/deploy.yml
```

Expected: `git diff --check` exits 0; the workflow diff contains only removal of `--legacy-peer-deps` and insertion of the test step.

- [ ] **Step 5: Commit the CI gate**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: enforce clean dependency installation"
```

### Task 4: Run the Workstream 1 acceptance gate

**Files:**
- Create: `docs/superpowers/reports/2026-08-14-workstream-1-dependency-integrity.md`

**Interfaces:**
- Consumes: Tasks 1-3 and baseline evidence from the approved design
- Produces: a persistent audit, bundle, test, and visual verification record for Workstream 2

- [ ] **Step 1: Capture the candidate audit result**

Run:

```bash
npm audit --json
```

Expected: npm may exit 1 because Vite 6 and RxDB 17.2 remain intentionally deferred. The result must not contain a Visx peer-resolution error, and the report must record exact critical, high, moderate, low, and total counts plus every remaining direct advisory.

- [ ] **Step 2: Capture dependency and bundle evidence**

Run:

```bash
npm ls --depth=0
npm test
npm run build
```

Expected: `npm ls` exits 0 without invalid peers; tests pass 48/48; build exits 0 and emits `manifest.webmanifest`, `sw.js`, and `workbox-*.js`. Record the candidate `vendor-visx` raw and gzip sizes against the baseline 33.05 kB raw and 9.82 kB gzip.

- [ ] **Step 3: Smoke-test both Visx charts in a real browser**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Using the in-app browser, verify `http://127.0.0.1:5173/stock-snowball/` at 1440×900 and 390×844:

1. The default projection chart renders its line, grid, axes, and labels without clipping or a zero-sized container.
2. Activating the `과거 백테스트 모드` button renders the backtest chart, legend, axes, and comparison controls.
3. Moving the pointer across each chart displays the corresponding tooltip and scrub line.
4. No console error references Visx, `ResizeObserver`, ESM resolution, or React peer dependencies.

Expected: all four checks pass at both viewport sizes. Any chart layout or tooltip regression blocks the workstream.

- [ ] **Step 4: Write the verification report with observed evidence**

Create `docs/superpowers/reports/2026-08-14-workstream-1-dependency-integrity.md` with these exact sections and the observed command outputs summarized under each:

```markdown
# Workstream 1 dependency integrity verification

## Environment

## Install and dependency graph

## Tests and production build

## Audit delta

## Visx bundle delta

## Desktop visual smoke test

## Mobile visual smoke test

## Deferred findings

## Rollback
```

The report must name Vite 6, RxDB 17.2, and any transitive advisories that remain. Its rollback section must identify the Workstream 1 dependency commit and confirm that reverting it restores the previous lockfile without touching application data.

- [ ] **Step 5: Run final repository checks**

Run:

```bash
git diff --check
git status --short
```

Expected: `git diff --check` exits 0. Before staging the report, status contains only the report plus the pre-existing untracked `.agents/` and `skills-lock.json`; no `dist/` or `node_modules/` path appears.

- [ ] **Step 6: Commit the verification evidence**

```bash
git add docs/superpowers/reports/2026-08-14-workstream-1-dependency-integrity.md
git commit -m "docs: verify dependency integrity restoration"
```

- [ ] **Step 7: Confirm the workstream stop condition**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: only the pre-existing untracked `.agents/` and `skills-lock.json` remain. The four newest implementation commits are the scoped test command, dependency integrity restoration, clean CI install, and verification report. Stop here; do not begin RxDB, Anime.js, Tailwind, Vite 8, TypeScript 7, or Node 24 work.
