import React, { useCallback, useMemo } from 'react';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { localPoint } from '@visx/event';
import { GridColumns, GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Bar, LinePath } from '@visx/shape';
import { defaultStyles, TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HistoricalAssetType } from '../../types/finance';
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

const BacktestChartInner: React.FC<BacktestChartProps & { width: number; height: number }> = React.memo(({
  series,
  currency,
  resultView,
  width,
  height,
}) => {
  const reduceMotion = useReducedMotion();
  const margin = useMemo(() => ({
    top: 48,
    right: width > 520 ? 28 : 12,
    bottom: 44,
    left: width > 520 ? 82 : 52,
  }), [width]);
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
  const allValues = allPoints.flatMap((point) => [point.value, ...(point.principal === undefined ? [] : [point.principal])]);
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const dateScale = useMemo(() => scaleTime({ range: [0, innerWidth], domain: [timeExtent[0], timeExtent[1]] }), [innerWidth, timeExtent[0], timeExtent[1]]);
  const valueScale = useMemo(() => scaleLinear({
    range: [innerHeight, 0],
    domain: [minValue, maxValue * 1.08],
    nice: true,
  }), [innerHeight, minValue, maxValue]);
  const formatValue = useCallback((value: number) => resultView === 'NORMALIZED'
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
    : SnowballEngine.formatBigNumber(value, currency), [currency, resultView]);
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft } = useTooltip<{
    date: Date;
    points: Array<BacktestDisplayPoint & Pick<BacktestDisplaySeries, 'assetId' | 'targetMultiple' | 'color'>>;
  }>();

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
    const rows = series.flatMap((item) => {
      const closest = findClosestPointOnOrBefore(item.points, date);
      return closest ? [{ ...closest, assetId: item.assetId, targetMultiple: item.targetMultiple, color: item.color }] : [];
    });
    if (rows.length === 0) return;
    showTooltip({ tooltipData: { date: hoveredDate, points: rows }, tooltipLeft: left });
  }, [dateScale, hideTooltip, innerWidth, margin.left, series, showTooltip]);

  if (width < 10 || height < 10 || allPoints.length === 0) return null;
  const principalPoints = datedSeries[0]?.points.filter((point) => point.principal !== undefined) ?? [];

  return (
    <div className="relative">
      <svg width={width} height={height} role="img" aria-label="과거 백테스트 결과 다중 자산 비교 차트">
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
          <AxisBottom
            top={innerHeight}
            scale={dateScale}
            numTicks={width > 520 ? 7 : 4}
            stroke="var(--apple-hairline)"
            tickStroke="var(--apple-hairline)"
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'middle' }}
          />
          <AxisLeft
            scale={valueScale}
            numTicks={5}
            stroke="none"
            tickFormat={(value) => formatValue(Number(value))}
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'end', dx: -4 }}
          />
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={hideTooltip}
            tabIndex={0}
          />
          {tooltipData && (
            <line x1={tooltipLeft} x2={tooltipLeft} y1={0} y2={innerHeight} stroke="var(--apple-ink-muted-48)" strokeWidth={1} pointerEvents="none" />
          )}
        </Group>
      </svg>
      <AnimatePresence>
        {tooltipData && (
          <TooltipWithBounds top={margin.top} left={(tooltipLeft ?? 0) + margin.left} style={tooltipStyles}>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              <div className="mb-3 border-b border-apple-hairline pb-2 font-semibold text-apple-ink">
                {tooltipData.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
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
              </div>
            </motion.div>
          </TooltipWithBounds>
        )}
      </AnimatePresence>
    </div>
  );
});

const BacktestChart: React.FC<BacktestChartProps> = ({ series, currency, resultView }) => {
  if (series.length === 0) return null;
  const finalValuesLabel = `차트 최종값: ${series.map((item) => `${item.assetId} ${item.points.at(-1)?.value ?? 0}`).join(', ')}`;
  return (
    <div className="flex h-full w-full flex-col" aria-label={finalValuesLabel}>
      <div className="relative min-h-[280px] flex-1">
        <ParentSize>
          {({ width, height }) => (
            <BacktestChartInner series={series} currency={currency} resultView={resultView} width={width} height={height} />
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
      </div>
    </div>
  );
};

export default BacktestChart;
