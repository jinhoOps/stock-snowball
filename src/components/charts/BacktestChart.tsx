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
import { BacktestHistoryPoint } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';

interface BacktestChartProps {
  history: BacktestHistoryPoint[];
  assetName: string;
}

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
  zIndex: 100,
};

const bisectDate = (points: { date: Date }[], x0: Date) => {
  let l = 0;
  let h = points.length;
  while (l < h) {
    const mid = (l + h) >>> 1;
    if (points[mid].date.getTime() < x0.getTime()) l = mid + 1;
    else h = mid;
  }
  return l;
};

const BacktestChartInner: React.FC<{ 
  history: BacktestHistoryPoint[]; 
  assetName: string;
  width: number; 
  height: number;
}> = React.memo(({ history, width, height }) => {
  const margin = { top: 60, right: 30, bottom: 50, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Process data for chart
  const data = useMemo(() => history.map(p => ({
    date: new Date(p.date),
    value: p.value,
    principal: p.principal,
    isLiquidated: p.isLiquidated
  })), [history]);

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
  } = useTooltip<{
    date: Date;
    value: number;
    principal: number;
    isLiquidated?: boolean;
  }>();

  // Accessors
  const getDate = useCallback((d: { date: Date }) => d.date, []);
  const getValue = useCallback((d: { value: number }) => d.value, []);
  const getPrincipal = useCallback((d: { principal: number }) => d.principal, []);

  // Scales
  const dateScale = useMemo(() => scaleTime({
    range: [0, innerWidth],
    domain: [Math.min(...data.map(d => d.date.getTime())), Math.max(...data.map(d => d.date.getTime()))],
  }), [data, innerWidth]);

  const valueScale = useMemo(() => {
    const maxValue = Math.max(...data.map(d => Math.max(d.value, d.principal)));
    return scaleLinear({
      range: [innerHeight, 0],
      domain: [0, maxValue * 1.1],
      nice: true,
    });
  }, [data, innerHeight]);

  const handleTooltip = useCallback((event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const xLeft = x - margin.left;
    if (xLeft < 0 || xLeft > innerWidth) {
      hideTooltip();
      return;
    }
    
    const x0 = dateScale.invert(xLeft);
    const index = bisectDate(data, x0);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && d1.date) {
      if (x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf()) {
        d = d1;
      }
    }

    showTooltip({
      tooltipData: d,
      tooltipLeft: dateScale(d.date),
      tooltipTop: valueScale(d.value),
    });
  }, [showTooltip, hideTooltip, dateScale, valueScale, data, margin.left, innerWidth]);

  // Keyboard Navigation Handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (data.length === 0) return;
    
    let currentIndex = -1;
    if (tooltipData) {
      currentIndex = data.findIndex(p => p.date.getTime() === tooltipData.date.getTime());
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') {
      nextIndex = Math.min(currentIndex + 1, data.length - 1);
      if (currentIndex === -1) nextIndex = 0;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = Math.max(currentIndex - 1, 0);
      if (currentIndex === -1) nextIndex = data.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const d = data[nextIndex];

    showTooltip({
      tooltipData: d,
      tooltipLeft: dateScale(d.date),
      tooltipTop: valueScale(d.value),
    });
  }, [data, tooltipData, showTooltip, dateScale, valueScale]);

  if (width < 10) return null;

  // Generate representative data for the hidden table (SR only)
  const tableData = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1);

  return (
    <div style={{ position: 'relative' }}>
      <svg 
        width={width} 
        height={height}
        role="img"
        aria-label={`${assetName} 과거 백테스트 결과 차트. 가로축은 시간, 세로축은 자산 가치를 나타냅니다.`}
      >
        <defs>
          <LinearGradient id="backtest-gradient" from="#007AFF" to="#007AFF" fromOpacity={0.15} toOpacity={0} />
        </defs>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={valueScale} width={innerWidth} stroke="#f0f0f0" strokeDasharray="4,4" />
          <GridColumns scale={dateScale} height={innerHeight} stroke="#f0f0f0" strokeDasharray="4,4" />

          {/* Principal Area (Gray) */}
          <AreaClosed<{ principal: number, date: Date }>
            data={data}
            x={d => dateScale(getDate(d)) ?? 0}
            y={d => valueScale(getPrincipal(d)) ?? 0}
            yScale={valueScale}
            fill="#8e8e93"
            fillOpacity={0.05}
            curve={curveMonotoneX}
          />

          {/* Asset Area */}
          <AreaClosed<{ value: number, date: Date }>
            data={data}
            x={d => dateScale(getDate(d)) ?? 0}
            y={d => valueScale(getValue(d)) ?? 0}
            yScale={valueScale}
            fill="url(#backtest-gradient)"
            curve={curveMonotoneX}
          />
          
          {/* Principal Line */}
          <LinePath<{ principal: number, date: Date }>
            data={data}
            x={d => dateScale(getDate(d)) ?? 0}
            y={d => valueScale(getPrincipal(d)) ?? 0}
            stroke="#8e8e93"
            strokeWidth={1}
            strokeDasharray="4,4"
            curve={curveMonotoneX}
          />

          {/* Value Line */}
          <LinePath<{ value: number, date: Date }>
            data={data}
            x={d => dateScale(getDate(d)) ?? 0}
            y={d => valueScale(getValue(d)) ?? 0}
            stroke="#007AFF"
            strokeWidth={3}
            curve={curveMonotoneX}
            style={{ filter: 'drop-shadow(0 0 8px rgba(0, 122, 255, 0.3))' }}
          />

          {/* Interaction Bar */}
          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label="차트 상호작용 영역. 화살표 키로 데이터를 탐색할 수 있습니다."
          />

          {/* Scrubbing Line */}
          {tooltipData && (
            <g>
              <line x1={tooltipLeft} x2={tooltipLeft} y1={0} y2={innerHeight} stroke="#d1d1d6" strokeWidth={1} pointerEvents="none" />
              <circle cx={tooltipLeft} cy={valueScale(tooltipData.value)} r={5} fill="white" stroke="#007AFF" strokeWidth={3} pointerEvents="none" />
              <circle cx={tooltipLeft} cy={valueScale(tooltipData.principal)} r={4} fill="white" stroke="#8e8e93" strokeWidth={2} pointerEvents="none" />
            </g>
          )}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={dateScale}
            numTicks={width > 520 ? 8 : 4}
            stroke="#e0e0e0"
            tickStroke="#e0e0e0"
            tickLabelProps={{ fill: '#8e8e93', fontSize: 10, textAnchor: 'middle' }}
          />
          <AxisLeft
            scale={valueScale}
            numTicks={5}
            stroke="none"
            tickFormat={v => SnowballEngine.formatKoreanWon(Number(v))}
            tickLabelProps={{ fill: '#8e8e93', fontSize: 10, textAnchor: 'end', dx: -4 }}
          />
        </Group>
      </svg>

      {/* Screen Reader Only Table */}
      <div className="sr-only">
        <table summary="과거 백테스트 데이터 상세 정보">
          <thead>
            <tr>
              <th>날짜</th>
              <th>평가 금액</th>
              <th>투자 원금</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td>{row.date.toLocaleDateString()}</td>
                <td>{row.value.toLocaleString()}원</td>
                <td>{row.principal.toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip Card */}
      <AnimatePresence>
        {tooltipData && (
          <TooltipWithBounds top={margin.top} left={tooltipLeft! + margin.left} style={tooltipStyles}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="font-bold text-apple-ink mb-2 border-b border-apple-hairline pb-1">
                {tooltipData.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="space-y-1.5 min-w-[140px]">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-apple-ink-muted-48 text-[11px] font-bold uppercase">평가 금액</span>
                  <span className="font-bold text-apple-primary text-[13px]">{SnowballEngine.formatKoreanWon(tooltipData.value)}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-apple-ink-muted-48 text-[11px] font-bold uppercase">투자 원금</span>
                  <span className="font-bold text-apple-ink text-[13px]">{SnowballEngine.formatKoreanWon(tooltipData.principal)}</span>
                </div>
                <div className="flex justify-between items-center gap-4 border-t border-apple-hairline pt-1 mt-1">
                  <span className="text-apple-ink-muted-48 text-[11px] font-bold uppercase">수익률</span>
                  <span className={`font-bold text-[13px] ${tooltipData.value >= tooltipData.principal ? 'text-apple-primary' : 'text-apple-error'}`}>
                    {(((tooltipData.value - tooltipData.principal) / tooltipData.principal) * 100).toFixed(2)}%
                  </span>
                </div>
                {tooltipData.isLiquidated && (
                  <div className="mt-2 text-apple-error text-[10px] font-bold uppercase text-center bg-apple-error/10 py-1 rounded">
                    청산 발생 (Liquidation)
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

const BacktestChart: React.FC<BacktestChartProps> = ({ history, assetName }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[300px] relative">
        <ParentSize>
          {({ width, height }) => (
            <BacktestChartInner history={history} assetName={assetName} width={width} height={height} />
          )}
        </ParentSize>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-apple-primary" />
          <span className="text-[11px] font-bold text-apple-ink uppercase tracking-wider">{assetName} 평가금</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8e8e93]" />
          <span className="text-[11px] font-bold text-apple-ink uppercase tracking-wider">투자 원금</span>
        </div>
      </div>
    </div>
  );
};

export default BacktestChart;
