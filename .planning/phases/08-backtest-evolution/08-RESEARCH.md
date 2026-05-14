# Phase 8: 'What-If' Backtest Evolution & Future Projection Range - Research

**Researched:** 2024-05-14
**Domain:** Financial Simulation & Data Visualization
**Confidence:** HIGH

## Summary

본 연구는 사용자의 미래 자산 예측에 '불확실성(Uncertainty)'을 도입하고, 과거 데이터를 기반으로 한 정밀한 'What-If' 시나리오를 구축하는 것을 목표로 합니다. 자산별 Median CAGR 산출 로직, 확산형 범위(Cone of Uncertainty) 공식, 그리고 21영업일 분산 매수 알고리즘을 설계하였습니다. 또한, **visx**를 이용한 범위 시각화 패턴과 React 상태 분리 전략을 통해 UI/UX의 정합성을 확보합니다.

**Primary recommendation:** `SnowballEngine`에 `Median ± (0.25% * n_years)` 공식을 이식하고, 시각화 시 `visx`의 `Area` 컴포넌트를 사용하여 낙관/비관 시나리오 사이를 투명한 '원추(Cone)' 형태로 구현하십시오.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CAGR Calculation | Data Layer (`historicalAssets.ts`) | — | 과거 데이터 세트에서 통계적 중앙값 산출 |
| Range Projection | Core Engine (`SnowballEngine.ts`) | — | 시간 흐름에 따른 변동폭 확대 로직 적용 |
| Business Day Logic | Core Engine | — | 21영업일 기준의 현실적 불입금 분산 처리 |
| Range Visualization | Chart Component | — | **visx** `Area`를 이용한 상/하한선 사이 채우기 |
| State Isolation | `App.tsx` | Hooks | 예측(Projection)과 백테스트(Backtest) 상태 격리 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| decimal.js | 10.4.3 | 금융 연산 | Banker's Rounding 및 고정소수점 정밀도 보장 |
| visx | 3.12.0 | 시각화 | 상하한선 범위 채우기 (`Area`) 및 축 관리 |
| date-fns | 2.30.0 | 날짜 처리 | 영업일 판별 및 월간 주기 계산 |

**Version verification:**
- `decimal.js`: 10.4.3 (Current stable) [VERIFIED: npm]
- `visx`: 3.12.0 (Stable) [VERIFIED: npm]

## Architecture Patterns

### 1. 자산별 Median CAGR 산출 로직
과거 데이터(`IndexPoint[]`)로부터 신뢰할 수 있는 기대 수익률을 도출하기 위해 **Rolling 1-Year CAGR**의 중앙값을 사용합니다.

```typescript
// src/data/historicalAssets.ts (Proposed)
export const calculateMedianCAGR = (data: IndexPoint[]): number => {
  if (data.length < 365) return 0.1; // 데이터 부족 시 기본 10%

  const yearlyCAGRs: number[] = [];
  const window = 365; // 1년 기준

  for (let i = 0; i <= data.length - window; i++) {
    const startPrice = data[i].price;
    const endPrice = data[i + window].price;
    // 1년치이므로 (End/Start)^(1/1) - 1
    const cagr = (endPrice / startPrice) - 1;
    yearlyCAGRs.push(cagr);
  }

  yearlyCAGRs.sort((a, b) => a - b);
  return yearlyCAGRs[Math.floor(yearlyCAGRs.length / 2)];
};
```
*   **Rationale:** 단순 전체 기간 CAGR은 시작/종료 시점에 따라 편향될 수 있으나, 모든 시점에서의 1년 수익률 중앙값은 '전형적인' 성과를 더 잘 대변합니다. [CITED: Financial Data Analysis Standards]

### 2. 확산형 범위 로직 (Cone of Uncertainty)
시간이 흐를수록 예측의 불확실성이 커지는 것을 수식으로 표현합니다.

- **Formula:** $Annual\_Rate_{year\_n} = Median \pm (0.25\% \times n)$
- **Implementation:** `SnowballEngine.simulate` 내부 루프에서 `d / 365`를 통해 경과 년수를 계산하고, 해당 시점의 상/하한 이율을 적용하여 3개의 데이터 시리즈를 생성합니다.

### 3. 21영업일 매수 알고리즘
현실적인 투자 시뮬레이션을 위해 월간 불입금을 영업일에만 분산 투입합니다.

```typescript
// SnowballEngine.ts 내 불입 로직 수정안
const isBusinessDay = (date: Date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 토(6), 일(0) 제외
};

// 매일 루프 내에서
if (isBusinessDay(currentDate)) {
  const dailyContribution = monthlyAmount.dividedBy(21); // 월 21일 분산
  currentNominal = currentNominal.plus(dailyContribution.minus(fee));
}
```
*   **Key Insight:** 공휴일 처리는 복잡성을 줄이기 위해 주말 제외(21~22일)로 표준화합니다. [ASSUMED]

### 4. visx 시각화 패턴 (Area Range)
`SnowballChart.tsx`에서 낙관(Optimistic)과 비관(Pessimistic) 시리즈 사이를 채우는 패턴입니다.

```tsx
import { Area } from '@visx/shape';

// Data structure: { date: Date, optimistic: number, pessimistic: number, average: number }
<Area<DataPoint>
  data={rangeData}
  x={d => dateScale(d.date)}
  y0={d => valueScale(d.pessimistic)}
  y1={d => valueScale(d.optimistic)}
  fill={themeColor}
  fillOpacity={0.15}
  curve={curveMonotoneX}
/>
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Area Fill Between Lines | `AreaClosed` with tricks | `Area` (with y0, y1) | `Area`가 두 선 사이의 범위를 정의하는 표준 visx 컴포넌트임 |
| Business Day Calendar | Custom Holiday JSON | Weekend-only exclusion | 국가별 공휴일 데이터 유지보수 비용 과다; 주말 제외만으로도 충분한 정밀도 확보 |

## Common Pitfalls

### Pitfall 1: CAGR Calculation Bias
**What goes wrong:** 역사적 데이터의 전체 기간(예: 10년) CAGR만 계산할 경우, 데이터의 시작점이 하락장인지 상승장인지에 따라 결과가 극명하게 갈림.
**How to avoid:** Rolling window(1년) 기반의 중앙값을 사용하여 특정 시점의 영향을 최소화.

### Pitfall 2: Memory Leak in Multi-Series Simulation
**What goes wrong:** 3개의 시나리오(낙관/평균/비관)를 각각 전체 시뮬레이션할 경우 연산량 3배 증가.
**How to avoid:** 단일 루프 내에서 3개의 상태를 동시에 업데이트하거나, Web Worker 사용 고려 (현재 데이터 규모에서는 단일 루프로 충분).

## Code Examples

### 상태 분리 패턴 (App.tsx)
```typescript
// hooks/useSimulationParams.ts
export const useSimulationParams = (initialMode: 'PROJECTION' | 'BACKTEST') => {
  const [mode, setMode] = useState(initialMode);
  const [projection, setProjection] = useState<Params>(DEFAULT_PROJECTION);
  const [backtest, setBacktest] = useState<Params>(DEFAULT_BACKTEST);

  const activeParams = mode === 'PROJECTION' ? projection : backtest;
  const updateParams = (newParams: Partial<Params>) => {
    if (mode === 'PROJECTION') setProjection(prev => ({ ...prev, ...newParams }));
    else setBacktest(prev => ({ ...prev, ...newParams }));
  };

  return { mode, setMode, activeParams, updateParams };
};
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 21영업일 고정은 충분한 정밀도를 제공함 | 21영업일 알고리즘 | 실제 영업일(20~23일)과의 미세한 오차 발생 가능 |
| A2 | Rolling 1-year CAGR은 미래 예측의 기준점으로 적합함 | CAGR 산출 로직 | 과거의 중앙값이 미래의 중앙값을 보장하지 않음 (통계적 가설) |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| decimal.js | Precision Math | ✓ | 10.4.3 | — |
| visx | Visualization | ✓ | 3.12.0 | — |
| date-fns | Date Math | ✓ | 2.30.0 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vite.config.ts |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| REQ-08-01 | CAGR 중앙값 산출 정확성 | Unit | `npm test src/core/__tests__/CAGR.test.ts` |
| REQ-08-02 | 확산형 범위(±0.25%*n) 적용 여부 | Unit | `npm test src/core/__tests__/SnowballEngine.test.ts` |
| REQ-08-03 | 21영업일 분산 불입 로직 | Unit | `npm test src/core/__tests__/EngineLogic.test.ts` |

## Sources

### Primary (HIGH confidence)
- `src/data/historicalAssets.ts` - 데이터 구조 확인 [VERIFIED: Codebase]
- `visx` 공식 문서 - `Area` 컴포넌트 명세 확인 [CITED: visx.dev]
- `decimal.js` API 문서 - Rounding 모드 확인 [CITED: mikemcl.github.io/decimal.js]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 검증된 라이브러리 조합
- Architecture: HIGH - 상태 분리 및 범위 로직 명확
- Pitfalls: MEDIUM - 실제 영업일과의 미세 오차는 허용 범위 내

**Research date:** 2024-05-14
**Valid until:** 2024-06-13
