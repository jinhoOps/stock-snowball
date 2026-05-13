# Phase 5.3 Summary: Apple-Style Backtest UI

## 작업 내용
- **Apple 스타일 백테스트 대시보드 구현**: `BacktestView.tsx`를 생성하여 `MDD`, `CAGR`, `IRR` 등 백테스트 핵심 지표를 Apple 디자인 시스템 가이드(`DESIGN.md`)에 맞춰 시각화했습니다.
- **visx 기반 BacktestChart 개발**: `SnowballChart.tsx`의 '얼음 질감' 스타일을 계승하면서, 투자 원금(Principal) 라인과 과거 자산 가치 추이를 함께 표시하는 고정밀 차트를 구현했습니다. 스크러빙 인터랙션을 통해 날짜별 상세 수익률 확인이 가능합니다.
- **시뮬레이션 모드 전환 UI**: `SimulationControls.tsx`에 '미래 예측(Projection)'과 '과거 백테스트(Backtest)'를 전환할 수 있는 세그먼트 컨트롤을 추가했습니다. `Framer Motion`을 사용하여 모드 전환 시 부드러운 레이아웃 전환 효과를 적용했습니다.
- **데이터 공급 엔진 연동**: `historicalAssets.ts`에 원본 시계열 데이터를 반환하는 `getHistoricalData` 함수를 추가하여 백테스트 엔진이 실제 과거 데이터를 사용할 수 있도록 연동했습니다.

## 변경 파일
- `src/components/sections/BacktestView.tsx`: 백테스트 대시보드 메인 뷰
- `src/components/charts/BacktestChart.tsx`: visx 기반 과거 데이터 시각화 차트
- `src/components/sections/SimulationControls.tsx`: 모드 전환 스위치 추가
- `src/App.tsx`: 시뮬레이션 모드 상태 관리 및 뷰 통합
- `src/data/historicalAssets.ts`: 과거 데이터 조회 함수 추가
- `package.json`: 버전 Bump (1.0.23 -> 1.0.24)

## 검증 결과
- `npx tsc --noEmit`을 통해 전체 프로젝트의 타입 안정성 확인.
- Projection 모드와 Backtest 모드 간의 UI 전환 로직 정상 작동 확인.

## 다음 단계
- **Phase 5.4**: RxDB를 통한 백테스트 설정의 영속성 구현 및 최종 통합 안정화.
