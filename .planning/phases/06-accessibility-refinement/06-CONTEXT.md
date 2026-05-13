# Phase 6 Context: Accessibility & Design Refinement

## Goal
Phase 5에서 노출된 접근성 블록커와 디자인 부채를 해결하여, Apple 수준의 프리미엄 품질과 포용성을 확보합니다.

## Decisions

### 1. Accessibility (WCAG AA Standard)
- **ARIA Labels**: 모든 버튼, 입력 필드, 인터랙티브 차트 영역에 `aria-label`을 추가합니다.
- **Semantic HTML**: `SimulationControls` 등에서 `label`과 `id`를 명확히 연결하여 스크린 리더 호환성을 확보합니다.
- **Keyboard Navigation**: 차트 스크러빙 및 탭 전환 시 키보드 접근성을 지원합니다.

### 2. Chart Accessibility (Hidden Table Fallback)
- **Implementation**: 시각 장애 사용자를 위해 차트의 데이터를 요약된 HTML `<table>` 형태로 제공하되, 시각적으로는 숨깁니다 (`sr-only`).
- **Target**: `SnowballChart.tsx` 및 `BacktestChart.tsx`.

### 3. Design Tokenization & Cleanup
- **Typography Alignment**: 
  - `text-[10px]` → `text-micro-legal`
  - `text-[11px]`, `text-[12px]` → `text-fine-print` (12px)
  - `text-[13px]` → `text-caption` (14px)
  - 헤드라인 굵기를 `font-bold` (700)에서 `font-semibold` (600)으로 조정 (DESIGN.md 준수).
- **Color Tokenization**: 
  - `BacktestChart.tsx`의 하드코드된 hex 값 (`#007AFF`, `#8e8e93` 등)을 Tailwind `apple-` 토큰으로 교체합니다.
  - SVG 내부의 `stroke`, `fill` 속성을 CSS 변수나 Tailwind `theme()` 함수를 사용하도록 수정합니다.
- **Grid Alignment**: 차트 내부의 하드코드된 여백(margins)을 8px 그리드 단위에 맞게 조정합니다.

### 4. Interaction Polish (UI-04)
- **Scrubbing UX**: 차트 스크러빙 시 툴팁의 반응성 및 위치 정합성을 최종 고도화합니다.
- **KPI Animation**: 데이터 변경 시 `AnimatedCounter`의 부드러움을 유지하며 접근성 알림(Aria-live)을 연동합니다.

## Technical Notes
- **Accessibility Verification**: `axe-core` 또는 브라우저 라이트하우스 접근성 점수 90점 이상을 목표로 합니다.
- **Token Map**:
  - `Action Blue`: `theme('colors.apple.primary')` (#0066cc)
  - `Muted Gray`: `theme('colors.apple.ink-muted-48')` (#7a7a7a)
  - `Fine Print`: `12px` / `leading-none` / `-0.12px tracking`

## Deferred
- 다크 모드 완전 지원 (디자인 시안 확정 후로 연기).
- 복잡한 차트 내부의 키보드 세부 탐색 (Phase 7 이후 고려).
