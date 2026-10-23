---
phase: 01-foundation
plan: 02
subsystem: UI Components
tags: [apple-design, refactoring, framer-motion]
requires: [01-01]
provides: [Apple Global Nav, Shadow-less KPI Grid, Unified Button/Input Styles]
affects: [GlobalNav, KPIGrid, App, ProductHero]
tech-stack: [React, Tailwind CSS, Framer Motion, Lucide React]
key-files: [src/components/layout/GlobalNav.tsx, src/components/sections/KPIGrid.tsx, src/App.tsx, src/components/sections/ProductHero.tsx]
decisions:
  - Use Snowflake icon as the "Snowball Logo" in GlobalNav.
  - Implement backdrop-blur-md for GlobalNav to match Apple's frosted glass effect.
  - Standardize whileTap scale (0.95 for buttons, 0.96 for KPI cards) for haptic feedback feel.
  - Remove all shadows from UI components, relying on surface color changes and hairlines for hierarchy.
metrics:
  duration: 1h
  completed_date: 2026-05-12
---

# Phase 1 Plan 02: Core UI Components Refactoring Summary

## Substantive Summary
Apple의 프리미엄 디자인 언어를 핵심 UI 컴포넌트에 완벽하게 이식했습니다. GlobalNav는 44px의 슬림한 높이와 Frosted Glass 효과를 갖추었으며, KPIGrid는 그림자를 제거하고 Surface Tile 시스템을 통해 깊이감을 표현하도록 리팩터링되었습니다. 모든 상호작용 요소(버튼, 카드, 네비게이션 아이템)에는 `framer-motion`을 활용한 Scale-down 애니메이션이 적용되어 물리적인 피드백을 제공합니다.

## Deviations from Plan

None - plan executed exactly as written.

## Key Changes

### GlobalNav 리팩터링
- 높이를 44px로 고정하고 `bg-apple-surface-black/80` 및 `backdrop-blur-md` 적용.
- Apple 로고를 브랜드 아이덴티티를 담은 Snowball 로고(Snowflake 아이콘)로 교체.
- 모든 네비게이션 아이템에 44px 터치 타겟 확보 및 `whileTap` 애니메이션 추가.

### KPIGrid & KPICard 리팩터링
- 모든 `shadow-*` 클래스 제거.
- `rounded-lg` (18px) 곡률 및 `bg-apple-canvas-parchment` 배경 적용.
- `whileTap={{ scale: 0.96 }}`을 통한 카드 상호작용 강화.
- 텍스트 자간(Negative tracking) 조정을 통해 Apple 특유의 단단한 타이포그래피 구현.

### 버튼 및 입력 필드 표준화
- "저장하기" 등 주요 CTA 버튼에 `rounded-pill` 적용.
- 유틸리티 버튼에는 `rounded-sm` (8px) 적용.
- 모든 버튼에 `whileTap={{ scale: 0.95 }}` 적용.
- 입력 필드에 `border-apple-hairline` 및 포커스 상태의 `apple-primary` 링 효과 구현.
- 섹션 간 간격을 `py-section` (80px)으로 통일하여 여백의 미(Airy layout) 강조.

## Verification Result

- [x] GlobalNav 높이 44px 검증 (`grep` 확인 완료)
- [x] KPIGrid 그림자 제거 및 둥근 모서리 검증 (`grep` 확인 완료)
- [x] App.tsx 내 pill-shape 버튼 및 whileTap 애니메이션 검증 (`grep` 확인 완료)
- [x] ProductHero 레이아웃 및 애니메이션 통합 완료.

## Self-Check: PASSED
