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
            className="fixed inset-0 z-40 bg-apple-surface-black/20 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%', y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: '100%', y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-apple-canvas-parchment/90 backdrop-blur-md border-l border-apple-hairline shadow-[-4px_0_24px_rgba(0,0,0,0.1)] overflow-y-auto max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[80vh] max-md:border-l-0 max-md:border-t max-md:rounded-t-3xl"
            // Override animation for mobile
            style={{ '@media (max-width: 768px)': { transform: 'translateY(100%) translateX(0)' } } as any}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-display-md text-apple-ink tracking-tight">고급 설정</h3>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-apple-surface-chip-translucent/60 text-apple-ink hover:bg-apple-surface-chip-translucent/80 transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="space-y-8 flex flex-col items-start">
                {/* 1. 자산 선택 및 기대 수익률 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight block">투자 자산 (Backtest)</label>
                  <select 
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as AssetType)}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary transition-all appearance-none mb-4"
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

                  {assetType === 'CUSTOM' ? (
                    <div className="flex flex-col items-start">
                      <label className="text-caption-strong text-apple-ink mb-2 tracking-tight block">기대 수익률 (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={annualRate * 100}
                        onChange={(e) => setAnnualRate(Number(e.target.value) / 100)}
                        className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-start opacity-50">
                      <label className="text-caption-strong text-apple-ink mb-2 tracking-tight block">기대 수익률 (%)</label>
                      <div className="w-full bg-apple-canvas-parchment border border-apple-hairline rounded-sm p-3 text-body">
                        과거 데이터 자동 적용
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. 투자 전략 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight block">투자 전략</label>
                  <select 
                    value={strategyType}
                    onChange={(e) => setStrategyType(e.target.value as StrategyType)}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary transition-all appearance-none"
                  >
                    <option value="FIXED">정액 적립식 (Fixed)</option>
                    <option value="STEP_UP">증액 적립식 (Step-up)</option>
                    <option value="VALUE_AVERAGING">가치 분할 매수 (Value Averaging)</option>
                  </select>
                </div>

                {/* 3. 계좌 유형 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight block">계좌 유형</label>
                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => setAccountType('GENERAL')}
                      className={`flex-1 py-3 rounded-sm border transition-all ${accountType === 'GENERAL' ? 'bg-apple-surface-black text-apple-on-dark border-apple-surface-black' : 'bg-apple-canvas border-apple-hairline text-apple-ink'}`}
                    >
                      일반
                    </button>
                    <button 
                      onClick={() => setAccountType('ISA')}
                      className={`flex-1 py-3 rounded-sm border transition-all ${accountType === 'ISA' ? 'bg-apple-surface-black text-apple-on-dark border-apple-surface-black' : 'bg-apple-canvas border-apple-hairline text-apple-ink'}`}
                    >
                      ISA
                    </button>
                  </div>
                </div>

                {/* 4. 물가상승률 */}
                <div className="w-full">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight block">물가상승률 (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={inflationRate * 100}
                    onChange={(e) => setInflationRate(Number(e.target.value) / 100)}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
                  />
                  <p className="mt-2 text-fine-print text-apple-ink-muted-48">실질 가치 계산을 위해 사용됩니다.</p>
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
