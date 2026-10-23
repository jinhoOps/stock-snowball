# Phase 9: Advanced Metrics, Comparison & Sharing - Research

**Researched:** 2024-05-14
**Domain:** Financial Analytics, Performance Optimization, Social Sharing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **No Web Workers (for now)**: Rely on duration limits instead of offloading to workers.
- **No Sharpe Ratio**: Focus exclusively on Volatility as requested.
- **PNG Export**: Sharing will be image-based card generation, not just text or link sharing.

### the agent's Discretion
- (None specified in CONTEXT.md, but implied for UI/UX details of comparison mode)

### Deferred Ideas (OUT OF SCOPE)
- (None specified in CONTEXT.md)
</user_constraints>

## Summary

본 단계는 "Stock Snowball" 프로젝트의 고도화 단계로, 사용자에게 심도 있는 금융 지표(변동성)를 제공하고, 대규모 연산에 따른 성능 저하를 방지하기 위한 제약 사항을 도입하며, 유려한 Apple 스타일의 공유 기능을 구현하는 것을 목표로 합니다. 특히, 기존의 단일 자산 백테스트를 넘어 여러 자산을 동시에 비교할 수 있는 '비교 모드'로의 전환이 핵심입니다.

**Primary recommendation:** `BacktestEngine`에 변동성 및 실질 가치 연산 로직을 통합하고, `html-to-image`를 활용하여 오프스크린 렌더링 방식의 공유 카드를 구현하십시오.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Volatility Calculation | Engine (Logic) | — | 정교한 금융 지표 연산은 엔진 레이어의 책임입니다. |
| Duration Limits | Client (UI/State) | Engine (Safeguard) | 즉각적인 사용자 피드백을 위해 UI 레이어에서 우선 통제합니다. |
| Apple-style Share Card | Client (UI) | — | 브라우저 DOM을 활용한 이미지 캡처 방식으로 구현합니다. |
| Real-value Rebase | Engine (Logic) | — | 인플레이션을 반영한 실질 가치 계산은 복리 엔진의 핵심 기능입니다. |
| Backtest Comparison | Client (State) | Engine (Multiple) | 여러 엔진 결과를 취합하여 시각화하는 것은 클라이언트 상태 관리의 영역입니다. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| html-to-image | ^1.11.13 | DOM to Image | SVG/Canvas를 포함한 복잡한 DOM을 고품질 이미지로 변환하는 데 최적화되어 있습니다. |
| Decimal.js | ^10.6.0 | High-precision Math | 금융 연산의 무결성(절삭 방지 등)을 보장합니다. |
| visx | ^3.12.0 | Visualization | Apple 스타일의 정교하고 유려한 차트를 구현하는 표준 라이브러리입니다. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| framer-motion | ^12.38.0 | Animation | 비교 모드 전환 및 모달 애니메이션에 사용합니다. |
| lucide-react | ^0.474.0 | Icons | 공유, 추가, 제거 버튼 등 UI 아이콘에 사용합니다. |

**Version verification:**
- `html-to-image@1.11.13` (verified via package.json)
- `Decimal.js@10.6.0` (verified via package.json)

## Architecture Patterns

### Backtest Comparison Logic Flow
기존의 `BacktestParams`를 단일 객체가 아닌, 선택된 자산들의 배열 또는 맵으로 관리하는 구조로 확장합니다.

1.  **Selection**: 사용자가 최대 3개의 자산을 선택합니다 (SPY, QQQ, SCHD 등).
2.  **Execution**: 각 자산에 대해 `BacktestEngine.run()`을 순차적으로 호출합니다.
3.  **Aggregation**: 각 결과의 `history` 데이터를 날짜 기준으로 정렬/병합하여 멀티 라인 차트 데이터를 생성합니다.
4.  **Display**: `BacktestChart`에서 여러 시리즈를 렌더링하고, 범례(Legend)를 통해 가독성을 확보합니다.

### Recommended Project Structure
```
src/
├── components/
│   ├── charts/
│   │   └── ComparisonChart.tsx   # 멀티 자산 비교 전용 차트
│   ├── common/
│   │   └── ShareCard.tsx        # 공유용 오프스크린 컴포넌트
│   └── sections/
│       ├── ComparisonManager.tsx # 자산 추가/제거 UI
│       └── ShareButton.tsx       # 이미지 생성 및 다운로드 로직
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image Generation | HTML/Canvas Manual drawing | `html-to-image` | CSS 스타일, 폰트, SVG 렌더링을 직접 구현하는 것은 극도로 복잡하고 오류가 잦습니다. |
| Volatility Math | Custom statistical loops | `Decimal.js` base Standard Deviation | 연산 오차 방지를 위해 검증된 수식을 정밀 연산 라이브러리 기반으로 구현해야 합니다. |
| Multi-line Chart | Raw D3 / Canvas | `visx` | 반응형 대응 및 Apple 스타일의 미니멀한 디자인 적용이 용이합니다. |

## Common Pitfalls

### Pitfall 1: Share Card Font Rendering
**What goes wrong:** `html-to-image`로 캡처 시 시스템 폰트(SF Pro)가 포함되지 않아 텍스트 정렬이 깨지거나 기본 폰트로 대체될 수 있습니다.
**How to avoid:** 공유 카드용 스타일에서는 가급적 웹 안전 폰트를 사용하거나, 필요한 폰트가 렌더링되는 시점에 캡처가 발생하도록 보장해야 합니다 (`fontEmbedCSS` 옵션 참고).

### Pitfall 2: High Frequency Data Overhead
**What goes wrong:** 30년 이상의 일일 데이터(약 11,000포인트)를 3개 자산에 대해 동시에 차트로 그릴 때 브라우저 메모리 및 렌더링 성능 이슈가 발생할 수 있습니다.
**How to avoid:** 기간 제한(30년/50년)을 엄격히 적용하고, 필요 시 차트 렌더링용 데이터를 샘플링(예: 주 단위)하여 최적화합니다.

### Pitfall 3: Inflation Rebase Confusion
**What goes wrong:** "실질 가치" 계산 시 기준 시점이 모호해질 수 있습니다.
**How to avoid:** 시뮬레이션 시작 시점(Day 0)의 구매력을 100%로 두고, 경과 기간에 따라 할인율을 적용하는 일관된 방식을 유지합니다.

## Code Examples

### Annualized Volatility (연율화된 변동성)
```typescript
// BacktestEngine.ts 내 구현 예시 [VERIFIED: 금융 통계 표준]
const dailyReturns = [];
for (let i = 1; i < filteredData.length; i++) {
  const prevPrice = new Decimal(filteredData[i-1].price);
  const currentPrice = new Decimal(filteredData[i].price);
  // (Pt - Pt-1) / Pt-1
  dailyReturns.push(currentPrice.minus(prevPrice).dividedBy(prevPrice));
}

const mean = dailyReturns.reduce((acc, r) => acc.plus(r), new Decimal(0)).dividedBy(dailyReturns.length);
const variance = dailyReturns.reduce((acc, r) => acc.plus(r.minus(mean).pow(2)), new Decimal(0)).dividedBy(dailyReturns.length);
const dailyVol = variance.sqrt();
const annualizedVol = dailyVol.times(Math.sqrt(252)); // 252 거래일 기준
```

### Apple-style Share Component (공유 카드)
```tsx
// src/components/common/ShareCard.tsx
const ShareCard = ({ result, assets }: { result: BacktestResult, assets: string[] }) => (
  <div id="share-card-target" className="w-[600px] p-10 bg-white rounded-[40px] shadow-2xl">
    <div className="flex justify-between items-center mb-8">
      <Logo className="w-12 h-12" />
      <span className="text-caption-strong text-apple-ink-muted-48">Stock Snowball</span>
    </div>
    <div className="mb-10">
      <h2 className="text-display-md mb-2">{assets.join(' vs ')}</h2>
      <p className="text-body text-apple-ink-muted-48">백테스트 성과 리포트</p>
    </div>
    <div className="grid grid-cols-2 gap-8">
      <Metric label="최종 자산" value={result.metrics.finalValue} />
      <Metric label="수익률" value={result.metrics.totalReturn} percent />
    </div>
    {/* Mini Sparkline using visx */}
    <div className="mt-12 h-32 w-full">
      <Sparkline data={result.history} />
    </div>
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 단일 자산 백테스트 | 멀티 자산 비교 모드 | Phase 9 | 자산 간 상관관계 및 상대적 우위 파악 가능 |
| 명목 가치 중심 차트 | 실질 가치(인플레이션 반영) 토글 | Phase 9 | 장기 투자 시 실제 구매력 변화 확인 가능 |
| 텍스트/링크 공유 | Apple 스타일 이미지 카드 공유 | Phase 9 | 시각적 소구력 및 브랜드 정체성 강화 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | 인플레이션은 일정한 연율(constant rate)로 가정함 | Inflation Rebase | 역사적 CPI와 차이가 발생할 수 있으나 UI 복잡도를 낮추기 위해 수용 가능한 수준임 |
| A2 | 변동성 계산 시 연간 거래일을 252일로 고정함 | Volatility | 한국 시장(240~245일)과 미세한 차이가 있으나 글로벌 표준 관행임 |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| html-to-image | Sharing Card | ✓ | 1.11.13 | — |
| Decimal.js | Financial Math | ✓ | 10.6.0 | — |
| visx | Charts | ✓ | 3.12.0 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-09-01 | 변동성(Volatility) 계산 정확성 | Unit | `npm test src/core/__tests__/BacktestEngine.test.ts` | ✅ |
| REQ-09-02 | 기간 제한(30/50년) 유효성 검사 | Integration | `npm test src/components/sections/SimulationControls.test.ts` | ❌ Wave 0 |
| REQ-09-03 | 이미지 생성 및 공유 동작 | UI / Manual | — | ❌ Wave 0 |
| REQ-09-04 | 실질 가치 리베이스 계산 | Unit | `npm test src/core/__tests__/SnowballEngine.test.ts` | ✅ |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Duration Limit (Max 50Y, Daily Max 30Y) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Resource Exhaustion | Denial of Service | Max duration limits on client-side simulation |

## Sources

### Primary (HIGH confidence)
- `/bubkoo/html-to-image` - toPng usage and options
- `Investopedia` - Annualized Volatility standard formula
- `DESIGN.md` - Apple-style UI guidelines for Stock Snowball

### Secondary (MEDIUM confidence)
- Standard financial engineering practices for Real Value discounting

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH
- Architecture: HIGH
- Pitfalls: MEDIUM

**Research date:** 2024-05-14
**Valid until:** 2024-06-14
