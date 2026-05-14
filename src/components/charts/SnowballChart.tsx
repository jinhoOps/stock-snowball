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
import { AnimatePresence } from 'framer-motion';
import { SimulationMode } from '../../types/finance';

interface DataPoint {
  date: Date;
  value: number;
  pessimistic?: number;
  optimistic?: number;
  contribution?: number;
}

interface ScenarioData {
  id: string;
  name: string;
  color: string;
  points: DataPoint[];
}

interface SnowballChartProps {
  scenarios: ScenarioData[];
  mode: SimulationMode;
  comparisonMode?: boolean;
  onPointSelect?: (data: { date: Date; points: { name: string; value: number; color: string; pessimistic?: number; optimistic?: number }[] }) => void;
  onPointHover?: (data: { date: Date; points: { name: string; value: number; color: string; pessimistic?: number; optimistic?: number }[] } | null) => void;
}

// Simple bisector implementation
const bisectDate = (points: DataPoint[], x0: number | Date, low: number = 0) => {
  let l = low;
  let h = points.length;
  const targetX = x0 instanceof Date ? x0.getTime() : x0;

  while (l < h) {
    const mid = (l + h) >>> 1;
    // @ts-ignore
    const currentX = points[mid].date instanceof Date ? points[mid].date.getTime() : points[mid].x;
    if (currentX < targetX) l = mid + 1;
    else h = mid;
  }
  return l;
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
  scenarios: ScenarioData[]; 
  width: number; 
  height: number;
  mode: SimulationMode;
  comparisonMode?: boolean;
  onPointSelect?: SnowballChartProps['onPointSelect'];
  onPointHover?: SnowballChartProps['onPointHover'];
}> = React.memo(({ scenarios, width, height, comparisonMode, onPointHover }) => {
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
    points: { name: string; value: number; color: string; pessimistic?: number; optimistic?: number; contribution?: number }[];
  }>();

  // 1. Data Transformation for Comparison Mode
  const processedScenarios = useMemo(() => {
    return scenarios.map(s => ({
      ...s,
      transformedPoints: s.points.map((p, i) => ({
        ...p,
        monthsElapsed: i // Points are assumed to be 30-day intervals
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
      if (processedScenarios.length === 0 || !processedScenarios[0].transformedPoints.length) return;

      const mainPoints = processedScenarios[0].transformedPoints;
      let index = 0;
      if (comparisonMode) {
        index = Math.round(Number(x0));
      } else {
        index = bisectDate(mainPoints, x0 as Date, 1);
      }
      
      index = Math.max(0, Math.min(index, mainPoints.length - 1));
      const d = mainPoints[index];

      const tooltipPoints = processedScenarios.map(s => {
        const p = s.transformedPoints[index] || s.transformedPoints[mainPoints.length - 1];
        return {
          name: s.name,
          value: p.value,
          color: s.color,
          pessimistic: p.pessimistic,
          optimistic: p.optimistic,
          contribution: p.contribution,
        };
      });

      const tooltipPayload = {
        date: d.date,
        xValue: comparisonMode ? index : d.date,
        points: tooltipPoints,
      };

      showTooltip({
        tooltipData: tooltipPayload,
        tooltipLeft: xScale(comparisonMode ? index : d.date.getTime()),
        tooltipTop: valueScale(d.value),
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
              {/* Asset Growth Line */}
              <LinePath<any>
                data={s.transformedPoints}
                x={d => xScale(comparisonMode ? d.monthsElapsed : d.date.getTime()) ?? 0}
                y={d => valueScale(d.value) ?? 0}
                stroke={s.color}
                strokeWidth={3}
                curve={curveMonotoneX}
                style={{ filter: `drop-shadow(0 0 6px ${s.color}33)` }}
              />
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
                  <circle cx={tooltipLeft} cy={valueScale(p.value)} r={5} fill="white" stroke={p.color} strokeWidth={2} pointerEvents="none" />
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
              {comparisonMode ? `${tooltipData.xValue}개월 경과` : tooltipData.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="space-y-2">
              {tooltipData.points.map((p, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-apple-ink-muted-48 text-fine-print">{p.name}</span>
                    </div>
                    <span className="font-bold text-apple-ink text-caption">{formatCurrency(p.value)}</span>
                  </div>
                  {p.contribution !== undefined && (
                    <div className="flex justify-between pl-3 text-[10px] text-apple-ink-muted-48">
                      <span>누적 투입금</span>
                      <span>{formatCurrency(p.contribution)}</span>
                    </div>
                  )}
                  {p.optimistic && p.pessimistic && (
                    <div className="flex justify-between pl-3 text-[10px] text-apple-ink-muted-48 italic">
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

const SnowballChart: React.FC<SnowballChartProps> = ({ scenarios, mode, comparisonMode, onPointSelect, onPointHover }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[300px] relative">
        <ParentSize>
          {({ width, height }) => (
            <SnowballChartInner 
              scenarios={scenarios} 
              width={width} height={height} 
              mode={mode} comparisonMode={comparisonMode}
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
        {scenarios.some(s => s.points.some(p => p.contribution !== undefined)) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-apple-gray-400" />
            <span className="text-caption text-apple-ink-muted-48 tracking-tight italic">누적 투입금</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnowballChart;
