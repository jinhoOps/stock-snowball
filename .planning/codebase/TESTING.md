# Testing Patterns

**Analysis Date:** 2026-05-13

## Test Framework

**Runner:**
- Vitest

**Assertion Library:**
- Vitest `expect`

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npx vitest            # Watch mode
```

## Test File Organization

**Location:**
- Co-located in `__tests__` directories within each module (e.g., `src/core/__tests__/`).

**Naming:**
- `[FileName].test.ts` (e.g., `SnowballEngine.test.ts`)

**Structure:**
```
src/
└── core/
    ├── SnowballEngine.ts
    └── __tests__/
        ├── SnowballEngine.test.ts
        ├── BacktestEngine.test.ts
        └── Integrity.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';

describe('SnowballEngine', () => {
  describe('Specific Method Name', () => {
    it('Should behave in a certain way (Korean description)', () => {
      // 1. Arrange
      // 2. Act
      // 3. Assert
    });
  });
});
```

**Patterns:**
- **Language**: Test descriptions (`describe`, `it`) must be in **Korean (한국어)**.
- **Precision**: Assertions for financial results should account for precision (using `.toNumber()` for rough checks or `toDecimalPlaces()` for exact matches).

## Mocking

**Framework:** Vitest Built-in (`vi.mock`).

**What to Mock:**
- External data fetching (e.g., fetching historical asset data).
- Database operations (RxDB/Dexie).

**What NOT to Mock:**
- `SnowballEngine` and `BacktestEngine` logic (always test the real implementation).
- `decimal.js` operations.

## Fixtures and Factories

**Test Data:**
- Use historical data samples in `src/data/indices/*.json` as reference for backtest simulations.
- Define static parameters in `Integrity.test.ts` to match external validation sources (Excel/Financial calculators).

## Coverage

**Requirements:**
- High coverage (100% preferred) for `src/core/` logic.
- Integrity validation for long-term compound interest simulations (1, 5, 10, 20 years).

## Test Types

**Unit Tests:**
- Focus on individual methods in `SnowballEngine` (Banker's rounding, compounding formulas, tax calculations).

**Integrity Tests:**
- Validate `SnowballEngine` against known financial reference values.
- Verify floating point error prevention using `decimal.js`.

**Backtest Validation:**
- Verify `BacktestEngine` logic using historical data points.

## Common Patterns

**Financial Accuracy Testing:**
```typescript
it('Decimal.js를 사용하여 부동 소수점 오차를 방지해야 합니다', () => {
  const a = new Decimal('0.1');
  const b = new Decimal('0.2');
  expect(a.plus(b).toNumber()).toBe(0.3);
});
```

**Banker's Rounding Testing:**
```typescript
it('가장 가까운 짝수로 반올림해야 합니다', () => {
  expect(SnowballEngine.bankersRounding(2.5, 0).toNumber()).toBe(2);
  expect(SnowballEngine.bankersRounding(3.5, 0).toNumber()).toBe(4);
});
```

---

*Testing analysis: 2026-05-13*
