# Feature Landscape: Snowball Engine

**Domain:** Investment Calculator
**Researched:** 2024-05-22

## Table Stakes (기본 필수 기능)

금융 계산기라면 반드시 갖춰야 할 핵심 기능입니다.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 정밀 복리 계산 | 원금, 수익률, 기간 입력 시 오차 없는 결과 도출 | Low | `Decimal.js` 활용 |
| 정기 불입 시뮬레이션 | 매월/매주 일정 금액 추가 시의 자산 성장 계산 | Medium | 불입 시점(기초/기말) 옵션 포함 |
| 인플레이션 조정 | 미래 가치를 현재 가치로 환산하여 체감 효과 제공 | Medium | 연평균 물가상승률 변수 필요 |
| 다국어/다통화 지원 | 원화, 달러 등 다양한 통화 표시 및 환산 | Medium | `Intl` API 및 환율 데이터 연동 |

## Differentiators (차별화 기능)

"Stock Snowball"만의 경쟁력을 확보해 줄 기능입니다.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 환율 변동 시뮬레이션 | 환율 상승/하락 시나리오에 따른 외화 자산 가치 변화 추적 | High | 환전 수수료 및 스프레드 포함 |
| 거래 수수료 엔진 | 국내/해외 주식 수수료 체계(최소 수수료 등) 자동 적용 | Medium | 증권사별 프리셋 제공 가능 |
| 세금 자동 계산 | 배당소득세, 양도세 등을 고려한 '실질 세후 수익' 산출 | High | 국가별/계좌종류별(ISA 등) 세율 적용 |
| 시나리오 비교 | 여러 투자 전략(A안 vs B안)을 한 눈에 시각화 비교 | Medium | 다중 데이터셋 처리 |

## Anti-Features (지양해야 할 기능)

복잡도만 높이고 가치는 낮은 기능들입니다.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 실시간 주가 연동 | 계산기는 시뮬레이션 도구이지 트레이딩 터미널이 아님 | 사용자가 기대 수익률을 입력하거나 과거 평균 수익률 프리셋 제공 |
| 복잡한 포트폴리오 최적화 | 계산 엔진의 범위를 넘어섬 | 자산군별 기대 수익률 입력으로 단순화 |

## Feature Dependencies

```
정밀 복리 계산 → 정기 불입 시뮬레이션 → 세금/수수료 엔진 → 시나리오 비교
```

## MVP Recommendation

Prioritize:
1. **정밀 복리 엔진:** `Decimal.js` 기반의 무결성 확보.
2. **정기 불입 로직:** 매월 적립식 투자 시뮬레이션.
3. **인플레이션 조정:** 미래 자산의 실제 가치 체감 기능.

Defer: **세금 자동 계산** - 국가별 규정이 복잡하므로 1단계에서는 고정 세율 입력 방식으로 시작.

## Sources

- [Vanguard Retirement Nest Egg Calculator](https://retirementplans.vanguard.com/VGApp/pe/pubnav/JSPServlet?Atn=RetirementNestEggCalc)
- [Stripe Tax API Design](https://stripe.com/docs/tax)
