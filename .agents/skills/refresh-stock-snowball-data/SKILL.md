---
name: refresh-stock-snowball-data
description: Use when Stock Snowball's committed backtest CSVs, weekly market benchmarks, market-data manifest, or default USD/KRW exchange rate need a current manual refresh.
---

# Refresh Stock Snowball Data

## Overview

Refresh the repository's complete static market-data catalog and default USD/KRW exchange rate, and prove that the diff is safe to commit. Preserve existing work and let the generator's validation rules decide whether provider data is acceptable. A normal refresh includes both; a request to edit this skill does not itself authorize running a refresh.

## Safety Gate

Work from the repository root. Confirm `package.json` exposes `data:refresh` and `data:check` and that `src/data/indices/manifest.json` exists.

Run `git status --short -- src/data/indices` before any setup or refresh command. If it prints anything, stop and report the paths. Do not move, stash, hide, restore, delete, or overwrite those changes in that turn. Continue only after the user makes the directory clean or, after seeing the path report, gives a new instruction that names each path and its disposition. An earlier or general instruction to "refresh anyway" is not dirty-path authorization. Unrelated changes elsewhere may remain untouched.

Do not commit or push unless the user separately requests it.

Before refreshing, inspect `git diff -- src/types/finance.ts` and its staged diff. Preserve unrelated edits; if existing edits touch `DEFAULT_EXCHANGE_RATE` or its provenance comment, report the conflict and leave that value unchanged pending user direction.

## Refresh Contract

1. Run `npm run data:check` to establish that the committed catalog is valid.
2. Run `npm run data:refresh` once. This is the only authorized networked CSV/benchmark operation; the separate read-only exchange-rate lookup below is also authorized.
3. If refresh fails, preserve the exact error and stop. Do not retry, query providers separately, weaken validation, filter bad rows, or invent/backfill values unless the user explicitly asks for diagnosis or remediation. Confirm `src/data/indices` still has no diff and report otherwise.
4. After a successful refresh, run `npm run data:check`.
5. Review `git status --short -- src/data/indices`, `git diff --stat -- src/data/indices`, and the manifest diff. Confirm the catalog still contains exactly the approved 17 CSV series plus `manifest.json`; summarize `generatedAt`, each series' end date, row count, and any provenance changes. Treat removed historical dates, shorter coverage, unexpected files, or unexplained manual overrides as failures requiring user review.
6. Update the default exchange rate using the procedure below.
7. Run:

   ```bash
   uv run python -m unittest tests/test_market_data.py
   npm test
   npm run build
   ```

The refresh is complete only when every command passes, the exchange-rate lookup succeeds (including an already-current value), and the diff review finds no unexplained regression.

## Default Exchange Rate

- Locate `DEFAULT_EXCHANGE_RATE` in `src/types/finance.ts` and inspect its consumers before editing. Its unit is **KRW per 1 USD**. Update this shared default only; do not replace matching numbers globally, overwrite saved user settings, or introduce historical FX conversion into the backtest.
- Ensure `src/App.tsx` uses `DEFAULT_EXCHANGE_RATE` as the fallback when no `exchange_rate` is cached. If that fallback is still hardcoded (currently `1450`), replace that fallback with the shared constant as part of the refresh. Preserve the cached-value branch and verify both first-launch and saved-rate behavior.
- Look up the latest published completed-business-day USD/KRW reference rate from a primary source, such as the Bank of Korea or a bank's published reference-rate table. Read the source itself and verify the rate's date, quote direction, and rate type; do not use an undated search snippet, intraday quote, cash buy/sell rate, or remittance spread. On weekends/holidays use the latest preceding published business day and report that date.
- Require a finite positive value explicitly quoted as KRW per USD. Round to two decimal places in KRW; do not round to an arbitrary convenient value. If the source date is older than the existing provenance date, keep the existing value and report the stale lookup.
- Use `apply_patch` to update the constant and an adjacent comment recording the source URL, rate's effective date, rate type, and retrieval timestamp in UTC. If the rounded value is unchanged, report it as already current; update provenance only when there is a newer verified observation.
- If the lookup fails or its date/unit cannot be verified, retain the existing default and provenance, report a warning, and still verify any successful CSV refresh. Report the overall result as partial rather than complete; do not invent a rate or undo valid CSV updates.
- Review `git diff -- src/types/finance.ts` together with the data diff. Verify that the default still reaches the app's exchange-rate initialization and that tests/build pass. Adjust only tests whose expected default conversion intentionally changes; preserve fixtures with their own explicit exchange rates.

## Result Report

Report, in order:

- outcome: updated, partial (exchange rate not updated), blocked before refresh, or failed safely;
- coverage changes: old and new endpoints/row counts plus provenance changes;
- default exchange rate: old → new KRW per USD, effective date, rate type, source URL, retrieval timestamp, or the warning explaining why it was retained;
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
