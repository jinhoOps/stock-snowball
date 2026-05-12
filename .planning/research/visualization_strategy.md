# 시각화 전략: Stock Snowball

**도메인:** 금융 데이터 시각화 (복리 성장 시뮬레이션)
**디자인 컨셉:** Apple Minimalist (Clarity, Simplicity, Fluidity)
**조사 날짜:** 2024-05-12

## 1. 개요
"Stock Snowball"의 핵심 가치는 시간이 지남에 따라 자산이 기하급수적으로 증가하는 '눈덩이 효과'를 사용자가 체감하게 하는 것입니다. Apple의 디자인 철학을 따라, 복잡한 격자선과 수치를 배제하고 **데이터의 흐름과 성장의 궤적**에 집중하는 시각화 전략을 제안합니다.

## 2. 라이브러리 비교 및 추천

| 라이브러리 | 장점 | 단점 | Apple 스타일 적합도 |
| :--- | :--- | :--- | :--- |
| **visx** (추천) | 저수준 프리미티브 제공, 픽셀 단위 커스텀, 가벼움 | 학습 곡선 높음, 직접 조립 필요 | **최상** (가장 정교함) |
| **Nivo** | `react-spring` 기반의 유려한 애니메이션, 높은 완성도 | 세밀한 커스텀(스크러빙 등) 제한적 | 상 (빠른 구현) |
| **Recharts** | 사용법이 매우 쉬움, 대중적인 컴포넌트 구조 | Apple 특유의 독특한 인터랙션 구현 한계 | 중 (표준적) |

### **최종 추천: visx + Framer Motion**
*   **visx:** Apple의 건강(Health) 및 주식(Stocks) 앱과 같은 정교한 차트 인터랙션(Scrubbing, Snap-to-datum)을 구현하기 위해 필수적입니다.
*   **Framer Motion:** 차트 진입 시의 '성장 애니메이션'과 UI 요소 간의 부드러운 전환을 위해 보조적으로 사용합니다.

---

## 3. 구현 전략

### 🎨 시각적 요소 (Visuals)
*   **Color:** Apple Action Blue (`#0066cc`)를 메인 라인 컬러로 사용. 하단에 매우 투명한 그라데이션(`LinearGradient`)을 배치하여 볼륨감 형성.
*   **Curve:** `curveMonotoneX`를 사용하여 급격한 꺾임 없는 부드러운 곡선 구현.
*   **Typography:** SF Pro Display(헤드라인) 및 SF Pro Text(데이터) 사용. 숫자에는 `font-variant-numeric: tabular-nums` 필수로 적용.
*   **Minimalism:** Y축 격자선 제거, X축은 주요 시점만 표시. 배경은 `canvas-parchment` (#f5f5f7) 또는 순백색 사용.

### 🖱 인터랙션 (Interactions)
*   **Scrubbing (탐색):** 사용자가 차트 위를 드래그할 때 가장 가까운 데이터 포인트로 수직 가이드라인이 '착' 달라붙는(Snap) 효과 구현.
*   **Progressive Disclosure:** 평소에는 최종 자산액만 보여주다가, 스크러빙 시 해당 시점의 상세 수익률과 원금을 툴팁으로 노출.
*   **Haptic Simulation:** 스크러빙 시 툴팁이나 마커에 미세한 `spring` 기반 스케일 변화 적용.

### ❄️ '눈덩이' 특화 시각화
*   **Growing Marker:** 차트의 선을 따라 움직이는 포인터(Marker)의 크기를 자산 규모에 비례하여 미세하게 키움으로써 '눈덩이가 커지는' 시각적 은유 적용.
*   **Path Drawing:** 페이지 진입 시 복리 곡선이 왼쪽에서 오른쪽으로 부드럽게 그려지는 애니메이션 (`stroke-dasharray` 활용).

---

## 4. 기술적 구현 예시 (visx)

```tsx
import { XYChart, LineSeries, AreaSeries, Tooltip, Crosshair } from '@visx/xychart';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';

// Apple 스타일 스크러빙 차트 핵심 구조
const SnowballChart = ({ data }) => (
  <XYChart xScale={{ type: 'time' }} yScale={{ type: 'linear' }}>
    <LinearGradient id="area-gradient" from="#0066cc" to="#0066cc" fromOpacity={0.15} toOpacity={0} />
    <AreaSeries data={data} fill="url(#area-gradient)" curve={curveMonotoneX} {...accessors} />
    <LineSeries data={data} stroke="#0066cc" strokeWidth={2.5} curve={curveMonotoneX} {...accessors} />
    <Crosshair showVerticalLine snapTooltipToDatumX stroke="#0066cc" />
    <Tooltip 
      renderTooltip={({ tooltipData }) => (
        <div className="apple-tooltip">
          <p className="date">{formatDate(tooltipData.nearestDatum.datum.date)}</p>
          <p className="value">{formatCurrency(tooltipData.nearestDatum.datum.value)}</p>
        </div>
      )}
    />
  </XYChart>
);
```

---

## 5. 결론 및 로드맵 반영
1.  **Phase 1 (MVP):** `visx`를 이용한 기본 복리 곡선 및 스크러빙 인터랙션 구현.
2.  **Phase 2 (Polish):** `Framer Motion` 연동 및 눈덩이 마커 애니메이션 추가.
3.  **Phase 3 (Expansion):** 다크 모드(`surface-tile-1`) 대응 및 모바일 제스처 최적화.
