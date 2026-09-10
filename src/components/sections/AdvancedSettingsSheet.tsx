import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { StrategyType, AssetType, SimulationParams, SimulationMode, DEFAULT_TAX_CONFIG } from '../../types/finance';
import { calculateMedianCAGR } from '../../data/historicalAssets';
import Button from '../common/Button';
import { Field, Input, Select } from '../common/Field';
import SegmentedControl from '../common/SegmentedControl';
import Sheet from '../common/Sheet';
import { Tooltip } from '../common/Tooltip';

interface AdvancedSettingsSheetProps {
  mode: SimulationMode;
  isOpen: boolean;
  onClose: () => void;
  params: SimulationParams;
  onUpdate: (p: Partial<SimulationParams>) => void;
  exchangeRate: number;
  setExchangeRate: (v: number) => void;
  onReset: () => void;
}

export default function AdvancedSettingsSheet({ mode, isOpen, onClose, params: parentParams, onUpdate,
  exchangeRate: parentExchangeRate, setExchangeRate, onReset }: AdvancedSettingsSheetProps) {
  const [localParams, setLocalParams] = useState<SimulationParams>(parentParams);
  const [localExchangeRate, setLocalExchangeRate] = useState(parentExchangeRate);
  const [snapshot, setSnapshot] = useState<{ params: SimulationParams; rate: number } | null>(null);
  const isProjection = mode === 'PROJECTION';
  const isValueAveraging = isProjection && localParams.strategyType === 'VALUE_AVERAGING';
  const taxConfig = localParams.taxConfig ?? DEFAULT_TAX_CONFIG;
  const taxDescription = `${isProjection
    ? `일반 계좌: 양의 전체 수익에 ${(taxConfig.dividendTaxRate * 100).toFixed(1)}%를 적용하는 단순 추정입니다.`
    : '일반 계좌: 배당세·양도세를 계산하지 않습니다.'}\nISA: 수익 중 ${(taxConfig.isaTaxFreeLimit / 10000).toLocaleString()}만원 공제 후 초과분에 ${(taxConfig.isaReducedTaxRate * 100).toFixed(1)}%를 적용합니다. 실제 가입·보유·과세 조건은 반영하지 않습니다.`;

  useEffect(() => {
    if (isOpen) {
      setLocalParams(parentParams);
      setLocalExchangeRate(parentExchangeRate);
      setSnapshot({ params: parentParams, rate: parentExchangeRate });
    }
  }, [isOpen, parentParams, parentExchangeRate]);

  const hasChanges = snapshot && (JSON.stringify(localParams) !== JSON.stringify(snapshot.params) || localExchangeRate !== snapshot.rate);
  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setLocalParams((previous) => {
      const next = { ...previous, [key]: value };
      if ((key === 'assetType' || key === 'rate') && value !== previous[key]) delete next.annualRateOverride;
      if (key === 'strategyType' && value === 'VALUE_AVERAGING') next.cycle = 'MONTHLY';
      return next;
    });
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
        <Field htmlFor="asset-type-select" label={isProjection ? '참조 자산' : '투자 자산'}>
          <Select value={localParams.assetType} onChange={(event) => updateParam('assetType', event.target.value as AssetType)}>
                      {isProjection && <option value="CUSTOM">사용자 정의 (고정 수익률)</option>}
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
        {isProjection && (localParams.assetType === 'CUSTOM' ? (
          <Field htmlFor="annual-rate-input" label="기대 수익률 (%)">
            <Input type="number" step="0.1" value={localParams.rate * 100} onChange={(event) => updateParam('rate', Number(event.target.value) / 100)} />
          </Field>
        ) : (
          <div className="ui-field">
            <span className="ui-field-label">기대 수익률 (CAGR)</span>
            <output className="ui-input flex items-center justify-between gap-2" aria-label="과거 데이터 기대 수익률">
              <span className="text-fine-print text-apple-ink-muted-48">{localParams.annualRateOverride === undefined ? '과거 데이터 자동 적용' : '저장한 수익률 적용'}</span>
              <span className="shrink-0">약 {((localParams.annualRateOverride ?? calculateMedianCAGR(localParams.assetType)) * 100).toFixed(1)}%</span>
            </output>
          </div>
        ))}
        {isProjection && <Field htmlFor="strategy-type-select" label="투자 전략"
          hint={localParams.strategyType === 'STEP_UP' ? `납입액이 매년 ${(localParams.strategyIncreaseRate * 100).toFixed(1)}%씩 변합니다.` : undefined}>
          <Select value={localParams.strategyType} onChange={(event) => updateParam('strategyType', event.target.value as StrategyType)}>
            <option value="FIXED">정액 적립식 (Fixed)</option>
            <option value="STEP_UP">증액 적립식 (Step-up)</option>
            <option value="VALUE_AVERAGING">가치 분할 매수 (Value Averaging)</option>
          </Select>
        </Field>}
        {isValueAveraging ? <p className="ui-field-hint">매월 목표 자산에 부족한 금액만 매수합니다. 월간 목표 증가액은 기본 입력에서 조정합니다.</p> : <div className="ui-field">
          <span className="ui-field-label">납입 주기</span>
          <SegmentedControl label="납입 주기" value={localParams.cycle} onChange={(cycle) => updateParam('cycle', cycle)} fullWidth
            options={[{ value: 'DAILY', label: '일' }, { value: 'WEEKLY', label: '주' }, { value: 'MONTHLY', label: '월' }]} />
        </div>}
        <Field htmlFor="exchange-rate-input" label="기준 환율 (KRW/USD)" hint="원화·달러 전환 및 시나리오 비교에 적용합니다.">
          <Input type="number" min="1" value={localExchangeRate} onChange={(event) => setLocalExchangeRate(Math.max(1, Number(event.target.value)))} />
        </Field>
        <div className="ui-field">
          <div className="ui-field-label">
            <span>계좌 유형</span>
            <Tooltip content={taxDescription} />
          </div>
          <SegmentedControl label="계좌 유형 선택" value={localParams.accountType} onChange={(accountType) => updateParam('accountType', accountType)} fullWidth
            options={[{ value: 'GENERAL', label: '일반 계좌', ariaLabel: '일반 계좌 선택' }, { value: 'ISA', label: 'ISA (절세)', ariaLabel: 'ISA 절세 계좌 선택' }]} />
          <p className="ui-field-hint">{isProjection ? '세금은 계좌 유형에 따른 단순 추정치입니다.' : '백테스트는 매수 수수료와 종료 시 ISA 과세만 반영합니다.'}</p>
        </div>
        <Field htmlFor="inflation-rate-input" label="물가상승률 (%)" hint="자산을 계산 시작 시점의 구매력으로 환산할 때 적용합니다.">
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
