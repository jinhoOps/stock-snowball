# Weekly Market Trend Overlay Design

## Goal

Add 20-week and 60-week simple moving-average context for three representative market indices to the existing historical backtest chart. The overlay helps users interpret a primary asset's result in the market regime that existed at the time, without turning the indicator into another investable backtest asset.

## Approved Scope

- Use the actual indices, not ETF proxies:
  - Nasdaq 100: Yahoo Finance `^NDX`
  - S&P 500: Yahoo Finance `^GSPC`
  - KOSPI: Yahoo Finance `^KS11`
- Show the feature only in `BACKTEST` mode.
- Choose the benchmark only from the primary asset:
  - `QQQ`, `QLD`, `TQQQ` -> Nasdaq 100
  - `SPY` -> S&P 500
  - `KOSPI` (the existing KOSPI 200 backtest asset) -> KOSPI
- Do not infer a benchmark for `AMD`, `AMDL`, `TSLA`, `TSLL`, `SOXX`, `SOXL`, `SCHD`, `KOSDAQ`, or `GOLD`.
- Show a visible legend for the benchmark close, 20-week SMA, and 60-week SMA.
- Do not add a market dashboard, signal card, trading recommendation, persistence setting, or user-selectable benchmark.

## Chosen Approach

The manual Python refresh downloads daily index history and reduces it to completed weekly closes before committing data. The browser loads only the compact weekly files and calculates the two rolling averages from the full available weekly history before slicing to the selected backtest range.

This is preferred over reusing `QQQ`, `SPY`, and KOSPI 200 because ETF fees, dividends, and tracking behavior are not identical to the requested indices. It is also preferred over shipping three additional daily datasets because the application already has a large historical-data bundle and the feature needs only completed weekly observations.

## Static Data Contract

Keep the existing 14 investable/backtest assets unchanged. Add three non-investable benchmark records to the same atomically replaced static market-data catalog:

| Benchmark ID | Ticker | Display label | Currency | File | Frequency |
| --- | --- | --- | --- | --- | --- |
| `NASDAQ100` | `^NDX` | `나스닥100` | USD | `nasdaq100.csv` | weekly |
| `SP500` | `^GSPC` | `S&P 500` | USD | `sp500.csv` | weekly |
| `KOSPI_INDEX` | `^KS11` | `코스피` | KRW | `kospi-index.csv` | weekly |

The CSV header remains `date,close,dividend`; benchmark dividends are always `0`. Manifest schema version 2 adds `kind` (`asset` or `benchmark`) and `frequency` (`daily` or `weekly`) to every entry. The Python validator requires exactly the 14 existing daily asset files, the three weekly benchmark files, and `manifest.json`.

`npm run data:refresh` remains the only networked path. It downloads and validates all 17 series in a sibling staging directory, then replaces the catalog as one unit. `npm run data:check`, the browser, tests, and deployment never import or call yfinance.

## Completed-Week and Anti-Lookahead Rules

1. Fetch daily unadjusted closes using the existing provider arguments.
2. Group daily observations by ISO week and select that week's last actual trading-day close.
3. Include a week only after the next ISO week has begun in UTC. The current ISO week is excluded even if its latest observation happens to be a Friday, so refresh timing cannot create a partial-week ambiguity.
4. Calculate SMA values from all prior committed weekly closes, not merely the visible backtest range.
5. The 20-week SMA is absent until 20 completed observations exist; the 60-week SMA is absent until 60 exist.
6. At the left edge of a selected range, carry the most recent completed observation on or before the start date to an anchor at the start date. Never use a later week's close.
7. Render weekly values with a step-after curve so a Friday value is not visually interpolated into Monday through Thursday.

## Browser Modules and Interfaces

Create `src/data/marketBenchmarks.ts` to own CSV imports, manifest agreement, the exact primary-asset mapping, and accessors for the three benchmark datasets. Benchmark IDs do not enter `HistoricalAssetType`, the asset picker, backtest engine, scenario persistence, or leverage-family logic.

Create `src/core/MarketTrend.ts` for pure rolling-sum SMA calculation, range anchoring, and chart normalization. A `MarketTrendOverlay` contains benchmark metadata and points with raw close/SMA values plus indexed values. All three plotted values use the first visible benchmark close as the same base of 100; this preserves the close-versus-average relationship.

`BacktestView` receives the selected `startDate` and `endDate`, resolves the primary asset's benchmark, builds the overlay with `useMemo`, and passes it to `BacktestChart`. Unsupported primary assets pass no overlay.

## Chart Presentation

The existing backtest result lines remain unchanged.

- In `시작값 100`, benchmark close and both SMAs share the normalized chart scale.
- In `투자 결과`, the investment values keep the left currency axis while market-trend values use a labeled right axis with base 100. This allows a true overlay without distorting portfolio amounts.
- Use dedicated Apple-style tokens and distinct line patterns so meaning does not depend on color alone:
  - benchmark close: neutral solid line;
  - 20-week SMA: orange medium-dash line;
  - 60-week SMA: purple long-dash line.
- The legend spells out the selected index and both periods, and a short disclosure says these are completed-week price-index indicators rather than return comparison lines.
- Mouse, touch, and keyboard scrubbing expose the latest completed benchmark close and available SMA values for the selected date. Tooltip values use raw index levels, while the plotted right/shared scale uses indexed values.
- The chart's accessible name and live tooltip text include the benchmark label and completed-week basis.

No overlay toggle is added. A mapped primary asset always shows its benchmark; an unsupported primary asset shows the existing chart without empty controls or warnings.

## Error Handling

- Generator and offline validation reject missing/extra benchmark files, wrong kind or frequency, unsorted or duplicate dates, weekend dates, non-positive/non-finite closes, nonzero benchmark dividends, malformed manifest metadata, and incomplete current-week output.
- TypeScript loading rejects CSV/header/manifest mismatches during tests and build, matching the existing fail-fast static-data behavior.
- If a valid benchmark has no completed point on or before the requested range, omit the overlay rather than failing the backtest.
- Missing 20-week or 60-week warm-up values omit only that line segment.

## Verification

- Python unit tests cover the exact 14+3 registries, daily-to-weekly reduction, holidays, current-week exclusion, manifest version 2, atomic rollback, and network-free `--check`.
- TypeScript unit tests cover exact asset mapping, rolling SMA windows, range anchoring, shared-base normalization, and unsupported assets.
- Chart tests cover both result views, right-axis isolation, legend labels and line patterns, closest-prior tooltip resolution, keyboard announcements, and absent warm-up values.
- Component/App tests prove the primary asset and selected dates control the overlay and that projection mode never renders it.
- Playwright verifies Nasdaq, S&P 500, KOSPI, an unsupported asset, desktop/mobile layout, no horizontal overflow, and screenshot appearance.
- Final gates are `uv lock --check`, `uv sync --locked`, Python tests, `npm run data:check`, Vitest, Playwright, build, `git diff --check`, and a clean worktree.
