# Architecture Patterns: Snowball Engine

**Domain:** Fintech Simulation Engine
**Researched:** 2024-05-22

## Recommended Architecture

계산 엔진은 외부 상태에 의존하지 않는 **순수 함수 기반의 계층형 아키텍처**를 제안합니다.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Core Engine** | 순수 수학 연산 (복리, 수수료, 세율) | None (Pure Logic) |
| **Data Provider** | 환율 API, 과거 수익률 데이터 조회 | Core Engine, Simulation Manager |
| **Simulation Manager** | 시나리오 구성 및 엔진 실행 제어 | Core Engine, UI Layer |
| **UI Layer** | 차트 시각화 및 사용자 입력 처리 | Simulation Manager |

### Data Flow

1. 사용자가 입력값(원금, 기간, 수익률)을 UI에 전달.
2. `Simulation Manager`가 필요한 외부 데이터(환율 등)를 `Data Provider`로부터 수집.
3. `Core Engine`에 입력 데이터를 전달하여 시뮬레이션 수행.
4. 엔진이 계산된 결과 배열(연도별 자산 추이 등)을 반환.
5. UI Layer가 `Intl` API를 사용하여 결과를 포맷팅하고 차트에 렌더링.

## Patterns to Follow

### Pattern 1: Immutability (불변성)
**What:** 계산 결과는 절대 원본 데이터를 수정하지 않고 새로운 객체를 생성하여 반환합니다.
**When:** 모든 시뮬레이션 계산 시 적용.
**Example:**
```typescript
const calculateNextYear = (currentBalance: Decimal, rate: Decimal): Decimal => {
  return currentBalance.times(rate.plus(1)); // 새로운 Decimal 객체 반환
};
```

### Pattern 2: Result Object Pattern
**What:** 계산 결과와 함께 메타데이터(정밀도, 사용된 환율, 발생한 수수료 등)를 객체에 담아 반환합니다.
**Why:** 단순 숫자만 반환할 경우 '왜 이런 결과가 나왔는지'에 대한 추적이 어려움.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Singleton State in Engine
**What:** 엔진 내부에 전역 상태(예: `currentTaxRate`)를 두는 행위.
**Why bad:** 테스트가 어려워지고 동시 시뮬레이션 시 데이터가 꼬일 수 있음.
**Instead:** 모든 변수는 함수 인자로 주입(Dependency Injection)받아야 함.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Calculation** | 클라이언트 브라우저 | 클라이언트 브라우저 | 클라이언트 브라우저 (연산 부하 적음) |
| **Rate API** | 무료 API | 유료 캐싱 서버 | 자체 데이터 웨어하우스 |
| **Precision** | `Decimal.js` | `Decimal.js` | WebAssembly (필요 시 성능 최적화) |

## Sources

- [Clean Architecture for Fintech](https://blog.cleancoder.com/)
- [Functional Programming in Financial Applications](https://www.janestreet.com/technology/)
