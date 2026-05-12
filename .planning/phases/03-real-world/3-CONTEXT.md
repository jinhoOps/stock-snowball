# Phase 3 & 4 UI/UX Refinement Context

## 🎯 Goal
현실적인 투자 시뮬레이션을 제공하되, 사용자가 가장 먼저 마주하는 경험을 극도로 단순화하고(Apple-style Minimalism), 필요할 때만 강력한 기능을 꺼내 쓸 수 있는 구조로 개편.

## 🛠️ Implementation Decisions

### 1. Minimalist Header (GlobalNav)
- **Action**: 모든 더미 메뉴 및 아이콘(검색, 장바구니) 제거.
- **Components**: 좌측 Snowball 로고(Snowflake 아이콘)만 유지. 우측에는 필요한 경우 최소한의 안내 아이콘만 배치 가능하나 기본은 공백.
- **Style**: 44px height, `backdrop-blur-md`, `bg-apple-surface-black/80`.

### 2. Input Hierarchy (Progressive Disclosure)
- **1순위 (Primary)**: 투자 금액 및 주기 ([매일/매주/매월] + 금액 입력). 화면 중앙에 대형 문장형 UI로 배치.
- **2순위 (Secondary)**: 투자 기간 (Slider 또는 Number Input).
- **3순위 (Tertiary)**: "고급 설정" 버튼을 통해 진입. 연이율(기대 수익률), 계좌 유형, 전략 선택 등을 포함.

### 3. Advanced Options Panel (Slide-over)
- **UI Interaction**: "고급 설정" 클릭 시 Apple 스타일의 **Slide-over 패널** 노출.
- **Platform Adaptation**: 
  - 데스크탑: 우측에서 슬라이드 인 (Right Sheet).
  - 모바일: 하단에서 슬라이드 업 (Bottom Sheet).
- **Style**: Frosted glass 효과, Pill-shaped handle (모바일), `framer-motion`을 활용한 유연한 진입/퇴장.

### 4. Backtesting-based Return Engine
- **Data Source**: Nasdaq 계열(QQQM, QLD, TQQQ) 및 KOSPI의 일간 종가 데이터셋 구축 (Mock 또는 Local JSON).
- **Function**: 단순 고정 수익률 입력 대신, 실제 과거 자산 데이터에 기반한 기대 수익률 시뮬레이션 기능 제공.
- **Strategy**: 메인 UI는 '적립식'으로 고정. '가치 평균법' 등은 고급 설정 내에서 선택 가능하게 하되 초기엔 비활성화/숨김 처리.

## 📋 Success Criteria for Downstream Agents
1. `GlobalNav.tsx`에서 불필요한 모든 요소가 제거되었는가?
2. `SimulationControls.tsx`가 Primary/Secondary 입력만 남기고 간소화되었는가?
3. Slide-over 패널이 구현되어 모든 고급 변수(수익률, 계좌 등)를 수용하는가?
4. 시뮬레이션 엔진이 자산별 기대 수익률 프리셋을 지원하는가?

## 🚫 Constraints & Decisions Locked
- **No standard modals**: 모든 설정은 Slide-over Sheet 또는 인라인 전환으로 처리.
- **No complex strategy in Hero**: 메인은 반드시 '적립식' 문구 사용.
- **Strict Apple Color Palette**: #0066cc (Action Blue), #f5f5f7 (Canvas).
