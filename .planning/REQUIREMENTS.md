# Requirements: Stock Snowball

## Project Core Value
매일의 소액 투자가 복리의 힘을 통해 거대한 자산으로 성장하는 과정을 시각화하고 관리하는 고정밀 투자 시뮬레이션 플랫폼. (Apple 스타일 UX + 금융 무결성)

## V1 Scope (Targeting MVP)

### [CORE] 금융 연산 엔진
- **CORE-01**: `Decimal.js`를 사용한 부동 소수점 오차 없는 고정밀 연산 구현.
- **CORE-02**: 통계적 편향을 방지하는 **Banker's Rounding** (오사오입) 적용.
- **CORE-03**: '매일(Daily)' 단위의 복리 계산 및 불입 시뮬레이션 로직.
- **CORE-04**: 환율 변동성, 증권사 수수료, 세금(ISA 등) 반영 로직.
- **CORE-05**: 다양한 투자 전략(정액 적립식, 가치 적립식 등) 지원.
- **CORE-06**: 과거 시계열 데이터(QQQM, QLD, TQQQ, KOSPI 등) 기반 백테스트 및 미래 시나리오(5단계 수익률) 연산 로직.

### [DATA] 데이터 관리 및 영속성
- **DATA-01**: `RxDB (IndexedDB)`를 활용한 로컬 퍼스트 아키텍처 구축.
- **DATA-02**: 투자 시나리오 저장, 불러오기 및 다중 비교 기능.
- **DATA-03**: `Web Crypto API`를 이용한 민감 데이터 클라이언트 측 암호화 저장.

### [UI] Apple 스타일 인터페이스
- **UI-01**: `DESIGN.md` 가이드를 준수한 Apple 스타일의 미니멀 인터페이스 (SF 전용 폰트, Action Blue 등).
- **UI-02**: `visx` 기반의 유려한 자산 성장 곡선 차트 구현.
- **UI-03**: `Framer Motion`을 활용한 부드러운 상태 전환 및 마일스톤 애니메이션.
- **UI-04**: 고정밀 스크러빙(Scrubbing) 인터랙션을 통한 시점별 자산 탐색.
- **UI-05**: 결과 요약 대시보드 (KPI Grid) 구현.
- **UI-06**: 메인 화면은 '투자 단위(매일/매주/매월)' 및 '금액' 입력에만 집중. 복잡한 표기 옵션(원/달러, 실질/명목)과 변수 설정(기준금리, 환율)은 별도의 설정 슬라이드/모달로 분리하여 미니멀리즘 유지.

### [PWA] 앱 경험
- **PWA-01**: 서비스 워커를 통한 오프라인 구동 및 즉각적인 로딩.
- **PWA-02**: iOS/Android 홈 화면 설치 지원 (A2HS) 및 맞춤형 스플래시 화면.

### [VAL] 무결성 검증 (Financial Integrity)
- **VAL-01**: 누적 오차 확산 방지를 위한 단위 테스트 및 금융 시나리오 검증.
- **VAL-02**: 디자인 시스템 정합성 체크 (DESIGN.md 준수 여부).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Complete |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Complete |
| CORE-04 | Phase 3 | Complete |
| CORE-05 | Phase 3 | Complete |
| CORE-06 | Phase 3 | In Progress |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 4 | Complete |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 2 | Complete |
| UI-06 | Phase 3 | In Progress |
| PWA-01 | Phase 2 | Complete |
| PWA-02 | Phase 2 | Complete |
| VAL-01 | Phase 1 | Complete |
| VAL-02 | Phase 1 | Complete |
