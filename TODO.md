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

## ✅ Phase 4: Apple Polish & Interactions (Completed)
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

## ✅ Phase 6: Accessibility & Design Refinement (Completed)
- [x] WCAG AA 준수 (`aria-label`, 스크린 리더용 히든 테이블)
- [x] 하드코드된 스타일의 디자인 토큰화 (Typography, Colors)
- [x] Lighthouse 접근성 점수 90점 이상 달성

## ✅ Phase 7: UI/UX & Financial Precision Refinement (Completed)
- [x] **Big Number Helper**: 억/만(KRW), Million/Billion(USD) 단위 실시간 가이드
- [x] **Currency Auto-Conversion**: 원/달러 자동 환산 및 환율 편집 기능
- [x] **NumericInput**: '0' 값 처리 UX 개선 및 모바일 최적화
- [x] **Advanced Settings**: 헤더 톱니바퀴 아이콘을 통한 진입점 일원화
- [x] **Slider UX**: 30년 고정 스케일 및 초과 입력 지원 로직 완성

## ✅ Phase 8: 'What-If' Backtest Evolution & Future Projection Range (Completed)
- [x] **State Isolation**: Projection과 Backtest 상태의 완전한 분리
- [x] **Cone of Uncertainty**: `SnowballEngine`을 통한 미래 예측 범위(낙관/평균/비관) 연산
- [x] **High-Precision Backtesting**: 일/주/월 단위 정밀 백테스팅 및 영업일 분산 로직
- [x] **Multi-Dimensional Visualization**: `visx Area`를 이용한 범위 시각화 및 비교 모드 구현

## ✅ Phase 10: UX Fix & Input Refinement (Completed)
- [x] NumericInput UX 개선 (0 유지, 커서 위치 보존)
- [x] 1억 원 이상 금액 절삭 로직 반영
- [x] '미래 예측' -> '스노우볼' 리브랜딩 적용
- [x] '공유(이미지)' 기능 고도화 및 버튼 텍스트 최적화
- [x] `localStorage`를 통한 통화 및 환율 설정 영속화

