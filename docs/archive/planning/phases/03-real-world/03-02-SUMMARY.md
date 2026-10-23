---
phase: "03-real-world"
plan: "02"
subsystem: "UI/UX"
tags: ["ui", "components", "framer-motion", "slide-over"]
dependency_graph:
  requires: ["03-01"]
  provides: ["AdvancedSettingsSheet", "SimplifiedSimulationControls"]
  affects: ["App.tsx", "SimulationControls.tsx", "AdvancedSettingsSheet.tsx"]
tech_stack:
  added: ["framer-motion (slide-over UI)"]
  patterns: ["Slide-over Panel", "Progressive Disclosure"]
key_files:
  created:
    - "src/components/sections/AdvancedSettingsSheet.tsx"
  modified:
    - "src/components/sections/SimulationControls.tsx"
    - "src/App.tsx"
    - "package.json"
key_decisions:
  - "SimulationControls.tsx를 핵심 입력(초기 자산, 월 불입액, 투자 기간)만 남기고 단순화하여 인지 부하 감소."
  - "복잡한 금융 설정(투자 자산 선택, 수익률, 계좌 유형, 물가상승률 등)을 AdvancedSettingsSheet로 분리하여 Progressive Disclosure(점진적 공개) 원칙 적용."
  - "AdvancedSettingsSheet는 데스크탑에서는 우측에서, 모바일에서는 하단에서 나타나도록 반응형 Slide-over 구현."
metrics:
  duration: 3m
  tasks_completed: 2
  files_created_or_modified: 4
---

# Phase 03 Plan 02: Advanced Settings & Simplified Controls Summary

## Objective
"고급 설정" Slide-over 패널을 구현하고 메인 입력기를 단순화하여 사용자의 초기 인지 부하를 줄이면서도 정교한 시뮬레이션 설정이 가능하도록 개선했습니다.

## Tasks Completed
- **Task 1: AdvancedSettingsSheet (Slide-over) Implementation**
  - `framer-motion`을 사용하여 데스크탑(Right Sheet) 및 모바일(Bottom Sheet)에 맞는 반응형 슬라이드 오버 패널 구현 완료.
  - 고급 설정 값(자산 선택, 기대 수익률, 계좌 유형, 투자 전략, 물가상승률) 폼 구축.
- **Task 2: SimulationControls Simplification**
  - 핵심 입력 요소(초기 자산, 월 불입액, 투자 기간) 위주로 간소화.
  - "고급 설정" 진입을 위한 Trigger 버튼 배치.
  - `App.tsx`에서 두 컴포넌트 간의 State 연결 및 Modal 제어 로직 적용 완료.
  - `package.json` 버전 Bump 완료 (1.0.14).

## Deviations from Plan
None - plan executed exactly as written.

## Threat Flags
- None. (설정값은 클라이언트 로컬 상태이므로 외부 유출 위험 낮음)

## Next Steps
- 백테스팅 엔진 고도화 파트 (과거 데이터 주입, 시뮬레이션 모델 적용) 구현.
