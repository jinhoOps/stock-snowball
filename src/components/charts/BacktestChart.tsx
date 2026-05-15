import React, { useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { LinePath, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { ParentSize } from '@visx/responsive';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { motion, AnimatePresence } from 'framer-motion';
import { BacktestResult, BacktestHistoryPoint } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';

interface BacktestChartProps {
  results: {
    assetId: string;
    result: BacktestResult;
    color: string;
  }[];
  currency: 'KRW' | 'USD';
}

const tooltipStyles = {
  ...defaultStyles,
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '16px',
  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
  padding: '16px',
  color: 'var(--apple-ink)',
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
  results: { assetId: string; result: BacktestResult; color: string; }[]; 
  currency: 'KRW' | 'USD';
  width: number; 
  height: number;
}> = React.memo(({ results, currency, width, height }) => {
  const margin = useMemo(() => ({
    top: 64, 
    right: width > 520 ? 32 : 16, 
    bottom: 48, 
    left: width > 520 ? 84 : 56 
  }), [width]);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const formatCurrency = useCallback((val: number) => {
    return SnowballEngine.formatBigNumber(val, currency);
  }, [currency]);

  // Primary data for scales and primary axis
  const primaryData = useMemo(() => results[0].result.history.map((p: BacktestHistoryPoint) => ({
    date: new Date(p.date),
    value: p.value,
    principal: p.principal,
    isLiquidated: p.isLiquidated
  })), [results]);

  // All datasets mapped for quick access during tooltipping
  const allData = useMemo(() => results.map(r => ({
    assetId: r.assetId,
    color: r.color,
    points: r.result.history.map((p: BacktestHistoryPoint) => ({
      date: new Date(p.date),
      value: p.value,
      principal: p.principal,
      isLiquidated: p.isLiquidated
    }))
  })), [results]);

  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
  } = useTooltip<{
    date: Date;
    points: { assetId: string; value: number; color: string; principal: number; isLiquidated?: boolean }[];
  }>();

  // Scales
  const dateScale = useMemo(() => scaleTime({
    range: [0, innerWidth],
    domain: [Math.min(...primaryData.map(d => d.date.getTime())), Math.max(...primaryData.map(d => d.date.getTime()))],
  }), [primaryData, innerWidth]);

  const valueScale = useMemo(() => {
    const allValues = results.flatMap(r => r.result.history.map(p => Math.max(p.value, p.principal)));
    const maxValue = Math.max(...allValues);
    return scaleLinear({
      range: [innerHeight, 0],
      domain: [0, maxValue * 1.1],
      nice: true,
    });
  }, [results, innerHeight]);

  const handleTooltip = useCallback((event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const xLeft = x - margin.left;
    if (xLeft < 0 || xLeft > innerWidth) {
      hideTooltip();
      return;
    }
    
    const x0 = dateScale.invert(xLeft);
    const index = bisectDate(primaryData, x0);
    const d0 = primaryData[index - 1];
    const d1 = primaryData[index];
    let d = d0;
    if (d1 && d1.date) {
      if (x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf()) {
        d = d1;
      }
    }

    if (!d) return;

    // Collect points from all datasets for this date
    const datePoints = allData.map(asset => {
      // Find matching date in this asset's points (assume same date alignment for now)
      const assetIndex = bisectDate(asset.points, d.date);
      const assetPoint = asset.points[assetIndex - 1] || asset.points[0];
      return {
        assetId: asset.assetId,
        value: assetPoint.value,
        principal: assetPoint.principal,
        color: asset.color,
        isLiquidated: assetPoint.isLiquidated
      };
    });

    showTooltip({
      tooltipData: {
        date: d.date,
        points: datePoints
      },
      tooltipLeft: dateScale(d.date),
    });
  }, [showTooltip, hideTooltip, dateScale, valueScale, primaryData, allData, margin.left, innerWidth]);

  if (width < 10) return null;

  return (
    <div style={{ position: 'relative' }}>
      <svg 
        width={width} 
        height={height}
        role="img"
        aria-label="과거 백테스트 결과 다중 자산 비교 차트"
      >
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={valueScale} width={innerWidth} stroke="var(--apple-divider-soft)" strokeDasharray="4,4" />
          <GridColumns scale={dateScale} height={innerHeight} stroke="var(--apple-divider-soft)" strokeDasharray="4,4" />

          {/* Common Principal Line (using first result) */}
          <LinePath<{ principal: number, date: Date }>
            data={primaryData}
            x={d => dateScale(d.date) ?? 0}
            y={d => valueScale(d.principal) ?? 0}
            stroke="var(--apple-ink-muted-48)"
            strokeWidth={1}
            strokeDasharray="4,4"
            curve={curveMonotoneX}
          />

          {/* Multi-asset Value Lines */}
          {allData.map((asset, i) => (
            <LinePath<{ value: number, date: Date }>
              key={asset.assetId}
              data={asset.points}
              x={d => dateScale(d.date) ?? 0}
              y={d => valueScale(d.value) ?? 0}
              stroke={asset.color}
              strokeWidth={i === 0 ? 3 : 2}
              curve={curveMonotoneX}
              style={{ filter: i === 0 ? `drop-shadow(0 0 8px ${asset.color}44)` : 'none' }}
            />
          ))}

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
            tabIndex={0}
          />

          {/* Scrubbing Line */}
          {tooltipData && (
            <g>
              <line x1={tooltipLeft} x2={tooltipLeft} y1={0} y2={innerHeight} stroke="var(--apple-hairline)" strokeWidth={1} pointerEvents="none" />
              {tooltipData.points.map((p, i) => (
                <circle key={i} cx={tooltipLeft} cy={valueScale(p.value)} r={i === 0 ? 5 : 4} fill="white" stroke={p.color} strokeWidth={i === 0 ? 3 : 2} pointerEvents="none" />
              ))}
            </g>
          )}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={dateScale}
            numTicks={width > 520 ? 8 : 4}
            stroke="var(--apple-hairline)"
            tickStroke="var(--apple-hairline)"
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'middle' }}
          />
          <AxisLeft
            scale={valueScale}
            numTicks={5}
            stroke="none"
            tickFormat={v => formatCurrency(Number(v))}
            tickLabelProps={{ fill: 'var(--apple-ink-muted-48)', fontSize: 10, textAnchor: 'end', dx: -4 }}
          />
        </Group>
      </svg>

      {/* Tooltip Card */}
      <AnimatePresence>
        {tooltipData && (
          <TooltipWithBounds top={margin.top} left={tooltipLeft! + margin.left} style={tooltipStyles}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="font-semibold text-apple-ink mb-3 border-b border-apple-hairline pb-2 flex justify-between items-center">
                <span>{tooltipData.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="text-[10px] bg-apple-surface-chip-translucent px-2 py-0.5 rounded-sm uppercase tracking-wider text-apple-ink-muted-48">Value Comparison</span>
              </div>
              <div className="space-y-3 min-w-[200px]">
                {tooltipData.points.map((p, i) => (
                  <div key={i} className={`flex flex-col gap-1 p-2 rounded-lg ${i === 0 ? 'bg-apple-surface-chip-translucent ring-1 ring-apple-primary/10' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-micro-legal font-bold text-apple-ink uppercase tracking-wider">{p.assetId}</span>
                      {i === 0 && <span className="text-[8px] text-apple-primary font-bold">(MAIN)</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-body-strong font-display font-bold text-apple-ink">{formatCurrency(p.value)}</span>
                      <span className={`text-[11px] font-bold ${(p.value >= p.principal) ? 'text-apple-primary' : 'text-apple-error'}`}>
                        {(((p.value - p.principal) / p.principal) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 border-t border-apple-hairline flex justify-between items-center text-apple-ink-muted-48">
                  <span className="text-micro-legal font-semibold uppercase tracking-widest">투자 원금</span>
                  <span className="font-semibold text-caption">{formatCurrency(tooltipData.points[0].principal)}</span>
                </div>
              </div>
            </motion.div>
          </TooltipWithBounds>
        )}
      </AnimatePresence>
    </div>
  );
});

const BacktestChart: React.FC<BacktestChartProps> = ({ results, currency }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[300px] relative">
        <ParentSize>
          {({ width, height }) => (
            <BacktestChartInner results={results} currency={currency} width={width} height={height} />
          )}
        </ParentSize>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-6 pb-2">
        {results.map((r, i) => (
          <div key={r.assetId} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="text-fine-print font-bold text-apple-ink uppercase tracking-widest">
              {r.assetId} {i === 0 && '(Main)'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-apple-ink-muted-48 border-t border-dashed" />
          <span className="text-fine-print font-bold text-apple-ink-muted-48 uppercase tracking-widest">투자 원금</span>
        </div>
      </div>
    </div>
  );
};

export default BacktestChart;
