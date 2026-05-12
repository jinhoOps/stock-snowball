# Phase 3 Plan: Real-world Simulation

**Goal**: 현실 세계의 변수(환율, 세금, 수수료)를 반영한 실질 수익률 시뮬레이션

## Must-Haves
- [ ] 세금(ISA, 배당소득세) 및 증권사 수수료 연산 모듈
- [ ] 환율 변동성 시뮬레이션 엔진 (원화 가치 환산)
- [ ] 투자 전략 확장 (Value Averaging, Rebalancing 시뮬레이션)
- [ ] 다중 시나리오 비교 차트 (Comparison Chart)
- [ ] 국가별/자산별 프리셋(Presets) 데이터 구축

## Task List

### 3.1 Realistic Finance Modules
- [ ] 세금 계산 엔진 구현: 일반 계좌 vs ISA 계좌 혜택 시뮬레이션
- [ ] 매수/매도 수수료 누적 로직 구현
- [ ] 실질 세후 수익률(Post-tax Returns) 지표 추가

### 3.2 Currency & Strategy Extension
- [ ] 해외 자산용 환율 고정/변동 시나리오 모듈 개발
- [ ] 투자 전략 엔진 고도화: 정액 적립식 외 3종 전략 추가
- [ ] 인플레이션 반영 실질 가치 계산 기능

### 3.3 Comparative Visualization
- [ ] 여러 시나리오를 한 차트에 오버레이하는 기능
- [ ] 시나리오별 성과 격차 데이터 요약 테이블
- [ ] 비교 분석용 공유 이미지 생성 기능 (선택 사항)

### 3.4 Settings Panel & Toggles
- [ ] 뷰포트/표기 토글 제어 (원/달러, 실질/명목, 매일/매주/매월)
- [ ] 변수 설정 입력 폼 (기준금리, 적용 환율)
- [ ] 백테스트 vs 시나리오 모드 전환 및 데이터셋 로딩 (QQQM 등)

## Success Criteria
1. 세금과 수수료를 포함한 최종 자산이 정확하게 산출됨.
2. 환율 변동에 따른 환차익/환차손이 시뮬레이션 결과에 반영됨.
3. 서로 다른 두 가지 투자 전략을 한 화면에서 즉시 비교 가능함.
