# Phase 8: 'What-If' Backtest Evolution - Research

**Researched:** 2024-05-13 (Revised: 2024-05-14)
**Domain:** Historical Backtesting & Scenario Engineering
**Confidence:** HIGH

## Summary

본 단계의 핵심은 사용자에게 단순한 수익률 계산을 넘어, 역사적 위기 상황에서 자신의 투자 전략이 어떻게 작동했는지를 시각적으로 증명하는 것입니다. 특히 '최악의 시점'과 '최고의 시점'을 대조함으로써 장기 투자의 복원력을 강조합니다.

**Primary recommendation:** `App.tsx`의 상태 구조를 `mode`별로 분리하고, `BacktestEngine`에 `SnowballEngine` 수준의 세금/수수료 로직을 이식하여 데이터의 정합성을 확보하십시오. 시각화는 프로젝트 표준인 **visx**를 사용하여 'Elapsed Months' 기준의 비교 차트를 구현합니다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Scenario Discovery | Data Layer | — | 역사적 고점/저점 데이터를 상수화하여 제공 |
| Backtest Logic | Core Engine | — | 세금, 수수료, 배당 재투자가 포함된 정밀 연산 |
| State Management | React Context/State | — | Projection과 Backtest 상태의 완전한 격리 |
| Comparison Visualization | Chart Component | — | **visx**를 이용한 서로 다른 시간 축 동기화 시각화 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| decimal.js | 10.4.3 | 금융 연산 정밀도 유지 | 부동 소수점 오차 방지 (Banker's Rounding 지원) |
| visx | 3.12.0 | 시각화 | 프로젝트 표준, 고도화된 SVG 제어 및 성능 |
| date-fns | 2.30.0 | 날짜 연산 | 복잡한 투자 주기(Daily/Weekly) 계산 보조 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| Framer Motion | 11.1.7 | UI 애니메이션 | 시나리오 전환 및 프리셋 선택 시 Apple 스타일 경험 제공 |

## Architecture Patterns

### State Separation Pattern
현재 `App.tsx`의 단일 상태 구조를 `SimulationParams` 인터페이스로 묶고, 모드별로 인스턴스를 관리합니다.

```typescript
interface SimulationParams {
  principal: number;
  contribution: number;
  cycle: ContributionCycle;
  assetType: AssetType;
  // ... 기타 공통 필드
}

// App.tsx
const [projectionParams, setProjectionParams] = useState<SimulationParams>(DEFAULT_PROJECTION);
const [backtestParams, setBacktestParams] = useState<SimulationParams>(DEFAULT_BACKTEST);
```

### Engine Porting Plan (Accuracy Enhancement)
`BacktestEngine`에 다음 로직을 추가합니다:
1. **Buy Fee**: 투자금 투입 시 (`principal` 및 `installment`) 즉시 차감.
2. **ISA Tax**: ISA 계좌일 경우, 비과세 한도(200만/500만) 초과분에 대해 9.5% 분리과세 적용.
3. **Contribution Cycle**: `filteredData` 루프 내에서 날짜 차이를 계산하여 주기(Daily/Weekly/Monthly)에 맞춰 현금 투입.

## Scenario Discovery

### Historical "Worst" & "Best" Points [VERIFIED: web search]

| Scenario Name | Start Date (Peak) | Bottom Date | Drawdown | Rationale |
|---------------|-------------------|-------------|----------|-----------|
| **Dot-com Crash** | 2000-03-24 | 2002-10-09 | -49.1% | 기술주 거품 붕괴의 정점 |
| **Financial Crisis** | 2007-10-09 | 2009-03-09 | -56.8% | 리먼 브라더스 사태 포함 최악의 금융 위기 |
| **COVID-19 Crash** | 2020-02-19 | 2020-03-23 | -33.9% | 역사상 가장 빠른 하락 및 V자 반등 |
| **GFC Recovery** | 2009-03-10 | — | — | 역사상 가장 긴 강세장의 시작점 |
| **April 2025 (Projected)** | 2025-04-02 | — | — | 관세 충격 및 스태그플레이션 우려 시점 |

**Key Insight:** "April 2025"는 2025년 4월 초(특히 4월 2일)에 예상되는 미국 행정부의 보편적 관세 정책 발표 및 인플레이션 지표 확인 시점과 맞물린 '시장 폭락 시나리오'로 분석됩니다. 이를 '가상 시나리오(Hypothetical)' 프리셋으로 포함하는 것을 권장합니다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date Comparison | `new Date().getTime()` | `date-fns` (isSameDay, etc.) | 서머타임, 윤년 등 날짜 연산의 엣지 케이스 대응 |
| Chart Overlays | Custom SVG Canvas | **visx** (Axis, LinePath) | 서로 다른 데이터셋을 하나의 X축(Elapsed Months)으로 정렬하기 용합 |

## Common Pitfalls

### Pitfall 1: State Leakage
**What goes wrong:** 백테스트 기간을 조정했는데 미래 예측 모드의 투자 금액이 같이 바뀌어 버림.
**How to avoid:** `App.tsx`에서 `activeParams` getter를 만들고, `mode`에 따라 서로 다른 상태 객체를 참조하도록 설계.

### Pitfall 2: Backtest Data Gaps
**What goes wrong:** 휴장일(주말, 공휴일) 데이터가 없어 `Daily` 적립 계산이 누락됨.
**How to avoid:** 데이터가 있는 날에만 루프를 돌리되, "마지막 적립일"로부터 주기가 지났는지를 체크하여 '누적 적립' 수행.

## Code Examples

### Cycle-based Investment Logic
```typescript
// BacktestEngine.ts 내 루프 예시
let lastInvestedDate: Date | null = null;

for (const point of data) {
  const currentDate = new Date(point.date);
  let shouldInvest = false;

  if (!lastInvestedDate) {
    shouldInvest = true;
  } else {
    const daysSince = differenceInDays(currentDate, lastInvestedDate);
    if (cycle === 'DAILY') shouldInvest = true;
    else if (cycle === 'WEEKLY' && daysSince >= 7) shouldInvest = true;
    else if (cycle === 'MONTHLY' && isNewMonth(currentDate, lastInvestedDate)) shouldInvest = true;
  }

  if (shouldInvest) {
    invest(installment);
    lastInvestedDate = currentDate;
  }
}
```

## Validation Architecture (Updated)
See `08-VALIDATION.md` for full test specifications.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `NumericInput`을 통한 숫자 필터링 및 범위 제한 (0~100억) |

## Sources

### Primary (HIGH confidence)
- `src/core/SnowballEngine.ts` - 기존 세금/수수료 로직 확인
- `src/core/BacktestEngine.ts` - 현재 백테스트 한계점 파악
- Web Search - 역사적 폭락/반등 시점 교차 검증

### Secondary (MEDIUM confidence)
- Financial News/Projections - "April 2025" 위기설의 배경 확인

## Metadata
**Confidence breakdown:**
- Standard Stack: HIGH - **visx** 기반 시각화 표준 준수
- Architecture: HIGH - 상태 분리 패턴 명확
- Pitfalls: MEDIUM - 사용자 경험 관점의 엣지 케이스 고려 필요

**Research date:** 2024-05-13
**Valid until:** 2024-06-12
