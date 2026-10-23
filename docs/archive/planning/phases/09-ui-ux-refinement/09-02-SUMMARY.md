---
phase: 09-ui-ux-refinement
plan: 02
subsystem: Backtest
tags: [multi-asset, comparison, chart, visx]
requires: [09-01]
provides: [Multi-asset comparison in BacktestView]
affects: [BacktestView, BacktestChart]
tech-stack: [React, visx, framer-motion]
key-files: [src/components/sections/BacktestView.tsx, src/components/charts/BacktestChart.tsx]
decisions:
  - "BacktestView에서 직접 추가 자산의 백테스트를 실행하여 비교 기능을 독립적으로 구현함"
  - "최대 3개 자산으로 제한하여 성능 및 시각적 명확성 유지"
  - "범례 및 상세 툴팁을 통해 다중 데이터 가독성 확보"
metrics:
  duration: 45m
  completed_date: "2026-05-15"
---

# Phase 09 Plan 02: Multi-asset Comparison Summary

백테스트 모드에서 최대 3개의 자산을 선택하여 성과를 비교할 수 있는 기능을 구현했습니다.

## Key Changes

### 1. BacktestView 다중 자산 선택 및 비교 구현
- **Asset Selector Chips**: SPY, QQQM 등 주요 자산을 즉시 선택하여 비교군에 추가할 수 있는 UI 구현.
- **Comparison Table**: 선택된 자산들의 최종 자산, 누적 수익률, CAGR, MDD, 변동성을 한눈에 비교할 수 있는 테이블 그리드 추가.
- **Engine Integration**: `BacktestView` 내에서 `BacktestEngine.run`을 호출하여 비동기적인 시나리오 추가 없이도 실시간 비교 데이터 생성.

### 2. BacktestChart 다중 라인 시각화
- **Multi-line Chart**: `visx`를 사용하여 각 자산별 수익률 곡선을 서로 다른 색상의 라인으로 표시.
- **Enhanced Tooltip**: 스크러빙 시 선택된 모든 자산의 해당 시점 가치와 수익률을 동시에 보여주는 상세 툴팁 구현.
- **Improved Legend**: 각 라인이 어떤 자산을 나타내는지 명확히 보여주는 범례 추가.

### 3. 데이터 무결성 및 성능
- `useMemo`를 통한 백테스트 계산 최적화.
- 최대 3개 자산 제한을 통한 브라우저 리소스 소모 방지.

## Deviations from Plan

- 없음. 계획된 모든 기능이 정상적으로 구현되었습니다.

## Self-Check: PASSED

- [x] 최대 3개 자산 선택 및 비교 기능 동작 확인
- [x] 차트 다중 라인 및 툴팁 정합성 확인
- [x] `npm test` 및 `npm run build` 통과

## Commits
- `c997205`: feat(09-02): implement multi-asset backtest comparison
- `c6e3988`: chore: bump version to 1.0.51
