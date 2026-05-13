import React from 'react';
import { SimulationMode, ContributionCycle } from '../../types/finance';
import { motion } from 'framer-motion';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { NumericInput } from '../common/NumericInput';
import { SnowballEngine } from '../../core/SnowballEngine';

interface SimulationControlsProps {
  mode: SimulationMode;
  setMode: (m: SimulationMode) => void;
  principal: number;
  setPrincipal: (v: number) => void;
  years: number;
  setYears: (v: number) => void;
  strategyBaseAmount: number;
  setStrategyBaseAmount: (v: number) => void;
  currency: 'KRW' | 'USD';
  setCurrency: (c: 'KRW' | 'USD') => void;
  exchangeRate: number;
  contributionCycle: ContributionCycle;
  onOpenAdvanced: () => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = (props) => {
  const handleCurrencyToggle = (newCurrency: 'KRW' | 'USD') => {
    if (newCurrency === props.currency) return;

    // 통화 전환 시 현재 입력값들을 환산
    const newPrincipal = SnowballEngine.convertCurrency(props.principal, props.exchangeRate, newCurrency);
    const newBaseAmount = SnowballEngine.convertCurrency(props.strategyBaseAmount, props.exchangeRate, newCurrency);

    props.setCurrency(newCurrency);
    props.setPrincipal(newPrincipal);
    props.setStrategyBaseAmount(newBaseAmount);
  };

  const cycleLabel = 
    props.contributionCycle === 'DAILY' ? '일' : 
    props.contributionCycle === 'WEEKLY' ? '주' : '월';

  return (
    <div className="flex flex-col gap-8 mb-12 w-full max-w-[1000px] items-center">
      <div className="flex flex-col md:flex-row justify-between w-full items-center gap-4">
        {/* Mode Switcher */}
        <div className="bg-apple-surface-chip-translucent p-1 rounded-pill flex gap-1 shadow-sm border border-apple-hairline" role="tablist">
          <button
            onClick={() => props.setMode('PROJECTION')}
            aria-pressed={props.mode === 'PROJECTION'}
            aria-label="미래 예측 모드"
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
            <span className="relative z-10">미래 예측</span>
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

      <div className="flex flex-col md:flex-row gap-6 w-full bg-apple-canvas-parchment border border-apple-hairline p-8 rounded-lg items-start shadow-sm">
        {/* 1순위: 투자 금액 */}
        <div className="flex-1 flex flex-col items-start w-full">
          <label htmlFor="principal-input" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">
            초기 자산 ({props.currency})
          </label>
          <NumericInput 
            id="principal-input"
            value={props.principal}
            onChange={props.setPrincipal}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
          <BigNumberHelper value={props.principal} currency={props.currency} className="ml-4" />
        </div>

        <div className="flex-1 flex flex-col items-start w-full">
          <label htmlFor="monthly-investment-input" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">매{cycleLabel} 납입액 ({props.currency})</label>
          <NumericInput 
            id="monthly-investment-input"
            value={props.strategyBaseAmount}
            onChange={props.setStrategyBaseAmount}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
          <BigNumberHelper value={props.strategyBaseAmount} currency={props.currency} className="ml-4" />
        </div>

        {/* 2순위: 기간 */}
        {props.mode === 'PROJECTION' && (
          <div className="flex-1 flex flex-col items-start w-full">
            <label htmlFor="years-range" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">투자 기간 (년)</label>
            <div className="flex items-center gap-4 w-full h-12">
              <input 
                id="years-range"
                type="range" 
                min="1" 
                max="30"
                value={Math.min(props.years, 30)}
                onChange={(e) => props.setYears(Number(e.target.value))}
                className="flex-1 accent-apple-primary h-2 bg-apple-hairline rounded-pill appearance-none cursor-pointer"
                aria-label="투자 기간 조절"
              />
              <NumericInput 
                id="years-number"
                value={props.years}
                onChange={props.setYears}
                className="w-20 h-12 bg-apple-canvas border border-apple-hairline rounded-pill text-body outline-none focus:border-apple-primary text-center font-text"
                aria-label="투자 기간 직접 입력"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationControls;

