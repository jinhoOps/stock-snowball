import React from 'react';
import { HistoricalAssetType, SimulationMode, SimulationParams } from '../../types/finance';
import { motion } from 'framer-motion';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { NumericInput } from '../common/NumericInput';
import ScenarioPresetPicker, { getPresetScenarios } from '../common/ScenarioPresetPicker';
import { getHistoricalCoverage } from '../../data/historicalAssets';
import { getCommonCoverage, getFamilyDurationPresets, LEVERAGE_FAMILIES } from '../../data/leverageFamilies';

interface SimulationControlsProps {
  mode: SimulationMode;
  setMode: (m: SimulationMode) => void;
  params: SimulationParams;
  onUpdate: (p: Partial<SimulationParams>) => void;
  currency: 'KRW' | 'USD';
  setCurrency: (c: 'KRW' | 'USD') => void;
  exchangeRate: number;
  onOpenAdvanced: () => void;
  selectedAssets: HistoricalAssetType[];
}

const CONTROL_LABEL_ROW_CLASS = 'mb-3 flex h-6 w-full items-center px-2';
const CONTROL_LABEL_CLASS = 'text-caption-strong text-apple-ink tracking-tight';

const SimulationControls: React.FC<SimulationControlsProps> = (props) => {
  const commonCoverage = getCommonCoverage(props.selectedAssets, getHistoricalCoverage);
  const historicalCoverage = {
    ...getHistoricalCoverage(props.selectedAssets[0]),
    startDate: commonCoverage.startDate,
    endDate: commonCoverage.endDate,
  };
  const startDate = props.params.startDate || historicalCoverage.startDate;
  const endDate = props.params.endDate || historicalCoverage.endDate;
  const historicalRangeError = startDate > endDate
    ? '백테스트 시작일은 종료일보다 앞서야 합니다.'
    : startDate < historicalCoverage.startDate || endDate > historicalCoverage.endDate
      ? `선택한 자산의 공통 데이터는 ${historicalCoverage.startDate}부터 ${historicalCoverage.endDate}까지 사용할 수 있습니다.`
      : null;
  const selectedFamily = Object.values(LEVERAGE_FAMILIES).find((family) =>
    family.members.length === props.selectedAssets.length &&
    family.members.every((member) => props.selectedAssets.includes(member.assetId)),
  );
  const familyPresets = selectedFamily
    ? getFamilyDurationPresets(commonCoverage)
    : undefined;
  const presetScenarios = getPresetScenarios(historicalCoverage);
  const selectablePresets = familyPresets ?? presetScenarios;

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
        <div className="bg-apple-surface-chip-translucent p-1 rounded-pill flex gap-1 shadow-sm border border-apple-hairline" role="tablist">
          <button
            onClick={() => handleCurrencyToggle('KRW')}
            aria-pressed={props.currency === 'KRW'}
            className={`relative px-4 py-1.5 rounded-pill text-[12px] font-bold transition-all duration-300 ${
              props.currency === 'KRW' ? 'text-apple-ink' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
            }`}
          >
            {props.currency === 'KRW' && (
              <motion.div
                layoutId="active-currency-tab"
                className="absolute inset-0 bg-white rounded-pill shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">KRW</span>
          </button>
          <button
            onClick={() => handleCurrencyToggle('USD')}
            aria-pressed={props.currency === 'USD'}
            className={`relative px-4 py-1.5 rounded-pill text-[12px] font-bold transition-all duration-300 ${
              props.currency === 'USD' ? 'text-apple-ink' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
            }`}
          >
            {props.currency === 'USD' && (
              <motion.div
                layoutId="active-currency-tab"
                className="absolute inset-0 bg-white rounded-pill shadow-sm"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">USD</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full bg-apple-surface-pearl border border-white/60 p-5 sm:p-8 rounded-lg items-start shadow-sm">
        {/* 1순위: 투자 금액 */}
        <div className="flex-1 flex flex-col items-start w-full">
          <div className={CONTROL_LABEL_ROW_CLASS}>
            <label htmlFor="principal-input" className={CONTROL_LABEL_CLASS}>
              초기 자산 ({props.currency})
            </label>
          </div>
          <NumericInput 
            id="principal-input"
            value={props.params.principal}
            onChange={(v) => updateParam('principal', v)}
            className="w-full h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all font-text"
          />
          <BigNumberHelper value={props.params.principal} currency={props.currency} className="ml-4" />
        </div>

        <div className="flex-1 flex flex-col items-start w-full">
          <div className={`relative ${CONTROL_LABEL_ROW_CLASS}`}>
            <label htmlFor="monthly-investment-input" className={CONTROL_LABEL_CLASS}>납입액 ({props.currency})</label>
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1 bg-apple-surface-chip-translucent p-0.5 rounded-pill border border-apple-hairline scale-90 origin-right" role="tablist">
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => updateParam('cycle', c)}
                  aria-pressed={props.params.cycle === c}
                  className={`relative px-3 py-1 rounded-pill text-[10px] font-bold transition-all duration-300 ${
                    props.params.cycle === c ? 'text-apple-ink' : 'text-apple-ink-muted-48 hover:text-apple-ink-muted-64'
                  }`}
                >
                  {props.params.cycle === c && (
                    <motion.div
                      layoutId="active-cycle-tab"
                      className="absolute inset-0 bg-white rounded-pill shadow-sm"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{c === 'DAILY' ? '일' : c === 'WEEKLY' ? '주' : '월'}</span>
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
            <div className={CONTROL_LABEL_ROW_CLASS}>
              <label htmlFor="years-range" className={CONTROL_LABEL_CLASS}>
                투자 기간 (년)
              </label>
            </div>
            <div className="flex items-center gap-4 w-full h-12">
              <div className="flex h-12 min-h-12 flex-1 items-center rounded-pill border border-apple-hairline bg-apple-canvas px-4">
                <input
                  id="years-range"
                  type="range"
                  min="1"
                  max={props.params.cycle === 'DAILY' ? 30 : 50}
                  value={Math.min(props.params.years, props.params.cycle === 'DAILY' ? 30 : 50)}
                  onChange={(e) => updateParam('years', Number(e.target.value))}
                  className="w-full accent-apple-primary h-2 bg-apple-hairline rounded-pill appearance-none cursor-pointer"
                  aria-label="투자 기간 조절"
                />
              </div>
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
             <div className={CONTROL_LABEL_ROW_CLASS}>
               <label className={CONTROL_LABEL_CLASS}>백테스트 기간</label>
             </div>
             <div className="flex flex-col gap-4 w-full">
               <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full">
                 <input 
                  type="date"
                  value={props.params.startDate}
                  min={historicalCoverage.startDate}
                  max={historicalCoverage.endDate}
                  onChange={(e) => updateParam('startDate', e.target.value)}
                  className="flex-1 bg-apple-canvas border border-apple-hairline rounded-pill px-4 h-12 text-body outline-none focus:border-apple-primary transition-all font-text"
                 />
                 <input 
                  type="date"
                  value={props.params.endDate}
                  min={historicalCoverage.startDate}
                  max={historicalCoverage.endDate}
                  onChange={(e) => updateParam('endDate', e.target.value)}
                  className="flex-1 bg-apple-canvas border border-apple-hairline rounded-pill px-4 h-12 text-body outline-none focus:border-apple-primary transition-all font-text"
                 />
               </div>
               {historicalRangeError && (
                 <p className="text-caption text-apple-error px-2" role="alert">
                   {historicalRangeError}
                 </p>
               )}
               <ScenarioPresetPicker 
                 coverage={historicalCoverage}
                 onSelect={(preset) => {
                   props.onUpdate({
                     startDate: preset.startDate,
                     endDate: preset.endDate
                   });
                 }}
                 activePresetName={selectablePresets.find(p => p.startDate === props.params.startDate && p.endDate === props.params.endDate)?.name}
                 familyPresets={familyPresets}
               />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationControls;
