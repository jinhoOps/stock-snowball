# Phase 8: 'What-If' Backtest Evolution - Validation

## Test Strategy
본 단계의 검증은 상태 관리의 무결성(Decoupling), 엔진 연산의 정밀도(Precision), 그리고 시각적 정합성(Visualization)에 집중합니다.

## 1. State Decoupling Validation (V-08-01)
**Goal**: Projection 모드와 Backtest 모드의 파라미터가 상호 간섭 없이 독립적으로 유지되는지 검증.

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| V-08-01-01 | Principal Independence | Projection에서 원금 변경 후 모드 전환 시 Backtest 원금은 유지됨 | Pending |
| V-08-01-02 | Contribution Cycle | Backtest에서 주기를 'Daily'로 변경해도 Projection 주기는 'Monthly' 유지 | Pending |
| V-08-01-03 | Unified Currency Toggle | 통화 전환(KRW/USD) 시 두 모드의 모든 금액 파라미터가 동시 환산됨 | Pending |

## 2. Engine Precision & Cycle Validation (V-08-02)
**Goal**: 업그레이드된 BacktestEngine이 D/W/M 주기와 세금/수수료를 정확히 반영하는지 검증.

| Test ID | Scenario | Verification Method | Tolerance |
|---------|----------|---------------------|-----------|
| V-08-02-01 | Daily vs Monthly | 동일 기간 동일 자산(SPY) 적립 시 Daily가 Monthly보다 적립 횟수가 많음을 확인 | 0 error |
| V-08-02-02 | Buy Fee Impact | 0.2% 수수료 적용 시 최종 투입 원금이 (총액 * 0.998)에 근사한지 확인 | ±1 KRW |
| V-08-02-03 | ISA Tax Accuracy | 수익 200만 원 초과분에 대해 9.5% 세금이 정확히 차감되는지 계산 | ±1 KRW |
| V-08-02-04 | Historical Dates | Lehman(2007-10-09) ~ COVID(2020-02-19) 데이터 로드 시 에러 없음 | N/A |

## 3. Comparison Visualization Validation (V-08-03)
**Goal**: visx 기반의 'Elapsed Months' 축 정렬 및 비교 모드의 시각적 정확성 검증.

| Test ID | Scenario | Expected Behavior | Status |
|---------|----------|-------------------|--------|
| V-08-03-01 | X-Axis Alignment | Projection(30년)과 Backtest(15년) 비교 시 0~180개월 지점까지 겹쳐서 표시됨 | Pending |
| V-08-03-02 | Tooltip Sync | 스크러빙 시 Projected Date와 Historical Date가 동일 툴팁 내에 표시됨 | Pending |
| V-08-03-03 | Milestone Trigger | Backtest 시뮬레이션 중 1억 원 달성 시 Confetti 애니메이션 발생 | Pending |

## Automated Verification Commands
```bash
# Core logic validation
npm test src/core/__tests__/BacktestEngine.test.ts

# Integrated system check (Mode switching & State)
npm test src/core/__tests__/Integrity.test.ts
```
