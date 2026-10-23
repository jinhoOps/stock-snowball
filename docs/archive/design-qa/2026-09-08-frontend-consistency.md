# 프론트엔드 일관성 정리 QA

점검일: 2026-09-08. 기준 커밋: `10690988669ae279a297398d93dda351350d8740`.
사용자가 승인한 전체 정리 범위에 따라 기존 Frost Blue·밝은 표면·둥근 형태를 유지하고, 디자인 문서와 공통 컴포넌트 및 실제 화면을 맞췄다.

## 확인한 문제와 반영 결과

| 변경 전 | 반영 결과 |
| --- | --- |
| DESIGN.md에 iPhone 구매 페이지 등 제품과 무관한 규칙 혼재 | 시뮬레이션·백테스트·설정·시나리오·공유 이미지 중심의 구현 규격으로 개정 |
| 사용 중인 제목·상태 색상 토큰의 CSS 누락 | CSS 변수와 Tailwind 연결, 실제 CSS 생성 검사 추가 |
| 기본 납입 주기 20.7px, 설정의 같은 선택은 40px 높이 | 이름과 선택 상태를 제공하는 공통 선택 컴포넌트, 최소 44px 조작 영역 |
| 입력마다 스타일과 레이블 연결을 별도 구현 | Field/Input/Select/NumericInput 공통 표현, 입력 높이 48px |
| 백테스트 지표의 지정 크기가 무효여서 16px로 표시 | MetricCard를 공유하고 숫자 24px, 제목 20px로 표시 |
| 내비게이션이 설정 제목·닫기 버튼을 덮음 | body 포털과 명시적 레이어, Tab 가두기·Escape·닫기 후 포커스 복원 |
| 시나리오 카드의 포인터 조작과 버튼이 혼재 | 불러오기·비교·삭제를 독립된 버튼으로 제공하고 시나리오 이름으로 구분 |
| CAGR에 금액 보조 표기, 음수 수익률에 중복 부호 가능 | 백분율에서 금액 설명 제외, 음수 부호 유지 |
| 공유 PNG의 짧은 레이블·단위·날짜가 줄바꿈되며 겹침 | 폭과 행간을 명시하고 짧은 문자열은 한 줄 유지, 긴 제목은 최대 두 줄 |

공통 스타일의 원본은 `src/styles/components.css`이고, Button/Surface/Notice의 변형은 완전한 클래스 문자열 맵으로 연결한다. 동적인 클래스 조합으로 인해 Tailwind가 변형 스타일을 제거하는 문제를 리뷰와 브라우저 검사로 발견해 수정했다.

기간 직접 입력을 비웠을 때의 값은 기존 부모 정규화 함수에 그대로 전달한다. 계산 엔진, 과거 데이터, DB 스키마·저장 모듈, 의존성 잠금 파일은 변경하지 않았다.

## 검증 결과

| 명령 | 결과 |
| --- | --- |
| `npm run design:check` | 앱 파일 42개에서 토큰 유틸리티 110개 생성 확인 |
| `npm run design:check:test` | 잘못된 토큰·투명도·반응형·정적 클래스 맵 관련 3개 통과 |
| `npm test -- --reporter=dot` | 파일 29개, 테스트 196개 통과 |
| `npm run build` | TypeScript·Vite·PWA 빌드 통과 |
| `npm run test:e2e -- --workers=2` | 데스크톱·모바일 Chromium 총 22개 통과 |
| `npx playwright test e2e/frontend-consistency.spec.ts --workers=2` | 마지막 글자 배치·공유 이미지 수정 후 관련 8개 재검증 통과 |
| `git diff --check` | 통과 |

설정의 임시 편집·취소·적용, 포커스 복원, Tab/Shift+Tab 순환, 배경 inert와 스크롤 상태 복원, 도움말의 키보드 탐색과 Escape 우선 처리를 실제 상호작용 테스트로 확인했다. 기존 백테스트·레버리지·시장 추세·시나리오 비교 테스트도 통과했다.

소스의 HEX 문자열 및 클래스 개수를 세던 두 검사는 실제 브라우저의 시장선 대비(최소 3:1)와 내비게이션의 동작 줄이기 상태 검사로 옮겼다. 새 화면 검증은 미디어 설정을 명시적으로 적용하고 `matchMedia` 결과도 확인한다.

## 화면 확인

데스크톱 1440×1000, 모바일 390×844에서 아래 캡처를 직접 열어 확인했다. 캡처는 E2E 실행으로 생성되는 `test-results/visual-review/`에 있으며 Git에는 포함하지 않는다. 다시 실행하면 같은 경로에 생성된다.

| 화면 | 데스크톱 | 모바일 |
| --- | --- | --- |
| 기본 입력 | [캡처](../../test-results/visual-review/frontend-projection-desktop-chromium.png) | [캡처](../../test-results/visual-review/frontend-projection-mobile-chromium.png) |
| 지표와 공유 동작 | [캡처](../../test-results/visual-review/frontend-metrics-desktop-chromium.png) | [캡처](../../test-results/visual-review/frontend-metrics-mobile-chromium.png) |
| 설정 Sheet | [캡처](../../test-results/visual-review/frontend-settings-desktop-chromium.png) | [캡처](../../test-results/visual-review/frontend-settings-mobile-chromium.png) |
| 백테스트·큰 금액 | [캡처](../../test-results/visual-review/frontend-backtest-desktop-chromium.png) | [캡처](../../test-results/visual-review/frontend-backtest-mobile-chromium.png) |
| 긴 시나리오 이름 | [캡처](../../test-results/visual-review/frontend-scenarios-desktop-chromium.png) | [캡처](../../test-results/visual-review/frontend-scenarios-mobile-chromium.png) |
| 공유 PNG | [이미지](../../test-results/visual-review/frontend-share-desktop-chromium.png) | [이미지](../../test-results/visual-review/frontend-share-mobile-chromium.png) |
| 긴 제목 공유 PNG | [이미지](../../test-results/visual-review/frontend-share-long-desktop-chromium.png) | [이미지](../../test-results/visual-review/frontend-share-long-mobile-chromium.png) |

입력 정렬, 44px 조작 영역, 지표 크기, 페이지 가로 넘침, 스크롤 후 설정 닫기 버튼의 실제 최상단 표시를 브라우저에서 검증했다. 기본·긴 제목의 다운로드가 정상 PNG이고 1200×1560px인지 확인했다. 화면의 전체 시나리오 이름은 줄바꿈하며, 공유 이미지의 긴 제목만 두 줄로 제한한다.

## 재발 방지와 범위

PR용 `frontend-checks.yml`에 토큰 검사·검사 자체의 테스트·단위 테스트·빌드·E2E를 연결했다. 기존 배포 워크플로에도 토큰 검사를 추가했다. CI 정의는 로컬에서 검토했으며 원격 실행·배포는 수행하지 않았다.

검증 범위는 Chromium의 데스크톱·모바일 뷰포트와 jsdom이다. 실제 iOS/Safari 및 스크린 리더 장비 검증은 포함하지 않는다. 기존 jsdom `scrollTo` 경고와 과거 데이터 번들의 크기 경고는 남아 있으나 테스트와 빌드는 성공했다.
