<!-- generated-by: gsd-doc-writer -->
# Testing Patterns

**Analysis Date:** 2026-05-13
**Project Version:** v1.3.25 (Phase 12 Completion)

## Test Framework and Setup

The project uses **Vitest** (v4.1.6) as the primary testing framework. It is configured to handle TypeScript and ESM natively through Vite.

- **Framework**: Vitest
- **Assertion Library**: Vitest `expect`
- **Precision Library**: `decimal.js` is used as the ground truth for all financial assertions.
- **Setup**: Tests for core engines (`SnowballEngine`, `BacktestEngine`) are designed to run in a Node.js environment without DOM dependencies, ensuring high-speed execution.

## Running Tests

Tests are executed using standard npm scripts:

```bash
# 전체 테스트 실행 (단발성)
npm test

# 감시 모드 (개발 중 실시간 테스트)
npx vitest

# 특정 파일만 테스트
npx vitest src/core/__tests__/SnowballEngine.test.ts
```

## Writing New Tests

**Naming Convention:**
- Location: `src/**/__tests__/*.test.ts`
- Language: `describe` 및 `it` 블록의 설명은 **한국어(존댓말)**로 작성합니다.

**Strategy for Precision Calculations:**
Financial logic must be verified using the following pattern to prevent precision issues:

```typescript
it('고정밀 복리 연산은 외부 기준값(Excel 등)과 0자리까지 일치해야 합니다', () => {
  const result = SnowballEngine.calculateDailyCompound(10000000, 0.05, 365);
  const rounded = SnowballEngine.bankersRounding(result, 0);
  expect(rounded.toNumber()).toBe(10512675); // 외부 검증 완료된 기준값
});
```

**Key Abstractions in Testing:**
- **Integrity Tests**: `src/core/__tests__/Integrity.test.ts`에서 장기 복리(10년, 20년) 시뮬레이션의 수학적 정밀도를 검증합니다.
- **Banker's Rounding**: 모든 절삭/반올림 로직은 `bankersRounding` 유틸리티를 거쳐야 하며, 이에 대한 경계값 테스트가 필수입니다.

## UI and PWA Verification

UI 요소와 PWA 기능은 현재 다음과 같은 전략으로 검증합니다.

- **UI Animations**: `framer-motion`을 사용한 레이아웃 전환 및 마이크로 인터랙션은 Chrome DevTools의 Performance 탭을 통해 프레임 드랍 여부를 수동으로 확인합니다.
- **PWA Features**: 
  - `vite-plugin-pwa`를 통해 생성된 Service Worker가 `registerType: 'autoUpdate'`로 정상 동작하는지 확인합니다.
  - 오프라인 환경에서 `src/data/indices/` 하위의 과거 지수 데이터가 정상적으로 로드되는지 확인합니다.
  - Lighthouse PWA Audit 점수를 기준으로 설치 가능성(Installability)을 검증합니다.

## Coverage Requirements

- **Core Logic**: `src/core/` 폴더 내의 엔진 로직은 **100% 문장(Statement) 및 분기(Branch) 커버리지**를 지향합니다.
- **High-Precision Validation**: 소수점 8자리 이상의 연산이 수반되는 복리 엔진은 누적 오차 방지를 위해 고정밀 검증 데이터를 통과해야 합니다.

## CI Integration

- **Workflow**: `.github/workflows/deploy.yml` (GitHub Pages 배포 워크플로우)
- **Status**: 현재 배포 파이프라인에는 빌드 전 `npm test` 단계가 포함되어 있지 않으며, 배포 전 개발 환경에서 수동으로 모든 테스트를 통과해야 합니다.
- **Note**: 향후 Phase에서 PR 시 자동 테스트 및 커버리지 리포트 생성을 추가할 예정입니다.

---
*Last Updated: 2026-05-13 (v1.3.25)*
