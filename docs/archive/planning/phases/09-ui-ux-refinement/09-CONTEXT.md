# Phase 9 Context: Advanced Metrics, Comparison & Sharing

Phase 9 focuses on enriching the financial insights (Volatility), enforcing robust performance constraints, and enhancing the visual storytelling (Sharing & Comparison) of the Stock Snowball application.

## 🎯 Goals
1.  **Enrich Insights**: Add Annualized Volatility to backtest results.
2.  **Ensure Performance**: Enforce duration limits (Max 50 years, Max 30 years for Daily) to prevent UI lag.
3.  **Enhance Storytelling**: Implement Apple-style card sharing and real-value (inflation-adjusted) comparison.
4.  **Comparative Analysis**: Evolve Backtest from single-asset to multi-asset comparison mode.

## 🛠️ Implementation Decisions

### 1. Advanced Metrics: Volatility
-   **Formula**: Annualized Standard Deviation of daily returns.
    -   `Daily Return = (Price_t - Price_t-1) / Price_t-1`
    -   `Volatility = Stdev(Daily Returns) * sqrt(252)` (assuming ~252 trading days/year for historical data).
-   **UI**: Added to `BacktestView` metrics grid.

### 2. Performance Constraints (Duration Limits)
-   **Global Limit**: Maximum investment period capped at **50 years**.
-   **Granularity Limit**: If the contribution cycle is **DAILY**, the limit is tightened to **30 years**.
-   **Enforcement**:
    -   UI: `SimulationControls` and `AdvancedSettingsSheet` will restrict slider max and validate numeric input.
    -   Engine: Add a safeguard warning if inputs exceed limits (optional but recommended).

### 3. Apple-Style Sharing Card
-   **Technology**: Use `html-to-image` (to be added) for high-quality PNG export.
-   **Design**: A dedicated, non-rendered (or off-screen) component `ShareCard` that includes:
    -   App Logo & Branding.
    -   Asset Name(s) and Period.
    -   Final Asset Value (Large number).
    -   Total Return % and CAGR.
    -   Miniature Sparkline of the growth curve.
-   **Trigger**: A "Share" button in the Hero or Result section.

### 4. Real-Value (Inflation-Adjusted) Comparison & UI Conciseness
-   **SnowballChart**: Add a toggle "Show Real Returns (Inflation Adjusted)".
-   **Visualization**: When enabled, render a secondary dashed or semi-transparent line showing the `realValue` series from `SimulationResult`.
-   **Rebase**: Both lines start from the same principal, but the real value line represents the purchasing power in today's terms.
-   **UI Conciseness**: The summary asset value displayed in the Hero/Header section will be truncated to the nearest **10,000 KRW (만원)** for KRW currency, or integer for USD, to maintain a minimalist Apple-style appearance. Full detailed precision is reserved for the "Share Card".

### 5. Backtest Comparison Mode
-   **UX Evolution**: 
    -   Current "Scenario Save" logic for Backtest will be repurposed/expanded to "Add Comparison".
    -   Users can select up to 3 assets (e.g., SPY, QQQ, SCHD) to compare on the same timeline.
-   **Engine**: `BacktestEngine.run` will be called for each selected asset.
-   **Visualization**: `BacktestChart` updated to support multiple lines with a clear color-coded legend.

## 📋 Locked Decisions
-   **No Web Workers (for now)**: Rely on duration limits instead of offloading to workers.
-   **No Sharpe Ratio**: Focus exclusively on Volatility as requested.
-   **PNG Export**: Sharing will be image-based card generation, not just text or link sharing.

## 🚀 Next Steps
1.  Add `html-to-image` dependency.
2.  Update `BacktestEngine` for Volatility and Multi-Asset support.
3.  Refine `SimulationControls` for duration constraints.
4.  Implement `ShareCard` and `SnowballChart` inflation toggle.
