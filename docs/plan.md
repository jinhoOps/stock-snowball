# Stock Snowball 작업 계획

2026-10-23 디자인 리뷰(화면 캡처 기반, 두 리뷰 통합)에서 시작했다. 목표는 **결과를 빨리 보여주고, 입력에 즉각 반응하며, 만지는 재미가 있는 시뮬레이터**다.

디자인 개편 순서: A → B(+C3~C5) → C 나머지 → D. E는 계산 바로잡기이며 완료했다. 다음 작업은 **F. 시장 데이터 자동 갱신**이다. 상태: `[ ]` 할 일, `[~]` 진행 중, `[x]` 완료.

## A. 빠른 정리

작고 서로 독립적이며 바로 체감되는 항목.

- [x] **A1 축하 효과 분리**
  - 자동 축하: 사용자가 입력을 바꿔 새 목표 금액(1억·5억·10억·50억·100억)을 처음 넘을 때만. 첫 접속, 모드 전환, 시나리오 불러오기, 통화 변경으로는 터지지 않는다. 슬라이더는 조작이 멈춘 뒤 판정한다. 같은 목표는 세션당 한 번. 대표 금액 위치에서 작게 터진다.
  - 장난감 눈 뭉치: 화면 구석에 떠 있는 오브젝트. 모드와 상관없이 언제든 눌러서 눈을 터뜨린다. 연타 콤보, 짧은 쿨다운, anime.js 기반. 상세 리액션은 D에서 다듬는다.
- [x] **A2 대표 금액 카운트** — 대표 금액에 anime.js 카운트를 적용하고 KPI와 같은 속도로 맞춘다. 대표 금액에서 KPI로 이어지는 순서를 둔다.
- [x] **A3 차트 호버 정리** — 호버는 차트 안 툴팁만 표시한다. 상세 패널은 클릭·탭으로 열고 고정한다. 현재는 호버만으로 패널이 열려 페이지가 길어지고, 마우스를 빼도 닫히지 않는다(`App.tsx` `onPointHover`).
- [x] **A4 입력 금액 자릿수 구분** — 입력 중에도 `10,000,000`처럼 콤마를 표시한다.
- [x] **A5 금액·단위 줄바꿈 방지** — 데스크톱 5열 KPI와 모바일 2열 카드에서 "원"이 다음 줄로 떨어지지 않게 한다.
- [x] **A6 한글 자간** — 한글 레이블의 `uppercase tracking-widest`를 제거한다(백테스트 비교표 헤더, 기간 프리셋 레이블).
- [x] **A7 공유 버튼 통일** — 스노우볼(secondary)과 백테스트(primary)의 공유 버튼 위계를 맞춘다.

## B. 레이아웃 재구성 — 최우선 문제

현재 결과 위치: 모바일 스노우볼은 금액이 첫 화면 밖이다. 백테스트는 결과가 약 1,870px, 차트가 약 2,590px 아래에 있다. 기본 백테스트에서 차트 앞에 조작 요소가 약 30개 있다.

- [x] **B1 도구형 헤더** — 큰 소개 문구(`ProductHero`, `min-h-[90vh]`)를 짧은 헤더로 줄인다. 검은 내비 바도 함께 재설계한다(서비스 이름, 모드 전환 배치 검토).
- [x] **B2 데스크톱 백테스트 2열** — 왼쪽은 조건(sticky), 오른쪽은 대표 결과와 차트.
- [x] **B3 스노우볼 데스크톱** — 2열 대신 입력을 상단 한 줄로 압축하고 결과·차트를 바로 아래에 둔다.
- [x] **B4 요약 우선 노출** — 기본 화면에는 종목·기간·투자 조건 요약만 두고, 누르면 편집이 열린다.
- [x] **B5 모바일 하단 결과 바** — 최종 자산과 수익률을 하단에 고정한다. 장난감 눈 뭉치와 위치가 겹치지 않게 한다.
- [x] **B6 차트 컨트롤 통합** — 결과 보기(투자 결과/시작값 100), 기준(명목/실질/금), 시장 추세를 차트 카드 상단으로 모은다.

## C. 정보 정리

- [x] **C1 스노우볼 지표 재구성** — 대표 블록(최종 자산) + 투자 원금·수익금. 누적 적립금·IRR은 펼쳐보기.
- [x] **C2 환산 금액 반복 제거** — 달러 환산은 대표 금액에만 둔다.
- [x] **C3 계산 조건 요약** — 결과 옆에 "연 7% · 매일 3만 원 · 10년"을 보여주고, 누르면 해당 설정을 연다. 기대 수익률을 고급 설정 밖으로 드러내는 방법이다.
- [x] **C4 종목 선택 흐름 통합** — 비교 종목 추가와 레버리지 묶음을 하나의 선택 흐름으로 합친다.
- [x] **C5 백테스트 중복 제거** — 종목이 1개면 비교표를 숨긴다. "적용 조건" 카드는 B4 요약으로 흡수한다.
- [x] **C6 펼치기 컴포넌트 통일** — 비교 종목 추가, 경제 위기 시나리오, 추가 기간.
- [x] **C7 설명문 정리** — 계산 기준 설명은 ⓘ 또는 하단 각주로 옮긴다.
- [x] **C8 문구 다듬기** — 예: "레버리지 가족" → "레버리지 묶음", "시나리오 저장 및 비교군 추가" → "시나리오 저장".
- [x] **C9 납입 주기 중복 제거** — 고급 설정 시트에서 뺀다.

## D. 미감과 동적 리액션

anime.js 기반 리액션을 중심으로 한다. 사용자가 "반응이 다양하면 좋겠다, 알아서 진행"으로 범위를 위임했다.

- [x] **D1 리액션 설계** — 입력 변경 → 대표 금액 → KPI → 차트로 이어지는 반응 흐름, 장난감 눈 뭉치 리액션, 자동 축하 연출. 세부는 DESIGN.md "결과 반응", "축하와 장난감".
- [x] **D1b 작은 반응** — 선택 알약이 미끄러지듯 이동(글자색은 알약이 도착할 때 바뀜), 펼치기 높이 전환(닫기는 즉시), 선택 카드·세그먼트 눌림.
- [x] **D2 표면 위계** — `Surface tone` 3단계(raised·default·quiet). 차트는 raised, 세부 카드·빈 상태는 quiet.
- [x] **D3 카드 중첩 제거** — 위기 시나리오 카드(C6), 레버리지 성과는 카드 대신 구분선 행.
- [x] **D4 KPI 강조 정리** — 강조는 대표 금액 하나(C1에서 Milestone 배지 제거). 백테스트 4열 지표는 20px로 낮춰 `투자원금` 줄바꿈 해결.
- [x] **D5 차트 팔레트 토큰화** — `SERIES_PALETTE` 하나로 통일, 첫 색 Frost Blue. 스노우볼 저장 시나리오의 검정·회색 계열을 구별되는 색으로 교체.
- [x] **D6 빈 상태와 회복 카드** — 저장된 시나리오 빈 상태, 회복 기간 타임라인.

## E. 계산 바로잡기

- [x] **E1 참조 자산 수익률을 실제 CAGR로** — 고급 설정의 "기대 수익률 (CAGR)"이 실제로는 1년 구간 수익률의 중앙값이라 높게 나왔다(QQQ 16.8% vs CAGR 10.7%, TQQQ 55.1% vs 41.4%). 배당 포함 전체 기간 CAGR로 바꾸고 변동성·최대낙폭을 함께 보여준다.
- [x] **E2 참조 자산 범위를 과거 이력 재표집으로** — 자산별 하드코딩 변동성(QQQ 18% 등) 대신, 그 자산의 과거 일간 수익률을 1년 블록으로 재표집해 범위를 만든다. 사용자 정의는 기존 로그정규(20%) 유지.
- [x] **E3 참조 자산 정리** — 스노우볼 참조 자산은 나스닥 1·2·3배, SPY, 코스피 200, SCHD, 금(GC=F)만 남긴다. 백테스트 자산은 그대로.

## F. 시장 데이터 자동 갱신

**선택한 방식:** GitHub Actions에서 기존 Python 수집·검증기를 실행하고 Supabase Storage에 게시한다. 앱은 공개 파일을 받아 기기에 저장한다. 일상적인 데이터 갱신에는 로컬 PC, Git 커밋, 앱 재배포가 필요하지 않게 한다.

- [x] **F0 설계·계획** — 추천안을 선택하고 아래 「F 설계 및 구현 계획」에 계약·작업 순서·완료 기준을 정리한다. 구현·Supabase 설정은 아직 시작하지 않았다.
- [x] **F1 데이터 계약과 계산용 접근 분리** — 정적 CSV와 원격 CSV를 같은 검증·파싱 경로로 읽는다. 기존 계산 결과를 보존한다.
- [ ] **F2 Storage 게시·복구 도구** — 전체 카탈로그를 변경 불가능한 버전으로 올리고, 마지막에 최신 버전 포인터를 바꾼다. 증분 수집은 원격 마지막 정상 버전에서 시작한다.
- [ ] **F3 예약 수집 워크플로** — 매일 한국 시간 10:17에 전날까지의 데이터를 수집·검증·게시한다. 수동 재실행도 제공한다.
- [ ] **F4 브라우저 로더와 오프라인 캐시** — 마지막 정상 캐시 또는 동봉 CSV로 시작한다. 새 버전은 전체 검증·저장이 끝난 뒤 다음 페이지 로드에서 사용한다.
- [ ] **F5 앱·PWA 연동과 데이터 기준일** — 시세·벤치마크·참조 CAGR이 같은 버전을 사용하게 한다. 새 데이터 적용 동작과 읽기 실패 안내를 제공한다.
- [ ] **F6 운영 설정·전환 검증** — 전용 버킷·Actions 비밀값 설정, 첫 게시, 앱 배포, PC를 끈 상태의 예약 실행, 장애·롤백을 확인한다.

상세 설계와 파일별 실행 순서는 [F 설계 및 구현 계획](#f-설계-및-구현-계획)에 둔다. 별도 계획 파일은 만들지 않는다.

## 진행 메모

- 2026-10-26 F0 계획 작성. Actions → Supabase Storage → 브라우저 캐시 방식과 F1~F6 실행·검증 순서를 정리했다. 앱 코드·외부 설정은 변경하지 않았다.

- 2026-10-23 A단계 완료. 검증: 단위 316개, E2E 44개, 빌드, 디자인 토큰 검사 통과. Orca 브라우저(1039px)와 Playwright(1440·390px)로 확인.
  - A3: 차트 호버는 툴팁만, 클릭·탭하면 상세 패널이 열린다(스노우볼·저장 시나리오 비교 차트 모두).
  - A5: 단위가 혼자 줄바꿈되지 않지만, 데스크톱 5열 첫 카드는 여전히 `1억 / 3,138만 원` 두 줄이다. C1에서 지표를 3개로 줄이면 해결된다.

- 2026-10-23 B단계 완료. 검증: 단위 317개, E2E 44개, 빌드, 디자인 토큰 검사 통과.
  - B1: 검은 바와 큰 제목을 없애고 밝은 헤더에 모드·통화·설정을 모았다. 모바일 헤더에는 로고를 숨긴다(폭 부족).
  - B4: 데스크톱은 왼쪽 열에 편집기를 항상 펼치고, 요약은 모바일에서만 보인다. E2E는 `e2e/helpers.ts`의 `openBacktest`로 모바일 편집기를 연다.
  - 남은 것: 데스크톱 백테스트 지표 4열에서 `투자원금`이 두 줄(C1/C5에서 정리). 모바일 차트 헤더 컨트롤이 3줄로 쌓인다(D2에서 정리 검토).

- 2026-10-23 C1·C2·C3·C9 완료.
  - C1: 대표 금액과 겹치는 "최종 예상 자산" 카드와 Milestone 배지를 없애고 투자 원금(초기+적립 내역)·총 수익금·연 수익률 3개로 줄였다.
  - C3: 대표 금액 아래에 "연 8.0% · 매일 3만 원 · 10년 · 일반 계좌"를 표시하고, 누르면 고급 설정이 열린다.
  - 덤: 모바일에서 스노우볼 차트 범례가 카드 밖으로 넘치던 문제를 고쳤다(차트 영역 높이를 직접 지정).

- 2026-10-23 C4~C8 완료. 단위 320개, E2E 44개 통과.
  - C4: "비교 종목 추가"와 "레버리지 가족"을 하나의 펼치기 "종목 추가 · 레버리지 비교"로 합쳤다. 기본 상태에서 차트 앞 조작 요소가 크게 줄었다.
  - C5: 종목이 1개면 비교표·모바일 카드 대신 포트폴리오 IRR과 변동성 한 줄만 보여준다.
  - C6: 공통 `Disclosure`를 만들어 종목 추가, 경제 위기 시나리오, 회복 이후 장기 구간에 적용했다. `추가 기간` 알약 버튼은 줄 안 옵션이라 유지.
  - C7: 성과 비교와 전고점 회복의 계산 기준 설명을 ⓘ 툴팁으로 옮겼다. 1년 미만 안내와 수수료·세금 각주는 화면에 남겼다.
  - C8: "레버리지 가족" → "레버리지 묶음", "시나리오 저장 및 비교군 추가" → "시나리오 저장", "명목 상품 성과" → "레버리지 상품의 실제 성과 · 명목 기준".
  - D3 일부: 경제 위기 카드를 카드 전체가 버튼인 형태로 바꿨다. 레버리지 성과 카드의 중첩은 남아 있다.

- 2026-10-23 D1 완료. 단위 323개, E2E 44개 통과.
  - 카운트를 anime.js로 옮겼다. 테스트는 anime.js가 자체 시계를 써서 실제 시간으로 기다린다.
  - 대표 금액 증감 칩, KPI 시차 카운트와 카드별 눈 장식, 차트 선 전환(`d` 전환 + 다시 그리기).
  - 장난감: 눈송이 입자(`flat`), 무작위 탭 반응, `×N` 콤보 배지, 끌어서 던지기, 결과에 따라 커지는 공, 첫 방문 말풍선, 최대 콤보 눈사람 얼굴.
  - 축하: 3단계 크기와 "N억 원 돌파" 스티커.
  - 참고: 오래 켜 둔 dev 서버에서 RxDB 플러그인 누락 오류가 보이면 Vite 의존성 캐시 문제다. 서버를 다시 켜면 사라진다.

- 2026-10-23 D2~D6 완료. 단위 324개, E2E 44개 통과.
  - 모바일 차트 헤더: `시장 추세` 버튼을 제목 줄 오른쪽으로 옮겨 4줄 → 3줄.
  - E2E: 선택 색 검사를 미끄러지는 알약 기준으로, 백테스트 지표 글자 크기 기대값을 20px로 바꿨다.
- 2026-10-24 PR #6 검토에서 나온 10건 수정. 단위 332개, E2E 44개 통과.
  - 금액 입력: 달러 전환 뒤 소수 자리에 쉼표가 들어가던 문제(정수로 표시), Delete 키가 쉼표 앞 숫자를 지우던 문제.
  - 목표 축하: 실질 가치를 볼 때는 실질 가치로 판정. 시나리오 불러오기·모드·통화·실질 가치 전환은 편집이 정리되는 중에도 축하로 치지 않는다.
  - 눈 뭉치: 날아가는 중에 탭하면 멈춰 있던 문제, 끌기가 시스템에 취소되면 다음 탭이 무시되던 문제.
  - 지표 카드 눈 쌓임이 다 녹기 전에 사라지던 문제(anime.js `duration`은 지연을 포함하지 않는다).
  - 차트 상세 패널이 입력을 바꾼 뒤에도 옛 값을 보여주던 문제(차트가 바뀌면 닫는다).
  - 불러온 시나리오의 수익률을 `(저장한 수익률)`로 표시. 납입 주기 이름표는 `src/lib/format/cycleLabel.ts` 하나로 모았다.

- 2026-10-24 시장 데이터를 10-23까지 갱신(코스피 200 16거래일은 네이버 값으로 검토 보충). 기본 환율 1327.00, 기본 물가상승률 3.25%. 기록: `docs/market-data-refresh-2026-10-24.md`.
- 2026-10-24 미래 시뮬레이션 범위를 고정 시드 몬테카를로로 교체. 대표 금액 아래에 범위와 원금 손실 가능성을 표시. 투자 기간 슬라이더를 스테퍼 + 바로 선택 칩으로 교체. 단위 341개, E2E 44개 통과.
- 2026-10-24 납입액을 스테퍼(약 10% 단위) + 주기별 금액 칩으로, 사용자 정의 수익률을 0.5%p 스테퍼로 바꿈. 수익률·물가상승률·환율 칸이 7.000000000000001로 보이고 지우면 0·1로 되돌아가던 문제 수정(`DecimalInput`). 단위 358개, E2E 44개 통과.
- 2026-10-26 E1~E3 완료. 단위 381개, E2E 44개 통과. Playwright(1440·390)로 고급 설정과 결과 확인.
  - 새 과거 CAGR: QQQ 10.7%, QLD 10.3%, TQQQ 3.5%, SPY 10.8%, 코스피 200 7.4%, SCHD 13.6%, 금 10.8%.
  - 원금 1천만 원 일시금, 10년 범위 예: QQQ 840만~8,000만, SPY 1,450만~5,180만, TQQQ 20만~6.2억.

## 결정 기록

- 2026-10-23: 장난감은 특정 모드가 아니라 언제든 찾을 수 있는 떠 있는 이스터에그 오브젝트로 만든다.
- 2026-10-23: 데스크톱 스노우볼은 2열 대신 입력을 상단 한 줄로 압축한다(B3). 백테스트만 2열(B2).
- 2026-10-23: 기존 계획·QA 문서는 `docs/archive/`로 옮기고 이 문서로 관리한다.
- 2026-10-23: 장난감은 오른쪽 아래 고정. 콤보 창 1.2초, 최대 콤보 10회면 눈보라. 모바일 하단 결과 바(B5)를 만들 때 위치를 다시 잡는다.
- 2026-10-23: 저장 버튼의 초록 컨페티는 명확한 사용자 동작이라 유지한다.
- 2026-10-23: 증감 칩은 입력이 260ms 멈춘 뒤 한 번만 보여준다. 슬라이더를 끄는 동안 칩이 계속 바뀌면 읽을 수 없다.
- 2026-10-24: 차트 상세 패널은 클릭으로만 열리므로, 차트 데이터가 바뀌면 옛 값을 보여주지 않도록 닫는다.
- 2026-10-24: 기본 물가상승률을 3.25%로 올린다. 2%는 최근 금리 환경에서 실질 가치를 너무 낙관적으로 보여준다. 저장된 사용자 값은 바꾸지 않는다.
- 2026-10-24: 범위는 5~95%가 아니라 10~90%로 보여준다. 로그정규 가정에서 30년 5~95% 상단은 중앙값의 4배를 넘어, 약속처럼 읽힌다. 원금 손실 가능성은 범위와 따로 계산하므로 이 선택에 영향받지 않는다.
- 2026-10-24: 투자 기간 슬라이더는 좁은 화면에서 한 해를 맞추기 어렵고, 끄는 동안 매번 재계산해 무겁다. `−/+`와 5·10·20·30년 칩으로 바꾼다.
- 2026-10-24: 납입액은 초기 자산과 달리 여러 번 바꿔 보며 비교하는 값이라, 매번 지우고 다시 치는 대신 스테퍼와 칩을 둔다. 스테퍼 폭은 고정값이 아니라 금액의 약 10%여서 매일 3만과 매월 200만 모두 몇 번 안에 원하는 값에 닿는다.
- 2026-10-24: 매월 금액 칩에서 30만을 뺀다. `30만`까지 네 개면 390 폭에서 줄이 바뀌어 보기 좋지 않다. 30만은 직접 입력하거나 스테퍼로 맞춘다.
- 2026-10-24: 장난감 콤보를 ×10에서 끝내지 않고 ×100까지 잇는다. ×10 눈보라, 10회마다 눈발, ×50 눈사태, ×100 눈폭풍 뒤 처음부터. 오래 누르는 사람에게 계속 보상을 준다.
- 2026-10-24: ×50·×100은 눈 입자만으로는 약하다. 큰 글자·번쩍임·흔들림·충격파·진동과 ×100 공 비행·폭발을 더한다. 큰 글자와 날아가는 공은 눈 입자 캔버스(z 100) 위에 와야 보이므로 `z-toy-stage`(110)를 둔다.
- 2026-10-25: 장난감 보상에 눈 말고 다른 입자(별, 얼음 조각, 색종이, 동전·돈다발, 눈사람)를 섞는다. 투자 앱이라 ×100에서 눈덩이가 돈으로 터지는 그림을 준다. 입자 종류는 `particles.ts`에 모은다.
- 2026-10-25: ×100을 계속 반복하는 사람을 위해 달성 횟수를 세고 회차별로 연출을 바꾼다. 5번째는 일부러 김빠지게(터지지 않고 바람 빠짐), 10번째는 끝판(화면을 덮고 깨지는 공, 오로라, 금빛 ×1000, 영구 왕관). 콤보 자체를 200·1000까지 늘리지 않는 건, 화면이 이미 꽉 차 더 키워도 지저분해질 뿐이기 때문이다.
- 2026-10-26: GSD 흔적을 걷어낸다. GSD가 만든 `docs/archive/planning/`(옛 단계별 계획·상태 문서)과 README의 GSD 문구를 지운다. 계획은 이 문서 하나로 관리한다.
- 2026-10-26: 참조 자산의 기대 수익률은 1년 구간 중앙값이 아니라 배당 포함 전체 기간 CAGR로 한다. 중앙값은 변동성 손실을 빼지 않아 장기 복리보다 높고, 화면 라벨(CAGR)과도 달랐다.
- 2026-10-26: QLD·TQQQ는 상장 전 구간을 QQQ 일간 수익률 ×2·×3에서 하루 비용을 뺀 값으로 재구성해 1999년부터 쓴다. 상장 후는 실제 일간 데이터. 하루 비용은 두 상품이 함께 거래된 날의 평균 차이로 맞춘다(재구성 검증: 2006~ QLD 24.5% vs 실제 24.6%, 2010~ TQQQ 40.4% vs 41.4%). 상승장만 담은 실제 이력은 레버리지를 지나치게 낙관하게 만든다.
- 2026-10-26: 참조 자산 범위는 과거 수익률을 1년 블록으로 재표집한다. 최대낙폭이나 폭락 빈도를 따로 가정하지 않아도 그 자산의 폭락·회복이 그대로 들어간다. 중앙값 성장은 기대 수익률에 맞추고(재표집 수익률은 평균을 빼서 씀), 이력은 흔들림의 모양만 준다.
- 2026-10-26: E 계산 수정 당시에는 정적 CSV를 유지하기로 했다. 이후 사용자가 로컬 PC와 주기적인 커밋·푸시 의존을 없애기 위해 Supabase 연동 추천안으로 계획을 요청했으므로, 이 결정은 아래 F 계획으로 대체한다.
- 2026-10-26: F는 GitHub Actions → Supabase Storage → 브라우저 캐시로 진행한다. DB 테이블·Edge Functions 도입은 포함하지 않는다. 동봉 CSV는 오프라인 기본값으로 유지하고, 원격 카탈로그는 전체 검증 후 버전 단위로 게시한다. 사용 중인 페이지의 계산 데이터는 고정하고, 새 데이터는 새로고침 시 적용한다.


## F 설계 및 구현 계획

> 실행자: 구현 시 `executing-plans` 스킬로 F1부터 순서대로 진행한다. 독립 에이전트 작업은 사용자가 실행 방식으로 선택한 경우에만 사용한다. 현재 요청의 산출물은 계획이다.

**Goal:** 로컬 PC와 데이터 커밋·앱 재배포 없이 검증된 시세를 정기적으로 갱신하고, 네트워크 장애 때도 마지막 정상 데이터로 계산한다.

**Architecture:** GitHub Actions가 Supabase의 마지막 정상 카탈로그를 가져와 기존 Python 엔진으로 증분 수집·검증한다. 성공한 전체 카탈로그를 버전 경로에 게시한 뒤 최신 포인터를 바꾼다. 브라우저는 검증된 캐시 또는 동봉 데이터로 시작하고, 내려받은 새 버전은 새로고침 후 사용한다.

**Tech Stack:** 기존 Python 3.13·uv·yfinance·exchange_calendars, GitHub Actions, Supabase Storage HTTP API, React·TypeScript·Vite PWA, IndexedDB. 브라우저에 Supabase SDK를 추가하지 않는다.

**Spec:** 이 문서의 아래 「F 설계 계약」이 설계이며 「F1~F6 실행 순서」가 구현 계획이다. 계획의 상태는 위 F 체크리스트 하나로 관리한다.

### F 설계 계약

#### 목표·범위·유지할 규칙

- 대상 프로젝트: `https://olqdftjssrzqvcindekh.supabase.co`. 기존 프로젝트의 다른 앱 데이터·권한은 변경하지 않는다.
- 대상 데이터: 일별 투자 자산 14개, 완료 주봉 벤치마크 3개, 기존 schema-4 `manifest.json`. 현재 17개 CSV 약 2.2MB다.
- 범위 밖: DB 테이블 이관, 로그인·시나리오 동기화, 실시간 시세, Edge Functions, 기본 환율·물가·세금의 자동 갱신, 신규 시세 제공자 도입.
- 기본 환율은 현재 별도 상수 `DEFAULT_EXCHANGE_RATE`이며 CSV 수집기에 포함되어 있지 않다. 이번 전환으로 자동 갱신된다고 설명하지 않는다.
- 금융 계산은 기존 `src/core` 엔진을 유지한다. 배당·분할 기준, CAGR, QLD·TQQQ 재구성, 블록 재표집, 금 기준 계산은 바꾸지 않는다.
- 단일 계산은 시세·일간 수익률·벤치마크·참조 자산 통계 모두 같은 카탈로그 버전을 사용한다.
- 평상시 원격 데이터 갱신은 Git 쓰기 권한이나 앱 배포를 요구하지 않는다. 현재 커밋된 CSV는 고정된 기본 데이터·테스트 기준으로 남긴다.
- 진행 중인 페이지의 데이터는 교체하지 않는다. 앱의 자동 PWA 업데이트가 사용자 작업 중 페이지를 강제로 새로고침하지 않는지도 확인한다.
- 코드 변경을 커밋할 때마다 당시 `package.json` patch를 +1 한다. 계획 문서만 작성하는 이번 작업은 버전을 바꾸지 않는다.

#### 현재 코드에서 바꿔야 하는 경계

`historicalAssets.ts`와 `marketBenchmarks.ts`는 CSV를 `?raw`로 가져와 모듈을 읽을 때 파싱한다. `projectionAssets.ts`는 참조 자산별 통계를 메모리에 캐시한다. URL만 바꾸면 이 초기화·캐시 경계 때문에 서로 다른 버전이 섞이거나 계산이 갱신되지 않는다.

파싱·검증, 계산용 카탈로그, 현재 페이지에서 사용할 카탈로그, 원격 통신을 각각 분리한다. 앱이 렌더링되기 전에 카탈로그 하나를 설치하고 기존 동기 getter를 유지한다. 네트워크를 계산 함수 안에 넣지 않는다. 테스트는 동봉 카탈로그를 명시적으로 설치하여 외부 통신 없이 재현한다.

#### Storage의 공개 계약

전용 public 버킷 이름은 `stock-snowball-market-data`로 한다. 익명·일반 로그인 사용자의 업로드·수정·삭제 정책은 만들지 않는다. GitHub Actions의 서버 비밀값으로만 게시한다. 기존 프로젝트 전체에 적용되는 정책은 변경하지 않는다.

~~~text
stock-snowball-market-data/
  v1/latest.json
  v1/releases/<releaseId>/release.json
  v1/releases/<releaseId>/manifest.json
  v1/releases/<releaseId>/<기존 이름의 CSV 17개>
~~~

`v1`은 전송 계약 버전이며, 시세 매니페스트의 `schemaVersion: 4`와 구분한다. `releaseId`는 `YYYYMMDDTHHMMSSZ-<runId>-<attempt>` 형식의 안전한 경로 조각이다. 외부 URL이나 `../`를 허용하지 않는다.

공유할 타입의 핵심은 다음과 같다. 자산 ID·ticker·파일명·주기·통화의 승인 목록은 기존 14+3개로 고정한다.

~~~typescript
interface ReleaseRef {
  releaseId: string;
  publishedAt: string; // 실제 게시 UTC 시각
  releaseSha256: string; // release.json의 원본 UTF-8 바이트 해시
}

interface LatestPointer {
  transportVersion: 1;
  current: ReleaseRef;
  previous?: ReleaseRef;
}

interface ReleaseManifest {
  transportVersion: 1;
  releaseId: string;
  publishedAt: string;
  dataHash: string;
  // manifest.json + CSV 17개. 상대 파일명, UTF-8 바이트 수와 해시.
  files: Record<string, { bytes: number; sha256: string }>;
}

interface RawMarketCatalog {
  manifestText: string;
  csvByFilename: Record<string, string>;
}

interface MarketDataSnapshot {
  releaseId: string;
  publishedAt: string | null; // 동봉 버전은 null
  raw: RawMarketCatalog;
}

interface ActiveMarketData {
  snapshot: MarketDataSnapshot;
  source: 'bundled' | 'cache';
}
~~~

브라우저와 Python은 정확히 18개 데이터 파일, 승인된 파일명, UTF-8 바이트 수·SHA-256, 실제 CSV 행 수·기간·정렬·가격·배당, 매니페스트와 자산 레지스트리의 일치를 검증한다. 전송 크기 상한은 포인터 8KiB, `release.json` 256KiB, 각 데이터 파일 6MiB, 전체 데이터 30MiB로 정한다. 해시는 전송 무결성 검사용이며 서명으로 설명하지 않는다.

변경 불가능한 버전 파일은 장기 캐시하고 덮어쓰지 않는다. `latest.json`만 덮어쓰며 캐시 수명을 60초로 둔다. 브라우저는 포인터 요청을 `cache: 'no-store'`로 보내고, CDN에서 구 포인터가 잠시 보이더라도 그 포인터가 가리키는 완전한 구 버전을 사용한다.

기존 프런트엔드의 `source` JSON 전체와 하드코딩 상수의 동등 비교는 제거한다. 대신 provider·client·달력 버전·검토 기록의 구조와, 검토 기록이 실제 데이터와 일치하는지를 검증한다. 새 수동 보정 기록을 추가할 때 프런트엔드 재배포까지 요구하지 않게 한다. Python의 새 산출물 검증은 현재 승인된 `SOURCE_PROVENANCE`와의 엄격한 일치를 유지한다.

#### 수집·게시·롤백

1. 일반 갱신은 원격 `latest.json`의 current 전체를 임시 디렉터리에 내려받고 무결성·기존 데이터 계약을 검증한다. 저장소의 오래된 CSV에서 매번 다시 시작하지 않는다.
2. 원격 베이스라인의 검토 기록은 그 카탈로그에 기록된 provenance로 검사한다. 현재 코드에 새 승인 보정이 추가됐다는 이유만으로 기존 정상 버전을 읽지 못하게 하지 않는다. 새 결과에는 현재 승인 보정을 적용하고 엄격하게 검사한다.
3. 기존 `refresh_all`로 증분 수집한다. 수집 종료일 이후의 행은 게시하지 않는다. 기존 날짜 보존·배당·분할·국내 거래일 누락·완료 주봉 검사를 유지한다.
4. `dataHash`는 CSV 17개의 해시와 schemaVersion·source·assets를 정렬된 JSON으로 직렬화해 계산한다. 수집 시각인 `generatedAt`은 제외한다. 데이터와 provenance가 모두 같으면 새 버전·포인터를 만들지 않고 성공 종료한다.
5. 검증된 18개 파일과 `release.json`을 새 경로에 올린다. 공개 읽기 URL로 해시까지 다시 확인한 뒤 `latest.json`을 마지막에 쓴다. 일부 업로드 실패 시 최신 포인터를 바꾸지 않는다.
6. 포인터 쓰기 응답이 끊겼다면 current를 다시 읽어 실제 결과를 확인한다. 확인하지 못한 상태를 성공으로 보고하지 않는다. 재실행은 같은 데이터에 대해 안전해야 한다.
7. 최근 정상 버전 10개를 보관하되 current·previous는 항상 보존한다. 정리는 게시 성공 후 별도 단계에서 하며, 정리 실패로 정상 게시를 되돌리지 않는다. 오래된 포인터를 받은 클라이언트의 파일이 정리됐으면 포인터를 한 번 다시 읽는다.
8. 롤백은 보관 중인 버전 전체를 재검증한 뒤 포인터만 되돌린다. 시세 재수집·앱 재배포는 하지 않는다. 브라우저도 명시적인 원격 롤백을 허용하며 날짜가 이전이라는 이유만으로 거부하지 않는다.

최초 게시만 `bootstrap` 모드로 동봉 카탈로그를 사용한다. 이미 포인터가 있으면 bootstrap을 거부한다. 일반 갱신에서 404·403·네트워크 오류를 bootstrap으로 처리하지 않는다.

`sync_market_data.py`는 `--mode bootstrap|refresh|publish|rollback`을 제공한다. `publish --data-dir <경로>`는 분할 등 예외를 검토하여 만든 완성 카탈로그를 게시하는 운영 경로이며, 현재 버전 대비 기존 날짜 보존 검사를 거친다. `rollback --release-id <버전>`만 예전 버전 복귀를 허용한다. 정상 refresh 작업에서 임의 날짜 삭제나 자동 전체 재생성은 허용하지 않는다.

#### 예약·완료 데이터·운영 한계

- 정기 실행: 매일 `01:17 UTC = 10:17 Asia/Seoul`, cron `17 1 * * *`. 한국·미국·금의 진행 중인 당일 행이 섞이지 않도록 **전날 UTC 날짜까지**만 수집한다. 국내 시세도 당일 장중 값은 제외한다.
- CLI에 `--as-of YYYY-MM-DD`를 추가하고 기존 `refresh_all(..., as_of=...)`에 연결한다. 전체 이력 조회와 증분 조회 모두 날짜 상한으로 필터링한다. 주봉은 기존 「완전히 끝난 ISO 주」 규칙을 유지하며 월요일부터 직전 주를 포함한다. 현재 주 금요일 장 마감만으로 주봉 정책을 바꾸지 않는다.
- `manifest.generatedAt`은 기존 as_of 호출의 기준 시각이며 실제 작업 시각과 다를 수 있다. 실제 게시 시각은 `publishedAt`, 데이터 기준일은 자산별 `endDate`로 구분한다.
- 원격 작업은 `contents: read`, 고정 concurrency 그룹, `cancel-in-progress: false`, 작업 제한 30분을 사용한다. 외부 호출은 개별 타임아웃과 기존 재시도를 유지한다. main의 workflow에서만 운영 비밀값을 사용한다.
- 수동 `workflow_dispatch`에서 네 모드를 선택한다. bootstrap·publish·rollback과 정기 refresh를 같은 concurrency로 직렬화한다. 별도 로컬 업로더를 동시에 실행하지 않는 운영 규칙도 README에 명시한다.
- 요약에 성공·변화 없음·실패, 이전/새 releaseId, 자산별 종료일, 실패 자산과 원인을 남긴다. 오류 응답에 비밀값·인증 헤더를 출력하지 않는다.
- 실행 실패 알림은 GitHub의 workflow 알림 설정으로 받는다. 스케줄 자체가 비활성화되면 실행 실패 알림도 오지 않으므로 이를 감지한다고 설명하지 않는다.
- 공개 GitHub 저장소는 60일 활동이 없으면 예약 workflow가 비활성화될 수 있다. Free Supabase도 DB 저활동으로 일시정지될 수 있으며 Storage 이용만으로 이를 예방한다고 보장하지 않는다. 장기간 무관리 운영이 필요하면 독립된 외부 스케줄러·감시와 유료 플랜을 별도 선택해야 한다.
- 반복되는 KOSPI 200 공급자 누락이나 주식 분할은 여전히 검토가 필요한 예외다. 오류를 숨기거나 임의 가격을 생성하지 않고 마지막 정상 버전을 유지한다. 초기 원격 실행에서 계속 실패하면 자동 갱신이 운영된다고 판정하지 않는다.

#### 앱 시작·캐시·사용자 동작

- 시작 시 IndexedDB에서 마지막 완전한 카탈로그를 읽고 재검증한다. 사용할 수 없거나 1.5초 내 읽지 못하면 동봉 CSV로 시작한다. 늦게 끝난 캐시 읽기로 실행 중 데이터를 교체하지 않는다.
- React App은 카탈로그 설치 후 동적으로 import한다. 원격 네트워크 응답을 첫 화면 계산의 필수 조건으로 삼지 않는다.
- 시작 후 백그라운드에서 최신 포인터를 확인한다. 포인터 요청 제한은 8초, 카탈로그 전체 다운로드 제한은 30초, 파일 동시 요청은 4개다.
- 새 카탈로그가 완전하게 검증돼야 IndexedDB의 한 트랜잭션으로 payload와 다음 시작용 포인터를 함께 저장한다. 부분 다운로드는 정상 캐시를 지우지 않는다. 현재 페이지에서 쓰는 메모리 스냅샷은 유지한다.
- 캐시는 별도 DB `stock-snowball-market-data`에 완전한 버전 최대 2개를 보관한다. 기존 RxDB 시나리오 DB와 분리하고 수정·삭제하지 않는다.
- 캐시 저장이 실패하면 새 데이터 준비 완료로 표시하지 않는다. 현재 데이터로 계속 계산하고 재시도를 제공한다. 앱 재접속 때 손상된 캐시를 만나도 전체 앱이 죽지 않게 한다.
- 새 버전 저장 성공 시 「새 시세가 준비됐어요」와 「새로고침해 적용」을 표시한다. 새로고침 후 캐시 버전을 앱 시작 전에 설치한다. 현재 입력은 기존 저장 동작을 유지하며 미적용 Sheet 초안은 새로고침 때 사라질 수 있음을 동작 가까이 안내한다.
- 정상 상태에는 선택 종목의 실제 데이터 기준일을 표시한다. 비교는 마지막 공통 날짜, 참조 자산은 해당 자산의 종료일을 쓴다. 주봉은 별도로 주봉 기준일을 표시하고 하나의 날짜를 전체 데이터의 최신일로 오인시키지 않는다.
- 원격 실패 때는 기존 결과를 유지하고 「시세 업데이트를 확인하지 못했어요. 보관된 데이터로 계산합니다」를 `status`로 안내한다. 기본 데이터 사용 시에도 실제 기준일을 표시한다.
- 조회·다운로드·캐시 설치를 목표 달성·금액 입력으로 취급하지 않는다. 자동 축하를 발생시키지 않는다. F5 구현에서 `DESIGN.md`에 이 상태 계약을 함께 추가한다.

### F1~F6 실행 순서

각 작업은 실패하는 동작 테스트 → 최소 구현 → 해당 검사 통과 → 관련 회귀 검사 → 문서 상태 갱신 순서로 진행한다. 실제 구현 커밋에는 patch 버전 증가를 포함한다.

#### F1. 계산용 카탈로그를 파일 입출력에서 분리

**파일**
- 추가: `src/data/marketDataContract.ts` — 전송 타입, 기존 자산 레지스트리, 경로·해시·크기 제한.
- 추가: `src/data/marketDataCatalog.ts` — CSV/schema-4/provenance 검증과 계산용 데이터 생성.
- 추가: `src/data/bundledMarketData.ts` — 현재 CSV 17개와 manifest를 읽는 유일한 기본 데이터 어댑터.
- 추가: `src/data/marketDataRuntime.ts` — 페이지에서 사용하는 스냅샷과 준비된 카탈로그.
- 수정: `src/data/historicalAssets.ts`, `src/data/marketBenchmarks.ts`, `src/data/projectionAssets.ts`.
- 추가: `vitest.config.ts`, `src/testSetup.ts`, `src/data/__tests__/marketDataCatalog.test.ts`.
- 수정: 기존 historicalAssets·marketBenchmarks·projectionAssets·계산 검산 테스트 중 직접 상수를 읽는 부분.

**인터페이스**
~~~typescript
// 기존 타입은 type-only import로 사용하여 모듈 초기화 순환을 만들지 않는다.
interface PreparedMarketCatalog {
  assets: Record<HistoricalAssetType, {
    data: IndexPoint[];
    coverage: HistoricalCoverage;
    dailyReturns: number[];
  }>;
  benchmarks: Record<MarketBenchmarkId, MarketBenchmarkDataset>;
}
// marketDataCatalog.ts
declare function buildMarketDataCatalog(raw: RawMarketCatalog): PreparedMarketCatalog;
// marketDataRuntime.ts
declare function installMarketData(snapshot: MarketDataSnapshot): void;
declare function getActiveMarketData(): MarketDataSnapshot;
declare function getPreparedMarketData(): PreparedMarketCatalog;
// historicalAssets.ts
declare function getHistoricalDailyReturns(asset: HistoricalAssetType): readonly number[];
// bundledMarketData.ts
declare function createBundledSnapshot(): MarketDataSnapshot;
~~~

- [ ] 동봉 전체 카탈로그로 기존 자산별 데이터·기간·수익률이 동일한지 테스트한다. CSV 누락, 잘못된 달력 날짜, 중복 날짜, 가격 0·NaN, 음수 배당, rowCount 불일치, 주봉 중복, 검토 보정 불일치를 각각 거부한다.
- [ ] 실제로 데이터가 같은데 검토 기록이 추가된 정상 카탈로그는 프런트엔드의 과거 상수에 묶이지 않고 읽을 수 있는지 테스트한다. 반대로 기록된 보정과 값이 다르면 거부한다.
- [ ] 위 순수 카탈로그 인터페이스를 구현하고 기존 파서·검증을 옮긴다. 기존 외부 getter는 유지한다. 모듈 전역 `HISTORICAL_DAILY_RETURNS` 사용처는 getter로 바꾸고 projection 캐시 키에 releaseId를 포함한다.
- [ ] `vitest.config.ts`는 기존 Vite 설정과 merge하고 `setupFiles: ['./src/testSetup.ts']`를 등록한다. setup은 동봉 스냅샷만 설치하며 통신·IndexedDB에 의존하지 않는다.
- [ ] 동일 입력을 버전 A에서 계산한 뒤 B를 설치했을 때 B의 참조 통계가 계산되는 회귀 검사를 추가한다. 프로덕션에서 세션 중 교체하기 위한 API로 노출하지 않는다.
- [ ] 실행: `npm test -- src/data src/core`, 이어 `npm test`·`npm run build`. 독립 계산 검산은 기존 기대값을 바꾸지 않고 통과해야 한다.

테스트의 주요 기대값(전송 해시 검사는 F4에서 별도로 다룬다):
~~~typescript
installMarketData(createBundledSnapshot());
const before = getProjectionMarket('QQQ');
const data = getHistoricalData('QQQ');
const growth = data.slice(1).reduce(
  (value, point, index) =>
    value * point.price / data[index].price * (1 + point.dividendYield),
  1,
);
const years = (Date.parse(data.at(-1)!.date) - Date.parse(data[0].date))
  / 86_400_000 / 365.25;
expect(before?.cagr).toBeCloseTo(Math.expm1(Math.log(growth) / years), 12);

const changedSnapshot = structuredClone(createBundledSnapshot());
changedSnapshot.releaseId = 'fixture-changed';
const lines = changedSnapshot.raw.csvByFilename['qqq.csv'].trimEnd().split('\n');
const last = lines.at(-1)!.split(',');
last[1] = String(Number(last[1]) * 1.01);
lines[lines.length - 1] = last.join(',');
changedSnapshot.raw.csvByFilename['qqq.csv'] = lines.join('\n') + '\n';
// 날짜·행 수는 유지하므로 매니페스트의 coverage는 바뀌지 않는다.
installMarketData(changedSnapshot);
expect(getActiveMarketData().releaseId).toBe('fixture-changed');
expect(getProjectionMarket('QQQ')).not.toBe(before);
expect(getProjectionMarket('QQQ')!.cagr).toBeGreaterThan(before!.cagr);
~~~

#### F2. 원격 베이스라인·게시·롤백 도구

**파일**
- 추가: `tools/market_data_storage.py` — Python 표준 HTTP 클라이언트, 해시·전송 계약.
- 추가: `scripts/sync_market_data.py` — bootstrap/refresh/publish/rollback 명령.
- 추가: `tests/test_market_data_storage.py`.
- 수정: `tools/market_data.py`, `tests/test_market_data.py` — 원격 이전 카탈로그의 recorded provenance 검증 경계.
- 수정: `package.json` — `data:sync` 명령을 Python CLI에 연결.

**인터페이스**
~~~python
# StorageClient는 get/put/list/delete를 제공하고 HTTP 타임아웃을 가진다.
# 테스트에서는 같은 메서드의 메모리 FakeStorage를 주입한다.
load_remote_catalog(storage, target_dir: Path) -> dict
publish_catalog(storage, data_dir: Path, release_id: str, published_at: str) -> dict | None
rollback_catalog(storage, release_id: str) -> dict
# publish의 None은 dataHash가 같아 게시를 생략했다는 뜻이다.
# storage.get(path) -> bytes
# storage.put(path, payload, *, content_type, cache_seconds, overwrite) -> None
# storage.list(prefix) -> list[str]; storage.delete(paths) -> None
~~~

- [ ] FakeStorage로 3번째 파일 업로드 실패, 공개 읽기 해시 불일치, 포인터 쓰기 후 응답 유실, 다른 source 기록의 정상 베이스라인, 동일 데이터 재실행, 정상 롤백을 테스트한다.
- [ ] 실패 전후 `storage.get('v1/latest.json')`가 동일하고 이전 전체 버전이 읽히는지 검증한다. 새 릴리스 일부가 남는 것은 허용하지만 current로 게시되어서는 안 된다.
- [ ] 기존 카탈로그를 임시 디렉터리에 다운로드하고 F 설계 계약대로 검증한 뒤 `refresh_all`에 넘긴다. recorded provenance 모드는 기존 CSV·매니페스트·보정값 검증을 생략하는 모드로 구현하지 않는다.
- [ ] 게시 순서를 아래와 같이 구현한다. `upload_release`는 해시 목록을 만들고 변경 불가능한 파일을 올리며, `verify_public_release`는 공개 URL의 실제 바이트를 대조한다.
~~~python
validate_generated_data(data_dir)
release = build_release_manifest(data_dir, release_id, published_at)
if release["dataHash"] == current_data_hash:
    return None
upload_release(storage, data_dir, release)
verify_public_release(storage, release)
write_latest_pointer(storage, release, previous=current_ref)
~~~
- [ ] bootstrap은 기존 포인터가 없을 때만 허용하고 refresh의 실패를 bootstrap으로 바꾸지 않는다. publish도 기존 날짜 보존 검사를 거친다.
- [ ] cleanup은 current·previous를 제외한 최근 10개 보관 규칙을 구현하고, 삭제 실패가 게시 성공 상태와 구분되는지 테스트한다.
- [ ] 실행: `uv run python -m unittest tests.test_market_data tests.test_market_data_storage -v`. 이 단계의 자동 테스트는 실제 Supabase에 쓰지 않는다.

#### F3. 예약 수집과 완료일 상한

**파일**
- 추가: `.github/workflows/refresh-market-data.yml`.
- 수정: `scripts/refresh_market_data.py`, `tools/market_data.py`, `tests/test_market_data.py`.
- 수정: `README.md`, `package.json`, `.env.example`.

- [ ] `--as-of`가 미래·잘못된 날짜를 거부하는지 테스트한다. 공급자가 상한 이후의 정상 숫자 행을 반환해도 전체 조회·증분 조회 모두 게시 결과에서 제외되는지 검사한다.
- [ ] 전날 UTC 날짜를 한 번 계산하여 해당 실행 전체의 cutoff로 고정한다. 현재 주봉 제외·월요일 새 완료 주 포함, 미국 DST 전후, 국내 장중, 주말·공휴일 무변화 사례를 고정 날짜로 검증한다.
- [ ] Python CLI의 날짜 옵션을 구현하고, full-history 경로도 end/filter를 적용한다. 기존 검증을 통과시키려고 마지막 날짜 검사나 분할 검사를 제거하지 않는다.
- [ ] 아래 workflow 뼈대에 checkout, 기존 저장소와 같은 uv 설치·고정 Python 설치·`uv sync --locked`, 테스트, `data:sync`, 실행 요약을 연결한다.
~~~yaml
name: Refresh market data
on:
  schedule:
    - cron: '17 1 * * *'
  workflow_dispatch:
    inputs:
      mode:
        type: choice
        default: refresh
        options: [refresh, bootstrap, publish, rollback]
      release_id:
        type: string
        required: false
permissions:
  contents: read
concurrency:
  group: stock-snowball-market-data
  cancel-in-progress: false
jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 30
~~~
- [ ] 예약 이벤트는 refresh로 고정한다. 수동 publish는 checkout된 카탈로그를 사용하고, rollback은 release_id를 필수 검증한다. shell에서 입력값을 코드에 끼워 넣지 않고 환경 변수·구조화 인자로 넘긴다.
- [ ] `SUPABASE_URL`은 Actions variable, `SUPABASE_SERVICE_ROLE_KEY`는 Actions secret으로만 참조한다. 브라우저의 `VITE_*`, 커밋, 로그, 업로드 artifact에 비밀값을 넣지 않는다. 예제 env는 빈 값과 용도만 포함한다.
- [ ] 데이터 workflow에는 git commit/push 및 Pages deploy 단계를 넣지 않는다. 기존 deploy·frontend-checks는 오프라인 기본 데이터 검사를 계속한다.
- [ ] 실행: `uv run python -m unittest tests.test_market_data tests.test_market_data_storage -v`, `npm run data:check`. 운영 실행은 F6에서 한다.

#### F4. 브라우저 다운로드·캐시·시작 준비

**파일**
- 추가: `src/data/marketDataRemote.ts` — 포인터·릴리스 다운로드와 무결성 검사.
- 추가: `src/data/marketDataCache.ts` — 별도 IndexedDB의 완전한 버전과 시작 포인터.
- 추가: `src/data/marketDataBootstrap.ts` — 초기 선택, 한 번의 원격 검사, 다음 시작용 저장.
- 추가: `src/data/__tests__/marketDataRemote.test.ts`, `marketDataCache.test.ts`, `marketDataBootstrap.test.ts`.
- 수정: `package.json`·lockfile — IndexedDB 테스트가 필요하면 `fake-indexeddb`를 개발 의존성으로만 추가.

**인터페이스**
~~~typescript
readCachedSnapshot(): Promise<MarketDataSnapshot | null>;
saveNextSnapshot(snapshot: MarketDataSnapshot): Promise<void>;
fetchRemoteSnapshot(currentReleaseId: string, signal?: AbortSignal): Promise<MarketDataSnapshot | null>;
// null: 원격 포인터가 없다는 뜻이 아니라 현재 캐시와 같은 releaseId일 때만 반환
prepareInitialMarketData(): Promise<ActiveMarketData>;
checkForMarketDataUpdate(): Promise<'unchanged' | 'ready'>;
~~~

- [ ] fetch mock으로 파일 중간 실패·타임아웃·해시 불일치·일부 다른 버전·승인되지 않은 경로·상한 초과를 거부하는 테스트부터 작성한다.
- [ ] 캐시 테스트에서 새 버전 저장 트랜잭션 실패 후 이전 시작 포인터와 데이터가 그대로인지 확인한다. IndexedDB 열기 거절·손상·용량 초과도 검사한다.
- [ ] startup은 캐시 읽기와 1.5초 제한을 경쟁시키고, 실패하면 동봉 스냅샷을 반환한다. 그 후 늦은 읽기 결과는 버린다. 원격 검사는 별도 한 번만 시작한다.
- [ ] 원격 로더는 포인터→release.json→18개 데이터 파일 순서로 읽고 타입·길이·해시·카탈로그를 검증한다. 파일 URL은 고정 프로젝트·버킷·승인된 상대 경로에서만 만든다.
- [ ] 검증 성공 뒤 다음 시작 스냅샷을 트랜잭션으로 저장한다. IndexedDB 저장 실패는 ready가 아닌 오류로 반환한다. 동일 포인터 확인 때 CSV를 다시 받지 않는다.
- [ ] 원격 current가 보관된 이전 releaseId인 정상 롤백, 정리된 구 포인터의 파일 404 후 포인터 1회 재조회, 중복 bootstrap 호출의 단일 원격 검사도 테스트한다.
- [ ] 실행: `npm test -- src/data`, 이어 `npm test`·`npm run build`.

#### F5. 앱·PWA·표시 연결

**파일**
- 수정: `src/main.tsx` — 카탈로그 설치 뒤 App import·렌더.
- 수정: `src/App.tsx` — 업데이트 상태·적용 동작·현재 데이터 기준일.
- 추가: `src/components/common/MarketDataStatus.tsx` 및 컴포넌트 테스트.
- 수정: `vite.config.ts`, `DESIGN.md`.
- 수정: `src/__tests__/App.integration.test.tsx`.
- 추가: `e2e/market-data-sync.spec.ts`.

- [ ] 통합 테스트에서 준비된 새 스냅샷을 저장해도 현재 계산 결과·설정·참조 통계가 변하지 않고 업데이트 안내만 생기는지 확인한다. 원격 실패·동봉 fallback·일반 재접속·수동 환율·저장 시나리오도 유지되는지 검사한다.
- [ ] main의 정적 App import를 없애고 다음 시작 순서를 구현한다. bootstrap이 가져오는 모듈에서는 아직 초기화되지 않은 데이터 getter를 호출하지 않는다.
~~~typescript
const initial = await prepareInitialMarketData();
installMarketData(initial.snapshot);
const { default: App } = await import('./App');
// 기존 React.StrictMode와 createRoot 렌더를 유지한다.
// App 렌더 후 원격 검사를 시작하고 결과 상태를 전달한다.
~~~
- [ ] 데이터 기준일과 업데이트 안내를 기존 Notice·Button·타이포·상태 토큰으로 구현한다. 「새로고침해 적용」은 검증·캐시 저장 후에만 노출한다. 자동 교체·자동 축하는 하지 않는다.
- [ ] Vite 수동 historical-data 청크와 PWA 캐시 크기 제한을 재확인한다. 동봉 데이터는 오프라인에 남긴다. 원격 최신 포인터를 service worker의 무기한 CacheFirst 규칙에 넣지 않는다. 카탈로그 payload 캐시는 IndexedDB 한 곳이 소유한다.
- [ ] 기존 서비스 워커 설치 기기와 새 설치를 모두 확인한다. 앱 코드 업데이트가 시세 다운로드 중 페이지를 자동 재시작하지 않게 한다.
- [ ] E2E에서 원격 요청을 고정 fixture로 가로챈 뒤 reload 적용, 전체 payload 다운로드 중 offline, 저장 후 offline 재접속, 캐시 사용 불가, 업데이트 전후 입력값 보존을 검증한다. 설치형 PWA 검사는 dev 서버가 아닌 production build·preview에서 별도로 한다.
- [ ] 실행: `npm test`, `npm run design:check`, `npm run design:check:test`, `npm run build`, `npm run test:e2e`. 실제 1440·390 브라우저에서 `/stock-snowball/`의 정상·오프라인·업데이트·실패 상태를 확인한다.

#### F6. 운영 설정과 전환

**파일**
- 수정: `README.md` — 운영 설정, 실행 모드, 실패 알림, 복구.
- 수정: `docs/calculation-audit.md` — 계산식 변경 없이 데이터 공급 경계를 바꿨다는 기록.
- 수정: `docs/plan.md` — 실제 검증 근거·버전·다음 작업.
- Supabase: 전용 Storage 버킷만 생성·설정. GitHub: Actions variable·secret·알림 설정.

- [ ] 로컬 테스트·dry run을 먼저 완료한다. 구현에 필요한 외부 설정 상태를 읽고, 실제 비밀값을 채팅에 요청하거나 출력하지 않는다. 계정에서 값 제공이 필요한 항목은 이름과 설정 위치만 안내한다.
- [ ] Orca CLI로 기존 프로젝트에 전용 public 버킷을 만들고 MIME `text/csv, application/json` 및 파일 크기 6MiB 제한을 설정한다. 현재 프로젝트의 다른 버킷·schema·정책은 유지한다. 익명 업로드·수정·삭제가 거부되는지 확인한다.
- [ ] bootstrap을 한 번 실행하고 공개 URL로 18개 파일·해시·포인터를 확인한다. refresh를 수동 실행해 원격 baseline에서 다음 버전이 만들어지는지 확인한다.
- [ ] 앱 연동을 한 번 배포한다. 이 배포 이후 시세 갱신에는 앱 배포가 필요 없어야 한다. 동일 번들에서 서로 다른 releaseId를 읽는 것을 확인한다.
- [ ] 정기 refresh를 최소 2회 확인한다. 한 번은 로컬 PC가 꺼진 상태에서 실행되어야 한다. 실행 시각·releaseId·자산별 종료일을 기록한다. 이 조건이 충족되기 전에는 F6를 완료로 표시하지 않는다.
- [ ] 테스트용 업로드 실패·공급자 실패·잘못된 hash에서 current가 유지되는지 확인한다. 보관 버전으로 rollback하고 브라우저에서 새로고침 후 반영되는지 확인한다.
- [ ] 사용 중인 프로젝트의 Free 일시정지와 Actions 무활동 비활성화 제한을 README에 남긴다. 사용자에게 무기한 무관리 실행을 보장하지 않는다.
- [ ] 기존 수동 refresh 문서를 보정·분할 예외용으로 바꾼다. 일상 갱신을 위해 CSV를 커밋하라는 안내는 제거하고, 초기 동봉 데이터의 기준일은 명시한다.

### 검토할 실패 조건과 담당 작업

| 입력·상태 | 기대 동작 | 검증 위치 |
| --- | --- | --- |
| 일부 CSV만 최신이거나 업로드·다운로드 중단 | 구 버전 전체 유지, 포인터·캐시 부분 교체 금지 | F2 FakeStorage, F4 캐시 트랜잭션, F5 offline E2E |
| 새 카탈로그의 provenance와 과거 프런트엔드 상수가 다름 | 구조·보정값이 유효하면 수용, 잘못된 보정은 거부 | F1 검증, F2 recorded baseline |
| 업데이트 후 projection 캐시·시장 주봉·금 데이터가 구 버전을 참조 | 새 페이지는 모든 계산이 한 버전, 기존 페이지는 계속 같은 버전 | F1 캐시 회귀, F5 reload 통합/E2E |
| 당일 미완료 시세·미완료 주봉·분할·누락된 국내 거래일 | 상한 이후 행 제외, 계약 위반이면 게시 중단 | F3 날짜 테스트, 기존 Python 검증 |
| 캐시 손상·IndexedDB 거절·용량 초과·오프라인 | 동봉/마지막 정상 데이터로 계속 계산, 거짓 업데이트 성공 금지 | F4 캐시/시작 테스트, F5 실제 브라우저 |

### 완료 판정

- [ ] 데이터 갱신만으로 Git 커밋·push·Pages 배포가 생기지 않는다.
- [ ] 예약 작업이 원격 마지막 정상 카탈로그에서 이어서 실행된다.
- [ ] 기본/원격/캐시 카탈로그가 같은 계약과 계산 검산을 통과한다.
- [ ] 앱의 초기 계산이 Supabase 응답을 기다리지 않으며, 오프라인 재접속이 가능하다.
- [ ] 다운로드된 새 데이터는 명시적 새로고침 뒤 한 버전으로 적용된다.
- [ ] 데이터·게시 기준일과 주봉 날짜가 구분되고 기존 환율·시나리오가 유지된다.
- [ ] 중간 실패와 롤백이 검증됐고 비밀값이 번들·로그·artifact에 없다.
- [ ] 1440·390 화면 확인, production PWA 확인, PC가 꺼진 상태의 실행을 포함한 예약 2회 검증이 기록됐다.

### 확인한 공식 자료

- [Supabase 공개 버킷과 접근 모델](https://supabase.com/docs/guides/storage/buckets/fundamentals): 공개 읽기와 쓰기 권한은 구분한다.
- [Supabase 파일 제공 URL](https://supabase.com/docs/guides/storage/serving/downloads): 브라우저에서 공개 객체를 직접 읽는다.
- [Supabase 업로드](https://supabase.com/docs/guides/storage/uploads/standard-uploads): 버전 파일의 새 경로 게시와 작은 파일 업로드 설계의 기준.
- [Supabase Storage 권한](https://supabase.com/docs/guides/storage/security/access-control): 업로드 권한·서버 자격 증명을 다룬다.
- [GitHub 예약 workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule): 기본 브랜치 실행, 지연 가능성, 공개 저장소의 60일 무활동 제한.
- [Supabase Free 프로젝트 일시정지](https://supabase.com/docs/guides/platform/free-project-pausing): Storage 이용만으로 지속 운영을 보장하지 않는다.
