# Domain Pitfalls: Snowball Engine

**Domain:** Investment Calculator
**Researched:** 2024-05-22

## Critical Pitfalls

### Pitfall 1: Cumulative Rounding Bias
**What goes wrong:** 모든 단계에서 사사오입(반올림)을 적용하면, 대량의 트랜잭션 합산 시 결과가 실제보다 높게 나옵니다.
**Why it happens:** `.5`를 항상 올림하므로 발생하는 통계적 편향입니다.
**Consequences:** 시뮬레이션 결과가 실제 수익보다 부풀려져 사용자에게 잘못된 희망을 줌.
**Prevention:** **Banker's Rounding (Round Half-Even)** 방식을 적용합니다.

### Pitfall 2: Float Precision Loss in Compounding
**What goes wrong:** `(1 + 0.0001) ^ 365`와 같은 연산에서 부동 소수점 오차가 발생합니다.
**Why it happens:** 이진수 기반 `Number` 타입의 한계입니다.
**Consequences:** 기간이 길어질수록(예: 30년 투자) 오차가 센트 단위를 넘어 달러/원 단위까지 확대됩니다.
**Prevention:** `Decimal.js`와 같은 임의 정밀도 라이브러리를 사용합니다.

## Moderate Pitfalls

### Pitfall 1: Timezone Misalignment in Historical Rates
**What goes wrong:** 환율 데이터의 기준 시간대와 사용자의 투자 기록 시간대가 불일치하여 잘못된 환율이 적용됨.
**Prevention:** 모든 시점 데이터를 UTC 기준으로 통일하고 표시 시점에만 Local Time으로 변환합니다.

## Minor Pitfalls

### Pitfall 1: Over-Engineering Tax Logic
**What goes wrong:** 모든 국가의 모든 세법을 완벽히 구현하려다 엔진이 복잡해져 유지보수가 불가능해짐.
**Prevention:** 대표적인 세법(한국 15.4% 등)을 프리셋으로 제공하고, 나머지는 사용자가 세율을 직접 입력하도록 설계합니다.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core Engine | 부동 소수점 오차 | `Decimal.js` 도입 초기화 |
| Currency Support | Stale Exchange Rates | 환율 데이터 타임스탬프 검증 로직 추가 |
| Fee Engine | 최소 수수료 누락 | 수수료 계산 시 `Math.max(minFee, calculatedFee)` 적용 |

## Sources

- [Floating Point Guide](https://floating-point-gui.de/)
- [Financial Errors in Software (Post-mortem)](https://www.hillelwayne.com/post/currency/)
