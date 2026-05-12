import React from 'react';

interface SimulationControlsProps {
  principal: number;
  setPrincipal: (v: number) => void;
  years: number;
  setYears: (v: number) => void;
  strategyBaseAmount: number;
  setStrategyBaseAmount: (v: number) => void;
  onOpenAdvanced: () => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = (props) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 mb-12 w-full max-w-[1000px] bg-apple-canvas-parchment border border-apple-hairline p-6 rounded-2xl items-end">
      {/* 1순위: 투자 금액 */}
      <div className="flex-1 flex flex-col items-start w-full">
        <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">초기 자산 (원)</label>
        <input 
          type="number" 
          value={props.principal}
          onChange={(e) => props.setPrincipal(Number(e.target.value))}
          className="w-full bg-apple-canvas border border-apple-hairline rounded-lg p-4 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
        />
      </div>

      <div className="flex-1 flex flex-col items-start w-full">
        <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">월 불입액 (원)</label>
        <input 
          type="number" 
          value={props.strategyBaseAmount}
          onChange={(e) => props.setStrategyBaseAmount(Number(e.target.value))}
          className="w-full bg-apple-canvas border border-apple-hairline rounded-lg p-4 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
        />
      </div>

      {/* 2순위: 기간 */}
      <div className="flex-1 flex flex-col items-start w-full">
        <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">투자 기간 (년)</label>
        <div className="flex items-center gap-4 w-full">
          <input 
            type="range" 
            min="1" 
            max="50"
            value={props.years}
            onChange={(e) => props.setYears(Number(e.target.value))}
            className="flex-1 accent-apple-primary"
          />
          <input 
            type="number" 
            value={props.years}
            onChange={(e) => props.setYears(Number(e.target.value))}
            className="w-20 bg-apple-canvas border border-apple-hairline rounded-lg p-4 text-body outline-none focus:border-apple-primary text-center"
          />
        </div>
      </div>

      {/* 고급 설정 버튼 */}
      <div className="flex flex-col justify-end w-full md:w-auto mt-4 md:mt-0">
        <button 
          onClick={props.onOpenAdvanced}
          className="h-[58px] px-6 rounded-lg bg-apple-surface-chip-translucent/60 text-apple-ink text-button-utility whitespace-nowrap hover:bg-apple-surface-chip-translucent/80 transition-colors w-full md:w-auto"
        >
          고급 설정
        </button>
      </div>
    </div>
  );
};

export default SimulationControls;
