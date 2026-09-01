import React, { useCallback, useMemo, useState } from 'react';
import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { curveMonotoneX, curveStepAfter } from '@visx/curve';
import { localPoint } from '@visx/event';
import { GridColumns, GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Bar, LinePath } from '@visx/shape';
import { defaultStyles, TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HistoricalAssetType } from '../../types/finance';
import { findMarketTrendOnOrBefore, type MarketTrendOverlay } from '../../core/MarketTrend';
import { SnowballEngine } from '../../core/SnowballEngine';

export interface BacktestDisplayPoint {
  date: string;
  value: number;
  principal?: number;
  isLiquidated?: boolean;
}

export interface BacktestDisplaySeries {
  assetId: HistoricalAssetType;
  targetMultiple: 1 | 2 | 3;
  color: string;
  strokeDasharray?: string;
  points: BacktestDisplayPoint[];
}

interface BacktestChartProps {
  series: BacktestDisplaySeries[];
  currency: 'KRW' | 'USD';
  resultView: 'PORTFOLIO' | 'NORMALIZED';
  marketTrend?: MarketTrendOverlay;
}

interface DatedPoint extends BacktestDisplayPoint {
  dateValue: Date;
}

export const findClosestPointOnOrBefore = (
  points: readonly BacktestDisplayPoint[],
  date: string,
): BacktestDisplayPoint | null => {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].date <= date) low = middle + 1;
    else high = middle;
  }
  return low > 0 ? points[low - 1] : null;
};

type BacktestTooltipPoint = BacktestDisplayPoint & Pick<BacktestDisplaySeries, 'assetId' | 'targetMultiple' | 'color'>;

export interface BacktestTooltipData {
  date: string;
  points: BacktestTooltipPoint[];
  marketTrend: {
    label: string;
    sourceDate: string;
    close: number;
    sma20: number | null;
    sma60: number | null;
  } | null;
}

export const resolveBacktestTooltip = (
  series: readonly BacktestDisplaySeries[],
  date: string,
  marketTrend?: MarketTrendOverlay,
): BacktestTooltipData | null => {
  const points = series.flatMap((item) => {
    const closest = findClosestPointOnOrBefore(item.points, date);
    return closest ? [{
      ...closest,
      assetId: item.assetId,
      targetMultiple: item.targetMultiple,
      color: item.color,
    }] : [];
  });
  const marketPoint = marketTrend
    ? findMarketTrendOnOrBefore(marketTrend.points, date)
    : null;
  const resolvedMarketTrend = marketTrend && marketPoint ? {
    label: marketTrend.label,
    sourceDate: marketPoint.sourceDate,
    close: marketPoint.close,
    sma20: marketPoint.sma20,
    sma60: marketPoint.sma60,
  } : null;
  return points.length > 0 || resolvedMarketTrend
    ? { date, points, marketTrend: resolvedMarketTrend }
    : null;
};

const tooltipDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export const formatBacktestTooltipDate = (date: string): string =>
  tooltipDateFormatter.format(new Date(`${date}T00:00:00Z`));

const formatMarketLevel = (value: number): string =>
  value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

const MARKET_SMA_20_DASH = '6,4';
const MARKET_SMA_60_DASH = '12,6';

const tooltipStyles = {
  ...defaultStyles,
  background: 'rgba(255, 255, 255, 0.94)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  borderRadius: '16px',
  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.14)',
  padding: '16px',
  color: 'var(--apple-ink)',
  pointerEvents: 'none' as const,
  zIndex: 100,
};

export const BacktestChartInner: React.FC<BacktestChartProps & { width: number; height: number }> = React.memo(({
  series,
  currency,
  resultView,
  marketTrend,
  width,
  height,
}) => {
  const reduceMotion = useReducedMotion();
  const hasMarketRightAxis = resultView === 'PORTFOLIO' && Boolean(marketTrend?.points.length);
  const margin = useMemo(() => ({
    top: 48,
    right: width > 520 ? (hasMarketRightAxis ? 78 : 28) : (hasMarketRightAxis ? 62 : 12),
    bottom: 44,
    left: width > 520 ? 82 : 52,
  }), [hasMarketRightAxis, width]);
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  const datedSeries = useMemo(() => series.map((item) => ({
    ...item,
    points: item.points.map((point): DatedPoint => ({ ...point, dateValue: new Date(`${point.date}T00:00:00Z`) })),
  })), [series]);
  const allPoints = datedSeries.flatMap((item) => item.points);
  const timeExtent = allPoints.length > 0
    ? [Math.min(...allPoints.map((point) => point.dateValue.getTime())), Math.max(...allPoints.map((point) => point.dateValue.getTime()))] as const
    : [0, 1] as const;
  const marketValues = marketTrend?.points.flatMap((point) => [
    point.indexedClose,
    ...(point.indexedSma20 === null ? [] : [point.indexedSma20]),
    ...(point.indexedSma60 === null ? [] : [point.indexedSma60]),
  ]) ?? [];
  const allValues = [
    ...allPoints.flatMap((point) => [point.value, ...(point.principal === undefined ? [] : [point.principal])]),
    ...(resultView === 'NORMALIZED' ? marketValues : []),
  ];
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const dateScale = useMemo(() => scaleTime({ range: [0, innerWidth], domain: [timeExtent[0], timeExtent[1]] }), [innerWidth, timeExtent[0], timeExtent[1]]);
  const valueScale = useMemo(() => scaleLinear({
    range: [innerHeight, 0],
    domain: [minValue, maxValue * 1.08],
    nice: true,
  }), [innerHeight, minValue, maxValue]);
  const marketTrendExtent = marketValues.length > 0
    ? [Math.min(...marketValues), Math.max(...marketValues)] as const
    : [0, 1] as const;
  const marketTrendScale = useMemo(() => scaleLinear({
    range: [innerHeight, 0],
    domain: [marketTrendExtent[0], marketTrendExtent[1]],
    nice: true,
  }), [innerHeight, marketTrendExtent[0], marketTrendExtent[1]]);
  const activeTrendScale = resultView === 'NORMALIZED' ? valueScale : marketTrendScale;
  const formatValue = useCallback((value: number) => resultView === 'NORMALIZED'
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
    : SnowballEngine.formatBigNumber(value, currency), [currency, resultView]);
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft } = useTooltip<BacktestTooltipData>();
  const keyboardDates = useMemo(() => [...new Set(series.flatMap((item) => item.points.map((point) => point.date)))].sort(), [series]);
  const [keyboardIndex, setKeyboardIndex] = useState(0);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const currentKeyboardIndex = Math.min(keyboardIndex, Math.max(0, keyboardDates.length - 1));

  const showTooltipAtDate = useCallback((date: string, requestedLeft?: number) => {
    const resolved = resolveBacktestTooltip(series, date, marketTrend);
    if (!resolved) return;
    const left = requestedLeft ?? dateScale(new Date(`${date}T00:00:00Z`));
    showTooltip({ tooltipData: resolved, tooltipLeft: left });
  }, [dateScale, marketTrend, series, showTooltip]);

  const handleTooltip = useCallback((event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const left = point.x - margin.left;
    if (left < 0 || left > innerWidth) {
      hideTooltip();
      return;
    }
    const hoveredDate = dateScale.invert(left);
    const date = hoveredDate.toISOString().slice(0, 10);
    showTooltipAtDate(date, left);
  }, [dateScale, hideTooltip, innerWidth, margin.left, showTooltipAtDate]);

  const showKeyboardTooltip = useCallback((index: number) => {
    if (keyboardDates.length === 0) return;
    const nextIndex = Math.max(0, Math.min(index, keyboardDates.length - 1));
    setKeyboardIndex(nextIndex);
    showTooltipAtDate(keyboardDates[nextIndex]);
  }, [keyboardDates, showTooltipAtDate]);

  const handleKeyboard = useCallback((event: React.KeyboardEvent<SVGRectElement>) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowLeft') nextIndex = currentKeyboardIndex - 1;
    if (event.key === 'ArrowRight') nextIndex = currentKeyboardIndex + 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = keyboardDates.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    showKeyboardTooltip(nextIndex);
  }, [currentKeyboardIndex, keyboardDates.length, showKeyboardTooltip]);

  if (width < 10 || height < 10 || allPoints.length === 0) return null;
  const principalPoints = datedSeries[0]?.points.filter((point) => point.principal !== undefined) ?? [];
  const svgLabel = marketTrend
    ? `과거 백테스트 결과 다중 자산 비교 차트 · ${marketTrend.label} 완료 주봉 가격지수와 20주선 및 60주선 포함`
    : '과거 백테스트 결과 다중 자산 비교 차트';

  return (
    <div className="relative">
      <svg width={width} height={height} role="img" aria-label={svgLabel}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={valueScale} width={innerWidth} stroke="var(--apple-divider-soft)" strokeDasharray="4,4" />
          <GridColumns scale={dateScale} height={innerHeight} stroke="var(--apple-divider-soft)" strokeDasharray="4,4" />
          {resultView === 'PORTFOLIO' && principalPoints.length > 0 && (
            <LinePath<DatedPoint>
              data={principalPoints}
              x={(point) => dateScale(point.dateValue) ?? 0}
              y={(point) => valueScale(point.principal ?? 0) ?? 0}
              stroke="var(--apple-ink-muted-48)"
              strokeWidth={1}
              strokeDasharray="4,4"
              curve={curveMonotoneX}
            />
          )}
          {datedSeries.map((item) => (
            <LinePath<DatedPoint>
              key={item.assetId}
              data={item.points}
              x={(point) => dateScale(point.dateValue) ?? 0}
              y={(point) => valueScale(point.value) ?? 0}
              stroke={item.color}
              strokeWidth={item.targetMultiple === 1 ? 2.5 : 2}
              strokeDasharray={item.strokeDasharray}
              curve={curveMonotoneX}
            />
          ))}
          {marketTrend && (
            <>
              <LinePath
                data={marketTrend.points}
                x={(point) => dateScale(new Date(`${point.date}T00:00:00Z`)) ?? 0}
                y={(point) => activeTrendScale(point.indexedClose) ?? 0}
                curve={curveStepAfter}
                stroke="var(--market-index)"
                strokeWidth={1.5}
                fill="none"
                aria-label={`${marketTrend.label} 가격지수`}
              />
              <LinePath
                data={marketTrend.points.filter((point) => point.indexedSma20 !== null)}
                x={(point) => dateScale(new Date(`${point.date}T00:00:00Z`)) ?? 0}
                y={(point) => activeTrendScale(point.indexedSma20!) ?? 0}
                curve={curveStepAfter}
                stroke="var(--market-sma-20)"
                strokeWidth={1.5}
                strokeDasharray={MARKET_SMA_20_DASH}
                fill="none"
                aria-label={`${marketTrend.label} 20주 SMA`}
              />
              <LinePath
                data={marketTrend.points.filter((point) => point.indexedSma60 !== null)}
                x={(point) => dateScale(new Date(`${point.date}T00:00:00Z`)) ?? 0}
                y={(point) => activeTrendScale(point.indexedSma60!) ?? 0}
                curve={curveStepAfter}
                stroke="var(--market-sma-60)"
                strokeWidth={1.5}
                strokeDasharray={MARKET_SMA_60_DASH}
                fill="none"
                aria-label={`${marketTrend.label} 60주 SMA`}
              />
            </>
          )}
          <AxisBottom
            top={innerHeight}
            scale={dateScale}
            numTicks={width > 520 ? 7 : 4}
            stroke="var(--apple-hairline)"
            tickStroke="var(--apple-hairline)"
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'middle' }}
          />
          <g role="group" aria-label={resultView === 'PORTFOLIO' ? '포트폴리오 가치' : '시작값 100'}>
            <AxisLeft
              scale={valueScale}
              numTicks={5}
              stroke="none"
              tickFormat={(value) => formatValue(Number(value))}
              tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'end', dx: -4 }}
            />
          </g>
          {hasMarketRightAxis && (
            <g role="group" aria-label="시장 추세 (시작값 100)">
              <AxisRight
                left={innerWidth}
                scale={marketTrendScale}
                numTicks={5}
                stroke="none"
                tickFormat={(value) => Math.round(Number(value)).toLocaleString('ko-KR')}
                tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'start', dx: 4 }}
              />
            </g>
          )}
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => {
              if (!keyboardFocused) hideTooltip();
            }}
            onFocus={() => {
              setKeyboardFocused(true);
              showKeyboardTooltip(currentKeyboardIndex);
            }}
            onBlur={() => {
              setKeyboardFocused(false);
              hideTooltip();
            }}
            onKeyDown={handleKeyboard}
            role="slider"
            aria-label="차트 날짜 탐색"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, keyboardDates.length - 1)}
            aria-valuenow={currentKeyboardIndex}
            aria-valuetext={keyboardDates[currentKeyboardIndex] ? formatBacktestTooltipDate(keyboardDates[currentKeyboardIndex]) : undefined}
            stroke={keyboardFocused ? 'var(--apple-primary)' : 'transparent'}
            strokeWidth={2}
            tabIndex={0}
          />
          {tooltipData && (
            <line x1={tooltipLeft ?? 0} x2={tooltipLeft ?? 0} y1={0} y2={innerHeight} stroke="var(--apple-ink-muted-48)" strokeWidth={1} pointerEvents="none" />
          )}
        </Group>
      </svg>
      <AnimatePresence>
        {tooltipData && (
          <TooltipWithBounds top={margin.top} left={(tooltipLeft ?? 0) + margin.left} style={tooltipStyles}>
            <motion.div
              role="status"
              aria-live="polite"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              <div className="mb-3 border-b border-apple-hairline pb-2 font-semibold text-apple-ink">
                {formatBacktestTooltipDate(tooltipData.date)}
              </div>
              <div className="min-w-[190px] space-y-2">
                {tooltipData.points.map((point) => (
                  <div key={point.assetId} className="flex items-center justify-between gap-5">
                    <span className="flex items-center gap-2 text-caption-strong text-apple-ink">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: point.color }} />
                      {point.assetId}
                      <span className="rounded-sm bg-apple-canvas px-1.5 py-0.5 text-micro-legal">{point.targetMultiple}×</span>
                    </span>
                    <span className="font-display text-caption-strong text-apple-ink">{formatValue(point.value)}</span>
                  </div>
                ))}
                {resultView === 'PORTFOLIO' && tooltipData.points[0]?.principal !== undefined && (
                  <div className="flex justify-between border-t border-apple-hairline pt-2 text-fine-print text-apple-ink-muted-48">
                    <span>투자 원금</span>
                    <span>{formatValue(tooltipData.points[0].principal!)}</span>
                  </div>
                )}
                {tooltipData.marketTrend && (
                  <div className="space-y-2 border-t border-apple-hairline pt-2">
                    <div className="flex items-center justify-between gap-5 text-caption-strong text-apple-ink">
                      <span>{tooltipData.marketTrend.label}</span>
                      <span className="font-display">{formatMarketLevel(tooltipData.marketTrend.close)}</span>
                    </div>
                    <div className="text-micro-legal text-apple-ink-muted-48">
                      완료 주봉 {formatBacktestTooltipDate(tooltipData.marketTrend.sourceDate)}
                    </div>
                    {tooltipData.marketTrend.sma20 !== null && (
                      <div className="flex justify-between gap-5 text-fine-print text-apple-ink">
                        <span>20주선</span>
                        <span className="font-display">{formatMarketLevel(tooltipData.marketTrend.sma20)}</span>
                      </div>
                    )}
                    {tooltipData.marketTrend.sma60 !== null && (
                      <div className="flex justify-between gap-5 text-fine-print text-apple-ink">
                        <span>60주선</span>
                        <span className="font-display">{formatMarketLevel(tooltipData.marketTrend.sma60)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </TooltipWithBounds>
        )}
      </AnimatePresence>
    </div>
  );
});

const BacktestChart: React.FC<BacktestChartProps> = ({ series, currency, resultView, marketTrend }) => {
  if (series.length === 0) return null;
  const finalValuesLabel = `차트 최종값: ${series.map((item) => `${item.assetId} ${item.points.at(-1)?.value ?? 0}`).join(', ')}`;
  return (
    <div className="flex h-full w-full flex-col" aria-label={finalValuesLabel}>
      <div className="relative min-h-[280px] flex-1">
        <ParentSize>
          {({ width, height }) => (
            <BacktestChartInner series={series} currency={currency} resultView={resultView} marketTrend={marketTrend} width={width} height={height} />
          )}
        </ParentSize>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-5 pb-1">
        {series.map((item) => (
          <div key={item.assetId} className="flex items-center gap-2 text-fine-print font-bold text-apple-ink">
            <svg width="22" height="6" aria-hidden="true">
              <line x1="0" x2="22" y1="3" y2="3" stroke={item.color} strokeWidth="2" strokeDasharray={item.strokeDasharray} />
            </svg>
            {item.assetId} <span className="rounded-sm bg-apple-canvas px-1.5 py-0.5">{item.targetMultiple}×</span>
          </div>
        ))}
        {resultView === 'PORTFOLIO' && (
          <div className="flex items-center gap-2 text-fine-print font-bold text-apple-ink-muted-48">
            <span className="w-5 border-t border-dashed border-apple-ink-muted-48" /> 투자 원금
          </div>
        )}
        {marketTrend && (
          <>
            <div className="flex items-center gap-2 text-fine-print font-bold text-apple-ink">
              <svg width="22" height="6" aria-label={`${marketTrend.label} 가격지수 범례`}>
                <line role="presentation" x1="0" x2="22" y1="3" y2="3" stroke="var(--market-index)" strokeWidth="2" />
              </svg>
              {marketTrend.label} ({marketTrend.ticker})
            </div>
            <div className="flex items-center gap-2 text-fine-print font-bold text-apple-ink">
              <svg width="22" height="6" aria-label="20주 SMA 범례">
                <line role="presentation" x1="0" x2="22" y1="3" y2="3" stroke="var(--market-sma-20)" strokeWidth="2" strokeDasharray={MARKET_SMA_20_DASH} />
              </svg>
              20주 SMA
            </div>
            <div className="flex items-center gap-2 text-fine-print font-bold text-apple-ink">
              <svg width="22" height="6" aria-label="60주 SMA 범례">
                <line role="presentation" x1="0" x2="22" y1="3" y2="3" stroke="var(--market-sma-60)" strokeWidth="2" strokeDasharray={MARKET_SMA_60_DASH} />
              </svg>
              60주 SMA
            </div>
          </>
        )}
      </div>
      {marketTrend && (
        <p className="mt-2 pb-1 text-center text-micro-legal text-apple-ink-muted-48">
          완료 주봉 가격지수와 이동평균이며 수익률 비교선이 아닙니다.
        </p>
      )}
    </div>
  );
};

export default BacktestChart;
