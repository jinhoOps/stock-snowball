# Roadmap: Stock Snowball

## Phases

- [x] **Phase 1: Foundation & Precision Engine** - [Completed] Apple 디자인 시스템 적용 및 고정밀 엔진 시각화 고도화
- [x] **Phase 2: Persistence & PWA** - RxDB를 활용한 로컬 데이터 영속성 및 PWA 모바일 경험 구현
- [x] **Phase 3: Real-world Simulation** - 환율, 세금, 수수료 및 다양한 투자 전략 반영 (진행 중: UI/UX Refinement) (completed 2026-05-12)        
- [x] **Phase 4: Apple Polish & Interactions** - Framer Motion 애니메이션 및 고도화된 스크러빙 UX 완성 (completed 2026-05-13)
- [x] **Phase 6: Accessibility & Design Refinement** - WCAG AA 준수 및 디자인 토큰 정합성 확보 (디자인 부채 해결)
- [x] **Phase 7: UI/UX & Financial Precision Refinement** - [Completed] 입력 편의성 개선, 통화 자동 환산 및 고급 설정 UI 고도화 (completed 2026-05-13)
- [x] **Phase 8: 'What-If' Backtest Evolution & Future Projection Range** - [Completed] Decoupled high-precision backtesting with historical presets and future "Cone of Uncertainty" (completed 2026-05-14)
- [x] **Phase 10: UX Fix & Input Refinement** - [Completed] 입력 편의성 개선, 납입액 시각화 및 이미지 공유 기능 고도화 (completed 2026-05-15)
- [x] **Phase 11: Advanced Metrics, Comparison & Sharing** - [Completed] 연율화된 변동성, 다중 자산 비교 및 Apple 스타일 공유 카드 기능 구현 (completed 2026-05-15)

## Phase Details

### Phase 10: UX Fix & Input Refinement
**Goal**: 입력 UX 고도화, 대형 금액 포맷팅 최적화 및 Apple 스타일의 성과 공유 기능 구현.
**Depends on**: Phase 8
**Requirements**: UI-01, UI-05, UI-06, CORE-01, REQ-09-06
**Success Criteria**:
  1. NumericInput 포커스 시 전체 선택되지 않고 커서 이동이 가능함.
  2. 1억 원 이상의 금액에서 1만 원 미만 단위가 자동 절삭되어 가독성 향상.
  3. KPI Grid와 Share Card에 납입 주기(일/주/월)가 포함된 납입액 카드가 추가됨.
  4. USD 입력 필드 하단에 환율 정보 및 KRW 환산 헬퍼 텍스트가 표시됨.
  5. `html-to-image`를 활용한 성과 이미지 저장 기능이 정상 동작함.
**Plans**: 1 plan
- [x] [10-01-PLAN.md](./phases/10-ux-fix-refinement/10-01-PLAN.md) — UX Inputs, Engine Logic & Image Sharing

### Phase 11: Advanced Metrics, Comparison & Sharing
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
- [x] [09-01-PLAN.md](./phases/09-ui-ux-refinement/09-01-PLAN.md) — Metrics & Constraints (Engine & Logic)
- [x] [09-02-PLAN.md](./phases/09-ui-ux-refinement/09-02-PLAN.md) — Multi-Asset Backtest Comparison (UI/UX)
- [x] [09-03-PLAN.md](./phases/09-ui-ux-refinement/09-03-PLAN.md) — Real-Value Rebase & Share Card (Polish)

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
| 10. UX Fix & Input Refinement | 1/1 | Completed | 2026-05-15 |
| 11. Advanced Metrics & Sharing | 3/3 | Completed | 2026-05-15 |
