import React, { useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ParentSize } from '@visx/responsive';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { motion, AnimatePresence } from 'framer-motion';

interface DataPoint {
  date: Date;
  value: number;
}

interface ScenarioData {
  id: string;
  name: string;
  color: string;
  points: DataPoint[];
}

interface SnowballChartProps {
  scenarios: ScenarioData[];
  onPointSelect?: (data: { date: Date; points: { name: string; value: number; color: string }[] }) => void;
  onPointHover?: (data: { date: Date; points: { name: string; value: number; color: string }[] } | null) => void;
}

// Simple bisector implementation
const bisectDate = (points: DataPoint[], x0: Date, low: number = 0) => {
  let l = low;
  let h = points.length;
  while (l < h) {
    const mid = (l + h) >>> 1;
    if (points[mid].date.getTime() < x0.getTime()) l = mid + 1;
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
  color: '#1d1d1f',
  fontSize: '13px',
  lineHeight: '1.4',
  pointerEvents: 'none' as const,
};

const SnowballChartInner: React.FC<{ 
  scenarios: ScenarioData[]; 
  width: number; 
  height: number;
  onPointSelect?: SnowballChartProps['onPointSelect'];
  onPointHover?: SnowballChartProps['onPointHover'];
}> = React.memo(({ scenarios, width, height, onPointSelect, onPointHover }) => {
  const margin = { top: 20, right: 30, bottom: 50, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
  } = useTooltip<{
    date: Date;
    points: { name: string; value: number; color: string }[];
  }>();

  // Accessors
  const getDate = useCallback((d: DataPoint) => d.date, []);
  const getValue = useCallback((d: DataPoint) => d.value, []);

  // Memoize all points for domain calculation
  const allPoints = useMemo(() => scenarios.flatMap(s => s.points), [scenarios]);
  
  // Memoize domains to avoid recalculating on every render
  const dateDomain = useMemo(() => {
    if (allPoints.length === 0) return [new Date().getTime(), new Date().getTime() + 365*24*60*60*1000];
    return [Math.min(...allPoints.map(d => d.date.getTime())), Math.max(...allPoints.map(d => d.date.getTime()))];
  }, [allPoints]);

  const valueDomain = useMemo(() => {
    if (allPoints.length === 0) return [0, 1000000];
    return [0, Math.max(...allPoints.map(d => d.value)) * 1.1];
  }, [allPoints]);

  // Scales
  const dateScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        domain: dateDomain,
      }),
    [dateDomain, innerWidth]
  );

  const valueScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: valueDomain,
        nice: true,
      }),
    [valueDomain, innerHeight]
  );

  // Tooltip handler - optimized search
  const handleTooltip = useCallback(
    (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const xLeft = x - margin.left;
      if (xLeft < 0 || xLeft > innerWidth) {
        hideTooltip();
        if (onPointHover) onPointHover(null);
        return;
      }
      
      const x0 = dateScale.invert(xLeft);
      
      if (scenarios.length === 0 || !scenarios[0].points.length) return;

      // Use the first scenario to find the closest date index
      const mainPoints = scenarios[0].points;
      const index = bisectDate(mainPoints, x0, 1);
      const d0 = mainPoints[index - 1];
      const d1 = mainPoints[index];
      let d = d0;
      let targetIndex = index - 1;
      
      if (d1 && getDate(d1)) {
        if (x0.valueOf() - getDate(d0).valueOf() > getDate(d1).valueOf() - x0.valueOf()) {
          d = d1;
          targetIndex = index;
        }
      }

      const tooltipPoints = scenarios.map(s => {
        const p = s.points[targetIndex] || s.points.find(point => point.date.getTime() === d.date.getTime()) || d;
        return {
          name: s.name,
          value: p.value,
          color: s.color,
        };
      });

      const tooltipPayload = {
        date: d.date,
        points: tooltipPoints,
      };

      showTooltip({
        tooltipData: tooltipPayload,
        tooltipLeft: dateScale(getDate(d)),
        tooltipTop: valueScale(d.value),
      });

      if (onPointHover) onPointHover(tooltipPayload);
    },
    [showTooltip, hideTooltip, dateScale, valueScale, scenarios, margin.left, innerWidth, getDate, onPointHover]
  );

  const handleBarClick = useCallback(
    (event: React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 };
      const xLeft = x - margin.left;
      if (xLeft < 0 || xLeft > innerWidth) return;
      
      const x0 = dateScale.invert(xLeft);
      if (scenarios.length === 0 || !scenarios[0].points.length) return;

      const mainPoints = scenarios[0].points;
      const index = bisectDate(mainPoints, x0, 1);
      const d0 = mainPoints[index - 1];
      const d1 = mainPoints[index];
      let d = d0;
      let targetIndex = index - 1;
      
      if (d1 && getDate(d1)) {
        if (x0.valueOf() - getDate(d0).valueOf() > getDate(d1).valueOf() - x0.valueOf()) {
          d = d1;
          targetIndex = index;
        }
      }

      if (onPointSelect) {
        onPointSelect({
          date: d.date,
          points: scenarios.map(s => ({
            name: s.name,
            value: (s.points[targetIndex] || d).value,
            color: s.color,
          })),
        });
      }
    },
    [dateScale, scenarios, margin.left, innerWidth, getDate, onPointSelect]
  );

  // Keyboard Navigation Handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (scenarios.length === 0 || !scenarios[0].points.length) return;
      const mainPoints = scenarios[0].points;
      
      let currentIndex = -1;
      if (tooltipData) {
        currentIndex = mainPoints.findIndex(p => p.date.getTime() === tooltipData.date.getTime());
      }

      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') {
        nextIndex = Math.min(currentIndex + 1, mainPoints.length - 1);
        if (currentIndex === -1) nextIndex = 0;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = Math.max(currentIndex - 1, 0);
        if (currentIndex === -1) nextIndex = mainPoints.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const d = mainPoints[nextIndex];
      const tooltipPoints = scenarios.map(s => ({
        name: s.name,
        value: (s.points[nextIndex] || d).value,
        color: s.color,
      }));

      const tooltipPayload = {
        date: d.date,
        points: tooltipPoints,
      };

      showTooltip({
        tooltipData: tooltipPayload,
        tooltipLeft: dateScale(d.date),
        tooltipTop: valueScale(d.value),
      });

      if (onPointHover) onPointHover(tooltipPayload);
    },
    [scenarios, tooltipData, showTooltip, dateScale, valueScale, onPointHover]
  );

  if (width < 10) return null;

  const formatCurrency = (val: number) => {
    if (val >= 100000000) return `${(val / 100000000).toFixed(2)}억`;
    if (val >= 10000) return `${(val / 10000).toFixed(0)}만`;
    return val.toLocaleString();
  };

  // Generate representative data for the hidden table (SR only)
  const tableData = useMemo(() => {
    if (scenarios.length === 0 || !scenarios[0].points.length) return [];
    const points = scenarios[0].points;
    const step = Math.max(1, Math.floor(points.length / 10));
    const indices = [];
    for (let i = 0; i < points.length; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== points.length - 1) {
      indices.push(points.length - 1);
    }
    
    return indices.map(idx => ({
      date: points[idx].date,
      values: scenarios.map(s => ({
        name: s.name,
        value: (s.points[idx] || points[idx]).value
      }))
    }));
  }, [scenarios]);

  return (
    <div style={{ position: 'relative' }}>
      <svg 
        width={width} 
        height={height} 
        role="img" 
        aria-label="자산 성장 시뮬레이션 차트. 가로축은 시간, 세로축은 자산 가치를 나타냅니다."
      >
        <defs>
          {scenarios.map(s => (
            <LinearGradient
              key={`gradient-${s.id}`}
              id={`gradient-${s.id}`}
              from={s.color}
              to={s.color}
              fromOpacity={0.15}
              toOpacity={0}
            />
          ))}
        </defs>
        <Group left={margin.left} top={margin.top}>
          {/* Minimalist Grid */}
          <GridRows
            scale={valueScale}
            width={innerWidth}
            stroke="#f0f0f0"
            strokeDasharray="4,4"
          />
          <GridColumns
            scale={dateScale}
            height={innerHeight}
            stroke="#f0f0f0"
            strokeDasharray="4,4"
          />

          {/* Areas (Bottom-up) */}
          {scenarios.map(s => (
            <AreaClosed<DataPoint>
              key={`area-${s.id}`}
              data={s.points}
              x={d => dateScale(getDate(d)) ?? 0}
              y={d => valueScale(getValue(d)) ?? 0}
              yScale={valueScale}
              fill={`url(#gradient-${s.id})`}
              curve={curveMonotoneX}
            />
          ))}
          
          {/* Lines */}
          {scenarios.map(s => (
            <LinePath<DataPoint>
              key={`line-${s.id}`}
              data={s.points}
              x={d => dateScale(getDate(d)) ?? 0}
              y={d => valueScale(getValue(d)) ?? 0}
              stroke={s.color}
              strokeWidth={3}
              curve={curveMonotoneX}
              style={{
                filter: `drop-shadow(0 0 8px ${s.color}44)`,
              }}
            />
          ))}

          {/* Interaction Bar */}
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            rx={14}
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => {
              hideTooltip();
              if (onPointHover) onPointHover(null);
            }}
            onClick={handleBarClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label="차트 상호작용 영역. 화살표 키로 데이터를 탐색할 수 있습니다."
          />

          {/* Scrubbing Line & Markers */}
          {tooltipData && (
            <g>
              <line
                x1={tooltipLeft}
                x2={tooltipLeft}
                y1={0}
                y2={innerHeight}
                stroke="#d1d1d6"
                strokeWidth={1}
                pointerEvents="none"
              />
              {tooltipData.points.map((p, i) => (
                <circle
                  key={`marker-${i}`}
                  cx={tooltipLeft}
                  cy={valueScale(p.value)}
                  r={4}
                  fill="white"
                  stroke={p.color}
                  strokeWidth={2}
                  pointerEvents="none"
                />
              ))}
            </g>
          )}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={dateScale}
            numTicks={width > 520 ? 8 : 4}
            stroke="#e0e0e0"
            tickStroke="#e0e0e0"
            tickLabelProps={{
              fill: '#7a7a7a',
              fontSize: 10,
              fontFamily: 'SF Pro Text, sans-serif',
              textAnchor: 'middle',
            }}
          />
          <AxisLeft
            scale={valueScale}
            numTicks={5}
            stroke="none"
            tickStroke="#e0e0e0"
            tickFormat={(v) => {
              const val = Number(v);
              if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
              if (val >= 10000) return `${(val / 10000).toFixed(0)}만`;
              return val.toLocaleString();
            }}
            tickLabelProps={{
              fill: '#7a7a7a',
              fontSize: 10,
              fontFamily: 'SF Pro Text, sans-serif',
              textAnchor: 'end',
              dx: -4,
            }}
          />
        </Group>
      </svg>

      {/* Screen Reader Only Table */}
      <div className="sr-only">
        <table summary="차트 데이터 상세 정보">
          <thead>
            <tr>
              <th>날짜</th>
              {scenarios.map(s => <th key={s.id}>{s.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td>{row.date.toLocaleDateString()}</td>
                {row.values.map((v, vIdx) => <td key={vIdx}>{v.value.toLocaleString()}원</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip Card */}
      <AnimatePresence>
        {tooltipData && (
          <TooltipWithBounds
            key="chart-tooltip"
            top={margin.top}
            left={tooltipLeft! + margin.left}
            style={tooltipStyles}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="font-semibold text-apple-gray-dark mb-2 border-b border-apple-gray-light pb-1">
                {tooltipData.date.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="space-y-1.5">
                {tooltipData.points.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-apple-gray text-[12px]">{p.name}</span>
                    </div>
                    <span className="font-bold text-apple-ink text-[13px]">
                      {formatCurrency(p.value)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </TooltipWithBounds>
        )}
      </AnimatePresence>
    </div>
  );
});

const SnowballChart: React.FC<SnowballChartProps> = ({ scenarios, onPointSelect, onPointHover }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[300px] relative">
        <ParentSize>
          {({ width, height }) => (
            <SnowballChartInner 
              scenarios={scenarios} 
              width={width} 
              height={height} 
              onPointSelect={onPointSelect}
              onPointHover={onPointHover}
            />
          )}
        </ParentSize>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 px-4">
        {scenarios.map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: s.color }} 
            />
            <span className="text-caption text-apple-ink tracking-tight">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnowballChart;


