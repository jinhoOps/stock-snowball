# Phase 1 Redesign Overview: Apple High-Fidelity Refinement

Phase 1을 `DESIGN.md` 및 `PHASE1_DESIGN_REFINEMENT.md`에 정의된 Apple의 프리미엄 디자인 시스템에 맞춰 고도화하기 위한 실행 계획 개요입니다.

## 핵심 목표
1. **디자인 시스템 동기화**: Tailwind 설정 및 글로벌 CSS를 Apple 표준(Typography, Colors, Spacing)으로 업데이트.
2. **UI 컴포넌트 리팩터링**: GlobalNav, KPI Grid, Buttons/Inputs의 형태와 인터랙션 고도화.
3. **시각화 엔진 업그레이드**: `SnowballChart`를 'Crystal Chart'(얼음 질감, 글로우 효과) 스타일로 개선.
4. **애니메이션 도입**: Framer Motion을 활용한 'Scale-down' 효과 및 부드러운 전환 전역 적용.

## 상세 실행 계획 (Execution Plans)

본 설계는 병렬 실행 및 점진적 검증을 위해 3개의 세부 계획으로 분할되었습니다:

1. **[01-01-PLAN.md](../phases/01-foundation/01-01-PLAN.md)**: Foundation Design System & Token Sync
   - Tailwind Config 및 index.css 업데이트.
2. **[01-02-PLAN.md](../phases/01-foundation/01-02-PLAN.md)**: Core UI Components Refactoring
   - GlobalNav, KPIGrid, Buttons/Inputs 리팩터링.
3. **[01-03-PLAN.md](../phases/01-foundation/01-03-PLAN.md)**: Advanced Visualization & Interaction Polishing
   - SnowballChart 고도화 및 글로벌 애니메이션 적용.

## 로드맵 업데이트
`ROADMAP.md`의 Phase 1 상태가 **[Redesigning]**으로 업데이트되었으며, 위 세부 계획들의 완료 여부에 따라 진행 상황이 관리됩니다.
