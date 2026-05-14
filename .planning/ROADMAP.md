# Roadmap: Stock Snowball

## Phases

- [x] **Phase 1: Foundation & Precision Engine** - [Completed] Apple 디자인 시스템 적용 및 고정밀 엔진 시각화 고도화
- [x] **Phase 2: Persistence & PWA** - RxDB를 활용한 로컬 데이터 영속성 및 PWA 모바일 경험 구현
- [x] **Phase 3: Real-world Simulation** - 환율, 세금, 수수료 및 다양한 투자 전략 반영 (진행 중: UI/UX Refinement) (completed 2026-05-12)
- [x] **Phase 4: Apple Polish & Interactions** - Framer Motion 애니메이션 및 고도화된 스크러빙 UX 완성 (completed 2026-05-13)
- [x] **Phase 6: Accessibility & Design Refinement** - WCAG AA 준수 및 디자인 토큰 정합성 확보 (디자인 부채 해결)
- [x] **Phase 7: UI/UX & Financial Precision Refinement** - [Completed] 입력 편의성 개선, 통화 자동 환산 및 고급 설정 UI 고도화 (completed 2026-05-13)
- [x] **Phase 8: 'What-If' Backtest Evolution & Future Projection Range** - [Completed] Decoupled high-precision backtesting with historical presets and future "Cone of Uncertainty" (completed 2026-05-14)
- [ ] **Phase 9: Advanced Metrics, Comparison & Sharing** - 연율화된 변동성, 다중 자산 비교 및 Apple 스타일 공유 카드 기능 구현

## Phase Details

### Phase 9: Advanced Metrics, Comparison & Sharing
**Goal**: 금융 지표 고도화(변동성), 다중 자산 비교 기능 및 Apple 스타일의 공유 카드 시스템 구축.
**Depends on**: Phase 8
**Requirements**: REQ-09-01, REQ-09-02, REQ-09-03, REQ-09-04, REQ-09-05, REQ-09-06
**Success Criteria**:
  1. 백테스트 결과에 연율화된 변동성(Volatility) 지표가 포함됨.
  2. 성능 보호를 위해 투자 기간 제한(50년, 일간 30년)이 적용됨.
  3. 최대 3개 자산을 선택하여 백테스트 성과를 동일 차트에서 비교 가능함.
  4. SnowballChart에서 실질 가치(인플레이션 반영) 리베이스 토글 지원.
  5. `html-to-image`를 활용한 고품질 성과 공유 카드 생성 기능 구현.
**Plans**: 3 plans
- [ ] [09-01-PLAN.md](./phases/09-ui-ux-refinement/09-01-PLAN.md) — Metrics & Constraints (Engine & Logic)
- [ ] [09-02-PLAN.md](./phases/09-ui-ux-refinement/09-02-PLAN.md) — Multi-Asset Backtest Comparison (UI/UX)
- [ ] [09-03-PLAN.md](./phases/09-ui-ux-refinement/09-03-PLAN.md) — Real-Value Rebase & Share Card (Polish)

### Phase 8: 'What-If' Backtest Evolution & Future Projection Range
**Goal**: Decoupled, high-precision 'What-if' backtesting system implementation with historical scenario presets and future "Cone of Uncertainty" range visualization.
**Depends on**: Phase 7
**Requirements**: CORE-06, DATA-02, UI-02, UI-06
**Success Criteria**:
  1. Projection and Backtest parameter states are fully decoupled.
  2. SnowballEngine calculates Median CAGR and generates pessimistic/average/optimistic series (Cone).
  3. BacktestEngine supports Daily/Weekly/Monthly cycles with Tax and Fee logic parity.
  4. Both engines distribute contributions across 21 business days.
  5. Chart supports 'Comparison Mode' and visualizes the future range using visx Area.
**Plans**: 4 plans
- [x] [08-01-PLAN.md](./phases/08-backtest-evolution/08-01-PLAN.md) — State Isolation & Scenario UI
- [x] [08-02-PLAN.md](./phases/08-backtest-evolution/08-02-PLAN.md) — Engine Evolution - Future Projection & Median CAGR
- [x] [08-03-PLAN.md](./phases/08-backtest-evolution/08-03-PLAN.md) — Engine Evolution - Precision Backtesting
- [x] [08-04-PLAN.md](./phases/08-backtest-evolution/08-04-PLAN.md) — Multi-Dimensional Visualization & Finalization

... (rest of phases)

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Precision Engine | 3/3 | Completed | 2026-05-12 |
| 2. Persistence & PWA | 1/1 | Completed | 2026-05-12 |
| 3. Real-world Simulation | 3/3 | Completed | 2026-05-12 |
| 4. Apple Polish & Interactions | 2/2 | Completed | 2026-05-13 |
| 5. Legacy Integration (migrated) | 4/4 | Completed | 2026-05-13 |
| 6. Accessibility & Design Refinement | 2/2 | Completed | 2026-05-13 |
| 7. UI/UX & Financial Precision | 3/3 | Completed | 2026-05-13 |
| 8. 'What-If' Backtest Evolution | 4/4 | Completed | 2026-05-14 |
| 9. Advanced Metrics & Sharing | 0/3 | Planned | - |
