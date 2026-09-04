---
name: refresh-stock-snowball-data
description: Use when Stock Snowball's committed backtest CSVs, weekly market benchmarks, or market-data manifest need a current manual refresh.
---

# Refresh Stock Snowball Data

## Overview

Refresh the repository's complete static market-data catalog and prove that the generated diff is safe to commit. Preserve existing work and let the generator's validation rules decide whether provider data is acceptable.

## Safety Gate

Work from the repository root. Confirm `package.json` exposes `data:refresh` and `data:check` and that `src/data/indices/manifest.json` exists.

Run `git status --short -- src/data/indices` before any setup or refresh command. If it prints anything, stop and report the paths. Do not move, stash, hide, restore, delete, or overwrite those changes in that turn. Continue only after the user makes the directory clean or, after seeing the path report, gives a new instruction that names each path and its disposition. An earlier or general instruction to "refresh anyway" is not dirty-path authorization. Unrelated changes elsewhere may remain untouched.

Do not commit or push unless the user separately requests it.

## Refresh Contract

1. Run `npm run data:check` to establish that the committed catalog is valid.
2. Run `npm run data:refresh` once. This is the only authorized networked market-data operation.
3. If refresh fails, preserve the exact error and stop. Do not retry, query providers separately, weaken validation, filter bad rows, or invent/backfill values unless the user explicitly asks for diagnosis or remediation. Confirm `src/data/indices` still has no diff and report otherwise.
4. After a successful refresh, run `npm run data:check`.
5. Review `git status --short -- src/data/indices`, `git diff --stat -- src/data/indices`, and the manifest diff. Confirm the catalog still contains exactly the approved 17 CSV series plus `manifest.json`; summarize `generatedAt`, each series' end date, row count, and any provenance changes. Treat removed historical dates, shorter coverage, unexpected files, or unexplained manual overrides as failures requiring user review.
6. Run:

   ```bash
   uv run python -m unittest tests/test_market_data.py
   npm test
   npm run build
   ```

The refresh is complete only when every command passes and the diff review finds no unexplained regression.

## Result Report

Report, in order:

- outcome: updated, blocked before refresh, or failed safely;
- coverage changes: old and new endpoints/row counts plus provenance changes;
- changed files and notable diff findings;
- verification commands and results;
- explicit confirmation that no commit or push was performed.

## Common Mistakes

| Mistake | Correct response |
|---|---|
| Clearing a dirty data directory to make validation pass | Stop and let the owner resolve it. |
| Treating a deadline or earlier maintainer order as dirty-path authorization | Report the paths and wait for a new path-specific instruction. |
| Treating provider output as trustworthy because fetch succeeded | Require offline validation and diff review. |
| Running only frontend tests | Run the market-data unittest, offline check, frontend tests, and build. |
| Silently repairing a failed refresh | Report the generator error without ad hoc market-data edits. |
