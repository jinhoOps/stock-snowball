# Leveraged Asset Family Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add actual-history QQQ/QLD/TQQQ, AMD/AMDL, TSLA/TSLL, and SOXX/SOXL family comparisons with mixed-cash-flow and normalized product views plus nominal, real, and gold value bases.

**Architecture:** Keep the current backtest screen and move comparison selection into parent-owned state. A transactional Python generator owns the complete 14-asset static catalog; focused TypeScript modules own legacy migration, product performance, leverage-family rules, and value-basis transforms; React components only coordinate and render prepared results.

**Tech Stack:** Python 3.13, uv, yfinance, unittest, TypeScript 6, React 19, Decimal.js, Vitest, Testing Library, visx, Playwright, Vite.

## Global Constraints

- Use only actual traded-product history; never synthesize pre-inception leveraged history.
- Regenerate exactly QQQ, QLD, TQQQ, AMD, AMDL, TSLA, TSLL, SOXX, SOXL, SPY, SCHD, KOSPI 200, KOSDAQ, and GOLD.
- Remove QQQM from the active catalog and migrate persisted QQQM selections to QQQ.
- External market access occurs only during the manual `npm run data:refresh`; CI and `npm run data:check` remain offline.
- Keep compact `date,close,dividend` CSV files with split-adjusted, dividend-unadjusted prices.
- Preserve the current convention that the initial principal and first scheduled contribution are both invested on the first available trading day.
- Reinvest a cash dividend only on the row that records it; never carry a previous dividend into zero-dividend rows.
- Product metrics and leverage insights are pre-tax; mixed-cash-flow results include only buy fees and the existing ISA end-of-period estimate.
- Keep at most three simultaneous assets and do not add a separate page or application mode.
- Use Frost Blue as the interaction accent, textual 1×/2×/3× badges, distinct line styles, keyboard semantics, and reduced-motion support.
- Gold basis uses regenerated GOLD futures data, closest-prior lookup without look-ahead, and the label `시작일 금 가치 기준`.

---

## File Structure

### Create

- `src/data/assetMigration.ts` — validates current asset IDs and maps legacy QQQM to QQQ.
- `src/data/__tests__/assetMigration.test.ts` — persistence-boundary migration tests.
- `src/core/ProductPerformance.ts` — contribution-free total-return series and product metrics.
- `src/core/__tests__/ProductPerformance.test.ts` — dividend, CAGR, MDD, and volatility tests.
- `src/core/ValueBasis.ts` — nominal, inflation, and gold transformations for values and contributions.
- `src/core/__tests__/ValueBasis.test.ts` — factor, contribution, coverage, and no-look-ahead tests.
- `src/data/leverageFamilies.ts` — family membership, targets, common coverage, presets, and insight math.
- `src/data/__tests__/leverageFamilies.test.ts` — family selection, duration, and insight tests.
- `src/components/common/SegmentedControl.tsx` — reusable accessible two/three-option control.
- `src/components/sections/__tests__/BacktestView.test.tsx` — family selection and value/view control tests.
- `playwright.config.ts` — local Vite test server and screenshot configuration.
- `e2e/leverage-comparison.spec.ts` — desktop/mobile interaction and visual-review coverage.

### Modify

- `tools/market_data.py` — 14-asset registry and recoverable directory swap.
- `tests/test_market_data.py` — exact catalog, staging, failure, and rollback tests.
- `src/data/indices/*.csv` and `src/data/indices/manifest.json` — fully regenerated catalog.
- `src/types/finance.ts` — current asset IDs, value-basis types, product and comparison result types.
- `src/data/historicalAssets.ts` — 14 static imports, manifest validation, common coverage, prior-date lookup.
- `src/data/__tests__/historicalAssets.test.ts` — complete catalog and lookup tests.
- `src/core/BacktestEngine.ts` — one-time explicit dividend handling and product-independent portfolio history.
- `src/core/__tests__/BacktestEngine.test.ts` — dividend carry-forward regression test.
- `src/db/schema.ts` and `src/db/database.ts` — schema version 5 and QQQM migration strategy.
- `src/hooks/useScenarios.ts` — normalize loaded and written asset IDs.
- `src/App.tsx` — cached-parameter migration, parent comparison state, prepared comparison results, and value basis.
- `src/components/sections/SimulationControls.tsx` — common coverage date bounds.
- `src/components/common/ScenarioPresetPicker.tsx` — family duration availability and reasons.
- `src/components/common/__tests__/ScenarioPresetPicker.test.ts` — 1/3/5/10/all coverage tests.
- `src/components/sections/AdvancedSettingsSheet.tsx` — current 14-asset options.
- `src/components/sections/BacktestView.tsx` — family chips, table/cards, insight, disclosures, and controls.
- `src/components/charts/BacktestChart.tsx` — prepared portfolio/normalized/value-basis series.
- `src/core/SnowballEngine.ts` and affected tests — QQQ replaces QQQM in asset-specific volatility defaults.
- `package.json`, `package-lock.json`, `.gitignore` — component/E2E test tooling and generated reports.
- `README.md` — catalog, leverage interpretation, and manual refresh documentation.

---

### Task 1: Replace the Static Catalog and Preserve Legacy Selections

**Files:**
- Create: `src/data/assetMigration.ts`
- Create: `src/data/__tests__/assetMigration.test.ts`
- Modify: `tools/market_data.py`
- Modify: `tests/test_market_data.py`
- Modify: `src/types/finance.ts`
- Modify: `src/data/historicalAssets.ts`
- Modify: `src/data/__tests__/historicalAssets.test.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/db/database.ts`
- Modify: `src/hooks/useScenarios.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/sections/AdvancedSettingsSheet.tsx`
- Modify: `src/components/sections/BacktestView.tsx`
- Modify: `src/core/SnowballEngine.ts`
- Modify: `src/core/__tests__/Backtesting.test.ts`
- Modify: `src/components/common/__tests__/ScenarioPresetPicker.test.ts`
- Modify: `.gitignore`
- Replace: `src/data/indices/*.csv`
- Replace: `src/data/indices/manifest.json`

**Interfaces:**
- Produces: `HISTORICAL_ASSET_IDS`, `HistoricalAssetType`, `AssetType`, `normalizeLegacyAssetType(value: unknown): AssetType`.
- Produces: `swap_catalog(staging_dir: Path, data_dir: Path, replace: Callable[[Path, Path], None] = os.replace, validator: Callable[[Path], object] = validate_generated_data) -> None`.
- Produces: a manifest containing exactly the 14 approved assets.

- [ ] **Step 1: Write failing Python catalog and rollback tests**

Add tests that require the exact catalog and simulate a failure on the second directory rename:

```python
EXPECTED_ASSET_IDS = {
    "QQQ", "QLD", "TQQQ", "AMD", "AMDL", "TSLA", "TSLL",
    "SOXX", "SOXL", "SPY", "SCHD", "KOSPI", "KOSDAQ", "GOLD",
}

def test_asset_registry_is_the_complete_approved_catalog(self) -> None:
    self.assertEqual({asset.asset_id for asset in ASSETS}, EXPECTED_ASSET_IDS)
    self.assertNotIn("QQQM", {asset.asset_id for asset in ASSETS})

def test_swap_catalog_restores_backup_when_install_rename_fails(self) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        target = root / "indices"
        staging = root / ".indices.staging"
        target.mkdir()
        staging.mkdir()
        (target / "old.txt").write_text("old", encoding="utf-8")
        (staging / "new.txt").write_text("new", encoding="utf-8")
        calls = 0

        def fail_second_replace(source: Path, destination: Path) -> None:
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("injected install failure")
            os.replace(source, destination)

        with self.assertRaisesRegex(MarketDataError, "install failure"):
            swap_catalog(staging, target, replace=fail_second_replace)

        self.assertEqual((target / "old.txt").read_text(encoding="utf-8"), "old")
        self.assertFalse((target / "new.txt").exists())

def test_swap_catalog_restores_backup_when_post_install_validation_fails(self) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        target = root / "indices"
        staging = root / ".indices.staging"
        target.mkdir()
        staging.mkdir()
        (target / "old.txt").write_text("old", encoding="utf-8")
        (staging / "new.txt").write_text("new", encoding="utf-8")

        def reject_installed_catalog(_: Path) -> object:
            raise MarketDataValidationError("post-swap validation failed")

        with self.assertRaisesRegex(MarketDataError, "post-swap validation failed"):
            swap_catalog(staging, target, validator=reject_installed_catalog)

        self.assertEqual((target / "old.txt").read_text(encoding="utf-8"), "old")
```

- [ ] **Step 2: Run the Python tests and confirm the expected failures**

Run: `uv run python -m unittest tests.test_market_data -v`

Expected: FAIL because the registry still contains QQQM and `swap_catalog` is not defined.

- [ ] **Step 3: Implement the 14-asset registry and staged directory swap**

Use this exact registry order so generated manifests and review output remain stable:

```python
ASSETS = (
    AssetDefinition("QQQ", "QQQ", "Invesco QQQ", "USD", "qqq.csv"),
    AssetDefinition("QLD", "QLD", "ProShares Ultra QQQ", "USD", "qld.csv"),
    AssetDefinition("TQQQ", "TQQQ", "ProShares UltraPro QQQ", "USD", "tqqq.csv"),
    AssetDefinition("AMD", "AMD", "Advanced Micro Devices", "USD", "amd.csv"),
    AssetDefinition("AMDL", "AMDL", "GraniteShares 2x Long AMD Daily ETF", "USD", "amdl.csv"),
    AssetDefinition("TSLA", "TSLA", "Tesla", "USD", "tsla.csv"),
    AssetDefinition("TSLL", "TSLL", "Direxion Daily TSLA Bull 2X Shares", "USD", "tsll.csv"),
    AssetDefinition("SOXX", "SOXX", "iShares Semiconductor ETF", "USD", "soxx.csv"),
    AssetDefinition("SOXL", "SOXL", "Direxion Daily Semiconductor Bull 3X Shares", "USD", "soxl.csv"),
    AssetDefinition("SPY", "SPY", "SPDR S&P 500 ETF Trust", "USD", "spy.csv"),
    AssetDefinition("SCHD", "SCHD", "Schwab U.S. Dividend Equity ETF", "USD", "schd.csv"),
    AssetDefinition("KOSPI", "^KS200", "KOSPI 200", "KRW", "kospi.csv"),
    AssetDefinition("KOSDAQ", "^KQ11", "KOSDAQ", "KRW", "kosdaq.csv"),
    AssetDefinition("GOLD", "GC=F", "Gold Futures", "USD", "gold.csv"),
)
```

Implement `refresh_all` by generating and validating a sibling staging directory, then calling `swap_catalog`. `swap_catalog` must rename the existing directory to a unique backup, install the staging directory, validate the installed directory, restore the backup on failure, wrap the original install or validation exception in `MarketDataError`, and delete the backup only after validation succeeds.

- [ ] **Step 4: Write failing TypeScript asset migration tests**

```typescript
import { describe, expect, it } from 'vitest';
import { normalizeLegacyAssetType } from '../assetMigration';

describe('normalizeLegacyAssetType', () => {
  it('maps legacy QQQM to QQQ', () => {
    expect(normalizeLegacyAssetType('QQQM')).toBe('QQQ');
  });

  it('keeps a supported asset and safely falls back for unknown values', () => {
    expect(normalizeLegacyAssetType('SOXL')).toBe('SOXL');
    expect(normalizeLegacyAssetType('NOT_A_TICKER')).toBe('SPY');
  });
});
```

Also replace the historical-loader fixture assertion with an exact catalog test:

```typescript
it('loads exactly the approved historical asset catalog', () => {
  expect(HISTORICAL_ASSET_IDS).toHaveLength(14);
  for (const assetId of HISTORICAL_ASSET_IDS) {
    const coverage = getHistoricalCoverage(assetId);
    const data = getHistoricalData(assetId);
    expect(data).toHaveLength(coverage.rowCount);
    expect(data[0].date).toBe(coverage.startDate);
    expect(data.at(-1)?.date).toBe(coverage.endDate);
  }
});
```

- [ ] **Step 5: Run the migration test and confirm it fails**

Run: `npm test -- src/data/__tests__/assetMigration.test.ts`

Expected: FAIL because `assetMigration.ts` does not exist.

- [ ] **Step 6: Implement the canonical asset tuple and migration helper**

```typescript
export const HISTORICAL_ASSET_IDS = [
  'QQQ', 'QLD', 'TQQQ', 'AMD', 'AMDL', 'TSLA', 'TSLL',
  'SOXX', 'SOXL', 'SPY', 'SCHD', 'KOSPI', 'KOSDAQ', 'GOLD',
] as const;

export type HistoricalAssetType = typeof HISTORICAL_ASSET_IDS[number];
export type AssetType = 'CUSTOM' | HistoricalAssetType;

const historicalAssets = new Set<string>(HISTORICAL_ASSET_IDS);

export const normalizeLegacyAssetType = (value: unknown): AssetType => {
  if (value === 'QQQM') return 'QQQ';
  if (value === 'CUSTOM' || (typeof value === 'string' && historicalAssets.has(value))) {
    return value as AssetType;
  }
  return 'SPY';
};
```

Move the canonical tuple/types to `finance.ts` and import them from `assetMigration.ts`. Update every QQQM code reference to QQQ, add all new raw CSV imports, and enumerate all 14 datasets in `historicalAssets.ts`.

Add `/src/data/.indices.staging-*` and `/src/data/.indices.backup-*` to `.gitignore` as crash-safety exclusions; successful and handled-failure paths must still delete them.

- [ ] **Step 7: Add schema and persistence migrations before removing QQQM**

Raise `scenarioSchema.version` from 4 to 5, replace the asset enum with the canonical 15 values including CUSTOM, and add:

```typescript
5: (oldDoc: ScenarioDocument) => ({
  ...oldDoc,
  assetType: normalizeLegacyAssetType(oldDoc.assetType),
  updatedAt: Date.now(),
})
```

Normalize cached `backtest_params` immediately after JSON parsing in `App.tsx`, normalize scenario documents before putting them in React state in `useScenarios.ts`, and normalize `assetType` in add/update writes.

- [ ] **Step 8: Run the manual full-catalog refresh and inspect the generated set**

Run:

```bash
npm run data:refresh
find src/data/indices -maxdepth 1 -type f -print | sort
npm run data:check
```

Expected: 14 CSV files plus `manifest.json`; no `qqqm.csv`; the check prints all 14 coverage summaries and exits 0.

- [ ] **Step 9: Run foundation verification**

Run:

```bash
uv run python -m unittest tests.test_market_data -v
npm test -- src/data/__tests__/assetMigration.test.ts src/data/__tests__/historicalAssets.test.ts src/components/common/__tests__/ScenarioPresetPicker.test.ts src/core/__tests__/Backtesting.test.ts
npm run build
git diff --check
```

Expected: all commands exit 0 and the production build contains no QQQM import error.

- [ ] **Step 10: Commit the coherent catalog migration**

```bash
git add tools/market_data.py tests/test_market_data.py src/data src/types/finance.ts src/db src/hooks/useScenarios.ts src/App.tsx src/components/sections/AdvancedSettingsSheet.tsx src/components/sections/BacktestView.tsx src/core/SnowballEngine.ts src/core/__tests__/Backtesting.test.ts src/components/common/__tests__/ScenarioPresetPicker.test.ts .gitignore
git commit -m "data: replace market catalog with leverage families"
```

---

### Task 2: Correct Dividends and Build Contribution-Free Product Performance

**Files:**
- Create: `src/core/ProductPerformance.ts`
- Create: `src/core/__tests__/ProductPerformance.test.ts`
- Modify: `src/core/BacktestEngine.ts`
- Modify: `src/core/__tests__/BacktestEngine.test.ts`
- Modify: `src/types/finance.ts`

**Interfaces:**
- Consumes: `IndexPoint` from `historicalAssets.ts`.
- Produces: `ProductPerformancePoint`, `ProductPerformanceMetrics`, `ProductPerformanceResult`.
- Produces: `calculateProductPerformance(data, startDate, endDate): ProductPerformanceResult`.

- [ ] **Step 1: Write a failing dividend carry-forward regression test**

```typescript
it('reinvests one explicit dividend once and never carries it forward', () => {
  const data = [
    { date: '2024-01-02', price: 100, dividendYield: 0.01 },
    { date: '2024-01-03', price: 100, dividendYield: 0 },
    { date: '2024-01-04', price: 100, dividendYield: 0 },
  ];
  const result = BacktestEngine.run({
    ...defaultParams,
    initialPrincipal: 100,
    startDate: '2024-01-02',
    endDate: '2024-01-04',
    reinvestDividends: true,
  }, data);

  expect(result.metrics.finalValue).toBe(101);
});
```

- [ ] **Step 2: Run the regression test and confirm the inflated result**

Run: `npm test -- src/core/__tests__/BacktestEngine.test.ts`

Expected: FAIL because the current engine repeats the 1% dividend on later rows.

- [ ] **Step 3: Remove dividend carry-forward from BacktestEngine**

Delete `lastKnownDividendYield` and its fallback branch. Apply only `new Decimal(point.dividendYield || 0)` on the current row. Keep the existing initial-principal-plus-first-contribution convention unchanged.

- [ ] **Step 4: Write failing product-performance tests**

```typescript
it('builds a total-return unit series independent of contributions', () => {
  const result = calculateProductPerformance([
    { date: '2024-01-02', price: 100, dividendYield: 0 },
    { date: '2024-01-03', price: 110, dividendYield: 0 },
    { date: '2024-01-04', price: 99, dividendYield: 0.01 },
  ], '2024-01-02', '2024-01-04');

  expect(result.points[0].value).toBe(100);
  expect(result.points.at(-1)?.value).toBeCloseTo(99.99, 6);
  expect(result.metrics.cumulativeReturn).toBeCloseTo(-0.0001, 6);
  expect(result.metrics.mdd).toBeCloseTo(0.091, 3);
});
```

- [ ] **Step 5: Run the new product test and confirm it fails**

Run: `npm test -- src/core/__tests__/ProductPerformance.test.ts`

Expected: FAIL because `ProductPerformance.ts` does not exist.

- [ ] **Step 6: Implement product total-return points and metrics**

Use these public types:

```typescript
export interface ProductPerformancePoint {
  date: string;
  value: number;
}

export interface ProductPerformanceMetrics {
  cumulativeReturn: number;
  cagr: number;
  mdd: number;
  volatility: number;
}

export interface ProductPerformanceResult {
  points: ProductPerformancePoint[];
  metrics: ProductPerformanceMetrics;
}
```

Filter inclusively, sort without mutating the source, start at 100, and for every later row multiply by `(current.price / previous.price) * (1 + current.dividendYield)`. Derive CAGR from actual calendar days, MDD from the unit peak, and annualized sample volatility from daily unit returns using `sqrt(252)`. Reject fewer than two points with an explicit range error.

- [ ] **Step 7: Run the core test set**

Run:

```bash
npm test -- src/core/__tests__/BacktestEngine.test.ts src/core/__tests__/ProductPerformance.test.ts src/core/__tests__/Backtesting.test.ts
```

Expected: all tests pass, including the once-only dividend assertion.

- [ ] **Step 8: Commit the corrected performance engine**

```bash
git add src/core/BacktestEngine.ts src/core/ProductPerformance.ts src/core/__tests__/BacktestEngine.test.ts src/core/__tests__/ProductPerformance.test.ts src/types/finance.ts
git commit -m "fix: calculate historical total returns accurately"
```

---

### Task 3: Model Leveraged Families, Common Coverage, and Insights

**Files:**
- Create: `src/data/leverageFamilies.ts`
- Create: `src/data/__tests__/leverageFamilies.test.ts`
- Modify: `src/data/historicalAssets.ts`
- Modify: `src/components/common/ScenarioPresetPicker.tsx`
- Modify: `src/components/common/__tests__/ScenarioPresetPicker.test.ts`
- Modify: `src/types/finance.ts`

**Interfaces:**
- Consumes: `HistoricalAssetType`, `HistoricalCoverage`, `ProductPerformanceResult`.
- Produces: `LEVERAGE_FAMILIES`, `getCommonCoverage`, `selectLeverageFamily`, `getFamilyDurationPresets`, `calculateLeverageInsights`.

Use these exact domain types:

```typescript
export type LeverageFamilyId = 'NASDAQ' | 'AMD' | 'TESLA' | 'SEMICONDUCTORS';

export interface LeverageInsight {
  assetId: HistoricalAssetType;
  targetMultiple: 2 | 3;
  underlyingReturn: number;
  actualReturn: number;
  simpleReference: number;
  difference: number;
}

export interface CommonCoverage {
  startDate: string;
  endDate: string;
  startAsset: HistoricalAssetType;
  endAsset: HistoricalAssetType;
}
```

- [ ] **Step 1: Write failing family and coverage tests**

```typescript
it('selects the Nasdaq family with the underlying as primary', () => {
  expect(selectLeverageFamily('NASDAQ')).toEqual({
    primaryAsset: 'QQQ',
    comparisonAssets: ['QLD', 'TQQQ'],
  });
});

it('intersects coverage and identifies the limiting start asset', () => {
  const coverage = getCommonCoverage(['QQQ', 'QLD', 'TQQQ'], getHistoricalCoverage);
  expect(coverage.startDate).toBe(getHistoricalCoverage('TQQQ').startDate);
  expect(coverage.startAsset).toBe('TQQQ');
  expect(coverage.endDate).toBe(
    [getHistoricalCoverage('QQQ'), getHistoricalCoverage('QLD'), getHistoricalCoverage('TQQQ')]
      .map(item => item.endDate)
      .sort()[0],
  );
});
```

- [ ] **Step 2: Write failing 2×/3× insight tests**

```typescript
it('reports percentage-point differences without dividing by the underlying return', () => {
  expect(calculateLeverageInsights(
    { QQQ: 0.20, QLD: 0.31, TQQQ: 0.35 },
    LEVERAGE_FAMILIES.NASDAQ,
  )).toEqual([
    { assetId: 'QLD', targetMultiple: 2, underlyingReturn: 0.20, actualReturn: 0.31, simpleReference: 0.40, difference: -0.09 },
    { assetId: 'TQQQ', targetMultiple: 3, underlyingReturn: 0.20, actualReturn: 0.35, simpleReference: 0.60, difference: -0.25 },
  ]);
});

it('keeps the arithmetic reference explicit for a negative underlying return', () => {
  expect(calculateLeverageInsights(
    { AMD: -0.60, AMDL: -0.90 },
    LEVERAGE_FAMILIES.AMD,
  )[0]).toMatchObject({
    simpleReference: -1.20,
    difference: 0.30,
  });
});
```

- [ ] **Step 3: Run family tests and confirm they fail**

Run: `npm test -- src/data/__tests__/leverageFamilies.test.ts`

Expected: FAIL because the family module does not exist.

- [ ] **Step 4: Implement immutable family definitions and selection**

```typescript
export const LEVERAGE_FAMILIES = {
  NASDAQ: { id: 'NASDAQ', label: '나스닥', members: [
    { assetId: 'QQQ', targetMultiple: 1 },
    { assetId: 'QLD', targetMultiple: 2 },
    { assetId: 'TQQQ', targetMultiple: 3 },
  ] },
  AMD: { id: 'AMD', label: 'AMD', members: [
    { assetId: 'AMD', targetMultiple: 1 },
    { assetId: 'AMDL', targetMultiple: 2 },
  ] },
  TESLA: { id: 'TESLA', label: 'Tesla', members: [
    { assetId: 'TSLA', targetMultiple: 1 },
    { assetId: 'TSLL', targetMultiple: 2 },
  ] },
  SEMICONDUCTORS: { id: 'SEMICONDUCTORS', label: '반도체', members: [
    { assetId: 'SOXX', targetMultiple: 1 },
    { assetId: 'SOXL', targetMultiple: 3 },
  ] },
} as const;
```

Return a common coverage object with `startDate`, `endDate`, `startAsset`, and `endAsset`. Add family presets for 1, 3, 5, and 10 years plus all; each preset carries `disabled` and a Korean reason naming the limiting asset and available start date.

- [ ] **Step 5: Keep existing general presets and add explicit family preset helpers**

Do not remove historical crash scenarios from general comparison. Extend `ScenarioPresetPicker` inputs with optional family preset availability so family selection renders `1년 / 3년 / 5년 / 10년 / 전체`, while ordinary single-asset use preserves its current YTD/month/history choices.

- [ ] **Step 6: Run family and preset tests**

Run:

```bash
npm test -- src/data/__tests__/leverageFamilies.test.ts src/components/common/__tests__/ScenarioPresetPicker.test.ts src/data/__tests__/historicalAssets.test.ts
```

Expected: all tests pass; short-history AMDL disables 5 and 10 years with AMDL in the reason.

- [ ] **Step 7: Commit the family domain model**

```bash
git add src/data/leverageFamilies.ts src/data/__tests__/leverageFamilies.test.ts src/data/historicalAssets.ts src/components/common/ScenarioPresetPicker.tsx src/components/common/__tests__/ScenarioPresetPicker.test.ts src/types/finance.ts
git commit -m "feat: model leveraged asset families"
```

---

### Task 4: Add Nominal, Real, and Gold Value Bases

**Files:**
- Create: `src/core/ValueBasis.ts`
- Create: `src/core/__tests__/ValueBasis.test.ts`
- Modify: `src/types/finance.ts`
- Modify: `src/data/historicalAssets.ts`

**Interfaces:**
- Consumes: `findPointOnOrBefore(points: readonly IndexPoint[], date: string): IndexPoint | null` from `historicalAssets.ts`.
- Produces: `ValueBasis = 'NOMINAL' | 'REAL' | 'GOLD'`.
- Produces: `transformPortfolioHistory(history, basis, options): BacktestHistoryPoint[]`.
- Produces: `transformProductSeries(points, basis, options): ProductPerformancePoint[]`.
- Produces: `getGoldBasisError(startDate, endDate, gold): string | null`.

- [ ] **Step 1: Write failing value-basis tests**

```typescript
it('converts each contribution at its own gold factor', () => {
  const history = [
    { date: '2024-01-02', value: 100, principal: 100 },
    { date: '2024-01-03', value: 220, principal: 200 },
  ];
  const gold = [
    { date: '2024-01-02', price: 2000, dividendYield: 0 },
    { date: '2024-01-03', price: 4000, dividendYield: 0 },
  ];

  expect(transformPortfolioHistory(history, 'GOLD', { inflationRate: 0, gold })[1]).toEqual({
    date: '2024-01-03',
    value: 110,
    principal: 150,
  });
});

it('uses the closest prior gold close and never looks ahead', () => {
  const gold = [
    { date: '2024-01-02', price: 2000, dividendYield: 0 },
    { date: '2024-01-04', price: 2100, dividendYield: 0 },
  ];
  expect(findPointOnOrBefore(gold, '2024-01-03')?.date).toBe('2024-01-02');
});
```

- [ ] **Step 2: Run value-basis tests and confirm they fail**

Run: `npm test -- src/core/__tests__/ValueBasis.test.ts`

Expected: FAIL because `ValueBasis.ts` does not exist.

- [ ] **Step 3: Implement factor lookup and cash-flow-aware transforms**

For each history point, calculate `principalDelta = current.principal - previous.principal`, divide that delta by the factor on its own date, and accumulate the transformed principal. Divide portfolio value by the current factor. Use `(1 + inflationRate) ** (elapsedDays / 365.25)` for real basis and `priorGold.price / startGold.price` for gold basis.

```typescript
export interface ValueBasisOptions {
  inflationRate: number;
  gold: readonly IndexPoint[];
}

export const transformPortfolioHistory = (
  history: readonly BacktestHistoryPoint[],
  basis: ValueBasis,
  options: ValueBasisOptions,
): BacktestHistoryPoint[] => {
  if (history.length === 0) return [];
  const startDate = history[0].date;
  const startGold = basis === 'GOLD' ? findPointOnOrBefore(options.gold, startDate) : null;
  if (basis === 'GOLD' && !startGold) {
    throw new ValueBasisError(`GOLD 데이터가 ${startDate} 이전을 포함하지 않습니다.`);
  }

  let previousPrincipal = 0;
  let transformedPrincipal = 0;
  return history.map(point => {
    const elapsedDays = (Date.parse(point.date) - Date.parse(startDate)) / 86_400_000;
    const currentGold = basis === 'GOLD' ? findPointOnOrBefore(options.gold, point.date) : null;
    if (basis === 'GOLD' && !currentGold) {
      throw new ValueBasisError(`GOLD 데이터가 ${point.date} 이전을 포함하지 않습니다.`);
    }
    const factor = basis === 'NOMINAL'
      ? 1
      : basis === 'REAL'
        ? (1 + options.inflationRate) ** (elapsedDays / 365.25)
        : currentGold!.price / startGold!.price;
    const principalDelta = point.principal - previousPrincipal;
    transformedPrincipal += principalDelta / factor;
    previousPrincipal = point.principal;
    return {
      ...point,
      value: point.value / factor,
      principal: transformedPrincipal,
    };
  });
};
```

Throw a typed `ValueBasisError` only for unavailable gold boundaries. Nominal and real transformations must remain usable when gold is unavailable.

- [ ] **Step 4: Run value-basis and product tests**

Run:

```bash
npm test -- src/core/__tests__/ValueBasis.test.ts src/core/__tests__/ProductPerformance.test.ts
```

Expected: all tests pass, including no-look-ahead and per-contribution conversion.

- [ ] **Step 5: Commit the value-basis layer**

```bash
git add src/core/ValueBasis.ts src/core/__tests__/ValueBasis.test.ts src/types/finance.ts src/data/historicalAssets.ts
git commit -m "feat: add gold-relative backtest values"
```

---

### Task 5: Move Comparison Selection and Coverage into Parent State

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/sections/SimulationControls.tsx`
- Modify: `src/components/sections/BacktestView.tsx`
- Modify: `src/data/leverageFamilies.ts`
- Modify: `src/data/__tests__/leverageFamilies.test.ts`

**Interfaces:**
- Consumes: `selectLeverageFamily` and `getCommonCoverage`.
- Produces: `BacktestAssetSelection` and `applyFamilySelection(params, familyId, getCoverage)`.
- Passes: `selectedAssets: HistoricalAssetType[]` to date controls and comparison view.

- [ ] **Step 1: Write a failing atomic family-selection test**

```typescript
it('changes primary, comparisons, and dates as one family action', () => {
  const next = applyFamilySelection(
    { assetType: 'SPY', startDate: '2000-01-01', endDate: '2026-08-13' },
    'NASDAQ',
    getHistoricalCoverage,
  );

  const common = getCommonCoverage(['QQQ', 'QLD', 'TQQQ'], getHistoricalCoverage);
  expect(next).toEqual({
    primaryAsset: 'QQQ',
    comparisonAssets: ['QLD', 'TQQQ'],
    startDate: common.startDate,
    endDate: common.endDate,
  });
});
```

- [ ] **Step 2: Run the selection test and confirm it fails**

Run: `npm test -- src/data/__tests__/leverageFamilies.test.ts`

Expected: FAIL because `applyFamilySelection` is not implemented.

- [ ] **Step 3: Implement the pure selection transition**

```typescript
export interface BacktestAssetSelection {
  primaryAsset: HistoricalAssetType;
  comparisonAssets: HistoricalAssetType[];
  startDate: string;
  endDate: string;
}
```

`applyFamilySelection` always returns the 1× member as primary, remaining members in declared order, and the full common range. Individual asset toggles retain the primary and reject a fourth selected series.

- [ ] **Step 4: Lift `comparisonAssets` from BacktestView to App**

Create parent state initialized to `[]`. Pass `primaryAsset`, `comparisonAssets`, `onComparisonAssetsChange`, and `onFamilySelect` to `BacktestView`. `onFamilySelect` updates `backtestParams.assetType`, `startDate`, and `endDate` in one state update and replaces comparison assets.

Pass all selected assets to `SimulationControls`; calculate its date min/max and range errors from common coverage instead of primary-only coverage.

- [ ] **Step 5: Run selection, coverage, and build verification**

Run:

```bash
npm test -- src/data/__tests__/leverageFamilies.test.ts src/components/common/__tests__/ScenarioPresetPicker.test.ts
npm run build
```

Expected: tests and build pass; App is the sole owner of the selected comparison assets.

- [ ] **Step 6: Commit parent-owned selection**

```bash
git add src/App.tsx src/components/sections/SimulationControls.tsx src/components/sections/BacktestView.tsx src/data/leverageFamilies.ts src/data/__tests__/leverageFamilies.test.ts
git commit -m "feat: coordinate leverage family selection"
```

---

### Task 6: Render Integrated Family Results, Insights, and Responsive Charts

**Files:**
- Create: `src/components/common/SegmentedControl.tsx`
- Create: `src/components/sections/__tests__/BacktestView.test.tsx`
- Modify: `src/components/sections/BacktestView.tsx`
- Modify: `src/components/charts/BacktestChart.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: portfolio results, product-performance results, value-basis transforms, family insights.
- Produces: accessible family chips, result/basis segmented controls, responsive metrics, insight, and disclosure.

Use this presentation boundary:

```typescript
export interface ComparisonAssetResult {
  assetId: HistoricalAssetType;
  targetMultiple: 1 | 2 | 3;
  portfolio: BacktestResult;
  product: ProductPerformanceResult;
  error?: string;
}

export interface BacktestViewProps {
  primaryAsset: HistoricalAssetType;
  comparisonAssets: HistoricalAssetType[];
  results: ComparisonAssetResult[];
  leverageInsights: LeverageInsight[];
  currency: 'KRW' | 'USD';
  valueBasis: ValueBasis;
  resultView: 'PORTFOLIO' | 'NORMALIZED';
  goldBasisError: string | null;
  onFamilySelect: (familyId: LeverageFamilyId) => void;
  onComparisonAssetsChange: (assets: HistoricalAssetType[]) => void;
  onValueBasisChange: (basis: ValueBasis) => void;
  onResultViewChange: (view: 'PORTFOLIO' | 'NORMALIZED') => void;
}
```

- [ ] **Step 1: Install component-test dependencies**

Run:

```bash
npm install --save-dev @testing-library/react @testing-library/user-event jsdom
```

Use `// @vitest-environment jsdom` at the top of the new component test so existing node-environment tests do not change.

- [ ] **Step 2: Write failing family-selection and segmented-control tests**

```tsx
// @vitest-environment jsdom
it('selects the entire Nasdaq family from one accessible button', async () => {
  const user = userEvent.setup();
  const onFamilySelect = vi.fn();
  const baseProps: BacktestViewProps = {
    primaryAsset: 'SPY',
    comparisonAssets: [],
    results: [],
    leverageInsights: [],
    currency: 'USD',
    valueBasis: 'NOMINAL',
    resultView: 'PORTFOLIO',
    goldBasisError: null,
    onFamilySelect,
    onComparisonAssetsChange: vi.fn(),
    onValueBasisChange: vi.fn(),
    onResultViewChange: vi.fn(),
  };
  render(<BacktestView {...baseProps} />);

  await user.click(screen.getByRole('button', { name: '나스닥 레버리지 가족 선택' }));
  expect(onFamilySelect).toHaveBeenCalledWith('NASDAQ');
});

it('changes value basis without changing the nominal leverage insight', async () => {
  const user = userEvent.setup();
  const onValueBasisChange = vi.fn();
  const props: BacktestViewProps = {
    primaryAsset: 'AMD',
    comparisonAssets: ['AMDL'],
    results: [],
    leverageInsights: [{
      assetId: 'AMDL',
      targetMultiple: 2,
      underlyingReturn: 0.40,
      actualReturn: 0.55,
      simpleReference: 0.80,
      difference: -0.25,
    }],
    currency: 'USD',
    valueBasis: 'NOMINAL',
    resultView: 'NORMALIZED',
    goldBasisError: null,
    onFamilySelect: vi.fn(),
    onComparisonAssetsChange: vi.fn(),
    onValueBasisChange,
    onResultViewChange: vi.fn(),
  };
  const { rerender } = render(<BacktestView {...props} />);
  const nominalInsight = screen.getByTestId('leverage-insight').textContent;

  await user.click(screen.getByRole('button', { name: '금 기준' }));
  expect(onValueBasisChange).toHaveBeenCalledWith('GOLD');
  rerender(<BacktestView {...props} valueBasis="GOLD" />);
  expect(screen.getByRole('button', { name: '금 기준' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByTestId('leverage-insight').textContent).toBe(nominalInsight);
});
```

- [ ] **Step 3: Run the component test and confirm it fails**

Run: `npm test -- src/components/sections/__tests__/BacktestView.test.tsx`

Expected: FAIL because the family buttons, controls, and new props are absent.

- [ ] **Step 4: Implement reusable accessible segmented controls**

```typescript
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}
```

Render a labelled group of buttons with `aria-pressed`, native `disabled`, visible focus rings, and the disabled reason in both `title` and adjacent screen-reader text.

- [ ] **Step 5: Prepare comparison results outside rendering components**

In `App.tsx`, memoize one `BacktestEngine.run` and one `calculateProductPerformance` result per selected asset using the shared date range. Pass prepared results, gold data, inflation rate, selected basis, and selected result view into `BacktestView`; do not make `BacktestChart` fetch data or calculate metrics.

- [ ] **Step 6: Implement the integrated BacktestView**

Render:

- four family buttons followed by individual asset chips;
- textual target badges from family metadata;
- `투자 결과 / 시작값 100` and `명목 / 실질 / 금 기준` controls;
- desktop table and mobile compact rows using CSS breakpoints, without `min-w-[800px]` on mobile;
- a single `명목 상품 성과` insight surface only for a complete family;
- the sentence `2배·3배는 하루의 목표이며, 전체 기간 수익률의 약속이 아닙니다.`;
- a cost disclosure naming buy fees and the ISA estimate as included, and sell fees/dividend tax/general capital-gains tax as excluded;
- inline per-asset calculation errors rather than `console.error`-only omission.
- a disabled gold option with `goldBasisError` exposed as visible and screen-reader text when coverage is incomplete;
- reduced-motion behavior driven by Framer Motion's `useReducedMotion` or the existing CSS media query for every newly added transition.

Use near-black solid lines for 1×, Frost Blue solid lines for 2×, and Sky Frost dashed lines for 3×. Remove the current green/orange comparison palette.

- [ ] **Step 7: Refactor BacktestChart to consume prepared display points**

```typescript
export interface BacktestDisplayPoint {
  date: string;
  value: number;
  principal?: number;
  isLiquidated?: boolean;
}

export interface BacktestDisplaySeries {
  assetId: HistoricalAssetType;
  targetMultiple: 1 | 2 | 3;
  color: string;
  strokeDasharray?: string;
  points: BacktestDisplayPoint[];
}
```

Tooltip date matching must use the closest point at or before the hovered date for every asset. Do not fall forward to a future point. Format normalized values as plain index numbers and portfolio values with the selected currency formatter.

Every tooltip row includes ticker text and its 1×/2×/3× badge, and the tooltip heading includes the Korean-formatted date.

- [ ] **Step 8: Run component, core, and build verification**

Run:

```bash
npm test -- src/components/sections/__tests__/BacktestView.test.tsx src/core/__tests__/ProductPerformance.test.ts src/core/__tests__/ValueBasis.test.ts src/data/__tests__/leverageFamilies.test.ts
npm run build
```

Expected: all tests pass and the production build completes.

- [ ] **Step 9: Commit the integrated presentation**

```bash
git add package.json package-lock.json src/App.tsx src/index.css src/components/common/SegmentedControl.tsx src/components/sections/BacktestView.tsx src/components/sections/__tests__/BacktestView.test.tsx src/components/charts/BacktestChart.tsx
git commit -m "feat: present leveraged family comparisons"
```

---

### Task 7: Add Browser Interaction and Visual-Review Coverage

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/leverage-comparison.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: accessible names defined in Task 6.
- Produces: `npm run test:e2e` and screenshots under ignored `test-results/visual-review/`.

- [ ] **Step 1: Install Playwright and configure the Vite server**

Run:

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

Add scripts:

```json
"test:e2e": "playwright test",
"test:e2e:update": "playwright test --update-snapshots"
```

Configure `webServer.command` as `npm run dev -- --host 127.0.0.1`, `webServer.url` as `http://127.0.0.1:5173/stock-snowball/`, and a Chromium desktop project plus a 390×844 mobile project.

- [ ] **Step 2: Write the end-to-end family interaction**

```typescript
test('Nasdaq family shows 1x, 2x, and 3x actual-history comparison', async ({ page }, testInfo) => {
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
  await page.getByRole('button', { name: '나스닥 레버리지 가족 선택' }).click();

  await expect(page.getByText('QQQ', { exact: true })).toBeVisible();
  await expect(page.getByText('QLD', { exact: true })).toBeVisible();
  await expect(page.getByText('TQQQ', { exact: true })).toBeVisible();
  await expect(page.getByText('2배·3배는 하루의 목표이며, 전체 기간 수익률의 약속이 아닙니다.')).toBeVisible();

  await page.screenshot({
    path: `test-results/visual-review/nasdaq-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
```

Use this exact second test for the short-history AMD family:

```typescript
test('AMD family explains unavailable long periods and supports gold basis', async ({ page }, testInfo) => {
  await page.goto('/stock-snowball/');
  await page.getByRole('button', { name: '백테스트 모드' }).click();
  await page.getByRole('button', { name: 'AMD 레버리지 가족 선택' }).click();

  await expect(page.getByRole('button', { name: '5년' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '10년' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '5년' })).toHaveAttribute('title', /AMDL/);
  await page.getByRole('button', { name: '금 기준' }).click();
  await expect(page.getByText('시작일 금 가치 기준')).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  await page.screenshot({
    path: `test-results/visual-review/amd-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
```

- [ ] **Step 3: Run browser tests and inspect both viewport captures**

Run:

```bash
npm run test:e2e
find test-results/visual-review -type f -print | sort
```

Expected: desktop and mobile captures for Nasdaq and AMD; no horizontal viewport overflow; family labels, target badges, controls, insight, and disclosures remain readable.

- [ ] **Step 4: Inspect the four screenshots against explicit acceptance criteria**

Open all four files with the local image viewer. Accept them only when no content overlaps or clips, no horizontal page overflow is visible, family labels and target badges are legible, disabled-period reasons are discoverable, the insight remains one restrained surface, and desktop/mobile spacing follows the existing 8-pixel rhythm. If a criterion fails, add a Playwright assertion that reproduces it, run the single test to see it fail, apply the smallest component/CSS correction, and rerun both projects.

- [ ] **Step 5: Commit browser coverage**

```bash
git add package.json package-lock.json playwright.config.ts e2e/leverage-comparison.spec.ts .gitignore src/components
git commit -m "test: cover leverage comparison journeys"
```

Do not add `test-results/` or `playwright-report/` to the commit.

---

### Task 8: Document and Verify the Complete Feature

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: final commands and user-facing behavior from Tasks 1–7.
- Produces: operator instructions and final verification evidence.

- [ ] **Step 1: Update README with the actual catalog and interpretation**

Document the 14 assets, manual full-catalog refresh, actual common-history limitation, QQQ/QLD/TQQQ and other family shortcuts, and the meaning of nominal/real/gold bases. Include the statement that leveraged targets are daily and that the gold basis is an approximate GOLD-futures purchasing-power comparison.

- [ ] **Step 2: Run the full offline verification suite**

Run:

```bash
uv run python -m unittest discover -s tests -v
npm run data:check
uv lock --check
uv sync --locked
npm test
npm run test:e2e
npm run build
git diff --check
```

Expected: every command exits 0. Record the exact Python test count, Vitest test/file count, Playwright project count, and any non-failing Vite chunk warning in the handoff.

- [ ] **Step 3: Inspect the final repository state and visual artifacts**

Run:

```bash
git status --short
git log --oneline -8
find test-results/visual-review -type f -print | sort
```

Expected: only the intended README change remains before the final commit; four visual-review screenshots exist locally and remain ignored.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md
git commit -m "docs: explain leveraged family backtests"
```

- [ ] **Step 5: Re-run the completion gate after the final commit**

Run:

```bash
npm run data:check
npm test
npm run test:e2e
npm run build
git diff --check
git status --short
```

Expected: all commands exit 0 and `git status --short` is empty.
