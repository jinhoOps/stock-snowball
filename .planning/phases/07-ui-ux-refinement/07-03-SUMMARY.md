---
phase: 07-ui-ux-refinement
plan: 03
subsystem: UI/UX Precision
tags: [NumericInput, UX, Financial-Precision]
requirements: [CORE-01, UI-04, UI-06]
key-files: [src/components/common/NumericInput.tsx, src/components/sections/SimulationControls.tsx, src/core/SnowballEngine.ts, src/core/__tests__/SnowballEngine.test.ts]
decisions:
  - "Custom NumericInput implemented to solve '0' stickiness and improve mobile-friendliness (inputMode=numeric)."
  - "Slider fixed to 30 years to maintain visual clarity while supporting extended periods via direct input."
  - "Korean Won formatting refined to ensure '억/만' units always end with '원' for better readability."
metrics:
  duration: 15m
  completed_date: "2026-05-13"
---

# Phase 07 Plan 03: UI/UX & Financial Precision Refinement Summary

입력 UX의 사소한 마찰을 해결하고, 대형 숫자 포맷팅 및 통화 환산의 정밀도를 강화하여 사용자 신뢰도를 높였습니다.

## 주요 변경 사항

### 1. NumericInput 컴포넌트 도입
- `input[type=number]`의 고질적인 문제인 '0' 값 수정 불편함을 해결했습니다.
- 포커스 시 '0' 자동 제거, 블러 시 빈 칸 '0' 복구 기능을 지원합니다.
- `inputMode="numeric"`과 정규식 필터링을 통해 숫자 전용 입력 환경을 구축했습니다.

### 2. 투자 기간 슬라이더 최적화
- 슬라이더의 시각적 범위를 30년으로 고정하여 조밀한 조작감을 제공합니다.
- 30년 이상의 기간이 필요한 경우 우측 숫자 입력창을 통해 자유롭게 설정 가능하며, 이때 슬라이더는 최대치(30년)에 머물도록 구현했습니다.

### 3. 금융 연산 및 포맷팅 정밀도 강화
- `SnowballEngine.convertCurrency`에 Banker's Rounding을 적용하여 통화 전환 시 오차를 최소화했습니다.
- `formatKoreanWon` 메서드를 개선하여 '1억 2,500만 원'과 같이 자연스럽고 가독성 높은 한국어 금액 표기를 지원합니다.
- `formatUSD` 메서드에 'Million', 'Billion' 단위를 추가하여 대형 자산 시뮬레이션 시의 가독성을 확보했습니다.

## 테스트 결과
- `SnowballEngine.test.ts`에 통화 환산 및 포맷팅 정밀도 테스트 케이스 4종을 추가하여 100% 통과를 확인했습니다.
- KRW <-> USD 전환 정밀도 및 경계값(1억, 1M 등) 포맷팅 무결성을 검증했습니다.

## Deviations from Plan
None - plan executed exactly as written.

## Self-Check: PASSED
- [x] 입력창 포커스 시 '0' 제거 확인
- [x] 슬라이더 30년 고정 및 직접 입력 overflow 확인
- [x] 통화 환산 및 Big Number 포맷팅 테스트 통과 확인
