import React, { useMemo } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ParentSize } from '@visx/responsive';
import { GridRows, GridColumns } from '@visx/grid';

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
}

const SnowballChartInner: React.FC<{ scenarios: ScenarioData[]; width: number; height: number }> = ({ scenarios, width, height }) => {
  const margin = { top: 20, right: 30, bottom: 50, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getDate = (d: DataPoint) => d.date;
  const getValue = (d: DataPoint) => d.value;

  // Flatten all points to find global domain
  const allPoints = scenarios.flatMap(s => s.points);
  
  // Scales
  const dateScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        domain: allPoints.length > 0 
          ? [Math.min(...allPoints.map(d => d.date.getTime())), Math.max(...allPoints.map(d => d.date.getTime()))]
          : [new Date().getTime(), new Date().getTime() + 365*24*60*60*1000],
      }),
    [allPoints, innerWidth]
  );

  const valueScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: [0, allPoints.length > 0 ? Math.max(...allPoints.map(d => d.value)) * 1.1 : 1000000],
        nice: true,
      }),
    [allPoints, innerHeight]
  );

  if (width < 10) return null;

  return (
    <svg width={width} height={height}>
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
  );
};

const SnowballChart: React.FC<SnowballChartProps> = ({ scenarios }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[300px] relative">
        <ParentSize>
          {({ width, height }) => (
            <SnowballChartInner scenarios={scenarios} width={width} height={height} />
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

