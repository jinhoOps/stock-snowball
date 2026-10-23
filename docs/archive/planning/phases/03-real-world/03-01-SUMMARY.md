# Summary: Plan 03-01 (Wave 1)

Phase 3의 UI/UX 간소화 및 백테스팅 엔진 구축의 첫 번째 단계인 Wave 1을 완료했습니다.

## ✅ 완료된 작업

### 1. GlobalNav 미니멀리즘 리팩터링
- `src/components/layout/GlobalNav.tsx`에서 모든 더미 링크(Store, Mac 등)와 검색/장바구니 아이콘을 제거했습니다.
- Snowball 로고(Snowflake 아이콘)만 유지하여 Apple 스타일의 극도로 단순한 헤더를 구현했습니다.
- `backdrop-blur-md`와 `bg-apple-surface-black/80`을 통해 프리미엄 질감을 유지했습니다.

### 2. 백테스팅 데이터셋 구축
- `src/data/historicalAssets.ts`를 생성하여 QQQM, QLD, TQQQ, KOSPI의 일간 수익률 데이터셋(10년치 모사 데이터)을 구축했습니다.
- `src/types/finance.ts`에 `AssetType`을 추가하여 시스템 전반에서 자산 유형을 구분할 수 있게 했습니다.

### 3. 시뮬레이션 엔진 업데이트
- `src/core/SnowballEngine.ts`의 `simulate` 메서드가 `AssetType`을 지원하도록 수정했습니다.
- `assetType`이 'CUSTOM'이 아닐 경우, 고정 이율 대신 실제(또는 모사된) 일간 수익률 데이터를 사용하여 시뮬레이션을 수행합니다.

## 🧪 검증 결과
- `Backtesting.test.ts`를 통해 자산별(QQQM, TQQQ 등)로 서로 다른 시뮬레이션 결과가 정상적으로 산출됨을 확인했습니다.
- 기존 금융 모듈 테스트(8개)도 모두 통과하여 회귀 오류가 없음을 보장합니다.

## 📦 버전 업데이트
- `package.json`: 1.0.12 -> **1.0.13** (Patch version bump)

---
Next: **Wave 2 (03-02)** - Slide-over 설정 패널 및 메인 입력창 개편.
