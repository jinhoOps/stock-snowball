---
phase: 07-ui-ux-refinement
plan: 02
subsystem: UI/UX Refinement
tags: [GlobalNav, AdvancedSettings, DynamicLabels]
requirements: [UI-01, UI-06]
key-files: [src/components/layout/GlobalNav.tsx, src/components/sections/AdvancedSettingsSheet.tsx, src/components/sections/SimulationControls.tsx]
decisions:
  - "Moved 'Advanced Settings' entry point to the top-right header (GlobalNav) for a cleaner UI."
  - "Added manual exchange rate and contribution cycle settings to the advanced sheet."
  - "Implemented dynamic input labels that respond to the selected contribution cycle (Daily/Weekly/Monthly)."
metrics:
  duration: 15m
  completed_date: "2026-05-13"
---

# Phase 07 Plan 02: Advanced Settings & Dynamic Labels Summary

고급 설정의 접근성을 개선하고 사용자의 설정에 따라 반응하는 유연한 UI를 구현했습니다.

## 주요 변경 사항

### 1. 헤더 설정 아이콘 도입
- `GlobalNav.tsx` 우측 끝에 Apple 스타일의 설정(Gear) 아이콘을 추가했습니다.
- 메인 화면의 '고급 설정' 버튼을 제거하고 헤더로 통합하여 미니멀리즘을 강화했습니다 (UI-06 준수).

### 2. 고급 설정 항목 확장
- `AdvancedSettingsSheet.tsx`에 환율(Exchange Rate) 직접 입력 필드를 추가했습니다.
- 납입 주기(Contribution Cycle: Daily, Weekly, Monthly) 선택 기능을 추가했습니다.

### 3. 컨텍스트 반응형 레이블
- `SimulationControls.tsx`에서 선택된 납입 주기에 따라 입력 필드의 레이블이 동적으로 변경되도록 수정했습니다 (예: "매일 납입액", "매주 납입액").

## 테스트 결과
- 수동 환율 입력 시 전체 시뮬레이션 결과가 즉시 반영됨을 확인했습니다.
- 납입 주기 변경 시 메인 화면의 레이블이 실시간으로 갱신됨을 확인했습니다.

## Deviations from Plan
None.
