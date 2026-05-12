import React, { useMemo } from 'react';
import { Group } from '@visx/group';
import { LinePath, AreaClosed } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { LinearGradient } from '@visx/gradient';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ParentSize } from '@visx/responsive';

interface DataPoint {
  date: Date;
  value: number;
}

interface SnowballChartProps {
  data: DataPoint[];
}

const SnowballChartInner: React.FC<{ data: DataPoint[]; width: number; height: number }> = ({ data, width, height }) => {
  const margin = { top: 20, right: 30, bottom: 50, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Accessors
  const getDate = (d: DataPoint) => d.date;
  const getValue = (d: DataPoint) => d.value;

  // Scales
  const dateScale = useMemo(
    () =>
      scaleTime({
        range: [0, innerWidth],
        domain: [Math.min(...data.map(d => d.date.getTime())), Math.max(...data.map(d => d.date.getTime()))],
      }),
    [data, innerWidth]
  );

  const valueScale = useMemo(
    () =>
      scaleLinear({
        range: [innerHeight, 0],
        domain: [0, Math.max(...data.map(d => d.value)) * 1.1],
        nice: true,
      }),
    [data, innerHeight]
  );

  if (width < 10) return null;

  return (
    <svg width={width} height={height}>
      <defs>
        <LinearGradient
          id="area-gradient"
          from="#0066cc"
          to="#0066cc"
          fromOpacity={0.2}
          toOpacity={0}
        />
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <Group left={margin.left} top={margin.top}>
        {/* Area */}
        <AreaClosed<DataPoint>
          data={data}
          x={d => dateScale(getDate(d)) ?? 0}
          y={d => valueScale(getValue(d)) ?? 0}
          yScale={valueScale}
          fill="url(#area-gradient)"
          curve={curveMonotoneX}
        />
        
        {/* Line */}
        <LinePath<DataPoint>
          data={data}
          x={d => dateScale(getDate(d)) ?? 0}
          y={d => valueScale(getValue(d)) ?? 0}
          stroke="#0066cc"
          strokeWidth={3}
          curve={curveMonotoneX}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(0, 102, 204, 0.3))',
          }}
        />

        {/* Axes */}
        <AxisBottom
          top={innerHeight}
          scale={dateScale}
          numTicks={width > 520 ? 10 : 5}
          stroke="#e0e0e0"
          tickStroke="#e0e0e0"
          tickLabelProps={{
            fill: '#7a7a7a',
            fontSize: 10,
            fontFamily: 'SF Pro Text',
            textAnchor: 'middle',
          }}
        />
        <AxisLeft
          scale={valueScale}
          numTicks={5}
          stroke="none"
          tickStroke="#e0e0e0"
          tickFormat={(v) => `${(Number(v) / 10000).toFixed(0)}만`}
          tickLabelProps={{
            fill: '#7a7a7a',
            fontSize: 10,
            fontFamily: 'SF Pro Text',
            textAnchor: 'end',
            dx: -4,
          }}
        />
      </Group>
    </svg>
  );
};

const SnowballChart: React.FC<SnowballChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[400px] bg-apple-surface-pearl rounded-lg p-4 border border-apple-hairline">
      <ParentSize>
        {({ width, height }) => (
          <SnowballChartInner data={data} width={width} height={height} />
        )}
      </ParentSize>
    </div>
  );
};

export default SnowballChart;
