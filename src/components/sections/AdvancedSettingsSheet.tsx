import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { StrategyType, AssetType, SimulationParams } from '../../types/finance';
import { calculateMedianCAGR } from '../../data/historicalAssets';
import Button from '../common/Button';
import { Field, Input, Select } from '../common/Field';
import SegmentedControl from '../common/SegmentedControl';
import Sheet from '../common/Sheet';
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

export default function AdvancedSettingsSheet({ isOpen, onClose, params: parentParams, onUpdate,
  exchangeRate: parentExchangeRate, setExchangeRate, onReset }: AdvancedSettingsSheetProps) {
  const [localParams, setLocalParams] = useState<SimulationParams>(parentParams);
  const [localExchangeRate, setLocalExchangeRate] = useState(parentExchangeRate);
  const [snapshot, setSnapshot] = useState<{ params: SimulationParams; rate: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalParams(parentParams);
      setLocalExchangeRate(parentExchangeRate);
      setSnapshot({ params: parentParams, rate: parentExchangeRate });
    }
  }, [isOpen, parentParams, parentExchangeRate]);

  const hasChanges = snapshot && (JSON.stringify(localParams) !== JSON.stringify(snapshot.params) || localExchangeRate !== snapshot.rate);
  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setLocalParams((previous) => ({ ...previous, [key]: value }));
  };
  const handleApply = () => {
    onUpdate(localParams);
    setExchangeRate(localExchangeRate);
    onClose();
  };

  return (
    <Sheet open={isOpen} onClose={onClose} title="고급 설정" footer={hasChanges ? (
      <div className="flex gap-3">
        <Button onClick={onClose} className="flex-1">취소</Button>
        <Button variant="primary" onClick={handleApply} className="flex-[2]">설정 적용</Button>
      </div>
    ) : undefined}>
      <div className="flex flex-col gap-6">
        <Field htmlFor="asset-type-select" label={localParams.startDate ? '투자 자산 (Backtest)' : '참조 자산 (Projection CAGR)'}>
          <Select value={localParams.assetType} onChange={(event) => updateParam('assetType', event.target.value as AssetType)}>
                      <option value="CUSTOM">사용자 정의 (고정 수익률)</option>
                      <option value="QQQ">Nasdaq 100 (QQQ)</option>
                      <option value="QLD">Nasdaq 100 2x (QLD)</option>
                      <option value="TQQQ">Nasdaq 100 3x (TQQQ)</option>
                      <option value="AMD">Advanced Micro Devices (AMD)</option>
                      <option value="AMDL">AMD 2x (AMDL)</option>
                      <option value="TSLA">Tesla (TSLA)</option>
                      <option value="TSLL">Tesla 2x (TSLL)</option>
                      <option value="SOXX">Semiconductors (SOXX)</option>
                      <option value="SOXL">Semiconductors 3x (SOXL)</option>
                      <option value="KOSPI">KOSPI 200</option>
                      <option value="KOSDAQ">KOSDAQ</option>
                      <option value="SPY">S&P 500 (SPY)</option>
                      <option value="SCHD">Dividend Equity (SCHD)</option>
                      <option value="GOLD">Gold Futures (GC=F)</option>
          </Select>
        </Field>
        {localParams.assetType === 'CUSTOM' ? (
          <Field htmlFor="annual-rate-input" label="기대 수익률 (%)">
            <Input type="number" step="0.1" value={localParams.rate * 100} onChange={(event) => updateParam('rate', Number(event.target.value) / 100)} />
          </Field>
        ) : (
          <div className="ui-field">
            <span className="ui-field-label">기대 수익률 (CAGR)</span>
            <output className="ui-input flex items-center justify-between gap-2" aria-label="과거 데이터 기대 수익률">
              <span className="text-fine-print text-apple-ink-muted-48">과거 데이터 자동 적용</span>
              <span className="shrink-0">약 {(calculateMedianCAGR(localParams.assetType) * 100).toFixed(1)}%</span>
            </output>
          </div>
        )}
        <Field htmlFor="strategy-type-select" label="투자 전략">
          <Select value={localParams.strategyType} onChange={(event) => updateParam('strategyType', event.target.value as StrategyType)}>
            <option value="FIXED">정액 적립식 (Fixed)</option>
            <option value="STEP_UP">증액 적립식 (Step-up)</option>
            <option value="VALUE_AVERAGING">가치 분할 매수 (Value Averaging)</option>
          </Select>
        </Field>
        <div className="ui-field">
          <span className="ui-field-label">납입 주기</span>
          <SegmentedControl label="납입 주기" value={localParams.cycle} onChange={(cycle) => updateParam('cycle', cycle)} fullWidth
            options={[{ value: 'DAILY', label: '일' }, { value: 'WEEKLY', label: '주' }, { value: 'MONTHLY', label: '월' }]} />
        </div>
        <Field htmlFor="exchange-rate-input" label="기준 환율 (KRW/USD)" hint="원화·달러 전환 및 시나리오 비교에 적용합니다.">
          <Input type="number" min="1" value={localExchangeRate} onChange={(event) => setLocalExchangeRate(Math.max(1, Number(event.target.value)))} />
        </Field>
        <div className="ui-field">
          <div className="ui-field-label">
            <span>계좌 유형</span>
            <Tooltip content={'일반 계좌: 배당소득세 15.4% 부과\nISA 절세: 200만원 한도 비과세, 초과분 9.9% 분리과세 적용'} />
          </div>
          <SegmentedControl label="계좌 유형 선택" value={localParams.accountType} onChange={(accountType) => updateParam('accountType', accountType)} fullWidth
            options={[{ value: 'GENERAL', label: '일반 계좌', ariaLabel: '일반 계좌 선택' }, { value: 'ISA', label: 'ISA (절세)', ariaLabel: 'ISA 절세 계좌 선택' }]} />
        </div>
        <Field htmlFor="inflation-rate-input" label="물가상승률 (%)" hint="미래 자산을 현재의 구매력으로 환산할 때 적용합니다.">
          <Input type="number" step="0.1" value={localParams.inflationRate * 100} onChange={(event) => updateParam('inflationRate', Number(event.target.value) / 100)} />
        </Field>
        <div className="mt-2 border-t border-apple-hairline pt-6">
          <Button variant="danger" onClick={onReset} className="w-full">
            <RotateCcw size={16} aria-hidden="true" />모든 데이터 및 설정 초기화
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
