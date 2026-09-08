import React from 'react';
import { Snowflake, ArrowRight } from 'lucide-react';
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
  rateLabel?: string;
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
  rateLabel = 'CAGR',
  years,
  currency,
  cardRef,
}) => {
  return (
    <div aria-hidden="true" className="fixed -left-[10000px] top-0"> {/* Render off-screen for capture */}
      <div 
        ref={cardRef}
        className="w-[400px] h-[520px] rounded-card border border-apple-hairline bg-apple-canvas p-8 flex flex-col items-center justify-between shadow-2xl overflow-hidden relative"

      >
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-apple-primary/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-apple-primary/15 rounded-full blur-[100px] -ml-32 -mb-32" />

        {/* Header */}
        <div className="w-full flex justify-between items-start gap-4 z-10">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="block w-full whitespace-nowrap text-[9px] leading-relaxed font-bold uppercase tracking-widest text-apple-ink-muted-48 mb-1">Portfolio Projection</span>
            <h1 className="w-full text-lg font-display font-bold text-apple-ink leading-snug break-words line-clamp-2">{scenarioName}</h1>
          </div>
          {/* Brand Icon */}
          <div className="w-8 h-8 bg-apple-primary rounded-xl flex shrink-0 items-center justify-center shadow-lg shadow-apple-primary/20">
            <Snowflake size={20} className="text-apple-on-primary" />
          </div>
        </div>

        {/* Main Value */}
        <div className="text-center z-10 w-full mt-4">
          <span className="text-[10px] font-bold text-apple-ink-muted-48 mb-1.5 block uppercase tracking-tighter">{years}년 후 예상 자산</span>
          <div className="text-3xl font-display font-bold text-apple-primary tracking-tight mb-1 break-keep">
            {SnowballEngine.formatBigNumber(totalAsset, currency)}
          </div>
          <div className={`text-base font-semibold flex items-center justify-center gap-1 ${totalReturn >= 0 ? 'text-apple-success' : 'text-apple-error'}`}>
            <span>{totalReturn >= 0 ? '▲' : '▼'}</span>
            <span className="whitespace-nowrap">{returnPercentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Stats Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-2 w-full z-10 mt-6">
          <div className="bg-apple-surface-pearl rounded-md p-2.5 border border-apple-hairline flex flex-col items-center text-center">
            <span className="w-full text-[9px] leading-relaxed font-bold text-apple-ink-muted-48 uppercase mb-0.5 block whitespace-nowrap">{CYCLE_LABEL[cycle]} 얼마씩?</span>
            <span className="w-full text-[10px] leading-relaxed font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(contribution, currency, true)}</span>
          </div>
          <div className="bg-apple-surface-pearl rounded-md p-2.5 border border-apple-hairline flex flex-col items-center text-center">
            <span className="w-full text-[9px] leading-relaxed font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">수익금</span>
            <span className="w-full text-[10px] leading-relaxed font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(totalReturn, currency, true)}</span>
          </div>
          <div className="bg-apple-surface-pearl rounded-md p-2.5 border border-apple-hairline flex flex-col items-center text-center">
            <span className="w-full text-[9px] leading-relaxed font-bold text-apple-ink-muted-48 uppercase mb-0.5 block">{rateLabel}</span>
            <span className="w-full text-[10px] leading-relaxed font-bold text-apple-ink whitespace-nowrap">{cagr.toFixed(1)}%</span>
          </div>
        </div>

        {/* Best / Worst Scenario Band */}
        <div className="w-full z-10 bg-white/40 rounded-3xl border border-white/50 p-4 mt-4">
          <div className="flex justify-between items-center">
            {/* Pessimistic */}
            <div className="flex flex-col items-center text-center flex-1">
              <span className="w-full text-[9px] leading-relaxed font-bold text-apple-error uppercase tracking-wider mb-1">Worst</span>
              <span className="w-full text-[11px] leading-relaxed font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(pessimisticAsset, currency, true)}</span>
            </div>
            {/* Divider & Arrow */}
            <div className="flex flex-col items-center px-3">
              <ArrowRight size={24} className="text-apple-ink-muted-48" />
            </div>
            {/* Optimistic */}
            <div className="flex flex-col items-center text-center flex-1">
              <span className="w-full text-[9px] leading-relaxed font-bold text-apple-success uppercase tracking-wider mb-1">Best</span>
              <span className="w-full text-[11px] leading-relaxed font-bold text-apple-ink whitespace-nowrap">{SnowballEngine.formatBigNumber(optimisticAsset, currency, true)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full flex justify-between items-end gap-3 z-10 border-t border-apple-hairline pt-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="w-full whitespace-nowrap text-[10px] leading-relaxed font-bold text-apple-primary uppercase tracking-wider mb-0.5">Stock Snowball</span>
            <span className="w-full text-[8px] leading-relaxed text-apple-ink-muted-48">Build your future, one flake at a time.</span>
          </div>
          <div className="shrink-0 whitespace-nowrap text-[8px] leading-relaxed text-apple-ink-muted-48 text-right">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
