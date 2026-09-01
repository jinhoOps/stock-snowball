# Design QA — weekly market-trend overlay

## Comparison target

- Source visual truth: **unavailable**. No Figma frame, approved mockup, or source screenshot was supplied or found in the repository. The older `test-results/visual-review/nasdaq-*.png` files are prior implementation captures with different data and no market-trend overlay; they are not a valid visual source for this feature.
- Rendered implementation evidence:
  - `test-results/visual-review/market-trend-nasdaq-desktop-chromium.png`
  - `test-results/visual-review/market-trend-nasdaq-mobile-chromium.png`
  - `test-results/visual-review/market-trend-kospi-desktop-chromium.png`
  - `test-results/visual-review/market-trend-kospi-mobile-chromium.png`
- State: Backtest mode, primary asset QQQ / KOSPI, historical range, market trend overlay visible. Desktop and mobile captures cover the completed-week index line plus 20- and 60-week SMA legend.

## Capture normalization

| Capture | Pixels | CSS viewport / density |
| --- | --- | --- |
| Nasdaq desktop implementation | 1440 × 3704 | 1440px wide full-page capture; device scale factor not recorded in the retained artifact |
| Nasdaq mobile implementation | 390 × 5450 | 390px wide full-page capture; device scale factor not recorded in the retained artifact |
| Source visual target | unavailable | unavailable |

The captures are browser-rendered Playwright screenshots, but the in-app browser service was unavailable for a fresh interactive capture and console inspection in this QA session. There is no source visual to normalize to the same crop, density, or state; therefore no side-by-side comparison was performed.

## Full-view and focused-region evidence

- Full-view implementation inspection: the desktop and 390px mobile screenshots render the added chart/legend without visible page-level horizontal overflow. The `market-trend-overlay` E2E route passed for QQQ, SPY, KOSPI, and unmapped AMD in both desktop and mobile variants.
- Focused market-chart inspection: the captures visibly contain the black primary series, gray benchmark price-index series, orange 20-week SMA, purple 60-week SMA, and textual legend/disclosure. This is implementation-only evidence, not fidelity evidence.
- A source-target comparison and separate focused-region comparison are unavailable because no approved visual target exists.

**Findings**

- [P1] No approved source visual exists for the market-trend overlay.
  Location: QA input, not an implementation selector.
  Evidence: repository search found only implementation screenshots; no Figma node, mockup, or source capture representing the intended overlay layout, density, tooltip state, or mobile legend treatment.
  Impact: typography, layout rhythm, color-token, image/asset, and copy fidelity cannot be judged against intended design. A visual QA pass cannot be marked as passing from implementation screenshots alone.
  Fix: provide an approved Figma frame or screenshot for the desktop and 390px mobile backtest states, including the intended chart tooltip/legend state. Re-run this report with same-state captures side by side.

**Open Questions**

- Are the earlier pre-overlay `nasdaq-*.png` captures intended only as regression evidence, or are they an approved design source for preserving the surrounding page?
- Which tooltip state should be the visual reference: no tooltip, pointer hover, or keyboard-selected point?

**Implementation Checklist**

1. Attach or store the approved desktop and mobile visual target.
2. Capture the implementation at matching viewport, range, asset, tooltip state, and device density.
3. Compose source and implementation into one normalized comparison image.
4. Review fonts/typography, spacing/layout rhythm, colors/tokens, image quality/assets, and app copy against that source; fix any P0/P1/P2 mismatch before marking QA passed.

**Follow-up Polish**

- None assessed without a source target; visual differences would be speculative.

## Comparison history

- Iteration 1: blocked before comparison. No implementation fix was made because the required source visual is absent.

## Final result

blocked
