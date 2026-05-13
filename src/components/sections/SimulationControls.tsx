import React from 'react';
import { SimulationMode } from '../../types/finance';
import { motion } from 'framer-motion';

interface SimulationControlsProps {
  mode: SimulationMode;
  setMode: (m: SimulationMode) => void;
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
    <div className="flex flex-col gap-8 mb-12 w-full max-w-[1000px] items-center">
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
          <span className="relative z-10">미래 예측 (Projection)</span>
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
          <span className="relative z-10">과거 백테스트 (Backtest)</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full bg-apple-canvas-parchment border border-apple-hairline p-8 rounded-lg items-end shadow-sm">
        {/* 1순위: 투자 금액 */}
        <div className="flex-1 flex flex-col items-start w-full">
          <label htmlFor="principal-input" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">
            {props.mode === 'BACKTEST' ? '초기 자산 (원)' : '초기 자산 (원)'}
          </label>
          <input 
            id="principal-input"
            type="number" 
            value={props.principal}
            onChange={(e) => props.setPrincipal(Number(e.target.value))}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
        </div>

        <div className="flex-1 flex flex-col items-start w-full">
          <label htmlFor="monthly-investment-input" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">월 불입액 (원)</label>
          <input 
            id="monthly-investment-input"
            type="number" 
            value={props.strategyBaseAmount}
            onChange={(e) => props.setStrategyBaseAmount(Number(e.target.value))}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
        </div>

        {/* 2순위: 기간 (백테스트 모드에서는 숨기거나 날짜 선택으로 변경 예정이지만 일단 유지) */}
        {props.mode === 'PROJECTION' && (
          <div className="flex-1 flex flex-col items-start w-full">
            <label htmlFor="years-range" className="text-caption-strong text-apple-ink mb-3 tracking-tight ml-2">투자 기간 (년)</label>
            <div className="flex items-center gap-4 w-full h-12">
              <input 
                id="years-range"
                type="range" 
                min="1" 
                max="50"
                value={props.years}
                onChange={(e) => props.setYears(Number(e.target.value))}
                className="flex-1 accent-apple-primary h-2 bg-apple-hairline rounded-pill appearance-none cursor-pointer"
                aria-label="투자 기간 조절"
              />
              <input 
                id="years-number"
                type="number" 
                value={props.years}
                onChange={(e) => props.setYears(Number(e.target.value))}
                className="w-20 h-12 bg-apple-canvas border border-apple-hairline rounded-pill text-body outline-none focus:border-apple-primary text-center font-text"
                aria-label="투자 기간 직접 입력"
              />
            </div>
          </div>
        )}

        {/* 고급 설정 버튼 */}
        <div className="flex flex-col justify-end w-full md:w-auto mt-4 md:mt-0">
          <button 
            onClick={props.onOpenAdvanced}
            aria-label="고급 설정 열기"
            className="h-12 px-8 rounded-pill bg-apple-surface-chip-translucent text-apple-ink text-button-utility font-medium whitespace-nowrap hover:bg-apple-surface-chip-translucent/80 active:scale-95 transition-all w-full md:w-auto shadow-sm"
          >
            고급 설정
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimulationControls;
