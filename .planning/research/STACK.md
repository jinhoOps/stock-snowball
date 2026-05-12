# Technology Stack: Snowball Engine

**Project:** Stock Snowball
**Researched:** 2024-05-22

## Recommended Stack

### Core Math & Accuracy
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `decimal.js` | ^10.4.3 | 임의 정밀도 10진수 연산 | IEEE 754 부동 소수점 오차 완벽 해결, 금융 계산에 최적화된 API 제공 |
| `BigInt` | Native | 정수 기반 금액 저장 | 통화의 최소 단위(센트, 원) 저장 시 메모리 효율 및 정밀도 확보 |

### Formatting & Localization
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `Intl.NumberFormat` | Native | 통화 포맷팅 | 각 국가별 통화 기호, 소수점 구분자 자동 처리 |
| `Intl.DateTimeFormat` | Native | 날짜/시간 포맷팅 | 다국적 사용자를 위한 시뮬레이션 시점 표시 |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | ^3.0.0 | 투자 기간 및 주기 계산 | 매월/매주 정기 불입일 및 복리 주기 계산 시 |
| `zod` | ^3.22.0 | 스키마 검증 | 엔진 입력값(이자율, 금액)의 유효성 검사 |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Precision | `decimal.js` | `big.js` | `big.js`는 가볍지만 복리 계산에 필요한 지수(`pow`) 연산 기능이 제한적임 |
| Precision | `decimal.js` | `bignumber.js` | 두 라이브러리 모두 우수하나, 금융권에서는 `decimal.js`의 고정 소수점 제어 기능이 선호됨 |
| Time | `date-fns` | `moment.js` | `moment.js`는 무겁고 불변성을 보장하지 않음 (Deprecated) |

## Installation

```bash
# Core math
npm install decimal.js

# Utils
npm install date-fns zod
```

## Sources

- [Decimal.js Documentation](http://mikemcl.github.io/decimal.js/)
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Stripe Engineering: Handling Currencies](https://stripe.com/docs/currencies)
