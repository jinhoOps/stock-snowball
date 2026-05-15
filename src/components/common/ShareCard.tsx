import React from 'react';
import { SnowballEngine } from '../../core/SnowballEngine';
import { ContributionCycle } from '../../types/finance';

interface ShareCardProps {
  scenarioName: string;
  totalAsset: number;
  pessimisticAsset: number;
  optimisticAsset: number;
  contribution: number;
  cycle: ContributionCycle;
  totalReturn: number;
  returnPercentage: number;
  cagr: number;
  years: number;
  currency: 'KRW' | 'USD';
  cardRef: React.RefObject<HTMLDivElement | null>;
}

const CYCLE_LABEL: Record<ContributionCycle, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
};

const ShareCard: React.FC<ShareCardProps> = ({
  scenarioName,
  totalAsset,
  pessimisticAsset,
  optimisticAsset,
  contribution,
  cycle,
  totalReturn,
  returnPercentage,
  cagr,
  years,
  currency,
  cardRef,
}) => {
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
          {/* Brand Icon */}
          <div className="w-8 h-8 bg-apple-primary rounded-xl flex items-center justify-center shadow-lg shadow-apple-primary/20">
            <svg width="20" height="20" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial" fontSize="360" fill="white" fontWeight="bold">S</text>
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

        {/* Stats Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-2 w-full z-10">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white shadow-sm flex flex-col items-center text-center">
            <span className="text-[7px] font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">{CYCLE_LABEL[cycle]} 얼마씩?</span>
            <span className="text-[10px] font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(contribution, currency, true)}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white shadow-sm flex flex-col items-center text-center">
            <span className="text-[7px] font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">수익금</span>
            <span className="text-[10px] font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(totalReturn, currency, true)}</span>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-2.5 border border-white shadow-sm flex flex-col items-center text-center">
            <span className="text-[7px] font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">CAGR</span>
            <span className="text-[10px] font-bold text-apple-ink whitespace-nowrap">{cagr.toFixed(1)}%</span>
          </div>
        </div>

        {/* Best / Worst Scenario Band */}
        <div className="w-full z-10 bg-white/40 rounded-3xl border border-white/50 p-4">
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className="text-[8px] font-bold text-apple-ink-muted-48 uppercase tracking-wider">시나리오 범위</span>
          </div>
          <div className="flex justify-between items-center">
            {/* Pessimistic */}
            <div className="flex flex-col items-center text-center flex-1">
              <span className="text-[7px] font-bold text-apple-error/80 uppercase tracking-wider mb-1">Worst</span>
              <span className="text-[11px] font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(pessimisticAsset, currency, true)}</span>
            </div>
            {/* Divider & Arrow */}
            <div className="flex flex-col items-center px-3">
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6H38M38 6L34 2M38 6L34 10" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Optimistic */}
            <div className="flex flex-col items-center text-center flex-1">
              <span className="text-[7px] font-bold text-apple-success/80 uppercase tracking-wider mb-1">Best</span>
              <span className="text-[11px] font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(optimisticAsset, currency, true)}</span>
            </div>
          </div>
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
