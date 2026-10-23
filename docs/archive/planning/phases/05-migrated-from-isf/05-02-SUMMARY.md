# Phase 5.2 Summary: High-Precision Backtest Engine

## 작업 내용
- **고정밀 백테스팅 로직 구현**: `Decimal.js`를 사용하여 레거시 엔진의 로직을 완전히 재구현했습니다. 모든 중간 연산(수량 매수, 배당 재투자, 가치 평가 등)에서 정밀도를 유지합니다.
- **핵심 금융 지표 산출**:
    - **MDD (Maximum Drawdown)**: 자금 투입에 의한 왜곡을 방지하기 위해 '단위 가격(Unit Price)' 추적 방식을 도입하여 순수 자산 낙폭을 정확히 계산합니다.
    - **CAGR (Compound Annual Growth Rate)**: 투자 일수를 정밀하게 계산하여 연평균 성장률을 산출합니다.
    - **IRR (Internal Rate of Return)**: 이분법(Bisection Method)을 `Decimal.js` 기반으로 60회 반복 수행하도록 구현하여 높은 정밀도의 적립식 수익률을 제공합니다.
- **배당 재투자(TR) 및 청산 로직**: 배당금을 즉시 수량으로 재투자하는 로직과, 자산 가치가 급락(원금 1% 미만)할 경우 시뮬레이션을 중단하는 청산 로직을 구현했습니다.
- **TDD 기반 검증**: `src/core/__tests__/BacktestEngine.test.ts`를 작성하여 거치식, 적립식, 에지 케이스(폭락, 장기 투자, 투자금 0원 등)에 대해 7개의 테스트 케이스를 모두 통과시켰습니다.

## 변경 파일
- `src/core/BacktestEngine.ts`: 상세 시뮬레이션 및 지표 산출 로직 구현
- `src/core/__tests__/BacktestEngine.test.ts`: 엔진 검증 테스트 코드 추가
- `package.json`: 버전 Bump (1.0.22 -> 1.0.23)

## 검증 결과
- `vitest` 테스트 7개 전원 통과.
- `Decimal.js`를 통한 금융 연산 무결성 확인.

## 다음 단계
- **Phase 5.3**: Apple 스타일의 백테스트 UI 구현. 기존 시뮬레이션 UI와 조화로운 '백테스트 모드' 대시보드 및 차트 인터랙션 구축.
