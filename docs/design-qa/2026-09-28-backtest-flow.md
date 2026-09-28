# 백테스트 회복 기간 및 모바일 흐름 점검

점검일: 2026-09-28. 최신 데이터와 기능을 포함한 프로덕션 빌드를 Vite preview로 실행했다. Chromium의 데스크톱 1440×1000, 모바일 너비 390px, 작은 화면 320px에서 확인했다. 실제 iOS·Android 기기 검증은 포함하지 않는다.

## 확인한 흐름

| 단계 | 확인 내용 | 결과 및 화면 |
| --- | --- | --- |
| 1. 종목 선택 | 나스닥 가족 선택, 기준 종목 변경·제거, 개별 비교 추가, 3종목 제한, 적용 조건 | 통과. [모바일 종목 선택](../../test-results/visual-review/qa-01-assets-mobile-chromium.png) |
| 2. 위기 구간 | 코로나 급락(2020-02-19~03-23)에 QQQ·QLD·TQQQ 모두 미회복과 33일 경과 표시 | 통과. [미회복 표시](../../test-results/visual-review/qa-02-unrecovered-mobile-chromium.png) |
| 3. 기간 변경 | 종료일을 2021-01-04로 변경, 적용·취소·입력 오류, 달력 연월 이동, 포커스 복원 | 통과. [모바일 달력](../../test-results/visual-review/qa-03-dates-mobile-chromium.png) |
| 4. 회복 비교 | QQQ 105일(2020-06-03), QLD 133일(2020-07-01), TQQQ 142일(2020-07-10) | 통과. [회복 결과](../../test-results/visual-review/qa-04-recovered-mobile-chromium.png) |
| 5. 표시·화면 크기 | 납입액 및 투자 결과/시작값 100 전환에도 회복 기간 유지. 명목·실질·금 기준 전환. 320px에서 가로 넘침 없음 | 통과. [320px 회복 카드](../../test-results/visual-review/qa-05-recovery-small-mobile.png) |
| 6. 공유 | 설정한 기간·금액으로 PNG 다운로드. 기본·긴 시나리오 이름의 공유 이미지도 검증 | 통과. [백테스트 공유 이미지](../../test-results/visual-review/qa-06-backtest-share-mobile-chromium.png) |

최종 캡처를 직접 열어 카드 줄바꿈, 날짜·금액·설명 잘림 여부, 달력과 하단 적용 버튼을 확인했다. 캡처는 저장소에서 제외된 `test-results/visual-review/`에 있으며 E2E 재실행으로 생성할 수 있다. 기존 키보드·포커스·44px 터치 대상 검사를 함께 실행했지만, 스크린 리더 전체 점검이나 접근성 표준 전체 인증을 뜻하지 않는다.

## 구현과 수정

- `getMaxDrawdownRecovery`는 선택한 상품 총수익 지수의 최대낙폭을 만든 직전 고점부터 첫 회복일까지 달력 일수를 계산한다. 기간 밖의 미래 회복은 사용하지 않는다.
- 회복, 미회복, 낙폭 없음, 데이터 부족을 구분하며 명목·실질·금 기준의 표시 시계열을 따른다. 동일한 깊이의 별도 낙폭은 처음 구간을 유지하고, 하락 직전 같은 고점이 반복되면 마지막 고점 날짜를 사용한다.
- 새 회복 카드는 기존 4개 핵심 지표와 구분해 비교 자산별로 표시한다. 카드의 `<li>` 역할을 보존하면서 내부에 이름 있는 그룹을 두었다.
- 기존 E2E의 낡은 CAGR 명칭, 제거된 30년 제한 기대값, 중복 종목명 선택자를 수정했다. 새 E2E는 회복 여부 전환·납입액 독립성·가치 기준·모바일·공유까지 연결한다.
- 개발 서버의 소스 변경에 따른 재로딩이 검증에 섞이지 않도록 최종 전체 E2E는 빌드된 앱에서 실행했다.

## 검증

- `npm test`: 35개 파일, 296개 통과.
- `npm run test:e2e -- --workers=2`: 데스크톱·모바일 총 42개 통과.
- `npm run data:check`: 17개 시계열 통과.
- `uv run python -m unittest tests/test_market_data.py`: 47개 통과.
- `npm run design:check`, `npm run design:check:test`: 토큰 검사 및 검사기 테스트 3개 통과.
- `npm run build`: TypeScript, Vite, PWA 생성 통과.
- `git diff --check`: 통과.

기존의 큰 시세 데이터 청크 경고와 jsdom `scrollTo` 미구현 안내는 남아 있다. 데이터 출처·보정 근거·전체 갱신 범위는 [시장 데이터 갱신 보고서](../market-data-refresh-2026-09-28.md)에 기록했다. 위 검증은 커밋·푸시·배포 전에 수행했다.
