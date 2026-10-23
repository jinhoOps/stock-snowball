# Node 20 jsdom Deployment Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore GitHub Pages deployment by pinning the newest jsdom release compatible with the approved Node 20 CI runtime.

**Architecture:** Keep the Pages workflow and Node 20 baseline unchanged. Reproduce the incompatible jsdom import under Node 20.19.5, pin `jsdom@29.1.1`, synchronize package metadata at version `1.3.29`, then validate locally and through the real Pages workflow.

**Tech Stack:** Node.js 20.19.5 compatibility probe, npm lockfile, jsdom, Vitest, Vite, GitHub Actions, GitHub Pages

## Global Constraints

- Keep `.github/workflows/deploy.yml` on `node-version: 20`.
- Pin `jsdom` exactly to `29.1.1`; do not use a range.
- Do not modify application source or static market data.
- Bump `package.json` and lockfile root metadata from `1.3.28` to `1.3.29`.
- Push only after Node 20, Python, data, Vitest, and build gates pass.
- Monitor the pushed Pages workflow until both build and deploy succeed.

---

### Task 1: Restore Node 20 Test Compatibility and Deploy

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: GitHub Actions `node-version: 20`, npm clean installation, Vitest jsdom environments.
- Produces: a lockfile resolving `jsdom@29.1.1` and package version `1.3.29`.

- [ ] **Step 1: Install the failing lockfile and reproduce RED under Node 20**

Run:

```bash
npm ci
npx --yes node@20.19.5 --input-type=module -e "await import('jsdom'); console.log('jsdom import ok')"
```

Expected: the import fails from `undici`/WebIDL because the current lockfile resolves `jsdom@30.0.1`, whose engine excludes Node 20.

- [ ] **Step 2: Apply the minimal dependency and version change**

Run:

```bash
npm install --save-dev --save-exact jsdom@29.1.1
npm version 1.3.29 --no-git-tag-version
```

Expected: `package.json` pins `jsdom` to `29.1.1`; package and lockfile root versions are `1.3.29`; lockfile resolves jsdom 29-compatible transitive dependencies.

- [ ] **Step 3: Verify GREEN under Node 20**

Run:

```bash
npx --yes node@20.19.5 --input-type=module -e "await import('jsdom'); console.log('jsdom import ok')"
npx --yes node@20.19.5 node_modules/vitest/vitest.mjs run src
```

Expected: jsdom imports successfully and all 123 Vitest tests pass under Node 20.19.5.

- [ ] **Step 4: Run the complete local gates**

Run:

```bash
uv lock --check
uv sync --locked
uv run python -m unittest discover -s tests -v
npm run data:check
npm test
npm run build
git diff --check
```

Expected: Python 17/17, exact 14-asset data validation, Vitest 123/123, and the production build all pass; only the known static-data chunk warning remains.

- [ ] **Step 5: Commit the hotfix**

```bash
git add package.json package-lock.json
git commit -m "fix: restore Node 20 deployment tests"
```

- [ ] **Step 6: Fast-forward main and push**

From the main worktree, fetch/pull with `--ff-only`, fast-forward merge `jinhoOps/hotfix-node20-jsdom`, rerun `npm ci && npm test && npm run build`, and push `main` to `origin`.

Expected: `origin/main` advances from `efa9537` to the hotfix HEAD without a merge commit.

- [ ] **Step 7: Monitor production deployment**

Use `gh run list` to identify the new `Deploy to GitHub Pages` run, then watch it to completion and inspect failed logs if necessary.

Expected: build and deploy jobs both conclude `success`; report the workflow URL and deployed Pages URL.
