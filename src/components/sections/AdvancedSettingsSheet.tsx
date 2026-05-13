import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccountType, StrategyType, AssetType } from '../../types/finance';

interface AdvancedSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  assetType: AssetType;
  setAssetType: (v: AssetType) => void;
  annualRate: number;
  setAnnualRate: (v: number) => void;
  strategyType: StrategyType;
  setStrategyType: (v: StrategyType) => void;
  accountType: AccountType;
  setAccountType: (v: AccountType) => void;
  inflationRate: number;
  setInflationRate: (v: number) => void;
}

const sheetVariants = {
  hidden: { x: '100%', y: 0 },
  visible: { x: 0, y: 0 },
  exit: { x: '100%', y: 0 },
  mobileHidden: { y: '100%', x: 0 },
  mobileVisible: { y: 0, x: 0 },
  mobileExit: { y: '100%', x: 0 },
};

const AdvancedSettingsSheet: React.FC<AdvancedSettingsSheetProps> = ({
  isOpen,
  onClose,
  assetType,
  setAssetType,
  annualRate,
  setAnnualRate,
  strategyType,
  setStrategyType,
  accountType,
  setAccountType,
  inflationRate,
  setInflationRate
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Prevent scrolling on body when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-apple-surface-black/30 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            variants={sheetVariants}
            initial={isMobile ? "mobileHidden" : "hidden"}
            animate={isMobile ? "mobileVisible" : "visible"}
            exit={isMobile ? "mobileExit" : "exit"}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full md:w-[420px] bg-apple-canvas-parchment/95 backdrop-blur-xl border-l border-apple-hairline shadow-2xl overflow-y-auto max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[85vh] max-md:border-l-0 max-md:border-t max-md:rounded-t-[32px]"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-display-md text-apple-ink tracking-tight font-display">고급 설정</h3>
                <button
                  onClick={onClose}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-apple-surface-chip-translucent text-apple-ink hover:bg-apple-surface-chip-translucent/80 active:scale-90 transition-all shadow-sm"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="space-y-10 flex flex-col items-start">
                {/* 1. 자산 선택 및 기대 수익률 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">투자 자산 (Backtest)</label>
                  <div className="relative">
                    <select 
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as AssetType)}
                      className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all appearance-none mb-6 font-text"
                    >
                      <option value="CUSTOM">사용자 정의 (고정 수익률)</option>
                      <option value="QQQM">Nasdaq 100 (QQQM)</option>
                      <option value="QLD">Nasdaq 100 2x (QLD)</option>
                      <option value="TQQQ">Nasdaq 100 3x (TQQQ)</option>
                      <option value="KOSPI">KOSPI 200</option>
                      <option value="KOSDAQ">KOSDAQ</option>
                      <option value="SPY">S&P 500 (SPY)</option>
                      <option value="SCHD">Dividend Equity (SCHD)</option>
                      <option value="GOLD">Gold (GLD)</option>
                    </select>
                    <div className="absolute right-6 top-3.5 pointer-events-none text-apple-ink-muted-48">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>

                  {assetType === 'CUSTOM' ? (
                    <div className="flex flex-col items-start">
                      <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">기대 수익률 (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={annualRate * 100}
                        onChange={(e) => setAnnualRate(Number(e.target.value) / 100)}
                        className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-start opacity-50">
                      <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">기대 수익률 (%)</label>
                      <div className="w-full h-12 flex items-center bg-apple-canvas-parchment border border-apple-hairline rounded-pill px-6 text-body font-text">
                        과거 데이터 자동 적용
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. 투자 전략 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">투자 전략</label>
                  <div className="relative">
                    <select 
                      value={strategyType}
                      onChange={(e) => setStrategyType(e.target.value as StrategyType)}
                      className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary transition-all appearance-none font-text"
                    >
                      <option value="FIXED">정액 적립식 (Fixed)</option>
                      <option value="STEP_UP">증액 적립식 (Step-up)</option>
                      <option value="VALUE_AVERAGING">가치 분할 매수 (Value Averaging)</option>
                    </select>
                    <div className="absolute right-6 top-3.5 pointer-events-none text-apple-ink-muted-48">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>

                {/* 3. 계좌 유형 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">계좌 유형</label>
                  <div className="flex gap-3 w-full bg-apple-canvas-parchment p-1 rounded-pill border border-apple-hairline">
                    <button 
                      onClick={() => setAccountType('GENERAL')}
                      className={`flex-1 h-11 rounded-pill transition-all font-medium text-button-utility ${accountType === 'GENERAL' ? 'bg-apple-surface-black text-apple-on-dark shadow-md' : 'text-apple-ink hover:bg-apple-canvas/50'}`}
                    >
                      일반 계좌
                    </button>
                    <button 
                      onClick={() => setAccountType('ISA')}
                      className={`flex-1 h-11 rounded-pill transition-all font-medium text-button-utility ${accountType === 'ISA' ? 'bg-apple-surface-black text-apple-on-dark shadow-md' : 'text-apple-ink hover:bg-apple-canvas/50'}`}
                    >
                      ISA (절세)
                    </button>
                  </div>
                </div>

                {/* 4. 물가상승률 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">물가상승률 (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={inflationRate * 100}
                    onChange={(e) => setInflationRate(Number(e.target.value) / 100)}
                    className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
                  />
                  <p className="mt-3 text-fine-print text-apple-ink-muted-48 ml-1">실질 가치 계산을 위해 사용됩니다.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvancedSettingsSheet;
