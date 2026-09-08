# 날짜 선택과 경제 위기 시나리오

## 변경

- 공통 Sheet에 범위 달력, 연도·월 이동, 날짜 직접 입력, 원자적 적용·취소를 제공한다.
- 최근 1·3·5·10년과 전체 구간을 항상 노출한다. 추가 기간의 연초·월말 계산은 시간대에 영향받지 않는다.
- 경제 위기 시나리오는 접힌 메뉴 밖에 표시하며 레버리지 가족 비교에서도 유지한다. 날짜와 설명, 선택 상태, 지원 불가 사유를 제공한다.
- 닷컴, 리먼, 2011 유럽 재정위기, 2015 중국발 충격, 2018 긴축·무역갈등, 코로나, 2022 금리 인상, 2023 미국 은행 위기, 2025 관세 충격을 시간순으로 제공한다. 회복 이후 장기 비교는 별도로 펼쳐서 선택한다.
- 공통 데이터가 전체 시나리오를 포함하지 않으면 비활성화한다. 사용자가 요청한 범위에 따라 대공황은 제외한다.
- 코로나 구간은 급락만 포함하도록 설명을 수정했다. 2025 시나리오의 미래 종료일과 Projected 표기를 제거했다.

## 관찰 구간의 근거

이는 종목별 고점·저점을 자동 탐색하는 기능이 아니다. 사건별로 명시한 관찰 구간으로 비교하며, 기간 전체가 모든 자산의 연속 하락을 의미하지 않는다.

- [연준: 금융위기와 이후](https://www.federalreservehistory.org/essays/great-recession-and-its-aftermath): 리먼 사태의 맥락. 기존 2007-10-09 ~ 2009-03-09 시장 관찰 범위를 유지한다.
- [S&P DJI: 2022년 2월](https://www.spglobal.com/spdji/en/commentary/article/us-equities-market-attributes-february-2022/): 2020-02-19와 2020-03-23, 2022-01-03의 시장 기준점.
- [S&P DJI: 2022년 11월](https://www.spglobal.com/spdji/en/commentary/article/us-equities-market-attributes-november-2022/): 2022-10-12 저점 기준.
- [S&P Global: 관세 영향](https://www.spglobal.com/market-intelligence/en/news-insights/research/tariff-tools-in-action-tracking-impact-with-data): 2025-04-02 발표.
- [S&P Global Ratings: 2025 시장](https://www.spglobal.com/ratings/en/regulatory/article/-/view/sourceId/13491356): 2025-04-08 저점 기준.

## 검증

- 단위 테스트: 날짜 임시 편집, 적용·취소, 잘못된 날짜·지원 범위, 최종 연도 누락 회귀, 월말·연초 단축 기간.
- 브라우저: 데스크톱 1440px, 모바일 390px; 달력은 320px에서도 날짜 셀 44px 이상과 가로 넘침 없음을 확인.
- 위기 구간 적용 및 선택 표시, 나스닥·AMD 가족 공통 데이터 제한, 미래 날짜 선택 불가 확인.
- 전체 E2E 32개 통과 후, 최종 사건 목록 변경에 대해 날짜·시나리오 E2E 10개를 재검증했다. 최종 단위 테스트 203개, 디자인 토큰 검사와 검사기 테스트 3개, 프로덕션 빌드가 통과했다.
- 스크린샷: `test-results/visual-review/date-range-*`, `economic-scenarios-*` (gitignored).
- 기존 대용량 historical-data 청크 경고와 jsdom scrollTo 미구현 출력은 남아 있다.


## 추가 사건의 범위

- [연준 FEDS Notes 부록](https://www.federalreserve.gov/econres/notes/feds-notes/u-s-interest-rates-and-emerging-market-currencies-taking-stock-10-years-after-the-taper-tantrum-20231004.html)의 사건 관찰 구간을 사용: 유럽 재정위기 2011-07-22 ~ 2011-11-25, 중국 경기 둔화·위안화 절하 2015-05-20 ~ 2015-09-23. 해당 연구는 신흥국 통화 사건 연구이며, 이 날짜를 미국 주식의 고점·저점으로 표시하지 않는다.
- [연준 2019년 2월 통화정책 보고서](https://www.federalreserve.gov/monetarypolicy/2019-02-mpr-part1.htm)의 2018년 4분기 주식시장 불안에 맞춰 2018-10-01 ~ 2018-12-31로 설정. 연말 반등을 포함한다.
- [연준 2023년 5월 금융안정 보고서](https://www.federalreserve.gov/publications/files/financial-stability-report-20230508.pdf)의 3월 6일 주간부터 시작된 은행 불안을 관찰하도록 2023-03-06 ~ 2023-03-24의 3주를 선정했다. 3주 종료일은 이 앱의 관찰 범위이며 위기 종료일을 뜻하지 않는다.
