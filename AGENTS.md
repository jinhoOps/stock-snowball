# Stock Snowball — Agent Guide

적립식 투자 시뮬레이션(스노우볼)과 과거 데이터 백테스트를 보여주는 React + Vite PWA. 금액·기간·수익률을 정확하게 계산하고, 결과를 빠르고 즐겁게 체감하게 하는 것이 목표다.

## 작업 시작 전

1. `docs/plan.md`에서 현재 단계와 다음 작업을 확인한다. 작업 ID(예: `A3`)로 범위를 정한다.
2. UI를 바꾼다면 `DESIGN.md`(디자인 계약)를 따른다. 계약을 바꾸는 작업이면 같은 변경에서 `DESIGN.md`도 고친다.
3. 계산 규칙은 `docs/calculation-audit.md`를 참고한다. 금융 계산은 `decimal.js` 기반 엔진(`src/core`)을 거치며 화면 컴포넌트에 계산 로직을 넣지 않는다.

## 작업 중·후

- 작업이 끝나면 `docs/plan.md`의 체크박스와 "결정 기록"을 갱신한다. 새로 발견한 문제는 적절한 단계에 항목으로 추가한다.
- 코드 변경을 커밋할 때 `package.json`의 patch 버전을 +1 한다.
- 화면 변경은 실제 브라우저에서 데스크톱(1440)과 모바일(390) 모두 확인한다. Orca 내장 브라우저(`orca` CLI) 또는 Playwright를 쓴다. dev 서버 base 경로는 `/stock-snowball/`.

## 명령

| 목적 | 명령 |
| --- | --- |
| 개발 서버 | `npm run dev` |
| 단위 테스트 | `npm test` |
| 타입·빌드 | `npm run build` |
| 디자인 토큰 검사 | `npm run design:check` |
| E2E | `npm run test:e2e` |
| 시장 데이터 갱신·검사 | `npm run data:refresh`, `npm run data:check` |

## 모션 원칙

- 숫자·카운트·리액션 모션은 anime.js(`animejs`)를 우선한다. 레이아웃 전환과 진입·퇴장은 framer-motion을 쓴다.
- `prefers-reduced-motion`에서는 움직임을 줄이고 최종 값은 즉시 보여준다.
- 축하 효과는 두 종류다. 자동 축하는 사용자의 명확한 달성 순간에만, 장난감(눈 뭉치)은 사용자가 원할 때 언제든.

## 기록 보관

이전 계획·QA·에이전트 문서는 `docs/archive/`에 있다. 참고용이며 현재 작업 기준이 아니다.
