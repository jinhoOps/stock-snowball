# Leveraged Asset Family Comparison Design

## Goal

Extend the existing historical asset comparison without adding a new page or application mode. Users can select a curated leveraged family in one action, compare actual long-run product outcomes, and see why a daily 2× or 3× target does not promise the same multiple of cumulative return.

The feature uses only actual traded-product history. It does not synthesize AMDL, TSLL, or any other fund before inception.

## Product Principles

- Keep the current snowball workflow: one initial investment followed by the configured recurring contributions.
- Preserve the existing general comparison instead of creating a separate “leverage lab.”
- Reveal leverage-specific interpretation only when a complete leveraged family is selected.
- Separate the investor's mixed-cash-flow result from the product's contribution-free performance.
- Prefer a few clearly labelled values over an efficiency score that becomes misleading around zero or negative returns.
- Use the existing Frost Blue, near-black, and restrained Apple-like visual language. Do not add decorative gradients or card clutter.

## Asset Catalog

Regenerate the complete static market-data catalog in one refresh. The resulting catalog contains 14 assets:

- Nasdaq family: QQQ, QLD, TQQQ
- AMD family: AMD, AMDL
- Tesla family: TSLA, TSLL
- Semiconductor family: SOXX, SOXL
- General comparison assets: SPY, SCHD, KOSPI 200, KOSDAQ, GOLD

QQQM is removed from the current asset type, selector, CSV set, and manifest. QQQ is a real QQQ dataset, not a renamed QQQM proxy.

The curated leveraged families are:

| Family | Underlying | Leveraged products | Daily targets |
|---|---|---|---|
| Nasdaq | QQQ | QLD, TQQQ | 1×, 2×, 3× |
| AMD | AMD | AMDL | 1×, 2× |
| Tesla | TSLA | TSLL | 1×, 2× |
| Semiconductors | SOXX | SOXL | 1×, 3× |

The labels describe each product's stated daily target, not an expected long-term return multiple.

## User Experience

### Asset selection

Keep the existing individual asset chips. Add a compact “leveraged families” group above or adjacent to them. Selecting a family selects all its members in one action:

- `QQQ · QLD · TQQQ`
- `AMD · AMDL`
- `TSLA · TSLL`
- `SOXX · SOXL`

The user may still add or remove individual assets. The existing maximum of three simultaneous comparison series remains, which accommodates the largest family. Selecting a family replaces the current comparison set with that family so the action is deterministic.

Each selected series has a textual `1×`, `2×`, or `3×` badge. Meaning must not depend on color alone.

### Date range

For a selected family, the valid date range is the intersection of every selected asset's actual coverage. Family selection clamps the current dates into that common range. The default “all” range uses the full intersection.

The presets are `1년`, `3년`, `5년`, `10년`, and `전체`. A preset is enabled only when the full requested duration exists in the common range. A disabled preset exposes a short reason containing the limiting product's actual inception or first available date.

No partial overlap and no pre-inception synthetic history are permitted.

### Comparison surfaces

The existing comparison table and chart remain the main surfaces.

The table presents final portfolio value, cumulative product return, product CAGR, MDD, and annualized volatility. On narrow screens it becomes compact asset rows rather than requiring an 800-pixel horizontal table. The main asset is not given visual dominance when a family preset is active; all family members are peers.

The chart has two independent segmented controls:

1. Result view: `투자 결과` or `시작값 100`
2. Value basis: `명목`, `실질`, or `금 기준`

`투자 결과` shows the configured initial investment and recurring-contribution portfolios. `시작값 100` removes contributions and normalizes each product's total-return series to 100 on the shared start date.

### Leverage insight

When all members of a curated family are selected, show one restrained insight block beneath the headline metrics. For each leveraged member it displays:

- underlying cumulative total return;
- leveraged product cumulative total return;
- simple cumulative reference: underlying cumulative return multiplied by the stated daily target; and
- the percentage-point difference between the actual product return and that simple reference.

This block is explicitly labelled `명목 상품 성과`. Daily leverage objectives are defined on nominal daily returns, so the calculation does not change with the real or gold display basis. Do not call the value an “achievement rate” or “tracking efficiency,” because division by an underlying return near zero or below zero is unstable and misleading.

Include the concise explanation: `2배·3배는 하루의 목표이며, 전체 기간 수익률의 약속이 아닙니다.`

## Calculation Model

### Mixed-cash-flow portfolio result

Run every selected asset with identical current backtest inputs:

- the initial principal is invested on the first available trading day;
- the configured contribution is then invested on the configured daily, weekly, or monthly cycle;
- dividends are reinvested;
- current transaction-fee and account-tax settings are applied consistently.

The traded fund's expenses and realized tracking behavior are treated as already reflected in its historical price and distribution data. Do not subtract an expense ratio a second time.

Portfolio metrics use final value, total contributed principal, and money-weighted IRR. Product CAGR, MDD, and volatility come from the contribution-free normalized total-return series, so contributions do not distort product comparisons.

### Contribution-free product result

Build a total-return unit series from split-adjusted, dividend-unadjusted closes and explicit cash dividends, starting at 100. This series is the source for cumulative return, CAGR, MDD, volatility, the normalized chart, and the leverage insight.

For a target multiple `m`, the insight values are:

```text
simple reference = underlying cumulative return × m
difference (percentage points) = leveraged cumulative return - simple reference
```

The simple reference may be below -100% in a severe loss. It remains an arithmetic teaching reference, not a hypothetical investable portfolio, and is displayed only as a number rather than as a chart series.

### Value bases

Define a common value-basis transformer used by the headline, table values, chart, tooltip, and principal comparison.

- Nominal: use the original portfolio or normalized-series value.
- Real: divide by the cumulative configured inflation index from the selected start date.
- Gold: divide by the gold-price index, `gold close on date / gold close on start date`.

For the real and gold bases, transform each contribution on its own contribution date and accumulate the transformed contributions. This avoids comparing a transformed portfolio against nominal cash flows.

Gold uses the existing GOLD dataset, regenerated with the rest of the catalog. It is an approximate purchasing-power yardstick based on gold futures, not CPI and not a claim about physical-gold transaction prices. The UI label is `시작일 금 가치 기준`; values remain in the selected currency rather than being presented as ounces.

When an asset trading date has no gold row, use the closest prior gold close. Never look ahead. Gold basis is available only if gold coverage includes the selected start and end boundaries.

## Data Architecture

### Manual refresh

Continue using Python 3.13 and uv. The manual Yahoo Finance refresh remains the only networked data path; the browser and CI never call the external market API.

The generator fetches maximum available daily history and writes compact `date,close,dividend` CSV files plus the provenance manifest. Price semantics remain split-adjusted and dividend-unadjusted so explicit dividend reinvestment does not double count distributions.

### Atomic full-catalog replacement

Generate every CSV and the manifest in a temporary staging directory. Validate the entire 14-asset catalog before replacing any committed file. If fetching, normalization, or validation fails for one asset, leave the existing committed catalog untouched.

On a successful refresh:

- replace all 14 generated CSV files and the manifest together;
- remove the obsolete `qqqm.csv`;
- ensure the manifest contains no QQQM record; and
- print a coverage summary for review before commit.

Check-only mode remains network-free and validates the committed catalog as a complete set.

### Frontend boundaries

Keep responsibilities isolated:

- the market-data generator owns external ticker mapping, normalization, staged output, and manifest creation;
- the historical-data loader owns CSV parsing, manifest agreement, coverage, and prior-date lookup;
- a leverage-family module owns family membership, target multiples, common coverage, and insight calculations;
- a value-basis module owns nominal, inflation, and gold transformations;
- the comparison view owns selection and presentation, not financial calculations;
- the chart renders already prepared series and tooltips.

## QQQM Compatibility Migration

Persisted data may contain QQQM even after the type is removed. Normalize legacy QQQM to QQQ at every persistence boundary before validation or simulation:

- cached backtest parameters in local storage;
- saved scenarios loaded from the local database; and
- imported or restored scenario objects, if present.

Write the migrated value back during the next normal save. Unknown asset identifiers continue to use the existing safe fallback behavior; only QQQM receives this explicit semantic migration.

## Visual and Accessibility Details

- Use near-black for 1× underlyings, Frost Blue for 2× products, and Sky Frost plus a distinct dash pattern for 3× products.
- Keep Frost Blue as the sole interaction accent; series differences also use labels and line styles.
- Use one insight surface with a hairline boundary and generous spacing instead of multiple elevated cards.
- Segmented controls have visible keyboard focus, selected text, and appropriate pressed or tab semantics.
- Disabled duration presets remain discoverable to assistive technology and expose the coverage reason.
- Chart tooltips list ticker, target badge, value, and date in text.
- Respect reduced-motion preferences.

## Failure Handling

- If a selected range is outside any selected asset's coverage, prevent execution and identify the limiting asset and available range.
- If the GOLD dataset does not cover the full range, disable only gold basis and keep nominal and real results usable.
- If a comparison asset fails calculation, show an inline error for that asset instead of silently omitting it.
- Reject empty datasets, duplicate or non-increasing dates, non-positive closes, non-finite values, malformed dividends, manifest mismatches, and unexpected catalog membership.
- A failed network refresh must not leave a partial working tree data update.

## Verification Strategy

### Python

- Assert that the registry and generated manifest contain exactly the 14 approved assets.
- Verify compact CSV shape, chronological unique dates, positive finite closes, valid dividends, coverage, row counts, ticker provenance, and schema version.
- Test full-catalog staged generation and atomic replacement.
- Inject a single-asset failure and prove that committed output remains unchanged.
- Prove that check-only validation performs no network call.

### TypeScript core and data

- Test QQQM-to-QQQ migration at each persistence boundary.
- Test family membership, target multiples, selection replacement, and common-coverage intersections.
- Test duration availability and limiting-asset messages.
- Test total-return normalization and 2×/3× reference differences, including flat and negative underlying returns.
- Test nominal, inflation, and gold transformations, per-contribution basis conversion, and prior-gold-date lookup without look-ahead.
- Test gold coverage failure independently from nominal and real results.

### Components and visual review

- Test family selection, individual selection, the three-series limit, segmented controls, disabled presets, inline errors, and keyboard semantics.
- Verify desktop and mobile production builds.
- Capture the completed comparison with Playwright at desktop and phone widths for user review, including the three-member Nasdaq family and a short-history single-stock family.

## Non-goals

- Synthetic pre-inception leveraged-product history
- Intraday tracking analysis
- Short or inverse products
- User-defined leverage multiples
- Physical-gold premiums, storage costs, or currency hedging
- A separate leverage page or application mode
- Automatic or CI-triggered external market-data refresh
