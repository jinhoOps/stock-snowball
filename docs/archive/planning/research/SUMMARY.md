# Research Summary: Stock Snowball

## Executive Summary

Stock Snowball은 매일의 소액 투자가 복리의 힘을 통해 거대한 자산으로 성장하는 과정을 시각화하고 관리하는 **"Apple 스타일의 고정밀 투자 시뮬레이션 플랫폼"**입니다. 기존 시장의 계산기들이 제공하지 못하는 **금융적 정밀도(Precision)**와 **감성적인 사용자 경험(Emotional UX)**의 결합을 통해, 사용자가 장기 투자의 가치를 손끝으로 체감하고 습관화하도록 돕는 것을 목표로 합니다.

본 연구를 통해 도출된 핵심 전략은 '정교한 금융 엔진'과 '로컬 퍼스트 아키텍처', 그리고 'Apple 디자인 가이드라인'의 철저한 준수입니다. `Decimal.js`를 통한 1원의 오차 없는 계산, `RxDB`를 통한 즉각적인 반응성 및 데이터 보안, 그리고 `visx`를 활용한 유려한 데이터 시각화를 통해 단순한 도구를 넘어선 '금융 갤러리'와 같은 경험을 제공할 것입니다.

## Key Findings

### 1. 기술 스택 및 아키텍처 (STACK.md & ARCHITECTURE.md)
- **정밀 연산:** 부동 소수점 오차 제거를 위해 `Decimal.js`를 필수 사용하며, 통계적 편향을 방지하는 **Banker's Rounding**을 표준으로 채택합니다.
- **로컬 퍼스트:** `RxDB (IndexedDB)`를 사용하여 오프라인에서도 즉각적인 반응성을 보장하고, 민감한 금융 데이터는 클라이언트 측에서 암호화하여 저장합니다.
- **계층형 구조:** 순수 함수 기반의 `Core Engine`, 시나리오를 관리하는 `Strategy Layer`, Apple UI 시스템을 구현하는 `UI Layer`로 명확히 분리하여 무결성과 확장성을 확보합니다.

### 2. 주요 기능 및 차별화 요소 (FEATURES.md & market_analysis.md)
- **Daily Snowball:** '매월'이 아닌 **'매일'** 단위의 소액 투자를 기본 시나리오로 강조하여 복리 효과를 극대화하여 시각화합니다.
- **현실적 시뮬레이션:** 단순 수익률 계산을 넘어 환율 변동성, 증권사 수수료, 세금(ISA 등)을 반영한 '실질 세후 수익'을 산출합니다.
- **시나리오 비교:** 여러 투자 전략(예: 국내 주식 vs 해외 주식)을 한 눈에 비교할 수 있는 다중 데이터셋 시각화를 제공합니다.

### 3. 시각화 및 UX 전략 (visualization_strategy.md & pwa_data_strategy.md)
- **Tactile Exploration:** `visx` 기반의 정교한 스크러빙(Scrubbing) 인터랙션을 통해 사용자가 과거와 미래의 자산 궤적을 손끝으로 탐험하게 합니다.
- **Apple Minimalist:** SF Pro 타이포그래피, Action Blue 포인트 컬러, 유려한 `curveMonotoneX` 곡선을 사용하여 복잡한 데이터를 명료하게 전달합니다.
- **Native-like PWA:** iOS 맞춤형 스플래시 화면, 홈 화면 아이콘, 그리고 서비스 워커를 통한 즉각적인 앱 구동 환경을 구축합니다.

### 4. 주요 위험 요소 및 방어 전략 (PITFALLS.md & financial_accuracy.md)
- **누적 오차:** 모든 중간 계산에서 높은 정밀도를 유지하고 최종 단계에서만 반올림을 수행하여 오차 확산을 방지합니다.
- **데이터 보안:** `Web Crypto API`를 이용한 필드 레벨 암호화를 통해 사용자 자산 정보의 기밀성을 유지합니다.
- **복잡도 제어:** 국가별 세법 등 과도한 엔지니어링이 우려되는 부분은 프리셋과 사용자 직접 입력 방식을 병행하여 유연성을 확보합니다.

## Implications for Roadmap

### Suggested Phase Structure

1.  **Phase 1: Precision Engine & Basic Charts (The Foundation)**
    - **Rationale:** 신뢰의 기반인 정확한 계산 엔진과 핵심 시각화 기능을 먼저 구축합니다.
    - **Deliverables:** `Decimal.js` 기반 엔진, `visx` 기초 차트, 정기 불입 로직.
2.  **Phase 2: Persistence & PWA (The Product)**
    - **Rationale:** 계산기를 넘어 사용자가 시나리오를 저장하고 앱처럼 쓸 수 있는 환경을 구축합니다.
    - **Deliverables:** `RxDB` 연동, PWA 설정, 시나리오 저장/불러오기.
3.  **Phase 3: Real-world Simulation (The Differentiator)**
    - **Rationale:** 환율, 세금, 수수료 등 현실적인 변수를 추가하여 경쟁력을 확보합니다.
    - **Deliverables:** 세금/수수료 엔진, 환율 시뮬레이션 모듈.
4.  **Phase 4: Apple Polish & Interactions (The Experience)**
    - **Rationale:** Apple 수준의 감성적인 애니메이션과 인터랙션을 완성하여 팬덤을 형성합니다.
    - **Deliverables:** `Framer Motion` 애니메이션, 눈덩이 성장 마커, 고도화된 스크러빙 경험.

### Research Flags
- **중점 연구 필요:** Phase 3의 국가별 세금 프리셋 및 환율 데이터 연동 방식.
- **표준 패턴 활용:** Phase 1의 복리 엔진 및 Phase 2의 PWA/RxDB 설정은 기존 연구 데이터로 충분히 구현 가능.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | 금융권 및 PWA 표준 스택을 채택하여 기술적 위험이 낮음. |
| **Features** | HIGH | 시장 분석을 통해 명확한 UVP를 도출하였으며 우선순위가 뚜렷함. |
| **Architecture** | HIGH | 계층형 아키텍처와 로컬 퍼스트 전략이 프로젝트 목적에 부합함. |
| **Pitfalls** | HIGH | 금융 소프트웨어에서 발생할 수 있는 주요 오차 및 보안 문제를 선제적으로 파악함. |

**Gaps:** 실시간 환율 API의 비용 및 쿼터 제한 문제는 실제 구현 단계에서 구체적인 프로바이더 선정이 필요함.

## Sources
- STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
- financial_accuracy.md, visualization_strategy.md, pwa_data_strategy.md, market_analysis.md
- Apple Human Interface Guidelines (Design Principles)
