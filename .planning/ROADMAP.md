# Roadmap: Stock Snowball

## Phases

- [x] **Phase 1: Foundation & Precision Engine** - [Completed] Apple 디자인 시스템 적용 및 고정밀 엔진 시각화 고도화
- [x] **Phase 2: Persistence & PWA** - RxDB를 활용한 로컬 데이터 영속성 및 PWA 모바일 경험 구현
- [x] **Phase 3: Real-world Simulation** - 환율, 세금, 수수료 및 다양한 투자 전략 반영 (진행 중: UI/UX Refinement) (completed 2026-05-12)
- [ ] **Phase 4: Apple Polish & Interactions** - Framer Motion 애니메이션 및 고도화된 스크러빙 UX 완성

## Phase Details

### Phase 1: Foundation & Precision Engine
**Goal**: 금융적 무결성을 갖춘 계산 엔진과 Apple 수준의 프리미엄 UI/UX 기초 구축
**Depends on**: None
**Requirements**: CORE-01, CORE-02, CORE-03, UI-01, UI-02, UI-03, UI-04, VAL-01
**Success Criteria** (what must be TRUE):
  1. `Decimal.js`를 통해 10년 이상의 복리 계산 시 부동 소수점 오차가 발생하지 않음.
  2. Banker's Rounding이 모든 중간 연산 결과에 일관되게 적용됨.
  3. 사용자가 입력한 매일의 불입금이 누적되어 `visx` 차트에 '얼음 질감'의 곡선으로 표시됨.
  4. DESIGN.md의 모든 토큰(컬러, 타이포그래피, 44px 터치 타겟)이 100% 적용됨.
  5. 클릭 가능한 모든 요소에 Apple 스타일의 Scale-down 애니메이션이 적용됨.
**Plans**:
- [x] [01-01-PLAN.md](./phases/01-foundation/01-01-PLAN.md) — Design System & Token Sync
- [x] [01-02-PLAN.md](./phases/01-foundation/01-02-PLAN.md) — Core UI Components Refactoring
- [x] [01-03-PLAN.md](./phases/01-foundation/01-03-PLAN.md) — Advanced Visualization & Interaction Polishing
**UI hint: yes**

### Phase 2: Persistence & PWA
**Goal**: 앱처럼 시나리오를 저장하고 오프라인에서 구동되는 로컬 퍼스트 환경 구축
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, UI-05, PWA-01, PWA-02
**Success Criteria** (what must be TRUE):
  1. 브라우저를 새로고침하거나 오프라인 상태에서도 이전의 투자 시나리오가 유지됨.
  2. 여러 개의 투자 시뮬레이션 시나리오를 이름별로 저장하고 전환할 수 있음.
  3. 모바일 기기의 홈 화면에 설치 가능하며 스플래시 화면이 정상적으로 출력됨.
  4. KPI Grid를 통해 총 자산, 수익률 등의 핵심 지표가 한눈에 요약됨.
**Plans**: 1 plan
- [x] [phase2.md](./plans/phase2.md) — Persistence & PWA Implementation
**UI hint: yes**

### Phase 3: Real-world Simulation
**Goal**: 현실 세계의 변수(환율, 세금, 수수료)를 반영한 실질 수익률 시뮬레이션 및 Apple 미니멀리즘 UX 고도화
**Depends on**: Phase 2
**Requirements**: CORE-04, CORE-05, CORE-06, UI-06
**Success Criteria** (what must be TRUE):
  1. 해외 주식 투자 시 환율 변동 시나리오를 적용하여 세후 원화 가치를 산출할 수 있음.
  2. ISA 등 국내 세제 혜택 및 증권사 수수료가 적용된 시뮬레이션 결과를 제공함.
  3. 정액 적립식 외에 가치 적립식(Value Averaging) 등 다양한 전략 선택이 가능함.
  4. GlobalNav가 로고만 남기고 간소화되며, 입력 UI가 3단계 계층 구조(Primary/Secondary/Tertiary)를 따름.
  5. 과거 자산 데이터(QQQM, QLD 등) 기반의 백테스팅 시뮬레이션을 지원함.
**Plans**: 4 plans
- [x] [phase3.md](./plans/phase3.md) — Taxes, Fees, and Investment Strategies
- [x] [03-01-PLAN.md](./phases/03-real-world/03-01-PLAN.md) — Minimalist Nav & Backtesting Engine
- [x] [03-02-PLAN.md](./phases/03-real-world/03-02-PLAN.md) — Slide-over Panel & Simplified Controls
- [x] [03-03-PLAN.md](./phases/03-real-world/03-03-PLAN.md) — App Integration & 3-Step Hierarchy
**UI hint: yes**

### Phase 4: Apple Polish & Interactions
**Goal**: Apple 수준의 유려한 애니메이션과 인터랙션을 통한 사용자 경험 극대화
**Depends on**: Phase 3
**Requirements**: UI-03, UI-04, VAL-02
**Success Criteria** (what must be TRUE):
  1. 차트 위를 스크러빙할 때 해당 시점의 자산 상세 정보가 부드럽게 실시간 업데이트됨.
  2. 자산 성장에 따른 마일스톤 달성 시 감성적인 축하 애니메이션이 출력됨.
  3. DESIGN.md의 모든 가이드라인(그림자 사용 제한, 간격 등)이 100% 준수됨을 검증함.
**Plans**: [phase4.md](./plans/phase4.md)
**UI hint: yes**

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Precision Engine | 3/3 | Completed | 2026-05-12 |
| 2. Persistence & PWA | 1/1 | Completed | 2026-05-12 |
| 3. Real-world Simulation | 3/3 | Complete   | 2026-05-12 |
| 4. Apple Polish & Interactions | 0/1 | Not started | - |
