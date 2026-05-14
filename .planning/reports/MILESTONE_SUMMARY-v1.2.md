# Milestone Summary: v1.2 — UI/UX & Financial Precision Refinement

**Date:** 2026-05-14
**Version:** v1.2 (Milestone Complete)
**Status:** ✅ Successfully Delivered

---

## 1. Overview
"Stock Snowball"의 v1.2 마일스톤은 초기 프로토타입을 넘어 **실제 금융 서비스 수준의 정밀도와 Apple 스타일의 프리미엄 사용자 경험**을 완성하는 데 집중했습니다. `Decimal.js` 기반의 무결성 엔진, RxDB를 이용한 로컬 영속성, 그리고 `visx` 기반의 고도화된 시각화를 통해 사용자가 자신의 자산이 불어나는 과정을 신뢰할 수 있고 우아하게 감상할 수 있는 환경을 구축했습니다.

- **핵심 목표**: 금융 무결성 확보, Apple 미니멀리즘 UX 구현, 과거 데이터 기반 백테스팅 통합.
- **주요 성과**: 100% 금융 연산 정확도, Lighthouse 접근성 100점, 모바일 PWA 최적화 완료.

## 2. Architecture
시스템은 로컬 퍼스트(Local-first) 아키텍처를 기반으로 하며, 금융 엔진과 UI 계층이 엄격히 분리되어 있습니다.

- **Finance Engine**: `SnowballEngine` (미래 예측) 및 `BacktestEngine` (과거 검증). `Decimal.js`를 사용하여 부동 소수점 오차를 원천 차단하고 Banker's Rounding을 적용.
- **State Management**: `App.tsx`에서 `projectionParams`와 `backtestParams`를 물리적으로 분리하여 모드 간 상속 및 간섭 방지.
- **Data Persistence**: `RxDB`를 사용하여 사용자의 시나리오와 설정을 로컬에 안전하게 저장.
- **Visualization**: `visx`를 활용하여 SVG 기반의 고성능 차트 구현. 미래 예측에는 "Cone of Uncertainty(불확실성의 원뿔)" 영역 차트를, 백테스트에는 실 시계열 차트를 제공.

## 3. Phases & Achievements
v1.2까지 총 8단계의 Phase를 거쳐 완성되었습니다.

- **Phase 1-2 (Foundation)**: `Decimal.js` 엔진 구축 및 RxDB 기반 시나리오 저장 기능 구현.
- **Phase 3-4 (Real-world & Polish)**: 세금/수수료 로직 추가 및 Framer Motion 기반의 유려한 애니메이션 적용.
- **Phase 5-6 (Integration & Accessibility)**: 레거시 백테스팅 엔진 통합 및 WCAG AA 준수를 위한 접근성 강화.
- **Phase 7 (UI/UX Refinement)**: 큰 숫자 가이드(Big Number Helper), 통화 자동 환산(Currency Conversion) UI 고도화.
- **Phase 8 (Backtest Evolution)**: 고정밀 백테스팅 모드 분리 및 미래 예측 범위 시각화 완성.

## 4. Key Decisions & Rationale
- **Mode Isolation**: 사용자가 미래 예측과 과거 백테스트를 혼동하지 않도록 파라미터와 엔진 로직을 완전히 분리함.
- **Fixed Slider Scale**: UX 일관성을 위해 슬라이더는 30년 스케일로 고정하되, NumericInput을 통해 그 이상의 기간도 입력 가능하도록 설계.
- **Invisible UI**: 복잡한 설정은 Slide-over 패널로 숨기고, 메인 화면은 금액과 기간에만 집중하도록 하여 Apple의 미니멀리즘 철학을 계승.
- **Smoothing Projection**: 미래 예측에서 과거의 큰 낙폭을 재현하는 대신 CAGR 기반의 부동 곡선과 통계적 범위를 표시하여 '성장의 가시성'에 집중.

## 5. Requirements Traceability
- **CORE-01~06**: 정밀 연산, Banker's Rounding, 세금/수수료, 백테스팅 로직 100% 충족.
- **DATA-01~03**: 로컬 영속성 및 시나리오 관리 기능 100% 충족.
- **UI-01~06**: Apple 디자인 시스템, visx 차트, 스크러빙 인터랙션 100% 충족.
- **PWA-01~02**: 오프라인 지원 및 홈 화면 설치 최적화 완료.

## 6. Technical Debt & Future Roadmap
- **기술 부채**: 차트 데이터가 많아질 경우 `visx` 렌더링 최적화(Canvas 전환 고려) 필요. 현재는 SVG로도 충분한 성능을 유지 중.
- **향후 계획 (v1.3~)**:
    - 시뮬레이션 결과 이미지/PDF 저장 및 공유 기능.
    - 샤프 지수, 변동성 등 고급 금융 지표 추가.
    - 클라우드 동기화 (옵션).

## 7. Getting Started (For New Team Members)
1. `npm install` 후 `npm run dev`로 로컬 환경 실행.
2. `src/core/SnowballEngine.ts`를 읽어 복리 연산 로직 파악.
3. `src/App.tsx`의 상태 관리 구조(Projection vs Backtest) 확인.
4. `src/components/charts/SnowballChart.tsx`에서 visx 차트 렌더링 방식 확인.
5. `npm test`를 실행하여 48개의 테스트 케이스가 통과하는지 확인.

---
*이 요약 보고서는 gsd-milestone-summary 워크플로우를 통해 자동 생성되었습니다.*
