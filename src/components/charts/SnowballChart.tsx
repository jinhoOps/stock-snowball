import React, { useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, Bar, Area } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ParentSize } from '@visx/responsive';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { Tooltip as CommonTooltip } from '../common/Tooltip';
import { AnimatePresence } from 'framer-motion';
import { SimulationMode } from '../../types/finance';

export interface SnowballScenarioPoint {
  date: Date;
  value: number;
  realValue?: number;
  pessimistic?: number;
  optimistic?: number;
  contribution?: number;
}

export interface SnowballScenarioData {
  id: string;
  name: string;
  color: string;
  points: SnowballScenarioPoint[];
}

export interface SnowballChartSelection {
  date: Date;
  points: Array<{
    id: string;
    name: string;
    value: number;
    realValue?: number;
    color: string;
    pessimistic?: number;
    optimistic?: number;
  }>;
}

export interface SnowballChartProps {
  scenarios: SnowballScenarioData[];
  mode: SimulationMode;
  comparisonMode?: boolean;
  showRealValue?: boolean;
  onShowRealValueChange?: (show: boolean) => void;
  onPointSelect?: (data: SnowballChartSelection) => void;
  onPointHover?: (data: SnowballChartSelection | null) => void;
}

const MS_PER_MONTH = 365 * 86_400_000 / 12;

// Resolve each scenario by its own dates; values do not extend beyond its coverage.
const findPointOnOrBefore = (points: readonly SnowballScenarioPoint[], targetTime: number): SnowballScenarioPoint | null => {
  if (points.length === 0 || targetTime < points[0].date.getTime() || targetTime > points.at(-1)!.date.getTime()) return null;
  let l = 0;
  let h = points.length;

  while (l < h) {
    const mid = (l + h) >>> 1;
    if (points[mid].date.getTime() <= targetTime) l = mid + 1;
    else h = mid;
  }
  return l > 0 ? points[l - 1] : null;
};

const tooltipStyles = {
  ...defaultStyles,
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  padding: '12px',
  color: 'var(--apple-ink)',
  fontSize: '13px',
  lineHeight: '1.4',
  pointerEvents: 'none' as const,
  zIndex: 100,
};

const SnowballChartInner: React.FC<{ 
  scenarios: SnowballScenarioData[];
  width: number; 
  height: number;
  mode: SimulationMode;
  comparisonMode?: boolean;
  showRealValue?: boolean;
  onPointSelect?: SnowballChartProps['onPointSelect'];
  onPointHover?: SnowballChartProps['onPointHover'];
}> = React.memo(({ scenarios, width, height, comparisonMode, showRealValue, onPointHover }) => {
  const margin = useMemo(() => ({
    top: 24, 
    right: width > 520 ? 32 : 16, 
    bottom: 48, 
    left: width > 520 ? 72 : 48 
  }), [width]);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
  } = useTooltip<{
    date: Date;
    xValue: number | Date;
    points: { id: string; name: string; value: number; realValue?: number; color: string; pessimistic?: number; optimistic?: number; contribution?: number }[];
  }>();

  // 1. Data Transformation for Comparison Mode
  const processedScenarios = useMemo(() => {
    return scenarios.map(s => ({
      ...s,
      transformedPoints: s.points.map(p => ({
        ...p,
        monthsElapsed: (p.date.getTime() - s.points[0].date.getTime()) / MS_PER_MONTH,
      }))
    }));
  }, [scenarios]);

  // 2. Scale & Domain Setup
  const allProcessedPoints = useMemo(() => processedScenarios.flatMap(s => s.transformedPoints), [processedScenarios]);
  
  const xScale = useMemo(() => {
    if (comparisonMode) {
      const maxMonths = Math.max(...allProcessedPoints.map(d => d.monthsElapsed), 12);
      return scaleLinear({
        range: [0, innerWidth],
        domain: [0, maxMonths],
      });
    } else {
      const dateDomain = allProcessedPoints.length === 0 
        ? [new Date().getTime(), new Date().getTime() + 365*24*60*60*1000]
        : [Math.min(...allProcessedPoints.map(d => d.date.getTime())), Math.max(...allProcessedPoints.map(d => d.date.getTime()))];
      return scaleTime({
        range: [0, innerWidth],
        domain: dateDomain,
      });
    }
  }, [allProcessedPoints, innerWidth, comparisonMode]);

  const valueScale = useMemo(() => {
    if (allProcessedPoints.length === 0) return scaleLinear({ range: [innerHeight, 0], domain: [0, 1000000] });
    const maxValue = Math.max(...allProcessedPoints.map(d => Math.max(d.value, d.optimistic || 0, d.contribution || 0))) * 1.1;
    return scaleLinear({
      range: [innerHeight, 0],
      domain: [0, maxValue],
      nice: true,
    });
  }, [allProcessedPoints, innerHeight]);

  // 3. Handlers
  const handleTooltip = useCallback(
    (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const xLeft = x - margin.left;
      if (xLeft < 0 || xLeft > innerWidth) {
        hideTooltip();
        if (onPointHover) onPointHover(null);
        return;
      }
      
      const x0 = xScale.invert(xLeft);
      const tooltipPoints = processedScenarios.flatMap(s => {
        const start = s.points[0];
        if (!start) return [];
        const targetTime = comparisonMode
          ? Math.round(start.date.getTime() + Number(x0) * MS_PER_MONTH)
          : Number(x0);
        const p = findPointOnOrBefore(s.points, targetTime);
        return p ? [{
          ...p,
          id: s.id,
          name: s.name,
          color: s.color,
        }] : [];
      });
      if (tooltipPoints.length === 0) {
        hideTooltip();
        onPointHover?.(null);
        return;
      }

      const tooltipPayload = {
        date: comparisonMode ? tooltipPoints[0].date : new Date(Number(x0)),
        xValue: x0,
        points: tooltipPoints,
      };

      showTooltip({
        tooltipData: tooltipPayload,
        tooltipLeft: xLeft,
        tooltipTop: valueScale(tooltipPoints[0].value),
      });

      if (onPointHover) onPointHover(tooltipPayload);
    },
    [showTooltip, hideTooltip, xScale, valueScale, processedScenarios, margin.left, innerWidth, onPointHover, comparisonMode]
  );

  const formatCurrency = (val: number) => {
    if (val >= 100000000) return `${(val / 100000000).toFixed(2)}억`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}만`;
    return val.toLocaleString();
  };

  if (width < 10) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <defs>
          {processedScenarios.map(s => (
            <LinearGradient
              key={`gradient-${s.id}`}
              id={`gradient-${s.id}`}
              from={s.color}
              to={s.color}
              fromOpacity={0.15}
              toOpacity={0.05}
            />
          ))}
        </defs>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={valueScale} width={innerWidth} stroke="var(--apple-divider-soft)" strokeDasharray="4,4" />
          <GridColumns scale={xScale} height={innerHeight} stroke="var(--apple-divider-soft)" strokeDasharray="4,4" />

          {/* 1. Range Areas (Cone of Uncertainty) */}
          {processedScenarios.map(s => (
            s.transformedPoints.some(p => p.pessimistic !== undefined) && (
              <Area<any>
                key={`range-${s.id}`}
                data={s.transformedPoints}
                x={d => xScale(comparisonMode ? d.monthsElapsed : d.date.getTime()) ?? 0}
                y0={d => valueScale(d.pessimistic ?? d.value) ?? 0}
                y1={d => valueScale(d.optimistic ?? d.value) ?? 0}
                fill={s.color}
                fillOpacity={0.12}
                curve={curveMonotoneX}
              />
            )
          ))}

          {/* 2. Main Lines */}
          {processedScenarios.map(s => (
            <React.Fragment key={`lines-${s.id}`}>
              {/* Cumulative Contribution Line (Dashed) */}
              {s.transformedPoints.some(p => p.contribution !== undefined) && (
                <LinePath<any>
                  data={s.transformedPoints}
                  x={d => xScale(comparisonMode ? d.monthsElapsed : d.date.getTime()) ?? 0}
                  y={d => valueScale(d.contribution || 0) ?? 0}
                  stroke="var(--apple-gray-400)"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  curve={curveMonotoneX}
                />
              )}
              {/* Asset Growth Line (Nominal) */}
              <LinePath<any>
                data={s.transformedPoints}
                x={d => xScale(comparisonMode ? d.monthsElapsed : d.date.getTime()) ?? 0}
                y={d => valueScale(d.value) ?? 0}
                stroke={s.color}
                strokeWidth={3}
                curve={curveMonotoneX}
                style={{ filter: `drop-shadow(0 0 6px ${s.color}33)`, opacity: showRealValue ? 0.3 : 1 }}
              />
              {/* Real Value Line (Inflation Adjusted) */}
              {showRealValue && s.transformedPoints.some(p => p.realValue !== undefined) && (
                <LinePath<any>
                  data={s.transformedPoints}
                  x={d => xScale(comparisonMode ? d.monthsElapsed : d.date.getTime()) ?? 0}
                  y={d => valueScale(d.realValue || 0) ?? 0}
                  stroke={s.color}
                  strokeWidth={3}
                  strokeDasharray="2,2"
                  curve={curveMonotoneX}
                />
              )}
            </React.Fragment>
          ))}

          {/* 3. Interaction */}
          <Bar
            x={0} y={0} width={innerWidth} height={innerHeight} fill="transparent"
            onTouchStart={handleTooltip} onTouchMove={handleTooltip} onMouseMove={handleTooltip}
            onMouseLeave={() => { hideTooltip(); if (onPointHover) onPointHover(null); }}
          />

          {/* Markers */}
          {tooltipData && (
            <g>
              <line x1={tooltipLeft} x2={tooltipLeft} y1={0} y2={innerHeight} stroke="var(--apple-hairline)" pointerEvents="none" />
              {tooltipData.points.map((p, i) => (
                <g key={`marker-${i}`}>
                  <circle cx={tooltipLeft} cy={valueScale(p.value)} r={5} fill="white" stroke={p.color} strokeWidth={2} fillOpacity={showRealValue ? 0.3 : 1} strokeOpacity={showRealValue ? 0.3 : 1} pointerEvents="none" />
                  {showRealValue && p.realValue && <circle cx={tooltipLeft} cy={valueScale(p.realValue)} r={5} fill="white" stroke={p.color} strokeWidth={2} pointerEvents="none" />}
                  {p.optimistic && <circle cx={tooltipLeft} cy={valueScale(p.optimistic)} r={3} fill={p.color} fillOpacity={0.4} pointerEvents="none" />}
                  {p.pessimistic && <circle cx={tooltipLeft} cy={valueScale(p.pessimistic)} r={3} fill={p.color} fillOpacity={0.4} pointerEvents="none" />}
                  {p.contribution && <circle cx={tooltipLeft} cy={valueScale(p.contribution)} r={3} fill="var(--apple-gray-400)" pointerEvents="none" />}
                </g>
              ))}
            </g>
          )}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            numTicks={width > 520 ? 8 : 4}
            stroke="var(--apple-hairline)"
            tickFormat={comparisonMode ? (v) => `${v}개월` : undefined}
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'middle' }}
          />
          <AxisLeft
            scale={valueScale}
            numTicks={5}
            stroke="none"
            tickFormat={(v) => formatCurrency(Number(v))}
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'end', dx: -4 }}
          />
        </Group>
      </svg>

      <AnimatePresence>
        {tooltipData && (
          <TooltipWithBounds top={margin.top} left={tooltipLeft! + margin.left} style={tooltipStyles}>
            <div className="font-semibold text-apple-ink mb-2 border-b border-apple-hairline pb-1">
              {comparisonMode ? `${Number(tooltipData.xValue).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}개월 경과` : tooltipData.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="space-y-2">
              {tooltipData.points.map((p, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-apple-ink-muted-48 text-fine-print">{p.name} {showRealValue ? '(명목)' : ''}</span>
                    </div>
                    <span className="font-bold text-apple-ink text-caption" style={{ opacity: showRealValue ? 0.5 : 1 }}>{formatCurrency(p.value)}</span>
                  </div>
                  {showRealValue && p.realValue && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full border border-current" style={{ color: p.color }} />
                        <span className="text-apple-ink-muted-48 text-fine-print">{p.name} (실질)</span>
                      </div>
                      <span className="font-bold text-apple-ink text-caption">{formatCurrency(p.realValue)}</span>
                    </div>
                  )}
                  {p.contribution !== undefined && (
                    <div className="flex justify-between gap-3 pl-3 text-fine-print leading-relaxed text-apple-ink-muted-48">
                      <span>누적 투입금</span>
                      <span>{formatCurrency(p.contribution)}</span>
                    </div>
                  )}
                  {p.optimistic && p.pessimistic && (
                    <div className="flex justify-between pl-3 text-fine-print leading-relaxed text-apple-ink-muted-48">
                      <span>최저 {formatCurrency(p.pessimistic)}</span>
                      <span className="mx-1">~</span>
                      <span>최고 {formatCurrency(p.optimistic)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TooltipWithBounds>
        )}
      </AnimatePresence>
    </div>
  );
});

const SnowballChart: React.FC<SnowballChartProps> = ({ scenarios, mode, comparisonMode, showRealValue, onShowRealValueChange, onPointSelect, onPointHover }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[300px] relative">
        <ParentSize>
          {({ width, height }) => (
            <SnowballChartInner 
              scenarios={scenarios} 
              width={width} height={height} 
              mode={mode} comparisonMode={comparisonMode}
              showRealValue={showRealValue}
              onPointSelect={onPointSelect} onPointHover={onPointHover}
            />
          )}
        </ParentSize>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
        {scenarios.map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-caption text-apple-ink tracking-tight">{s.name}</span>
          </div>
        ))}
        {onShowRealValueChange && (
          <div className="flex items-center gap-1.5 ml-auto">
            <label className="flex min-h-control items-center gap-2 cursor-pointer bg-apple-canvas-parchment border border-apple-hairline rounded-pill px-3 py-2 text-caption-strong text-apple-ink hover:border-apple-primary/30 transition-colors">
              <input 
                type="checkbox" checked={showRealValue} onChange={(e) => onShowRealValueChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded-sm border-apple-hairline text-apple-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2 cursor-pointer"
              />
              <span>실질 가치로 보기</span>
            </label>
            <CommonTooltip content="설정된 물가상승률을 반영하여, 십수년 뒤 예상 자산이 현재 시점에서 어느 정도의 체감 가치(구매력)를 가지는지 환산하여 보여줍니다." />
          </div>
        )}
        {showRealValue && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 border-t-2 border-dashed border-apple-ink-muted-48" />
            <span className="text-caption text-apple-ink-muted-48 tracking-tight italic">실질 가치 (물가 반영)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnowballChart;
