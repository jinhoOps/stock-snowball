# Roadmap: Stock Snowball

## Phases

- [x] **Phase 1: Foundation & Precision Engine** - [Completed] Apple 디자인 시스템 적용 및 고정밀 엔진 시각화 고도화
- [x] **Phase 2: Persistence & PWA** - RxDB를 활용한 로컬 데이터 영속성 및 PWA 모바일 경험 구현
- [x] **Phase 3: Real-world Simulation** - 환율, 세금, 수수료 및 다양한 투자 전략 반영 (진행 중: UI/UX Refinement) (completed 2026-05-12)
- [x] **Phase 4: Apple Polish & Interactions** - Framer Motion 애니메이션 및 고도화된 스크러빙 UX 완성 (completed 2026-05-13)
- [x] **Phase 6: Accessibility & Design Refinement** - WCAG AA 준수 및 디자인 토큰 정합성 확보 (디자인 부채 해결)
- [ ] **Phase 7: UI/UX & Financial Precision Refinement** - 입력 편의성 개선, 통화 자동 환산 및 고급 설정 UI 고도화

## Phase Details

### Phase 7: UI/UX & Financial Precision Refinement
**Goal**: 자산 및 납입액 입력 UX를 개선하고, 환율 기반 통화 전환 및 고정밀 연산을 통해 현실적인 투자 시뮬레이션 경험 제공.
**Depends on**: Phase 6
**Requirements**: CORE-04, UI-01, UI-06
**Success Criteria**:
  1. 입력창 하단에 억/만(KRW) 또는 Million/Billion(USD) 단위 실시간 가이드 표시.
  2. 원/달러 통화 전환 시 기존 입력값의 자동 환산 및 환율(기본 1450원) 편집 기능 구현.
  3. 투자 기간 슬라이더의 30년(100%) 고정 스케일 및 초과 입력 지원.
  4. 헤더 바 우측 톱니바퀴 아이콘을 통한 고급 설정 접근성 개선.
  5. 입력창의 '0' 값 처리 UX 개선 및 일/주/월 주기에 따른 동적 레이블 적용.
**Plans**: 3 plans
- [ ] [07-01-PLAN.md](./phases/07-ui-ux-refinement/07-01-PLAN.md) — Currency & Big Number Helper
- [ ] [07-02-PLAN.md](./phases/07-ui-ux-refinement/07-02-PLAN.md) — Advanced Settings UI & Dynamic Labels
- [ ] [07-03-PLAN.md](./phases/07-ui-ux-refinement/07-03-PLAN.md) — Precision Engine & Slider UX Polish

### Phase 6: Accessibility & Design Refinement
**Goal**: Phase 5 UI Review에서 발견된 접근성 블록커를 해결하고, 하드코드된 스타일을 토큰화하여 시스템 무결성 완성.
**Depends on**: Phase 5
**Requirements**: UI-01, UI-04, VAL-02
**Success Criteria**:
  1. 모든 버튼 및 차트 영역에 `aria-label` 적용 (스크린 리더 가독성 확보).
  2. 시각 장애 사용자를 위한 차트 데이터 Hidden Table 제공.
  3. 모든 하드코드된 hex 컬러를 `apple-` 테마 토큰으로 전환.
  4. 디자인 시스템 기반의 타이포그래피 스케일(10px~13px → 정식 토큰) 준수.
  5. Lighthouse 접근성 점수 90점 이상 달성.
**Plans**: 2 plans
- [x] [06-01-PLAN.md](./phases/06-accessibility-refinement/06-01-PLAN.md) — Accessibility Foundation & SR-only Tables
- [x] [06-02-PLAN.md](./phases/06-accessibility-refinement/06-02-PLAN.md) — Design Tokenization & Typography Alignment

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
**Plans**:
- [x] [04-01-PLAN.md](./phases/04-apple-polish/04-01-PLAN.md) — Animated Counter & Transition Polish
- [x] [04-04-PLAN.md](./phases/04-apple-polish/04-04-PLAN.md) — Performance Optimization & Bundle Splitting
**UI hint: yes**

### Phase 5: Legacy Integration (migrated-from-ISF)
**Goal**: 이전 프로젝트(ISF)의 백테스팅 기능을 고정밀 엔진 및 Apple UI로 흡수 통합
**Depends on**: Phase 4
**Requirements**: CORE-06, DATA-02, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. `Decimal.js` 기반의 고정밀 백테스팅 엔진이 구현되어 historical data 기반의 MDD, CAGR, IRR을 산출함.
  2. Apple 디자인 시스템이 적용된 백테스팅 전용 대시보드와 KPI 그리드가 제공됨.
  3. 사용자가 시나리오 설정에서 'Projection'과 'Backtest' 모드를 유연하게 전환할 수 있음.
  4. 과거 배당 데이터가 반영된 Total Return(TR) 시뮬레이션 결과가 `visx` 차트에 표시됨.
**Plans**: 4 plans
- [x] [05-01-PLAN.md](./phases/05-migrated-from-isf/05-01-PLAN.md) — Legacy Audit & Interface Alignment
- [x] [05-02-PLAN.md](./phases/05-migrated-from-isf/05-02-PLAN.md) — High-Precision Backtest Engine
- [x] [05-03-PLAN.md](./phases/05-migrated-from-isf/05-03-PLAN.md) — Apple-Style Backtest UI
- [x] [05-04-PLAN.md](./phases/05-migrated-from-isf/05-04-PLAN.md) — Persistence & Final Integration

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Precision Engine | 3/3 | Completed | 2026-05-12 |
| 2. Persistence & PWA | 1/1 | Completed | 2026-05-12 |
| 3. Real-world Simulation | 3/3 | Completed | 2026-05-12 |
| 4. Apple Polish & Interactions | 2/2 | Completed | 2026-05-13 |
| 5. Legacy Integration (migrated) | 4/4 | Completed | 2026-05-13 |
| 6. Accessibility & Design Refinement | 2/2 | Completed | 2026-05-13 |
| 7. UI/UX & Financial Precision | 2/3 | In Progress|  |
