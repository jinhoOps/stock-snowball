import React from 'react';
import { SimulationMode, SimulationParams } from '../../types/finance';
import { motion } from 'framer-motion';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { NumericInput } from '../common/NumericInput';
import ScenarioPresetPicker, { PRESET_SCENARIOS } from '../common/ScenarioPresetPicker';

interface SimulationControlsProps {
  mode: SimulationMode;
  setMode: (m: SimulationMode) => void;
  params: SimulationParams;
  onUpdate: (p: Partial<SimulationParams>) => void;
  currency: 'KRW' | 'USD';
  setCurrency: (c: 'KRW' | 'USD') => void;
  exchangeRate: number;
  onOpenAdvanced: () => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = (props) => {
  const handleCurrencyToggle = (newCurrency: 'KRW' | 'USD') => {
    props.setCurrency(newCurrency);
  };

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    props.onUpdate({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-8 mb-12 w-full max-w-[1000px] items-center">
      <div className="flex flex-col md:flex-row justify-between w-full items-center gap-4">
        {/* Mode Switcher */}
        <div className="bg-apple-surface-chip-translucent p-1 rounded-pill flex gap-1 shadow-sm border border-apple-hairline" role="tablist">
          <button
            onClick={() => props.setMode('PROJECTION')}
            aria-pressed={props.mode === 'PROJECTION'}
            aria-label="스노우볼 모드"
            className={`relative px-6 py-2 rounded-pill text-caption-strong tracking-tight transition-all duration-300 ${
              props.mode === 'PROJECTION' ? 'text-apple-ink' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
            }`}
          >
            {props.mode === 'PROJECTION' && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white rounded-pill shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">스노우볼</span>
          </button>
          <button
            onClick={() => props.setMode('BACKTEST')}
            aria-pressed={props.mode === 'BACKTEST'}
            aria-label="과거 백테스트 모드"
            className={`relative px-6 py-2 rounded-pill text-caption-strong tracking-tight transition-all duration-300 ${
              props.mode === 'BACKTEST' ? 'text-apple-ink' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
            }`}
          >
            {props.mode === 'BACKTEST' && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white rounded-pill shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">백테스트</span>
          </button>
        </div>

        {/* Currency Switcher */}
        <div className="bg-apple-surface-chip-translucent p-1 rounded-pill flex gap-1 shadow-sm border border-apple-hairline">
          <button
            onClick={() => handleCurrencyToggle('KRW')}
            className={`px-4 py-1.5 rounded-pill text-[12px] font-bold transition-all duration-300 ${
              props.currency === 'KRW' ? 'bg-white text-apple-ink shadow-sm' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
            }`}
          >
            KRW
          </button>
          <button
            onClick={() => handleCurrencyToggle('USD')}
            className={`px-4 py-1.5 rounded-pill text-[12px] font-bold transition-all duration-300 ${
              props.currency === 'USD' ? 'bg-white text-apple-ink shadow-sm' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
            }`}
          >
            USD
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full bg-apple-canvas-parchment border border-apple-hairline p-5 sm:p-8 rounded-lg items-start shadow-sm">
        {/* 1순위: 투자 금액 */}
        <div className="flex-1 flex flex-col items-start w-full">
          <label htmlFor="principal-input" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">
            초기 자산 ({props.currency})
          </label>
          <NumericInput 
            id="principal-input"
            value={props.params.principal}
            onChange={(v) => updateParam('principal', v)}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
          <BigNumberHelper value={props.params.principal} currency={props.currency} className="ml-4" />
        </div>

        <div className="flex-1 flex flex-col items-start w-full">
          <div className="flex justify-between w-full items-center mb-3 px-2">
            <label htmlFor="monthly-investment-input" className="text-caption-strong text-apple-ink tracking-tight">납입액 ({props.currency})</label>
            <div className="flex gap-1 bg-apple-surface-chip-translucent p-0.5 rounded-pill border border-apple-hairline scale-90 origin-right">
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => updateParam('cycle', c)}
                  className={`px-3 py-1 rounded-pill text-[10px] font-bold transition-all ${
                    props.params.cycle === c ? 'bg-white text-apple-ink shadow-sm' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
                  }`}
                >
                  {c === 'DAILY' ? '일' : c === 'WEEKLY' ? '주' : '월'}
                </button>
              ))}
            </div>
          </div>
          <NumericInput 
            id="monthly-investment-input"
            value={props.params.contribution}
            onChange={(v) => updateParam('contribution', v)}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
          <BigNumberHelper 
            value={props.params.contribution} 
            currency={props.currency} 
            exchangeRate={props.exchangeRate}
            showExchangeRate={true}
            className="ml-4" 
          />
        </div>

        {/* 2순위: 기간 */}
        {props.mode === 'PROJECTION' && (
          <div className="flex-1 flex flex-col items-start w-full">
            <label htmlFor="years-range" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">
              투자 기간 (년) {props.params.cycle === 'DAILY' ? '(최대 30년)' : '(최대 50년)'}
            </label>
            <div className="flex items-center gap-4 w-full h-12">
              <input 
                id="years-range"
                type="range" 
                min="1" 
                max={props.params.cycle === 'DAILY' ? 30 : 50}
                value={Math.min(props.params.years, props.params.cycle === 'DAILY' ? 30 : 50)}
                onChange={(e) => updateParam('years', Number(e.target.value))}
                className="flex-1 accent-apple-primary h-2 bg-apple-hairline rounded-pill appearance-none cursor-pointer"
                aria-label="투자 기간 조절"
              />
              <NumericInput 
                id="years-number"
                value={props.params.years}
                onChange={(v) => updateParam('years', v)}
                className="w-20 h-12 bg-apple-canvas border border-apple-hairline rounded-pill text-body outline-none focus:border-apple-primary text-center font-text"
                aria-label="투자 기간 직접 입력"
              />
            </div>
          </div>
        )}

        {/* BACKTEST Dates */}
        {props.mode === 'BACKTEST' && (
          <div className="flex-[2] flex flex-col items-start w-full">
             <label className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">백테스트 기간</label>
             <div className="flex flex-col gap-4 w-full">
               <div className="flex gap-4 w-full h-12">
                 <input 
                  type="date"
                  value={props.params.startDate}
                  onChange={(e) => updateParam('startDate', e.target.value)}
                  className="flex-1 bg-apple-canvas border border-apple-hairline rounded-pill px-4 text-body outline-none focus:border-apple-primary transition-all font-text"
                 />
                 <input 
                  type="date"
                  value={props.params.endDate}
                  onChange={(e) => updateParam('endDate', e.target.value)}
                  className="flex-1 bg-apple-canvas border border-apple-hairline rounded-pill px-4 text-body outline-none focus:border-apple-primary transition-all font-text"
                 />
               </div>
               <ScenarioPresetPicker 
                 onSelect={(preset) => {
                   props.onUpdate({
                     startDate: preset.startDate,
                     endDate: preset.endDate
                   });
                 }}
                 activePresetName={PRESET_SCENARIOS.find(p => p.startDate === props.params.startDate && p.endDate === props.params.endDate)?.name}
               />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationControls;
