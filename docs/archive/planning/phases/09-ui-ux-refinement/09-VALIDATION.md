# Phase 9 Validation Strategy: Advanced Metrics, Comparison & Sharing

본 문서는 Phase 9에서 구현되는 금융 지표 고도화, 다중 자산 비교 및 공유 기능에 대한 검증 전략을 정의합니다. [[System_Integrity_Standard]]에 따라 금융 데이터의 정확성과 UI/UX의 안정성을 보장합니다.

## 1. 검증 대상 및 목표

| 대상 | 검증 목표 | 검증 방법 |
|------|-----------|-----------|
| **변동성 계산 (Volatility)** | 일일 수익률 기반 연율화 변동성(Standard Deviation * sqrt(252))의 정확도 검증 | Unit Test (`vitest`) |
| **기간 제한 로직** | 전체 50년, 일간 30년 제한이 UI와 엔진 레벨에서 강제되는지 확인 | UI Test & Unit Test |
| **다중 자산 비교** | 최대 3개 자산의 데이터 매핑 정합성 및 차트 멀티라인 표시 검증 | Manual/Visual & Logic Check |
| **실질 가치 리베이스** | 인플레이션 반영 실질 가치(Purchasing Power) 계산 로직 검증 | Unit Test (`vitest`) |
| **공유 카드 (Share Card)** | `html-to-image`를 통한 이미지 캡처 성공 여부 및 디자인 정합성 | Visual Verification |

## 2. 자동화된 테스트 계획

### 2.1. 단위 테스트 (Unit Tests)
- `src/core/__tests__/BacktestEngine.test.ts`:
  - 변동성(Volatility) 계산 공식 검증 (알려진 데이터셋 대비 오차 범위 확인).
  - 기간 제한(Duration Limits) 초과 시 엔진의 보정 또는 에러 처리 로직 검증.
- `src/core/__tests__/SnowballEngine.test.ts`:
  - 실질 가치(Real Value) 계산 로직의 정확성 검증 (인플레이션율 적용 후 리베이스 값 확인).

### 2.2. 통합 및 인터페이스 검증 (Integration)
- `BacktestView` <-> `BacktestEngine`:
  - 다중 자산 선택 시 엔진이 각각 독립적으로 호출되고 결과가 올바르게 취합되는지 확인.
  - `npm test src/core/__tests__/Backtesting.test.ts` 활용.

## 3. 수동 검증 및 체크리스트 (UAT)

### 3.1. UI 제약 사항 검증
- [ ] 납입 주기를 '일간'으로 선택했을 때, 투자 기간 슬라이더의 최대값이 30년으로 즉시 변경되는가?
- [ ] 숫자 직접 입력 시 50년(또는 30년)을 초과하는 값을 입력하면 자동으로 최대값으로 보정되는가?

### 3.2. 시각적 정합성 및 공유 기능
- [ ] `SnowballChart`에서 '실질 가치 보기' 토글 시 보조 라인이 정확하게 렌더링되는가?
- [ ] 메인 UI의 'N년 후 예상 자산' 표기가 만 원 단위(KRW)로 간결하게 절삭되어 표시되는가?
- [ ] '성과 공유하기' 버튼 클릭 시 다운로드된 PNG 이미지의 텍스트와 그래프가 깨지지 않고 선명한가?
- [ ] 다중 자산 비교 시 차트의 범례(Legend)와 각 라인의 색상이 일치하는가?

## 4. 정합성 가드레일 (Nyquist Rule)
- 모든 지표 계산 로직은 소수점 8자리 이상의 정밀도를 유지하며 최종 표시 단계에서만 반올림 처리함.
- `package.json`의 버전 정보는 Phase 9 완료 시 반드시 패치 업데이트(+1)되어야 함.
