# Phase 7: UI/UX & Financial Precision Refinement - Research

**Researched:** 2025-03-xx
**Domain:** UI/UX, Financial Calculation, Currency Conversion
**Confidence:** HIGH

## Summary

본 페이즈는 'Stock Snowball' 프로젝트의 입력 편의성을 극대화하고, 환율 기반의 글로벌 자산 시뮬레이션 환경을 구축하는 것을 목표로 합니다. 주요 연구 결과, 사용자 입력 시 '억/만' 또는 'Million/Billion' 단위를 실시간으로 보조하는 가이드가 사용자 인지 부하를 크게 줄여줌을 확인했습니다. 또한, Apple 스타일의 미니멀리즘을 유지하기 위해 고급 설정 진입점을 헤더 바의 아이콘으로 이동하고, 입력창의 '0' 처리 문제를 해결하기 위한 커스텀 입력 로직을 설계했습니다. 금융적 무결성을 위해 `Decimal.js`를 활용한 통화 전환 시 정밀도 유지 전략을 수립했습니다.

**Primary recommendation:** `Decimal.js` 기반의 통화 자동 환산 로직을 상태 관리와 결합하고, `NumericInput` 컴포넌트를 통해 '0' 값 처리 및 실시간 단위 도우미(Big Number Helper)를 통합 구현하십시오.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 금융 연산 엔진 | Browser (Core) | — | 즉각적인 시뮬레이션 피드백을 위해 클라이언트에서 수행 |
| 상태 및 통화 전환 | Browser (React) | — | UI 반응성 및 입력 상태 무결성 유지 |
| 단위 도우미 (Formatting) | Browser (Utils) | — | 국가별 단위 체계(KRW/USD)에 따른 포맷팅 제공 |
| 고급 설정 UI | Browser (UI) | — | Apple 스타일의 시트(Sheet) 및 헤더 통합 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| decimal.js | 10.6.0 | 고정밀 금융 연산 | 부동 소수점 오차 방지 및 Banker's Rounding 지원 [VERIFIED: package.json] |
| lucide-react | 0.474.0 | UI 아이콘 (Settings) | Apple 스타일의 정교한 아이콘 세트 제공 [VERIFIED: package.json] |
| framer-motion | 12.38.0 | UI 애니메이션 | 시트 전환 및 상태 변화 시 부드러운 인터랙션 [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| clsx / tailwind-merge | 최신 | CSS 클래스 병합 | 조건부 스타일링 및 Tailwind 클래스 충돌 방지 |

**Installation:**
```bash
# 이미 설치됨
npm install decimal.js lucide-react framer-motion
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── common/
│   │   ├── NumericInput.tsx      # '0' 처리 및 포커스 UX 개선
│   │   └── BigNumberHelper.tsx   # 억/만, M/B 단위 가이드
│   ├── layout/
│   │   └── GlobalNav.tsx         # Gear 아이콘 추가
│   └── sections/
│       ├── SimulationControls.tsx # 단위 도우미 통합
│       └── AdvancedSettingsSheet.tsx # 환율 및 주기 설정 추가
├── core/
│   └── SnowballEngine.ts        # USD 포맷팅 및 통화 전환 로직 확장
```

### Pattern 1: Currency-Aware State Toggle
통화 전환 시 기존 입력값을 손실 없이 변환하기 위해 `Decimal.js`를 사용합니다.
**Example:**
```typescript
// SnowballEngine.ts 내 확장 권장
static convertCurrency(value: number, rate: number, to: 'KRW' | 'USD'): number {
  const dValue = new Decimal(value);
  const dRate = new Decimal(rate);
  return to === 'USD' 
    ? dValue.div(dRate).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber()
    : dValue.mul(dRate).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
}
```

### Pattern 2: Fixed Visual Slider (30y Cap)
슬라이더의 시각적 범위는 30년으로 고정하되, 실제 값은 이를 초과할 수 있도록 매핑합니다.
**Example:**
```tsx
// SimulationControls.tsx 내 적용
const visualYears = Math.min(years, 30);
const sliderPercentage = (visualYears / 30) * 100;
// 슬라이더 조작 시 1~30 범위 내에서만 setYears 수행
// 입력창을 통해서는 30 초과 값 허용
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 부동 소수점 오차 | `a + b` | `Decimal.js` | 0.1 + 0.2 !== 0.3 문제 해결 |
| 아이콘 제작 | SVG 직접 작성 | `lucide-react` | 일관된 디자인 언어 및 유지보수 용이성 |
| 숫자 포맷팅 (조/억/만) | 정규식 노가다 | `SnowballEngine.formatKoreanWon` | 이미 구현된 검증된 로직 활용 |

## Common Pitfalls

### Pitfall 1: Input '0' Sticky Issue
**What goes wrong:** `input type="number"`에서 값이 `0`일 때 사용자가 이를 지우고 새 숫자를 입력하기 어려움.
**How to avoid:** `onFocus` 시 값이 `0`이면 필드를 비우고, `onBlur` 시 비어있으면 `0`으로 복구하는 `NumericInput` 컴포넌트 구현. [ASSUMED]

### Pitfall 2: Currency Conversion Jitter
**What goes wrong:** KRW -> USD -> KRW 반복 전환 시 소수점 처리로 인해 원래 값이 미세하게 변함.
**How to avoid:** 전환 시에만 연산을 수행하되, `Decimal.js`의 정밀도를 활용하고 KRW의 경우 최종 정수 처리를 엄격히 적용. [ASSUMED]

## Code Examples

### Big Number Formatting (USD)
```typescript
// Source: SnowballEngine.ts (Extension Proposal)
static formatUSD(value: Decimal | number | string): string {
  const amount = new Decimal(value);
  if (amount.isZero()) return '$0';
  
  // Million, Billion 단위 대응
  if (amount.gte(1e9)) return `${amount.div(1e9).toFixed(2)} Billion $`;
  if (amount.gte(1e6)) return `${amount.div(1e6).toFixed(2)} Million $`;
  return `${amount.toNumber().toLocaleString()} $`;
}
```

### Numeric Input Component Wrapper
```tsx
// Source: Proposed NumericInput.tsx
const NumericInput = ({ value, onChange, placeholder }) => {
  const [displayValue, setDisplayValue] = useState(value.toString());
  
  useEffect(() => { setDisplayValue(value.toString()); }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue === '0' ? '' : displayValue}
      placeholder={displayValue === '0' ? '0' : placeholder}
      onChange={(e) => {
        const val = e.target.value.replace(/[^0-9.]/g, '');
        setDisplayValue(val);
        onChange(val === '' ? 0 : parseFloat(val));
      }}
      onBlur={() => setDisplayValue(value.toString())}
    />
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 단일 통화 (KRW) | 다중 통화 지원 (KRW/USD) | Phase 7 | 글로벌 투자 환경 대응 |
| 고정 슬라이더 (50y) | 30y 고정 스케일 + 오버플로우 | Phase 7 | UX 집중도 및 유연성 확보 |
| 하단 고급 설정 버튼 | 상단 헤더 Gear 아이콘 | Phase 7 | Apple 디자인 가이드라인 준수 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `NumericInput`의 `onFocus` 비우기 방식이 모바일 키보드 UX를 개선할 것임 | Common Pitfalls | 입력 시마다 필드가 비워져 불편함을 초래할 수 있음 (조건부 구현 필요) |
| A2 | 사용자는 30년 이상의 투자를 슬라이더보다 직접 입력을 선호함 | Architecture Patterns | 30년 초과 투자가 메인 유즈케이스일 경우 슬라이더 효용성 저하 |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Decimal.js | 금융 연산 | ✓ | 10.6.0 | — |
| Lucide React | UI 아이콘 | ✓ | 0.474.0 | — |
| Framer Motion | 애니메이션 | ✓ | 12.38.0 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vite.config.ts / vitest.config.ts |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | Decimal.js 정밀도 유지 | unit | `npm test src/core/__tests__/SnowballEngine.test.ts` | ✅ |
| CORE-04 | KRW/USD 환산 정확도 | unit | `npm test` (신규 작성 필요) | ❌ Wave 0 |
| UI-06 | 30y 슬라이더 매핑 로직 | unit/integration | `npm test` | ❌ Wave 0 |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | 숫자 입력 필드에 대한 정규식 및 Range 검증 |

## Sources

### Primary (HIGH confidence)
- `decimal.js` library documentation - Precision & Rounding
- `lucide-react` icon list - Settings icon availability
- `src/core/SnowballEngine.ts` - Existing codebase logic

### Secondary (MEDIUM confidence)
- Apple Human Interface Guidelines - Placement of settings and modal sheets
- Common React Patterns - Controlled input handling for numeric values

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 명확한 라이브러리 버전 확인 완료
- Architecture: HIGH - 기존 엔진 및 컴포넌트 구조 분석 완료
- Pitfalls: MEDIUM - 실제 사용자 피드백이 아닌 개발자 경험 기반

**Research date:** 2025-03-xx
**Valid until:** 2025-04-xx
