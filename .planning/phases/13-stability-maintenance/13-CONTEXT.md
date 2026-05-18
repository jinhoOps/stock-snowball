# Context: Phase 13 - Stability & Issue Resolution

GitHub 이슈 #1에서 보고된 버그 해결 및 전반적인 시스템 안정성 강화를 위한 의사결정 사항입니다.

## 1. 개요 (Overview)
- **Phase**: 13
- **Goal**: 공유 이미지 레이아웃 오류 수정 및 납입 주기 설정 미반영 버그 해결
- **Source**: GitHub Issue #1

## 2. 주요 의사결정 (Key Decisions)

### 2.1 공유 이미지 줄바꿈 오류 (Issue #1-1)
- **현상**: '매주 얼마씩?' 영역에서 금액과 단위(원)가 강제로 줄바꿈됨.
- **해결 방식**: **Layout Adjustment**
    - `ShareCard.tsx` 내 해당 텍스트 컨테이너의 너비를 충분히 확보하거나 `whitespace-nowrap`을 적용하여 줄바꿈을 방지합니다.
    - 필요시 텍스트 영역의 padding을 조정하여 시각적 정합성을 유지합니다.

### 2.2 납입 주기 설정 미반영 오류 (Issue #1-2)
- **현상**: 사용자가 납입 주기를 변경해도 시뮬레이션 결과에 반영되지 않음.
- **원인 분석**: `App.tsx`의 `activeSimulation` useMemo 내에서 `SnowballEngine.simulateRange` 호출 시 `strategy` 객체에 `cycle` 속성을 누락함.
- **해결 방식**:
    - `App.tsx` 내의 모든 `simulateRange` 호출부(비교군 포함)를 검토하여 `cycle` 파라미터가 정확히 전달되도록 수정합니다.
    - `BacktestEngine.run` 호출부에서도 `cycle` 정합성을 재확인합니다.

## 3. 구현 가이드라인 (Implementation Guidelines)
- **Surgical Fixes**: 기존 로직을 대규모로 변경하지 않고, 발견된 버그 지점을 정확히 타격하여 수정합니다.
- **Verification**: 
    - 수정 후 실제 공유 이미지를 캡처하여 줄바꿈 여부를 확인합니다.
    - 납입 주기를 '일/주/월'로 변경하며 결과값이 즉각적으로, 그리고 논리적으로 타당하게(예: 일간 납입 시 복리 효과 증가) 변경되는지 검증합니다.

## 4. 제외 범위 (Out of Scope)
- 새로운 데이터 프리셋 추가
- 대규모 UI 리디자인
- 성능 최적화 (이슈 해결에 직접적인 관련이 없는 경우)

## 5. 다음 단계 (Next Steps)
- `13-01-PLAN.md`를 작성하여 이슈 #1에 대한 구체적인 수정 계획 수립 및 실행.
