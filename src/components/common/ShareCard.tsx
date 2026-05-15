import React from 'react';
import { SnowballEngine } from '../../core/SnowballEngine';

interface ShareCardProps {
  scenarioName: string;
  totalAsset: number;
  totalContribution: number;
  totalReturn: number;
  returnPercentage: number;
  cagr: number;
  years: number;
  currency: 'KRW' | 'USD';
  sparklineData: { value: number }[];
  cardRef: React.RefObject<HTMLDivElement | null>;
}

const ShareCard: React.FC<ShareCardProps> = ({
  scenarioName,
  totalAsset,
  totalContribution,
  totalReturn,
  returnPercentage,
  cagr,
  years,
  currency,
  sparklineData,
  cardRef,
}) => {
  // SVG Sparkline drawing
  const width = 320;
  const height = 80;
  const padding = 5;
  
  const min = Math.min(...sparklineData.map(d => d.value));
  const max = Math.max(...sparklineData.map(d => d.value));
  const range = max - min || 1;
  
  const points = sparklineData.map((d, i) => {
    const x = (i / (sparklineData.length - 1)) * (width - 2 * padding) + padding;
    const y = height - ((d.value - min) / range) * (height - 2 * padding) - padding;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="fixed -left-[10000px] top-0"> {/* Render off-screen for capture */}
      <div 
        ref={cardRef}
        className="w-[400px] h-[520px] bg-apple-canvas p-8 flex flex-col items-center justify-between shadow-2xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F7 100%)',
          borderRadius: '40px',
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-apple-primary/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-apple-primary/10 rounded-full blur-[100px] -ml-32 -mb-32" />

        {/* Header */}
        <div className="w-full flex justify-between items-start z-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-apple-ink-muted-48 mb-1">Portfolio Projection</span>
            <h1 className="text-lg font-display font-bold text-apple-ink leading-tight whitespace-nowrap">{scenarioName}</h1>
          </div>
          <div className="w-8 h-8 bg-apple-primary rounded-xl flex items-center justify-center shadow-lg shadow-apple-primary/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Main Value */}
        <div className="text-center z-10">
          <span className="text-[10px] font-bold text-apple-ink-muted-48 mb-1.5 block uppercase tracking-tighter">{years}년 후 예상 자산</span>
          <div className="text-3xl font-display font-bold text-apple-primary tracking-tight mb-1 whitespace-nowrap">
            {SnowballEngine.formatBigNumber(totalAsset, currency)}
          </div>
          <div className={`text-base font-semibold flex items-center justify-center gap-1 ${totalReturn >= 0 ? 'text-apple-success' : 'text-apple-error'}`}>
            <span>{totalReturn >= 0 ? '▲' : '▼'}</span>
            <span className="whitespace-nowrap">{returnPercentage.toFixed(1)}%</span>
            <span className="text-apple-ink-muted-48 text-[10px] font-normal ml-1">({years}년)</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 w-full z-10">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white shadow-sm flex flex-col items-center text-center">
            <span className="text-[7px] font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">납입금</span>
            <span className="text-[10px] font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(totalContribution, currency, true)}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white shadow-sm flex flex-col items-center text-center">
            <span className="text-[7px] font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">수익금</span>
            <span className="text-[10px] font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(totalReturn, currency, true)}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white shadow-sm flex flex-col items-center text-center">
            <span className="text-[7px] font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">수익률</span>
            <span className="text-[10px] font-bold text-apple-ink whitespace-nowrap">{cagr.toFixed(1)}%</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="w-full h-24 flex items-center justify-center z-10 bg-white/40 rounded-3xl border border-white/50 py-2">
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path
              d={`M ${points}`}
              fill="none"
              stroke="url(#sparklineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="sparklineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0066cc" />
                <stop offset="100%" stopColor="#5AC8FA" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Footer */}
        <div className="w-full flex justify-between items-end z-10 border-t border-apple-hairline pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-apple-primary uppercase tracking-wider mb-0.5">Stock Snowball</span>
            <span className="text-[8px] text-apple-ink-muted-48">Build your future, one flake at a time.</span>
          </div>
          <div className="text-[8px] text-apple-ink-muted-48 text-right">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
