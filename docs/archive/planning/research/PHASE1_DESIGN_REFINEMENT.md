# Phase 1: Foundation & Precision Engine - Design Refinement Research

**Researched:** 2026-05-12
**Domain:** Apple-Inspired UI/UX Design System Refinement
**Confidence:** HIGH

## Summary

본 조사는 "Stock Snowball"의 Phase 1 구현물을 `DESIGN.md`에 정의된 Apple-inspired 디자인 가이드라인에 맞춰 고도화하기 위한 기술적 분석을 수행했습니다. 현재 기초적인 Tailwind CSS 설정과 컴포넌트 구조는 가이드라인을 잘 따르고 있으나, **그림자 사용 철학(Shadow Philosophy)**, **터치 타겟(Touch Targets)**, **애니메이션 디테일**, 그리고 **차트의 시각적 완성도** 면에서 개선이 필요합니다.

**Primary recommendation:** "Invisible UI, Visible Growth" 원칙을 강화하기 위해 UI 요소의 불필요한 그림자와 외곽선을 제거하고, `Frosted Glass` 효과와 `Scale-down` 상호작용을 전면 도입하며, 차트를 얼음/눈의 질감을 가진 'Crystal Chart' 스타일로 업그레이드해야 합니다.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 디자인 토큰 관리 | Tailwind Config | CSS Variables | 테마 확장성 및 일관된 간격/색상 제어 |
| 컴포넌트 레이아웃 | React (JSX) | Tailwind CSS | Apple의 카드/타일 기반 그리드 시스템 구현 |
| 인터랙션/애니메이션 | Framer Motion | CSS Transitions | Apple 특유의 물리적 기반 반응형 애니메이션 구현 |
| 데이터 시각화 | Visx (D3) | Canvas/SVG | 정교하고 투명한 '얼음' 질감의 성장 차트 렌더링 |
| 접근성/반응형 | CSS Media Queries | React Hooks | 44px 터치 타겟 및 가변 레이아웃 보장 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.0.0 | UI Framework | 프로젝트 표준, 최신 기능 활용 [VERIFIED: package.json] |
| Tailwind CSS | 3.4.17 | Styling | `DESIGN.md`의 토큰 시스템을 유틸리티 클래스로 매핑 [VERIFIED: tailwind.config.ts] |
| Framer Motion | 12.38.0 | Animation | Apple 스타일의 물리 기반 애니메이션 라이브러리 [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @visx/* | 3.12.0 | Charting | 복잡한 금융 데이터를 SVG 기반으로 정교하게 시각화할 때 [VERIFIED: package.json] |
| Lucide React | 0.474.0 | Icons | 기본 아이콘 제공 (Apple 스타일 커스텀 필요) [VERIFIED: package.json] |
| clsx / tailwind-merge | 2.1+ / 3.0+ | Class Utility | 조건부 클래스 결합 및 충돌 방지 [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Visx | Recharts | Recharts는 쉽지만 Apple 특유의 세밀한 커스텀(얼음 질감 등)에 한계가 있음 |
| Lucide | SF Symbols | SF Symbols는 웹에서 사용하기 까다롭고 Apple 기기 전용임 |

## Architecture Patterns

### System Architecture Diagram
(Request) -> [GlobalNav/SubNav] -> [ProductHero (Main Engine)]
                                    |-> [SnowballChart (Visx)]
                                    |-> [KPIGrid (Summary)]
(Action)  -> [Framer Motion (Scale/Fade)] -> (Visual Feedback)

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/             # 원자 단위 컴포넌트 (Button, Input, Logo)
│   ├── charts/         # 정교한 시각화 (CrystalChart)
│   ├── layout/         # GlobalNav, Footer
│   └── sections/       # 페이지 조각 (ProductHero, FeatureTiles)
├── styles/
│   ├── tokens.css      # 디자인 토큰 (Font, Colors)
│   └── animations.css  # 공통 애니메이션 정의
```

### Pattern 1: Apple Scale-Down Interaction
**What:** 클릭/터치 시 요소가 95%로 작아졌다가 돌아오는 효과.
**When to use:** 모든 버튼, 링크, 클릭 가능한 카드.
**Example:**
```typescript
// Framer Motion을 활용한 Apple 스타일 버튼
<motion.button
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
  className="bg-apple-primary rounded-pill px-6 py-3"
>
  투자 시작
</motion.button>
```

### Anti-Patterns to Avoid
- **Shadow Sprawl:** 모든 카드에 `shadow-sm`을 넣는 행위. Apple은 오직 '제품 이미지'에만 그림자를 허용합니다.
- **Tight Touch:** 44px 미만의 클릭 영역. 모바일 사용자 경험을 해칩니다.
- **Gradient Backgrounds:** 배경에 복합적인 그라데이션을 넣는 것. `Fresh Snow` 화이트를 유지해야 합니다.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 복잡한 곡선 차트 | Custom SVG paths | `@visx/shape` | `curveMonotoneX` 등 정교한 곡선 처리와 반응형 지원 |
| 스프링 애니메이션 | CSS Keyframes | `framer-motion` | 물리 법칙 기반의 부드러운 Apple식 반동 구현 가능 |
| 폰트 가독성 | Custom kerning CSS | Tailwind `tracking` | `DESIGN.md`의 `negative letter-spacing` 수치를 정확히 매핑 |

## Common Pitfalls

### Pitfall 1: Typography Tracking Neglect
**What goes wrong:** 헤드라인이 벙벙해 보이고 Apple 특유의 '단단함'이 사라짐.
**Why it happens:** 기본 자간을 그대로 사용함.
**How to avoid:** `tracking-[-0.01em]` 또는 `tracking-[-0.28px]`(17px 이상)를 강제 적용.

### Pitfall 2: Small Touch Targets
**What goes wrong:** 네비게이션 아이콘이나 작은 버튼이 잘 안 눌림.
**Why it happens:** 아이콘 크기(16px)만 생각하고 패딩을 생략함.
**How to avoid:** 최소 `44x44px`의 클릭 영역을 확보하기 위해 버튼에 패딩 추가.

### Pitfall 3: Chart Grid Clutter
**What goes wrong:** 차트가 엑셀 데이터처럼 보이고 프리미엄 느낌이 사라짐.
**Why it happens:** 기본 그리드 라인과 축이 너무 진함.
**How to avoid:** 그리드 라인을 제거하거나 `hairline` 색상으로 극히 연하게 표현.

## Code Examples

### 1. Apple-Inspired Button (Refined)
```tsx
// src/components/ui/AppleButton.tsx
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const AppleButton = ({ children, variant = 'primary', className }: any) => {
  const variants = {
    primary: "bg-apple-primary text-apple-on-primary rounded-pill",
    secondary: "bg-apple-surface-pearl text-apple-ink border-apple-divider-soft rounded-md",
  };
  
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={cn("px-[22px] py-[11px] text-caption-strong transition-colors", variants[variant], className)}
    >
      {children}
    </motion.button>
  );
}
```

### 2. Crystal Snowball Chart Pattern
```tsx
// Area Gradient with Frosty feel
<LinearGradient
  id="frost-gradient"
  from="#0066cc"
  to="#0066cc"
  fromOpacity={0.2}
  toOpacity={0}
/>
// Line with glow
<LinePath
  stroke="#0066cc"
  strokeWidth={3}
  style={{ filter: 'drop-shadow(0 0 8px rgba(0, 102, 204, 0.3))' }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rounded 4px | Rounded 18px / Pill | iOS 13+ | 더 부드럽고 친근한 사용자 경험 |
| 16px Body | 17px Body | Apple Web Std | 가독성 향상 및 여유로운 호흡 |
| Pure Black | Near-Black (#1d1d1f) | DESIGN.md | 사진 중심 레이아웃에서 눈의 피로도 감소 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SF Pro 폰트가 로컬에 없을 경우 Inter가 가장 적합함 | Typography | 윈도우/안드로이드에서 인상이 달라질 수 있음 |
| A2 | 차트 영역 채우기는 Apple 가이드라인을 위반하지 않음 | Charting | 지나치게 화려하면 'Invisible UI' 원칙에 위배됨 |

## Open Questions

1. **로고 디자인**: Lucide Apple 로고 대신 `DESIGN.md`에서 언급한 '눈송이 각인 눈덩이' 로고를 어떻게 구현할 것인가? (SVG 드로잉 vs 이미지 에셋)
2. **다크 모드**: `surface-tile-1` 등의 토큰이 이미 존재하지만, 전체 페이지의 다크 모드 전환 로직(Switch)과 가독성 검증이 더 필요함.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| SF Pro Font | Typography | ✗ (OS Dependent) | — | Inter (Google Fonts) |
| Framer Motion | Animations | ✓ | 12.38.0 | CSS Transition |
| Visx | Charts | ✓ | 3.12.0 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vite.config.ts |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 | Action Blue (#0066cc) 적용 여부 | Snapshot | `npm test` | ✅ |
| DESIGN-02 | 44px 터치 타겟 준수 여부 | Unit/Manual | — | ❌ Wave 0 |
| DESIGN-03 | SF Pro / Inter 폰트 스택 적용 | Snapshot | `npm test` | ✅ |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Financial input sanitization (절삭 방지) |

### Known Threat Patterns for React/Tailwind

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Chart Data | Information Disclosure | Visx/SVG auto-encoding |

## Sources

### Primary (HIGH confidence)
- [DESIGN.md] - Full design specification
- [tailwind.config.ts] - Current implementation status
- [package.json] - Library versions

### Secondary (MEDIUM confidence)
- Apple Human Interface Guidelines (Web) - Verified common patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly from package.json
- Architecture: HIGH - Matches DESIGN.md goals
- Pitfalls: MEDIUM - Based on common Apple-style design errors

**Research date:** 2026-05-12
**Valid until:** 2026-06-12
