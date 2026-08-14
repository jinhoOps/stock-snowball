# ❄️ Stock Snowball

## **[👉 jinhoops.github.io/stock-snowball](https://jinhoops.github.io/stock-snowball/)**

매일의 작은 투자가 복리의 힘으로 거대한 눈덩이가 되는 과정을 시각화하는 **투자 시뮬레이션 도구**입니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 🎯 **정밀 복리 엔진** | `Decimal.js` + Banker's Rounding으로 부동소수점 오차 없는 연산 |
| 📊 **인터랙티브 차트** | visx 기반 자산 성장 곡선 + 스크러빙 탐색 |
| 🔮 **What-If 시뮬레이션** | 과거 데이터 백테스트 + 미래 시나리오(Cone of Uncertainty) |
| 💱 **실전 반영** | 환율·세금·수수료·ISA 세제혜택까지 반영한 실질 수익률 |
| 📱 **PWA 지원** | 오프라인 구동, 홈 화면 설치, 시나리오 로컬 저장 |
| ♿ **접근성** | WCAG AA 준수, 스크린 리더 지원 |

## 로컬 실행

```bash
npm install
npm run dev
```

## 백테스트 데이터 갱신

백테스트 데이터는 브라우저와 배포 CI가 외부 시세 API를 호출하지 않도록 정적 파일로 제공합니다. Python 도구는 `uv`와 Python 3.13을 사용하며, 데이터 갱신은 개발자가 수동으로 실행합니다.

```bash
uv python install 3.13 --default
uv sync --locked
npm run data:refresh # Yahoo Finance 데이터를 수동으로 갱신
npm run data:check   # 네트워크 없이 생성 데이터를 검증
npm test
npm run build
```

시세는 실제 종목·지수의 제공 가능한 기간만 사용합니다. 생성 데이터는 분할 조정 종가와 별도 현금 배당을 보관하며, CSV와 매니페스트 변경 사항을 검토한 후 커밋합니다.

⚡ *Built autonomously using [GSD](https://github.com/gsd-build/get-shit-done).*
---

## 라이선스

[MIT](./LICENSE) © KIM JINHO
