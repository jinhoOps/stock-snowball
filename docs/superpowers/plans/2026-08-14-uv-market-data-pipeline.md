# uv Market-Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Provide a reproducible Python 3.13/uv pipeline that manually refreshes compact, actual-market backtest data while the static web app consumes and validates that data safely.

**Architecture:** A non-package uv project runs a Python market-data generator backed by yfinance. The generator fetches each asset only when a developer invokes it, writes compact CSV plus a provenance manifest, and offers a network-free check mode. The Vite app imports CSV as raw assets, parses them into the existing historical-point API, and validates every requested backtest range against the generated coverage before calling the engine.

**Tech Stack:** CPython 3.13, uv, yfinance, Python unittest, CSV/JSON, React 19, TypeScript, Vite, Vitest, GitHub Actions.

## Global Constraints

- Require CPython >=3.13,<3.14 and pin the repository to 3.13 in .python-version.
- Use uv; commit pyproject.toml and uv.lock, but never commit .venv, uv caches, or raw provider responses.
- Fetch quote data only from the manual refresh command; CI and the deployed app never fetch it.
- Use actual history only; do not synthesize pre-inception history or proxy returns.
- Export split-adjusted, dividend-unadjusted close plus separate cash dividend; never use Adj Close for runtime data.
- CSV columns are exactly date,close,dividend. Commit src/data/indices/manifest.json with provenance and coverage.
- A backtest range must fall completely, inclusively within an asset's coverage. Apply the rule to active, comparison, and persisted scenarios.
- Preserve Node 20 deployment, npm test, and npm run build.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| .python-version | Repository-local CPython 3.13 request for uv. |
| pyproject.toml, uv.lock | Locked non-package Python tooling project. |
| tools/market_data.py | Asset registry, provider adapter, normalization, output, and offline validation. |
| scripts/refresh_market_data.py | Refresh and --check CLI. |
| tests/test_market_data.py | Fixture-only Python tests. |
| src/data/indices/*.csv | Committed browser data: date, close, cash dividend. |
| src/data/indices/manifest.json | Source ticker, coverage, row count, schema, and timestamp. |
| src/data/historicalAssets.ts | CSV parser, data accessor, and coverage helpers. |
| src/data/__tests__/historicalAssets.test.ts | CSV parser and coverage tests. |
| ScenarioPresetPicker.tsx, SimulationControls.tsx | Asset-aware date controls, presets, and visible errors. |
| App.tsx, BacktestView.tsx | Guard active and comparison engine execution. |
| deploy.yml | Locked uv setup plus offline validation before the existing Node build. |

### Task 1: Establish the uv-managed Python environment

**Files:**
- Create: .python-version
- Create: pyproject.toml
- Create: uv.lock
- Modify: .gitignore
- Modify: package.json
- Modify: README.md

**Interfaces:**
- Produces: uv run python scripts/refresh_market_data.py [--check].
- Produces: npm run data:refresh and npm run data:check.

- [ ] **Step 1: Install and select the local interpreter with uv**

Run:

~~~bash
uv python install 3.13 --default
uv python pin --global 3.13
uv python pin 3.13
python --version
python3 --version
~~~

Expected: both executables report a uv-managed Python 3.13 patch release, and .python-version contains exactly 3.13.

- [ ] **Step 2: Create a non-package uv project**

Create pyproject.toml:

~~~toml
[project]
name = "stock-snowball-market-data"
version = "0.1.0"
description = "Manual static market-data generation for Stock Snowball"
readme = "README.md"
requires-python = ">=3.13,<3.14"
dependencies = []

[tool.uv]
package = false
~~~

Run:

~~~bash
uv add yfinance
uv lock
~~~

Expected: pyproject.toml declares yfinance and uv.lock resolves it without creating a distributable Python package.

- [ ] **Step 3: Add wrappers, ignores, and contributor instructions**

Add these package scripts:

~~~json
"data:refresh": "uv run python scripts/refresh_market_data.py",
"data:check": "uv run python scripts/refresh_market_data.py --check"
~~~

Append to .gitignore:

~~~gitignore
# uv local environment and caches
.venv/
.uv-cache/
~~~

Document that data:refresh is the manual API call and data:check is an offline pre-commit check.

- [ ] **Step 4: Verify the locked environment**

~~~bash
uv lock --check
uv sync --locked
uv run python --version
~~~

Expected: all succeed; the final line reports Python 3.13.x.

- [ ] **Step 5: Commit the environment foundation**

~~~bash
git add .python-version pyproject.toml uv.lock .gitignore package.json README.md
git commit -m "build: add uv-managed Python data environment"
~~~

### Task 2: Build the test-driven market-data generator

**Files:**
- Create: tools/__init__.py
- Create: tools/market_data.py
- Create: scripts/refresh_market_data.py
- Create: tests/__init__.py
- Create: tests/test_market_data.py

**Interfaces:**
- Consumes: the locked yfinance environment from Task 1.
- Produces: ASSETS, MarketRecord, normalize_history(), refresh_all(), validate_generated_data(), and write_manifest() from tools.market_data.
- Produces: a --check command that reads only local data and returns non-zero on invalid CSV or manifest data.

- [ ] **Step 1: Write failing fixture tests**

Create tests/test_market_data.py with unittest and a fake provider/history table. The table must contain a Monday close of 100.0, a Tuesday close of 99.0 and dividend of 1.0, an out-of-order duplicate date, and a missing close. Test this exact normalized result:

~~~python
records = normalize_history("SPY", fake_history)
self.assertEqual(records, [
    MarketRecord(date="2024-01-02", close=100.0, dividend=0.0),
    MarketRecord(date="2024-01-03", close=99.0, dividend=1.0),
])
~~~

Test that the CSV text is exactly:

~~~text
date,close,dividend
2024-01-02,100,0
2024-01-03,99,1
~~~

Add validation tests that reject unsorted dates, duplicate dates, an invalid ISO date, a non-positive close, manifest row-count mismatch, and manifest coverage mismatch.

- [ ] **Step 2: Run tests to prove the interfaces do not exist**

~~~bash
uv run python -m unittest tests.test_market_data -v
~~~

Expected: FAIL with an import error for tools.market_data.

- [ ] **Step 3: Implement the asset registry and source adapter**

Define immutable registry records with these exact IDs, tickers, display names, currencies, and output names:

~~~python
ASSETS = (
    AssetDefinition("QQQM", "QQQM", "QQQM", "USD", "qqqm.csv"),
    AssetDefinition("QLD", "QLD", "QLD", "USD", "qld.csv"),
    AssetDefinition("TQQQ", "TQQQ", "TQQQ", "USD", "tqqq.csv"),
    AssetDefinition("SPY", "SPY", "SPY", "USD", "spy.csv"),
    AssetDefinition("SCHD", "SCHD", "SCHD", "USD", "schd.csv"),
    AssetDefinition("KOSPI", "^KS200", "KOSPI 200", "KRW", "kospi.csv"),
    AssetDefinition("KOSDAQ", "^KQ11", "KOSDAQ", "KRW", "kosdaq.csv"),
    AssetDefinition("GOLD", "GC=F", "Gold Futures", "USD", "gold.csv"),
)
~~~

Implement fetch_history(asset, client) using:

~~~python
client.history(
    period="max",
    interval="1d",
    auto_adjust=False,
    actions=True,
    raise_errors=True,
)
~~~

Fetch sequentially. Retry a temporary provider failure at most three times, and if exhausted raise an error that identifies the affected ticker.

- [ ] **Step 4: Implement normalization, atomic writes, and check mode**

Implement these types and signatures:

~~~python
@dataclass(frozen=True)
class MarketRecord:
    date: str
    close: float
    dividend: float

def normalize_history(asset_id: str, history: DataFrame) -> list[MarketRecord]: ...
def validate_generated_data(data_dir: Path) -> dict[str, AssetManifestEntry]: ...
def refresh_all(data_dir: Path, client_factory: Callable[[str], Ticker]) -> None: ...
~~~

Require Close, Dividends, and Stock Splits columns. Keep only finite positive Close values; treat a missing dividend as 0; sort and de-duplicate dates; and fail if an asset has no valid rows. Use the provider's split-adjusted Close, never Adj Close. Serialize numeric values with format(value, ".12g").

Fetch and normalize every asset before replacing any file. Write each CSV through a sibling temporary path followed by Path.replace(), then write manifest.json. The manifest has schemaVersion 1, source name, ticker, displayName, currency, startDate, endDate, rowCount, and UTC generatedAt.

In --check mode, call validate_generated_data only: it must make no provider calls.

- [ ] **Step 5: Implement the narrow CLI and make tests pass**

Add --check and --data-dir arguments:

~~~python
parser.add_argument("--check", action="store_true")
parser.add_argument(
    "--data-dir",
    type=Path,
    default=PROJECT_ROOT / "src/data/indices",
)
~~~

The default command calls refresh_all; --check calls validate_generated_data. Print a concise coverage summary on success. Catch expected provider/validation errors, print to stderr, and return exit code 1.

Run:

~~~bash
uv run python -m unittest tests.test_market_data -v
~~~

Expected: PASS with fixture-only tests.

- [ ] **Step 6: Commit the generator**

~~~bash
git add tools scripts tests
git commit -m "feat: add static market data generator"
~~~

### Task 3: Produce reviewed CSV artifacts from actual market history

**Files:**
- Delete: src/data/indices/qqq.json
- Delete: src/data/indices/qld.json
- Delete: src/data/indices/tqqq.json
- Delete: src/data/indices/kospi.json
- Delete: src/data/indices/kosdaq.json
- Delete: src/data/indices/spy.json
- Delete: src/data/indices/schd.json
- Delete: src/data/indices/gold.json
- Create: src/data/indices/qqqm.csv
- Create: src/data/indices/qld.csv
- Create: src/data/indices/tqqq.csv
- Create: src/data/indices/kospi.csv
- Create: src/data/indices/kosdaq.csv
- Create: src/data/indices/spy.csv
- Create: src/data/indices/schd.csv
- Create: src/data/indices/gold.csv
- Create: src/data/indices/manifest.json

**Interfaces:**
- Consumes: the Task 2 refresh command.
- Produces: actual-only, browser-consumable CSV and schema-version-1 provenance.

- [ ] **Step 1: Manually fetch every registry asset**

~~~bash
npm run data:refresh
~~~

Expected: output lists all eight assets. It does not fabricate any row before an asset's provider-returned history.

- [ ] **Step 2: Review source and artifact integrity**

~~~bash
head -n 3 src/data/indices/qqqm.csv
jq '.assets[] | {assetId, ticker, startDate, endDate, rowCount, currency}' src/data/indices/manifest.json
git diff --stat -- src/data/indices
git diff --check -- src/data/indices
~~~

Expected: CSV header is date,close,dividend; QQQM is no longer represented by the qqq.json proxy; and each manifest asset matches the fixed registry.

- [ ] **Step 3: Validate without provider access**

~~~bash
npm run data:check
~~~

Expected: PASS without calling Yahoo Finance.

- [ ] **Step 4: Commit reviewed data**

~~~bash
git add src/data/indices
git commit -m "data: refresh actual market backtest series"
~~~

### Task 4: Replace JSON imports with tested CSV data and coverage helpers

**Files:**
- Modify: src/data/historicalAssets.ts
- Create: src/data/__tests__/historicalAssets.test.ts
- Modify: src/core/__tests__/Backtesting.test.ts

**Interfaces:**
- Consumes: CSV and manifest from Task 3.
- Produces: getHistoricalData(asset), getHistoricalCoverage(asset), isHistoricalRangeCovered(asset, startDate, endDate), and getHistoricalRangeError(asset, startDate, endDate).
- Preserves: HISTORICAL_DAILY_RETURNS, calculateMedianCAGR, and getDailyReturn.

- [ ] **Step 1: Write failing parser and coverage tests**

Create src/data/__tests__/historicalAssets.test.ts. Test this parser input:

~~~ts
const csv = "date,close,dividend\n2024-01-02,100,0\n2024-01-03,99,1\n";
expect(parseHistoricalCsv(csv)).toEqual([
  { date: "2024-01-02", price: 100, dividendYield: 0 },
  { date: "2024-01-03", price: 99, dividendYield: 1 / 99 },
]);
~~~

Test range boundaries:

~~~ts
expect(isHistoricalRangeCovered("SPY", spy.startDate, spy.endDate)).toBe(true);
expect(isHistoricalRangeCovered("QQQM", "1900-01-01", "2021-01-01")).toBe(false);
expect(getHistoricalRangeError("QQQM", "1900-01-01", "2021-01-01")).toContain("QQQM");
~~~

- [ ] **Step 2: Run focused tests to verify failure**

~~~bash
npm test -- src/data/__tests__/historicalAssets.test.ts
~~~

Expected: FAIL because the parser and coverage helpers do not exist.

- [ ] **Step 3: Implement loading, parsing, and coverage checks**

Import each dataset with Vite raw imports and import manifest JSON:

~~~ts
import qqqmCsv from "./indices/qqqm.csv?raw";
import manifest from "./indices/manifest.json";
~~~

Implement parseHistoricalCsv to require the exact header, reject malformed/non-finite/non-positive close rows, map price from close, and map dividendYield to dividend / close. Derive coverage from parsed rows and verify startDate, endDate, and rowCount against manifest.

Implement coverage with this exact predicate:

~~~ts
return startDate >= coverage.startDate
  && endDate <= coverage.endDate
  && startDate <= endDate;
~~~

Keep Custom mapped to SPY for existing callers. Replace the old qqq import with qqqm.

- [ ] **Step 4: Make existing multi-asset tests use valid real history**

Update src/core/__tests__/Backtesting.test.ts to derive its shared range from the maximum start date and minimum end date across SPY, QQQM, and SCHD. Remove its fixed 2015 start so no test assumes synthetic QQQM history.

- [ ] **Step 5: Verify parser and regression behavior**

~~~bash
npm test -- src/data/__tests__/historicalAssets.test.ts src/core/__tests__/Backtesting.test.ts
npm test
~~~

Expected: PASS. No test requests history before a real asset's coverage.

- [ ] **Step 6: Commit the runtime data layer**

~~~bash
git add src/data/historicalAssets.ts src/data/__tests__/historicalAssets.test.ts src/core/__tests__/Backtesting.test.ts
git commit -m "feat: load compact historical CSV data"
~~~

### Task 5: Enforce coverage in controls, presets, and all engine call paths

**Files:**
- Modify: src/components/common/ScenarioPresetPicker.tsx
- Modify: src/components/sections/SimulationControls.tsx
- Modify: src/components/sections/BacktestView.tsx
- Modify: src/App.tsx
- Modify: src/data/__tests__/historicalAssets.test.ts

**Interfaces:**
- Consumes: HistoricalCoverage, isHistoricalRangeCovered(), and getHistoricalRangeError() from Task 4.
- Produces: only coverage-valid parameters reach BacktestEngine.run.

- [ ] **Step 1: Extend range tests for inclusive boundaries and saved data**

Add assertions:

~~~ts
expect(isHistoricalRangeCovered("SPY", spy.startDate, spy.endDate)).toBe(true);
expect(isHistoricalRangeCovered("SPY", spy.startDate, "1900-01-01")).toBe(false);
expect(isHistoricalRangeCovered("QQQM", "2000-03-24", "2002-10-09")).toBe(false);
~~~

Export these pure preset helpers from ScenarioPresetPicker.tsx and test them without rendering React:

~~~ts
const qqqmCoverage = getHistoricalCoverage("QQQM");
const rolling = getDurationPresets(qqqmCoverage);
expect(rolling.find((preset) => preset.name === "YTD")?.endDate)
  .toBe(qqqmCoverage.endDate);
expect(isPresetSupported(
  { name: "Dot-com Crash", startDate: "2000-03-24", endDate: "2002-10-09", description: "" },
  qqqmCoverage,
)).toBe(false);
~~~

Model a persisted scenario with assetType QQQM and the same 2000 range; assert getHistoricalRangeError returns a non-empty error. The App and BacktestView guard code must use that exact helper before constructing BacktestEngine.run arguments.

- [ ] **Step 2: Run coverage tests to verify the new guard path fails**

~~~bash
npm test -- src/data/__tests__/historicalAssets.test.ts
~~~

Expected: FAIL because getDurationPresets does not yet accept coverage and isPresetSupported is not exported.

- [ ] **Step 3: Make the controls and presets asset-aware**

In SimulationControls.tsx, derive coverage from params.assetType; give date inputs its min and max values; and display getHistoricalRangeError below the controls when manual or restored dates are invalid.

Change ScenarioPresetPicker to accept coverage: HistoricalCoverage. Derive rolling preset end dates from coverage.endDate. Disable a historical-preset button unless its full start-to-end range passes isHistoricalRangeCovered. Do not silently clamp a chosen historical range.

- [ ] **Step 4: Guard active, comparison, and persisted scenario execution**

In App.tsx, return null from the active backtest memo before calling BacktestEngine.run when getHistoricalRangeError returns text. In the comparison memo, validate every persisted backtest before the engine call and omit invalid comparison entries.

In BacktestView.tsx, validate each selected comparison asset before calling BacktestEngine.run and omit it when invalid. This preserves current rendering when valid and prevents a render-time exception from legacy data.

- [ ] **Step 5: Verify range handling and frontend behavior**

~~~bash
npm test -- src/data/__tests__/historicalAssets.test.ts src/core/__tests__/Backtesting.test.ts src/core/__tests__/BacktestEngine.test.ts
npm run build
~~~

Expected: PASS; invalid primary, comparison, and saved ranges do not crash rendering.

- [ ] **Step 6: Commit coverage guards**

~~~bash
git add src/components/common/ScenarioPresetPicker.tsx src/components/sections/SimulationControls.tsx src/components/sections/BacktestView.tsx src/App.tsx src/data/__tests__/historicalAssets.test.ts
git commit -m "feat: guard backtests by market data coverage"
~~~

### Task 6: Add offline CI validation and complete verification

**Files:**
- Modify: .github/workflows/deploy.yml
- Modify: README.md

**Interfaces:**
- Consumes: uv.lock, tests/test_market_data.py, npm run data:check, and existing Node build scripts.
- Produces: a deployment workflow that validates static data but never refreshes it.

- [ ] **Step 1: Add uv and offline validation before Node setup**

Insert after checkout and before the existing setup-node step:

~~~yaml
- name: Install uv
  uses: astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9 # v9.0.0
  with:
    enable-cache: true

- name: Install pinned Python
  run: uv python install --managed-python

- name: Validate static market data
  run: |
    uv sync --locked
    uv run python -m unittest tests.test_market_data -v
    npm run data:check
~~~

Keep Node 20, npm ci --legacy-peer-deps, npm run build, artifact upload, and deployment unchanged. Do not add the refresh command to CI.

- [ ] **Step 2: Document the complete contributor flow**

Add this exact workflow to README.md:

~~~bash
uv python install 3.13 --default
uv sync --locked
npm run data:refresh # manual Yahoo Finance request
npm run data:check   # offline verification
npm test
npm run build
~~~

Document actual-only coverage, split-adjusted close with separate cash dividends, and mandatory review of CSV and manifest diffs.

- [ ] **Step 3: Run every local quality gate**

~~~bash
uv lock --check
uv sync --locked
uv run python -m unittest tests.test_market_data -v
npm run data:check
npm test
npm run build
git diff --check
git status --short
~~~

Expected: every command succeeds. Keep the pre-existing untracked .codegraph directory uncommitted.

- [ ] **Step 4: Commit CI and documentation**

~~~bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: validate static market data with uv"
~~~

## Plan Self-Review

- **Spec coverage:** Tasks 1–2 deliver Python 3.13, uv, locking, and a manual Yahoo-compatible generator. Task 3 produces actual-only CSV and provenance. Task 4 keeps browser data access compatible. Task 5 validates full coverage in active, comparison, and saved flows and derives presets from real coverage. Task 6 performs offline CI validation without quote API calls.
- **Placeholder scan:** Each action names files, interfaces, validation behavior, commands, tests, tickers, and expected output.
- **Type consistency:** Python uses AssetDefinition, MarketRecord, and AssetManifestEntry throughout Tasks 2–3. TypeScript exports HistoricalCoverage, isHistoricalRangeCovered, and getHistoricalRangeError in Task 4, then uses those names in Task 5.
