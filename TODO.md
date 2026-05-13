# ❄️ Stock Snowball Project Backlog

매일 꾸준히 투자하여 자산의 눈덩이를 키워나가는 '자동 매수 계산기' 프로젝트의 여정입니다.

## ✅ Phase 1: Foundation & Precision Engine (Completed)
- [x] `Decimal.js` 기반 고정밀 복리 엔진 구현
- [x] Apple 디자인 시스템 가이드 및 토큰 적용
- [x] `visx` 기반 '얼음 질감' 차트 시각화

## ✅ Phase 2: Persistence & PWA (Completed)
- [x] RxDB를 활용한 로컬 퍼스트 데이터 영속성
- [x] 여러 투자 시나리오 저장 및 관리 기능
- [x] PWA 모바일 최적화 (iOS 메타 태그, 설치 지원)

## ✅ Phase 3: Real-world Simulation (Completed)
- [x] 세금(ISA, 배당세) 및 수수료 연산 엔진
- [x] 환율 변동성 및 인플레이션 반영 로직
- [x] 다중 시나리오 비교 오버레이 차트
- [x] **UI/UX 단순화 (Apple Minimalism)**
    - [x] GlobalNav: 모든 메뉴 제거 및 로고만 유지
    - [x] Hero Input: 3단계 계층 구조 (금액/주기 -> 기간 -> 고급설정)
    - [x] Settings: Slide-over 패널 (데스크탑: 우측, 모바일: 하단)
- [x] **자산 백테스팅 데이터 엔진**
    - [x] QQQM, QLD, TQQQ, KOSPI 일간 종가 데이터셋 구축
    - [x] 자산 기반 기대수익률 시뮬레이션 로직 구현

## 🏗️ Phase 4: Apple Polish & Interactions (In-Progress)
- [x] **Smooth Numeric Transitions**: `AnimatedCounter` 기반 수치 애니메이션
- [x] **Layout Transitions**: `AnimatePresence` 기반 화면 전환 효과
- [x] **Milestone Celebration**: 자산 목표 달성 시 축하 UI (Confetti)
- [x] Framer Motion 기반 고도화된 스크러빙 UX
- [x] 전반적인 마감(Polish) 및 인터랙션 최적화
- [x] Phase 4.4: 성능 최적화 (차트 렌더링 부하 감소 및 번들 사이즈 최적화)

## ✅ Phase 5: Legacy Integration (migrated-from-ISF) (Completed)
- [x] Phase 5.1: Legacy Components & Engine Audit
- [x] Phase 5.2: 고정밀 백테스팅 엔진 구현
- [x] Phase 5.3: Apple 스타일 백테스트 UI 구현
- [x] Phase 5.4: 데이터 영속성 및 최종 통합
