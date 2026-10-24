# uv-managed Python 3.13 market-data pipeline

## Goal

Use CPython 3.13 and uv to generate the static historical market data used by the browser-only backtester. Data refreshes are deliberately manual: the application and deployment workflow never call an external market-data API.

## Data policy

- Collect actual market data only. Do not fill pre-inception dates with proxies or synthetic leverage.
- Keep the existing asset set: QQQM, QLD, TQQQ, SPY, SCHD, KOSPI 200, KOSDAQ, and gold futures.
- Retrieve `Close`, `Dividends`, and `Stock Splits` with `yfinance` using `auto_adjust=False` and `actions=True`.
- Export only a split-adjusted, dividend-unadjusted closing-price series plus cash dividends. Never use `Adj Close`, because it applies dividend adjustments that would conflict with the application's dividend-reinvestment switch.
- Retain only valid trading-day rows, sorted and de-duplicated by date.
- Record a per-asset coverage range so the UI can reject a requested backtest range that has no actual data.

## Local environment

Use `uv python install 3.13 --default` so uv maintains the latest patch within the 3.13 series while providing `python` and `python3` launchers. Update shell configuration only if `~/.local/bin` is not already on `PATH`.

Use `uv python pin --global 3.13` to make 3.13 the default uv request outside projects. The repository's local pin takes precedence whenever work occurs in this checkout.

## Python project

Add a non-package uv project with:

- `.python-version` containing `3.13`.
- `pyproject.toml` declaring `requires-python = ">=3.13,<3.14"`, the `yfinance` dependency, and `tool.uv.package = false`.
- A committed `uv.lock` for reproducible manual refreshes and CI validation.
- A `scripts/refresh_market_data.py` command run as `uv run python scripts/refresh_market_data.py`.

The Python project exists only to run data tooling; it is not a distributable package and does not affect the Node application dependency graph.

## Data generation and runtime format

The refresh script owns a single asset registry containing each application asset ID, Yahoo ticker, display name, currency, and output path. It requests the maximum available daily history with corporate actions, validates the response, and writes a compact CSV for each asset under `src/data/indices/`.

Each CSV contains `date,close,dividend`. It omits JSON object keys repeated on every row, API-only columns, and non-trading dates. The script validates the required split-adjusted, dividend-unadjusted price semantics before writing files atomically. It has a check-only mode that validates already committed CSV files without a network request.

The generated `src/data/indices/manifest.json` is a small provenance record, not a duplicate dataset. For every asset it stores the application asset ID, source ticker, display name, currency, coverage start and end, row count, retrieval timestamp, and generator schema version. This makes a manual market-data refresh reviewable and traceable.

The TypeScript loader imports CSV files as raw static assets and converts each row to the existing `{ date, price, dividendYield }` shape. It calculates `dividendYield` only from that row's cash dividend and unadjusted close. This preserves the existing dividend-reinvestment switch and avoids double-counting dividends through adjusted close prices.

Replace the current hand-maintained JSON datasets with these CSV datasets, including renaming the QQQ proxy dataset to QQQM. No raw API responses, virtual environments, or cache files are committed.

## Application behavior

Expose each asset's first and last available dates from the parsed static data and validate every requested range inclusively against those bounds. The date controls must constrain or reject a range outside an asset's coverage with a user-facing message instead of allowing the backtest engine to throw. Apply the same validation to primary, comparison, and persisted scenarios before calling the engine.

Historical presets are available only when their entire range is covered by the selected asset; partial overlap is not sufficient. Replace the hard-coded preset "today" value with the selected asset's latest available trading date from the manifest, so rolling-duration presets cannot request future or unavailable dates.

## CI flow

Retain the existing Node 20 setup, dependency installation, build, and deployment steps. Before the Node build:

1. Install uv and the pinned managed CPython 3.13 release.
2. Run `uv sync --locked`.
3. Run the generator's check-only validation and its offline tests.

CI does not invoke the API fetch path or rewrite committed static data. A developer explicitly runs the refresh command when updating market data and reviews the generated CSV diff before committing it.

## Validation

- Confirm `python --version` and `python3 --version` resolve to CPython 3.13 after opening a fresh shell.
- Confirm `uv sync --locked` uses the pinned managed interpreter.
- Exercise CSV parsing and generator validation against local fixtures without network access.
- Confirm the UI rejects unsupported primary, comparison, and saved-scenario ranges without crashing.
- Confirm the manifest matches every CSV's coverage, row count, ticker, and schema version.
- Run `npm test` and `npm run build` after generated data changes.

## Non-goals

- Replacing macOS's system Python at `/usr/bin/python3`.
- Calling a market-data API from the deployed application or CI.
- Providing synthetic history before an asset's actual availability.
- Changing the Node.js runtime or package manager.
