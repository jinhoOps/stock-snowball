# Weekly Market Trend Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overlay the primary asset's actual representative index, 20-week SMA, and 60-week SMA on the historical backtest chart without lookahead or runtime market-data requests.

**Architecture:** Extend the manually refreshed static catalog with three compact completed-week benchmark series, while keeping them outside `HistoricalAssetType` and all investment/backtest calculations. A pure TypeScript market-trend module computes rolling averages and range-safe indexed chart points; `BacktestView` selects the benchmark from the primary asset and `BacktestChart` renders accessible overlay lines on a shared or independent axis depending on the result view.

**Tech Stack:** CPython 3.13, uv, yfinance, Python unittest, CSV/JSON, React 19, TypeScript 6, Visx 4, Vitest, Testing Library, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-09-01-weekly-market-trend-overlay-design.md`

## Global Constraints

- Use actual `^NDX`, `^GSPC`, and `^KS11` index histories; do not substitute QQQ, SPY, or KOSPI 200 prices.
- Show the indicator only in historical backtest mode and resolve it only from the primary asset.
- Exact mapping: QQQ/QLD/TQQQ -> NASDAQ100, SPY -> SP500, KOSPI -> KOSPI_INDEX; every other primary asset has no overlay.
- Use only completed ISO weeks and never apply a week's final close before that close date.
- Compute 20-week and 60-week simple moving averages from full prior history; do not synthesize warm-up values.
- Keep all external requests manual through `npm run data:refresh`; browser, CI, `data:check`, and tests remain network-free.
- Keep benchmark IDs out of `HistoricalAssetType`, scenario persistence, asset selectors, return calculations, taxes, and leverage-family behavior.
- Preserve existing nominal/real/gold value-basis behavior; the price-index overlay is an independent market-context scale.
- Use TDD for every production change and commit after each independently reviewable task.

## File Structure

| File | Responsibility |
| --- | --- |
| `tools/market_data.py` | Distinguish daily assets from weekly benchmarks, reduce daily provider rows to completed weeks, and validate/install one 17-series catalog. |
| `tests/test_market_data.py` | Prove registry membership, no-lookahead weekly reduction, schema/manifest validation, atomicity, and offline checks. |
| `src/data/indices/{nasdaq100,sp500,kospi-index}.csv` | Compact completed-week price-index history generated manually. |
| `src/data/indices/manifest.json` | Schema-v2 provenance for 14 daily assets plus three weekly benchmarks. |
| `src/data/marketBenchmarks.ts` | Load/validate benchmark CSVs and expose the exact primary-asset mapping and dataset accessors. |
| `src/data/__tests__/marketBenchmarks.test.ts` | Verify loader contract, coverage, and mapping. |
| `src/core/MarketTrend.ts` | Calculate rolling SMAs, safe range anchors, common-base normalization, and overlay snapshots. |
| `src/core/__tests__/MarketTrend.test.ts` | Verify SMA math, warm-up behavior, range alignment, and absence of lookahead. |
| `src/components/charts/BacktestChart.tsx` | Render the market overlay, appropriate scale/axis, legend, and accessible tooltip values. |
| `src/components/charts/__tests__/BacktestChart.test.tsx` | Verify both chart modes, style semantics, tooltip alignment, and keyboard access. |
| `src/components/sections/BacktestView.tsx` | Resolve and prepare the primary asset's market trend for the selected range. |
| `src/components/sections/__tests__/BacktestView.test.tsx` | Verify mapped and unmapped primary-asset presentation. |
| `src/App.tsx` and `src/__tests__/App.integration.test.tsx` | Pass the active backtest range into the view and prove the feature is absent from projection mode. |
| `src/index.css` | Define three stable market-trend color tokens. |
| `e2e/market-trend-overlay.spec.ts` | Exercise mappings, modes, accessibility, responsive layout, and screenshots. |
| `README.md` | Explain the three non-investable weekly benchmark datasets and completed-week semantics. |

---

### Task 1: Add, generate, and load completed-week benchmark data

**Files:**
- Modify: `tools/market_data.py`
- Modify: `tests/test_market_data.py`
- Create: `src/data/indices/nasdaq100.csv`
- Create: `src/data/indices/sp500.csv`
- Create: `src/data/indices/kospi-index.csv`
- Modify: `src/data/indices/manifest.json`
- Create: `src/data/marketBenchmarks.ts`
- Create: `src/data/__tests__/marketBenchmarks.test.ts`
- Modify: `src/data/historicalAssets.ts`
- Modify: `src/data/__tests__/historicalAssets.test.ts`

**Interfaces:**
- Produces: `HISTORICAL_ASSETS`, `MARKET_BENCHMARKS`, and combined `ASSETS` tuples of `AssetDefinition`.
- Produces: `AssetDefinition.kind: Literal["asset", "benchmark"]` and `AssetDefinition.frequency: Literal["daily", "weekly"]`.
- Produces: `completed_weekly_records(records: list[MarketRecord], as_of: date) -> list[MarketRecord]`.
- Produces: manifest schema version 2 entries containing exact `kind` and `frequency` strings.
- Produces: `MarketBenchmarkId = 'NASDAQ100' | 'SP500' | 'KOSPI_INDEX'`.
- Produces: `BenchmarkPoint { date: string; close: number }` and `MarketBenchmarkDataset { id, ticker, label, currency, startDate, endDate, points }`.
- Produces: `getMarketBenchmarkForAsset(asset: HistoricalAssetType): MarketBenchmarkId | null`.
- Produces: `getMarketBenchmarkData(id: MarketBenchmarkId): MarketBenchmarkDataset`.

- [ ] **Step 1: Write failing registry and resampling tests**

Add imports for `HISTORICAL_ASSETS`, `MARKET_BENCHMARKS`, and `completed_weekly_records`, then add these concrete assertions:

```python
EXPECTED_BENCHMARKS = {
    "NASDAQ100": ("^NDX", "nasdaq100.csv"),
    "SP500": ("^GSPC", "sp500.csv"),
    "KOSPI_INDEX": ("^KS11", "kospi-index.csv"),
}

def test_registry_separates_backtest_assets_from_market_benchmarks(self) -> None:
    self.assertEqual({asset.asset_id for asset in HISTORICAL_ASSETS}, EXPECTED_ASSET_IDS)
    self.assertEqual(
        {asset.asset_id: (asset.ticker, asset.output_filename) for asset in MARKET_BENCHMARKS},
        EXPECTED_BENCHMARKS,
    )
    self.assertTrue(all(asset.kind == "asset" and asset.frequency == "daily" for asset in HISTORICAL_ASSETS))
    self.assertTrue(all(asset.kind == "benchmark" and asset.frequency == "weekly" for asset in MARKET_BENCHMARKS))

def test_completed_weekly_records_uses_last_trading_day_and_excludes_current_week(self) -> None:
    records = [
        MarketRecord("2026-08-24", 100, 0),
        MarketRecord("2026-08-28", 104, 0),
        MarketRecord("2026-08-31", 106, 0),
    ]
    self.assertEqual(
        completed_weekly_records(records, as_of=date(2026, 9, 1)),
        [MarketRecord("2026-08-28", 104, 0)],
    )

def test_completed_weekly_records_accepts_holiday_shortened_completed_week(self) -> None:
    records = [MarketRecord("2026-08-24", 100, 0), MarketRecord("2026-08-27", 103, 0)]
    self.assertEqual(
        completed_weekly_records(records, as_of=date(2026, 8, 31)),
        [MarketRecord("2026-08-27", 103, 0)],
    )
```

- [ ] **Step 2: Run the focused Python tests and verify RED**

Run: `uv run python -m unittest tests.test_market_data.MarketDataNormalizationTests -v`

Expected: FAIL because the separated registries and `completed_weekly_records` do not exist.

- [ ] **Step 3: Implement registry metadata and deterministic weekly reduction**

Set `SCHEMA_VERSION = 2`, keep the existing 14 definitions in `HISTORICAL_ASSETS`, add these definitions, and derive `ASSETS` by concatenation:

```python
AssetDefinition("NASDAQ100", "^NDX", "나스닥100", "USD", "nasdaq100.csv", "benchmark", "weekly")
AssetDefinition("SP500", "^GSPC", "S&P 500", "USD", "sp500.csv", "benchmark", "weekly")
AssetDefinition("KOSPI_INDEX", "^KS11", "코스피", "KRW", "kospi-index.csv", "benchmark", "weekly")
```

Implement weekly reduction by comparing each record's ISO-week Monday with the Monday containing `as_of`; retain the last record in every strictly earlier week and force its dividend to `0.0`. Reject an empty completed result with `MarketDataValidationError`.

```python
def completed_weekly_records(records: list[MarketRecord], as_of: date) -> list[MarketRecord]:
    current_week_start = as_of - timedelta(days=as_of.weekday())
    completed: dict[tuple[int, int], MarketRecord] = {}
    for record in records:
        record_date = date.fromisoformat(record.date)
        week_start = record_date - timedelta(days=record_date.weekday())
        if week_start < current_week_start:
            iso = record_date.isocalendar()
            completed[(iso.year, iso.week)] = MarketRecord(record.date, record.close, 0.0)
    result = list(completed.values())
    if not result:
        raise MarketDataValidationError("benchmark has no completed weekly records")
    return result
```

Add `kind` and `frequency` to `AssetManifestEntry`, `from_records()`, and `to_dict()`. In `refresh_all`, continue fetching daily history for every definition, but call `completed_weekly_records(..., as_of=refresh_date)` only for weekly definitions before writing files and entries.

- [ ] **Step 4: Add validation failures for benchmark-specific corruption**

Extend the fixture writer to emit daily rows for assets and weekly rows for benchmarks. Add tests that mutate one condition at a time and assert a diagnostic containing the benchmark ID or filename:

```python
bad_cases = {
    "nonzero dividend": "date,close,dividend\n2026-08-21,100,1\n",
    "weekend date": "date,close,dividend\n2026-08-22,100,0\n",
}
```

Also assert schema version 1, `kind="asset"`, `frequency="daily"`, an extra benchmark file, and a missing benchmark file are rejected. Pass an explicit `as_of` to validator helpers so the current-week test is deterministic.

- [ ] **Step 5: Run the full Python suite before activating the new catalog**

Run: `uv run python -m unittest discover -s tests -v`

Expected: unit tests PASS. Continue directly to Step 6 without committing because the schema-v2 validator and its generated schema-v2 catalog form one reviewable deliverable.

- [ ] **Step 6: Write failing TypeScript loader and mapping tests**

Create `src/data/__tests__/marketBenchmarks.test.ts` with exact mapping and catalog expectations:

```ts
expect(getMarketBenchmarkForAsset('QQQ')).toBe('NASDAQ100');
expect(getMarketBenchmarkForAsset('QLD')).toBe('NASDAQ100');
expect(getMarketBenchmarkForAsset('TQQQ')).toBe('NASDAQ100');
expect(getMarketBenchmarkForAsset('SPY')).toBe('SP500');
expect(getMarketBenchmarkForAsset('KOSPI')).toBe('KOSPI_INDEX');
for (const asset of ['AMD', 'AMDL', 'TSLA', 'TSLL', 'SOXX', 'SOXL', 'SCHD', 'KOSDAQ', 'GOLD'] as const) {
  expect(getMarketBenchmarkForAsset(asset)).toBeNull();
}
expect(getMarketBenchmarkData('NASDAQ100')).toMatchObject({ ticker: '^NDX', label: '나스닥100', currency: 'USD' });
```

Assert each dataset is nonempty, strictly increasing, weekday-dated, positive, and agrees with manifest `kind="benchmark"`, `frequency="weekly"`, coverage, and row count. Extend `historicalAssets.test.ts` to prove the historical asset ID list remains exactly 14 and does not contain the three benchmark IDs.

- [ ] **Step 7: Run the loader tests and verify RED**

Run: `npm test -- src/data/__tests__/marketBenchmarks.test.ts src/data/__tests__/historicalAssets.test.ts`

Expected: FAIL because the module and benchmark files do not exist.

- [ ] **Step 8: Perform the approved manual provider refresh**

Run: `npm run data:refresh`

Expected: exit 0; output lists all 14 asset IDs plus `NASDAQ100`, `SP500`, and `KOSPI_INDEX`. Review that the three new files use `date,close,dividend`, contain only `0` dividends, and end before the ISO week containing the refresh date.

- [ ] **Step 9: Implement the static benchmark loader**

Create `marketBenchmarks.ts` with explicit raw imports for the three CSVs and manifest. Reuse `parseHistoricalCsv()` only as the common strict CSV parser, map `price` to `close`, and validate the schema-v2 metadata before constructing datasets. Keep the exact mapping as a `Partial<Record<HistoricalAssetType, MarketBenchmarkId>>`; return `null`, not a fallback, for unmapped assets.

```ts
export type MarketBenchmarkId = 'NASDAQ100' | 'SP500' | 'KOSPI_INDEX';

const PRIMARY_BENCHMARK: Partial<Record<HistoricalAssetType, MarketBenchmarkId>> = {
  QQQ: 'NASDAQ100',
  QLD: 'NASDAQ100',
  TQQQ: 'NASDAQ100',
  SPY: 'SP500',
  KOSPI: 'KOSPI_INDEX',
};

export const getMarketBenchmarkForAsset = (asset: HistoricalAssetType): MarketBenchmarkId | null =>
  PRIMARY_BENCHMARK[asset] ?? null;

export const getMarketBenchmarkData = (id: MarketBenchmarkId): MarketBenchmarkDataset =>
  datasets[id];
```

Update `historicalAssets.ts` manifest validation to require `kind === 'asset'` and `frequency === 'daily'` for its 14 datasets, ensuring benchmark metadata cannot masquerade as an investable asset.

- [ ] **Step 10: Run data and loader verification**

Run:

```bash
npm run data:check
npm test -- src/data/__tests__/marketBenchmarks.test.ts src/data/__tests__/historicalAssets.test.ts
```

Expected: both commands PASS; the offline check reports 17 validated series without importing yfinance.

- [ ] **Step 11: Commit the complete generator, catalog, and loaders**

```bash
git add tools/market_data.py tests/test_market_data.py src/data/indices src/data/marketBenchmarks.ts src/data/historicalAssets.ts src/data/__tests__/marketBenchmarks.test.ts src/data/__tests__/historicalAssets.test.ts
git commit -m "feat: add static weekly market benchmarks"
```

---

### Task 2: Build range-safe 20-week and 60-week trend overlays

**Files:**
- Create: `src/core/MarketTrend.ts`
- Create: `src/core/__tests__/MarketTrend.test.ts`

**Interfaces:**
- Consumes: `MarketBenchmarkDataset` and `BenchmarkPoint` from `src/data/marketBenchmarks.ts`.
- Produces: `MarketTrendPoint { date, sourceDate, close, sma20, sma60, indexedClose, indexedSma20, indexedSma60 }` where unavailable SMAs are `null`.
- Produces: `MarketTrendOverlay { benchmarkId, ticker, label, currency, points }`.
- Produces: `calculateWeeklyTrend(points: readonly BenchmarkPoint[]): WeeklyTrendValue[]`.
- Produces: `buildMarketTrendOverlay(dataset, startDate, endDate): MarketTrendOverlay | null`.
- Produces: `findMarketTrendOnOrBefore(points, date): MarketTrendPoint | null` using binary search.

- [ ] **Step 1: Write failing rolling-window tests**

Use deterministic weekly points `[{date: '2025-01-03', close: 1}, ...]`. Assert:

```ts
expect(trend[18].sma20).toBeNull();
expect(trend[19].sma20).toBeCloseTo(10.5);
expect(trend[58].sma60).toBeNull();
expect(trend[59].sma60).toBeCloseTo(30.5);
```

Also calculate a naive reference in the test and compare every available rolling value so an off-by-one window cannot pass only at the first boundary.

- [ ] **Step 2: Write failing range/no-lookahead tests**

Use completed points on `2026-08-21`, `2026-08-28`, and `2026-09-04`. For range `2026-08-25..2026-09-03`, assert the overlay anchors the `2026-08-21` value at chart date `2026-08-25`, includes `2026-08-28`, excludes `2026-09-04`, and reports `sourceDate: '2026-08-21'` for the anchor.

Assert every indexed close and SMA uses the anchor close as the single denominator:

```ts
expect(overlay.points[0].indexedClose).toBe(100);
expect(overlay.points[1].indexedClose).toBeCloseTo(points[1].close / points[0].close * 100);
expect(overlay.points[1].indexedSma20).toBeCloseTo(overlay.points[1].sma20! / points[0].close * 100);
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- src/core/__tests__/MarketTrend.test.ts`

Expected: FAIL because `MarketTrend.ts` does not exist.

- [ ] **Step 4: Implement rolling sums, binary lookup, anchoring, and normalization**

Use one pass with independent 20- and 60-value rolling sums; do not rescan each window. Compute the full trend before slicing. Find the closest completed point on or before `startDate` with binary search, clone it as the left-edge anchor, append only real points where `startDate < date <= endDate`, and return `null` when no point exists on or before the range end.

```ts
const withSma = (points: readonly BenchmarkPoint[], window: number): Array<number | null> => {
  let sum = 0;
  return points.map((point, index) => {
    sum += point.close;
    if (index >= window) sum -= points[index - window].close;
    return index + 1 >= window ? sum / window : null;
  });
};

export const calculateWeeklyTrend = (points: readonly BenchmarkPoint[]): WeeklyTrendValue[] => {
  const sma20 = withSma(points, 20);
  const sma60 = withSma(points, 60);
  return points.map((point, index) => ({ ...point, sma20: sma20[index], sma60: sma60[index] }));
};
```

Guard invalid ranges (`startDate > endDate`) with `RangeError`. Keep raw values for tooltip text and indexed values for plotting.

- [ ] **Step 5: Run focused and core tests**

Run:

```bash
npm test -- src/core/__tests__/MarketTrend.test.ts
npm test -- src/core
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the pure trend model**

```bash
git add src/core/MarketTrend.ts src/core/__tests__/MarketTrend.test.ts
git commit -m "feat: calculate weekly market trend overlays"
```

---

### Task 3: Render accessible market trend lines, axes, tooltip, and legend

**Files:**
- Modify: `src/components/charts/BacktestChart.tsx`
- Modify: `src/components/charts/__tests__/BacktestChart.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: optional `marketTrend?: MarketTrendOverlay` on `BacktestChartProps` and `BacktestChartInner`.
- Extends: `BacktestTooltipData` with `marketTrend: { label, sourceDate, close, sma20, sma60 } | null`.
- Produces: closest-prior market values in `resolveBacktestTooltip(series, date, marketTrend)`.

- [ ] **Step 1: Write failing tooltip and keyboard tests**

Create a fixture with weekly values dated Friday and daily investment points. Assert Tuesday tooltip resolution uses the prior Friday `sourceDate`, never the following Friday. Render `BacktestChartInner`, focus the slider, move with Arrow/End, and assert the live region contains `나스닥100`, `20주선`, `60주선`, and raw index values whenever available.

Add a warm-up fixture where `sma60` is null and assert `60주선` is absent rather than rendered as zero.

- [ ] **Step 2: Write failing presentation tests for both result views**

In `NORMALIZED`, assert the market paths use the shared left scale and there is no market right axis. In `PORTFOLIO`, assert a right axis named `시장 추세 (시작값 100)` exists and portfolio series values remain formatted from the left currency scale.

Render `BacktestChart` and assert the visible legend contains:

```text
나스닥100 (^NDX)
20주 SMA
60주 SMA
```

Assert each legend sample has a distinct dash pattern, and the disclosure contains `완료 주봉 가격지수` and `수익률 비교선이 아닙니다`.

- [ ] **Step 3: Run chart tests and verify RED**

Run: `npm test -- src/components/charts/__tests__/BacktestChart.test.tsx`

Expected: FAIL because `marketTrend` is not accepted or rendered.

- [ ] **Step 4: Implement scale isolation and step-after paths**

Import `AxisRight` and `curveStepAfter`. Add CSS tokens:

```css
--market-index: #86868b;
--market-sma-20: #ff9f0a;
--market-sma-60: #af52de;
```

When `resultView === 'NORMALIZED'`, include indexed close/SMA values in the existing value-domain calculation and plot with `valueScale`. When `resultView === 'PORTFOLIO'`, leave the existing value domain untouched, create a separate `marketTrendScale`, reserve right margin, and render `AxisRight` with integer base-100 labels. Use `curveStepAfter` for all market paths and the three distinct stroke/dash styles from the spec.

```tsx
const marketValues = marketTrend?.points.flatMap((point) => [
  point.indexedClose,
  ...(point.indexedSma20 === null ? [] : [point.indexedSma20]),
  ...(point.indexedSma60 === null ? [] : [point.indexedSma60]),
]) ?? [];
const marketTrendScale = scaleLinear({
  range: [innerHeight, 0],
  domain: [Math.min(...marketValues), Math.max(...marketValues)],
  nice: true,
});

<LinePath
  data={marketTrend.points}
  x={(point) => dateScale(new Date(`${point.date}T00:00:00Z`)) ?? 0}
  y={(point) => activeTrendScale(point.indexedClose) ?? 0}
  curve={curveStepAfter}
  stroke="var(--market-index)"
  strokeWidth={1.5}
/>
```

- [ ] **Step 5: Extend tooltip, legend, and accessible labeling**

Resolve market data independently with binary search so a tooltip date need not equal a Friday. Show raw close/SMA levels and the completed source date. Extend the SVG accessible label only when an overlay exists. Preserve all existing asset-series rows, principal behavior, pointer interaction, and keyboard date navigation.

```ts
const marketPoint = marketTrend
  ? findMarketTrendOnOrBefore(marketTrend.points, date)
  : null;
return {
  date,
  points,
  marketTrend: marketPoint ? {
    label: marketTrend.label,
    sourceDate: marketPoint.sourceDate,
    close: marketPoint.close,
    sma20: marketPoint.sma20,
    sma60: marketPoint.sma60,
  } : null,
};
```

- [ ] **Step 6: Run chart and regression tests**

Run:

```bash
npm test -- src/components/charts/__tests__/BacktestChart.test.tsx
npm test -- src/components/sections/__tests__/BacktestView.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 7: Commit chart presentation**

```bash
git add src/components/charts/BacktestChart.tsx src/components/charts/__tests__/BacktestChart.test.tsx src/index.css
git commit -m "feat: render weekly market trend overlays"
```

---

### Task 4: Connect the overlay to the active primary backtest asset

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/__tests__/App.integration.test.tsx`
- Modify: `src/components/sections/BacktestView.tsx`
- Modify: `src/components/sections/__tests__/BacktestView.test.tsx`

**Interfaces:**
- Extends: `BacktestViewProps` with required `startDate: string` and `endDate: string`.
- Consumes: `getMarketBenchmarkForAsset`, `getMarketBenchmarkData`, and `buildMarketTrendOverlay`.
- Passes: `marketTrend` to `BacktestChart`; comparison assets never participate in selection.

- [ ] **Step 1: Write failing BacktestView mapping tests**

Render with `primaryAsset="QQQ"`, comparisons `['SPY']`, and a covered range; assert the chart receives `NASDAQ100`, not `SP500`. Rerender with `primaryAsset="SPY"` and assert `SP500`; rerender with `KOSPI` and assert `KOSPI_INDEX`; rerender with `AMD` and assert no market legend or disclosure.

Mock only the chart rendering surface, not `getMarketBenchmarkForAsset` or `buildMarketTrendOverlay`, so the production selection path is exercised.

- [ ] **Step 2: Write failing mounted App boundary test**

Extend the existing mocked `BacktestView` to expose `primaryAsset`, `startDate`, and `endDate`. Assert projection mode does not mount the backtest view. Switch to backtest, select the Nasdaq family, and assert the real parent props contain `QQQ` and the active clamped backtest dates.

- [ ] **Step 3: Run focused component tests and verify RED**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestView.test.tsx src/__tests__/App.integration.test.tsx
```

Expected: FAIL because the date props and market-trend integration do not exist.

- [ ] **Step 4: Implement the narrow BacktestView integration**

Pass `backtestParams.startDate` and `backtestParams.endDate` from `App`. In `BacktestView`, memoize the following flow:

```ts
const benchmarkId = getMarketBenchmarkForAsset(primaryAsset);
const marketTrend = benchmarkId
  ? buildMarketTrendOverlay(getMarketBenchmarkData(benchmarkId), startDate, endDate)
  : null;
```

Pass `marketTrend ?? undefined` to `BacktestChart`. Do not add state, localStorage, a toggle, or comparison-asset inspection.

- [ ] **Step 5: Add contextual chart copy**

When present, add `주 자산 {primaryAsset} 대응 · {label} 시장 추세` beneath the existing chart subtitle. Keep it outside the SVG so mobile and screen-reader users discover the relationship before interacting with the chart.

- [ ] **Step 6: Run focused and full Vitest suites**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestView.test.tsx src/__tests__/App.integration.test.tsx
npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit primary-asset integration**

```bash
git add src/App.tsx src/__tests__/App.integration.test.tsx src/components/sections/BacktestView.tsx src/components/sections/__tests__/BacktestView.test.tsx
git commit -m "feat: map primary assets to market trends"
```

---

### Task 5: Document, visually verify, and close the feature

**Files:**
- Create: `e2e/market-trend-overlay.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Verifies: the complete static-data-to-backtest-chart user journey on desktop and mobile.
- Documents: 14 investable histories plus three non-investable completed-week benchmarks.

- [ ] **Step 1: Add Playwright journeys over the unit-tested integration**

Create a test that enters backtest mode and exercises these cases without provider requests:

```ts
await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();
await expect(page.getByText('주 자산 QQQ 대응 · 나스닥100 시장 추세')).toBeVisible();
await expect(page.getByText('나스닥100 (^NDX)')).toBeVisible();
await expect(page.getByText('20주 SMA')).toBeVisible();
await expect(page.getByText('60주 SMA')).toBeVisible();
```

Verify both `투자 결과` and `시작값 100`, focus the date slider and assert the live text contains completed-week market values, then verify SPY -> S&P 500, KOSPI -> 코스피, and AMD -> no market trend. In both Playwright projects, assert `scrollWidth <= clientWidth` and save `test-results/visual-review/market-trend-{nasdaq,sp500,kospi}-{project}.png`.

- [ ] **Step 2: Run the focused Playwright journey**

Run: `npm run test:e2e -- e2e/market-trend-overlay.spec.ts`

Expected: PASS in the desktop and mobile projects. The production behavior already completed its RED/GREEN cycles in Tasks 1–4; this task verifies the assembled browser journey.

- [ ] **Step 3: Update README data and interpretation documentation**

Document:

- the existing 14 investable/backtest assets remain unchanged;
- `^NDX`, `^GSPC`, and `^KS11` are non-investable context series;
- the Python refresh downloads daily data but commits only completed weekly benchmark closes;
- 20/60-week SMAs use prior completed weeks with no partial-week lookahead;
- the overlay follows only the primary asset and is a price-index trend indicator, not a portfolio-return comparison;
- browser and CI remain network-free.

- [ ] **Step 4: Run the complete fresh verification gate**

Run:

```bash
uv lock --check
uv sync --locked
uv run python -m unittest discover -s tests -v
npm run data:check
npm test
npm run test:e2e
npm run build
git diff --check
git status --short
```

Expected: every command exits 0; Git status lists only the intended README/E2E changes before the final commit; the known historical-data chunk warning may remain but the three compact weekly CSVs must not create an additional daily-data-sized payload.

- [ ] **Step 5: Inspect all generated screenshots at original resolution**

Confirm on desktop and 390px mobile that investment lines remain visually dominant, all three market lines and legend samples are distinguishable without color alone, the right axis does not collide with labels, tooltips remain inside the chart card, text is not clipped, and no horizontal overflow appears.

- [ ] **Step 6: Commit documentation and end-to-end coverage**

```bash
git add README.md e2e/market-trend-overlay.spec.ts
git commit -m "test: cover weekly market trend journeys"
```

- [ ] **Step 7: Re-run the final state checks after the commit**

Run:

```bash
npm run data:check
npm test
npm run test:e2e
npm run build
git diff --check
git status --short --branch
```

Expected: all verification commands exit 0 and the branch is clean.
