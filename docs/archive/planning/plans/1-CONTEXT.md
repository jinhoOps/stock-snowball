# Phase 1 Context: Foundation & Precision Engine

## 🎯 Phase Goal
금융적 무결성을 갖춘 `Decimal.js` 기반 계산 엔진과 Apple 스타일의 기초 UI 레이아웃을 구축합니다. 과거 백데이터(Backtest)와 미래 시뮬레이션(Sim)을 명확히 분리하여 사용자에게 정확한 자산 성장 데이터를 제공합니다.

## 🛠️ Key Decisions (Locked)

### 1. 시뮬레이션 모드 전략 (Mode Routing)
- **모드 전환(Option B) 채택**: '과거 복기(Backtest)'와 '미래 예측(Sim)' 모드를 명확히 분리된 탭 또는 토글로 제공합니다.
    - **Backtest**: 2024년 등 과거 시점부터 현재까지 실제 시장 데이터(QQQM, KOSPI 등) 기반 수익률 계산.
    - **Sim**: 현재부터 미래 시점까지 사용자 설정 수익률(+15% ~ -15% 5단계 프리셋) 기반 계산.

### 2. 가치 계산 및 표시 (Financial Logic)
- **실질 가치 산출**: 목표 시점의 명목 금액을 기준으로, 설정된 기준금리(물가상승률)를 **연/월 기간 가중 반영**하여 현재 가치로 환산합니다.
- **병기 방식**: 차트와 KPI 그리드에서 명목 금액을 주 지표로 노출하되, 실질 가치(현재 구매력 환산가)를 보조 지표로 명확히 병기합니다.

### 3. 데이터 및 배포 (Architecture)
- **데이터 소스**: 나스닥(QQQM, QLD, TQQQ) 및 코스피 10년치 일간 종가를 JSON 파일로 내장.
- **배포 환경**: GitHub Pages (Static Hosting).
- **로컬 퍼스트**: 모든 사용자 설정 및 시뮬레이션 결과는 `RxDB`를 통해 로컬에 저장.

### 4. UI/UX 구성 (Apple Style)
- **Sidebar Configurator**: 설정을 변경할 때 차트가 실시간으로 반응하는 'Live Feedback' 루프 구현.
- **Config Items**:
    - 표기 단위 (원/달러)
    - 환율 설정 (적용 환율/기준금리)
    - 실질/명목 토글
    - 매수 주기 (매일/매주/매월)
    - 세금 프리셋 (해외주식/ISA/사용자 정의)

## 📋 Success Criteria
- [ ] `Decimal.js`를 이용해 기간 가중치가 반영된 실질 가치 환산 로직 검증 완료.
- [ ] 과거 백데이터 기반 수익률과 미래 시나리오 수익률이 모드별로 정확히 렌더링됨.
- [ ] `DESIGN.md` 가이드에 따른 사이드바 및 차트 영역 기본 레이아웃 완성.
- [ ] GitHub Pages 배포를 위한 기초 환경 설정(CI/CD 포함) 완료.

## 🚀 Next Steps
1. 프로젝트 환경 초기화 (Vite, TypeScript, Tailwind CSS, Decimal.js).
2. 정적 백데이터 JSON 구조 정의 및 엔진 인터페이스 설계.
3. 사이드바 기반의 기본 레이아웃 구현.
