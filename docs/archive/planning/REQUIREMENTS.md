<!-- generated-by: gsd-doc-writer -->
# Requirements: Stock Snowball

## Project Core Value
매일의 소액 투자가 복리의 힘을 통해 거대한 자산으로 성장하는 과정을 시각화하고 관리하는 고정밀 투자 시뮬레이션 플랫폼. (Apple 스타일 UX + 금융 무결성)

## Core Requirements & Features

### [CORE] 금융 연산 엔진 (High-Precision Engine)
- **CORE-01**: `Decimal.js`를 사용한 부동 소수점 오차 없는 고정밀 연산 구현.
- **CORE-02**: 통계적 편향을 방지하는 **Banker's Rounding** (오사오입) 적용.
- **CORE-03**: '매일/매주/매월' 단위의 복리 계산 및 불입 시뮬레이션 지원 (납입 주기 유연성).
- **CORE-04**: 환율 변동성, 증권사 수수료, 세금(ISA 등 절세계좌 포함) 반영 로직.
- **CORE-05**: 다양한 투자 전략(정액 적립식, 가치 적립식, 스텝업) 지원.
- **CORE-06**: 과거 시계열 데이터(QQQM, QLD, TQQQ, KOSPI 등) 기반 백테스트 및 미래 시나리오(최상/평균/최악) 연산 로직.
- **CORE-07**: 연율화된 변동성(Annualized Volatility) 계산 및 시나리오 분산 적용.
- **CORE-08**: 인플레이션을 반영한 실질 가치(Real Value) 리베이스 연산.
- **CORE-09**: 대형 금액(1억 원 이상) 표기 시 가독성을 위한 자동 절삭 로직 적용.

### [DATA] 데이터 관리 및 영속성 (Data & Persistence)
- **DATA-01**: `RxDB (IndexedDB)`를 활용한 로컬 퍼스트 아키텍처 구축.
- **DATA-02**: 투자 시나리오 저장, 불러오기 및 다중 비교 기능.
- **DATA-03**: `Web Crypto API`를 이용한 클라이언트 측 로컬 암호화 저장 적용.
- **DATA-04**: `localStorage`를 통한 사용자 설정(통화, 환율 등) 캐싱 및 상태 유지.

### [UI] Apple 스타일 인터페이스 (UI/UX)
- **UI-01**: `DESIGN.md` 가이드를 준수한 Apple 스타일의 미니멀 인터페이스 (SF 전용 폰트, Action Blue 등).
- **UI-02**: `visx` 기반의 유려한 자산 성장 곡선 다중 라인 차트 구현 및 범례 시각화.
- **UI-03**: `Framer Motion`을 활용한 부드러운 상태 전환 및 마일스톤 애니메이션.
- **UI-04**: 고정밀 스크러빙(Scrubbing) 인터랙션을 통한 시점별 자산 탐색 기능.
- **UI-05**: 결과 요약 대시보드 (KPI Grid) 및 입력 보조 UI (USD 환산 및 환율 안내) 구현.
- **UI-06**: 복잡한 옵션(원/달러, 기준금리, 계좌 유형 등)을 별도의 고급 설정(Advanced Settings Sheet)으로 분리.
- **UI-07**: 최대 3개 자산 동시 백테스트 비교 UI 제공.

### [PWA & ACC] 앱 경험 및 접근성 (PWA & Accessibility)
- **PWA-01**: 서비스 워커(`vite-plugin-pwa`)를 통한 오프라인 구동 및 캐싱.
- **PWA-02**: iOS/Android 홈 화면 설치 지원 (A2HS) 및 맞춤형 스플래시 화면, 마스크어블 아이콘 적용.
- **ACC-01**: WCAG AA 수준을 목표로 모든 인터랙티브 요소에 `aria-label`, `role` 속성 부여.
- **ACC-02**: 스크린 리더 사용자를 위한 대체 텍스트 및 시맨틱 태그(Hidden Tables 등) 지원.

### [SHARE] 성과 공유 기능 (Sharing)
- **SHARE-01**: `html-to-image` 기반의 고품질 Apple 스타일 성과 공유 카드(ShareCard) PNG 이미지 저장 기능 구현.
- **SHARE-02**: 워터마크(브랜드 로고) 및 투자 시나리오 상세 내역(CAGR, 총 납입액 등) 포함 표기.

### [VAL] 성능 및 무결성 (Integrity & Validation)
- **VAL-01**: 누적 오차 확산 방지를 위한 단위 테스트 및 금융 시나리오 검증 체계.
- **VAL-02**: 과도한 연산 방지를 위한 성능 보호용 입력 기간 제한 (미래 예측 최대 50년 등).

## Traceability

| Requirement | Category | Status |
|-------------|----------|--------|
| CORE-01 | Engine | Complete |
| CORE-02 | Engine | Complete |
| CORE-03 | Engine | Complete |
| CORE-04 | Engine | Complete |
| CORE-05 | Engine | Complete |
| CORE-06 | Engine | Complete |
| CORE-07 | Engine | Complete |
| CORE-08 | Engine | Complete |
| CORE-09 | Engine | Complete |
| DATA-01 | Data | Complete |
| DATA-02 | Data | Complete |
| DATA-03 | Data | Complete |
| DATA-04 | Data | Complete |
| UI-01 | UX | Complete |
| UI-02 | UX | Complete |
| UI-03 | UX | Complete |
| UI-04 | UX | Complete |
| UI-05 | UX | Complete |
| UI-06 | UX | Complete |
| UI-07 | UX | Complete |
| PWA-01 | Experience | Complete |
| PWA-02 | Experience | Complete |
| ACC-01 | Accessibility | Complete |
| ACC-02 | Accessibility | Complete |
| SHARE-01 | Sharing | Complete |
| SHARE-02 | Sharing | Complete |
| VAL-01 | Validation | Complete |
| VAL-02 | Validation | Complete |

> **Note**: Phase 12 UX & Animation Polish 단계가 완료됨에 따라 초기 및 추가 요구사항 전반이 충족되었습니다. (Current version: v1.3.24)
