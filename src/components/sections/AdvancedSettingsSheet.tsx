import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StrategyType, AssetType, SimulationParams, ContributionCycle } from '../../types/finance';
import { calculateMedianCAGR } from '../../data/historicalAssets';
import { Tooltip } from '../common/Tooltip';

interface AdvancedSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  params: SimulationParams;
  onUpdate: (p: Partial<SimulationParams>) => void;
  exchangeRate: number;
  setExchangeRate: (v: number) => void;
  onReset: () => void;
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
  params: parentParams,
  onUpdate,
  exchangeRate: parentExchangeRate,
  setExchangeRate,
  onReset,
}) => {
  const [localParams, setLocalParams] = React.useState<SimulationParams>(parentParams);
  const [localExchangeRate, setLocalExchangeRate] = React.useState<number>(parentExchangeRate);
  const [snapshot, setSnapshot] = React.useState<{ params: SimulationParams, rate: number } | null>(null);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Sync with parent when opening
  useEffect(() => {
    if (isOpen) {
      setLocalParams(parentParams);
      setLocalExchangeRate(parentExchangeRate);
      setSnapshot({ params: parentParams, rate: parentExchangeRate });
    }
  }, [isOpen, parentParams, parentExchangeRate]);

  const hasChanges = snapshot && (
    JSON.stringify(localParams) !== JSON.stringify(snapshot.params) || 
    localExchangeRate !== snapshot.rate
  );

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setLocalParams(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onUpdate(localParams);
    setExchangeRate(localExchangeRate);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

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
                  aria-label="고급 설정 닫기"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-apple-surface-chip-translucent text-apple-ink hover:bg-apple-surface-chip-translucent/80 active:scale-90 transition-all shadow-sm"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="space-y-10 flex flex-col items-start pb-6">
                {/* 1. 자산 선택 및 기대 수익률 */}
                <div className="w-full">
                  <label htmlFor="asset-type-select" className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">
                    {localParams.startDate ? '투자 자산 (Backtest)' : '참조 자산 (Projection CAGR)'}
                  </label>
                  <div className="relative">
                    <select 
                      id="asset-type-select"
                      value={localParams.assetType}
                      onChange={(e) => updateParam('assetType', e.target.value as AssetType)}
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

                  {localParams.assetType === 'CUSTOM' ? (
                    <div className="flex flex-col items-start">
                      <label htmlFor="annual-rate-input" className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">기대 수익률 (%)</label>
                      <input 
                        id="annual-rate-input"
                        type="number" 
                        step="0.1"
                        value={localParams.rate * 100}
                        onChange={(e) => updateParam('rate', Number(e.target.value) / 100)}
                        className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-start">
                      <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">기대 수익률 (CAGR)</label>
                      <div className="w-full h-12 flex items-center justify-between bg-apple-canvas-parchment border border-apple-hairline rounded-pill px-6 text-body font-text opacity-70">
                        <span className="text-[12px] text-apple-ink-muted-48">과거 데이터 자동 적용</span>
                        <span className="text-apple-ink font-medium">약 {(calculateMedianCAGR(localParams.assetType) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. 투자 전략 및 주기 */}
                <div className="w-full">
                  <label htmlFor="strategy-type-select" className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">투자 전략</label>
                  <div className="relative mb-6">
                    <select 
                      id="strategy-type-select"
                      value={localParams.strategyType}
                      onChange={(e) => updateParam('strategyType', e.target.value as StrategyType)}
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

                  <label className="text-caption-strong text-apple-ink mb-3 tracking-tight block ml-1">납입 주기</label>
                  <div className="flex gap-2 w-full bg-apple-canvas-parchment p-1 rounded-pill border border-apple-hairline">
                    {(['DAILY', 'WEEKLY', 'MONTHLY'] as ContributionCycle[]).map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => updateParam('cycle', cycle)}
                        className={`flex-1 h-10 rounded-pill text-[13px] font-medium transition-all ${
                          localParams.cycle === cycle 
                            ? 'bg-apple-surface-black text-apple-on-dark shadow-sm' 
                            : 'text-apple-ink-muted-48 hover:text-apple-ink'
                        }`}
                      >
                        {cycle === 'DAILY' ? '일' : cycle === 'WEEKLY' ? '주' : '월'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 환율 설정 */}
                <div className="w-full">
                  <div className="flex items-center gap-1.5 mb-3 ml-1">
                    <label htmlFor="exchange-rate-input" className="text-caption-strong text-apple-ink tracking-tight block">기준 환율 (KRW/USD)</label>
                    <Tooltip content="원화/달러 통화 전환 및 복수 시나리오 자산 비교 시 사용되는 기준 환율입니다." />
                  </div>
                  <input 
                    id="exchange-rate-input"
                    type="number" 
                    value={localExchangeRate}
                    onChange={(e) => setLocalExchangeRate(Math.max(1, Number(e.target.value)))}
                    className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
                  />
                </div>

                {/* 4. 계좌 유형 */}
                <div className="w-full">
                  <div className="flex items-center gap-1.5 mb-3 ml-1">
                    <label className="text-caption-strong text-apple-ink tracking-tight block">계좌 유형</label>
                    <Tooltip content="일반 계좌: 배당소득세 15.4% 부과&#10;ISA 절세: 200만원 한도 비과세, 초과분 9.9% 분리과세 적용" />
                  </div>
                  <div className="flex gap-3 w-full bg-apple-canvas-parchment p-1 rounded-pill border border-apple-hairline" role="radiogroup" aria-label="계좌 유형 선택">
                    <button 
                      onClick={() => updateParam('accountType', 'GENERAL')}
                      aria-pressed={localParams.accountType === 'GENERAL'}
                      aria-label="일반 계좌 선택"
                      className={`flex-1 h-11 rounded-pill transition-all font-medium text-button-utility ${localParams.accountType === 'GENERAL' ? 'bg-apple-surface-black text-apple-on-dark shadow-md' : 'text-apple-ink hover:bg-apple-canvas/50'}`}
                    >
                      일반 계좌
                    </button>
                    <button 
                      onClick={() => updateParam('accountType', 'ISA')}
                      aria-pressed={localParams.accountType === 'ISA'}
                      aria-label="ISA 절세 계좌 선택"
                      className={`flex-1 h-11 rounded-pill transition-all font-medium text-button-utility ${localParams.accountType === 'ISA' ? 'bg-apple-surface-black text-apple-on-dark shadow-md' : 'text-apple-ink hover:bg-apple-canvas/50'}`}
                    >
                      ISA (절세)
                    </button>
                  </div>
                </div>

                {/* 5. 물가상승률 */}
                <div className="w-full">
                  <div className="flex items-center gap-1.5 mb-3 ml-1">
                    <label htmlFor="inflation-rate-input" className="text-caption-strong text-apple-ink tracking-tight block">물가상승률 (%)</label>
                    <Tooltip content="미래 시점의 자산을 현재 가치(실질 구매력)로 환산하기 위해 적용하는 연간 물가상승률입니다. 설정된 비율만큼 매년 화폐 가치가 하락하는 것으로 계산됩니다." position="bottom" />
                  </div>
                  <input 
                    id="inflation-rate-input"
                    type="number" 
                    step="0.1"
                    value={localParams.inflationRate * 100}
                    onChange={(e) => updateParam('inflationRate', Number(e.target.value) / 100)}
                    className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
                  />
                </div>
              </div>

              {/* Reset Button (Minimalist - 'Seen Later') */}
              <div className="mt-16 mb-8 flex justify-center border-t border-apple-hairline/30 pt-10">
                <button 
                  onClick={onReset}
                  className="text-[13px] text-apple-ink-muted-48 hover:text-red-500/80 transition-colors flex items-center gap-2 opacity-50 hover:opacity-100 font-medium"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                  </svg>
                  모든 데이터 및 설정 초기화
                </button>
              </div>

              {/* Confirmation Footer */}
              <AnimatePresence>
                {hasChanges && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="sticky bottom-0 left-0 right-0 p-6 bg-apple-canvas-parchment/95 backdrop-blur-md border-t border-apple-hairline mt-10 -mx-8 flex gap-3"
                  >
                    <button 
                      onClick={handleCancel}
                      className="flex-1 h-12 rounded-pill bg-apple-canvas border border-apple-hairline text-apple-ink font-semibold hover:bg-apple-canvas-parchment transition-all"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleApply}
                      className="flex-[2] h-12 rounded-pill bg-apple-primary text-apple-on-dark font-semibold hover:bg-apple-primary-focus transition-all shadow-md"
                    >
                      설정 적용
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvancedSettingsSheet;
