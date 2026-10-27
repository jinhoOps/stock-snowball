import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { StrategyType, AssetType, SimulationParams, SimulationMode, DEFAULT_TAX_CONFIG, MARKET_CRISIS_IDS, type MarketCrisisId } from '../../types/finance';
import { getProjectionMarket, sameCrises } from '../../data/projectionAssets';
import Button from '../common/Button';
import { DecimalInput } from '../common/DecimalInput';
import { Field, Select } from '../common/Field';
import SegmentedControl from '../common/SegmentedControl';
import Sheet from '../common/Sheet';
import Stepper from '../common/Stepper';
import { Tooltip } from '../common/Tooltip';
import { stepOnGrid } from '../../lib/input/stepOnGrid';

/** One tap of the expected-return stepper, in percentage points. */
const RATE_STEP_PERCENT = 0.5;
/** Percent shown in the field ↔ fraction stored in params, without float tails like 7.000000000000001. */
const toPercent = (fraction: number) => Number((fraction * 100).toFixed(4));
const toFraction = (percent: number) => Number((percent / 100).toFixed(6));
const formatPercent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
/** Rounded down, so a 99.98% fall reads as −99.9% rather than a total loss. */
const formatDrawdown = (fraction: number) => `−${(Math.floor(fraction * 1000) / 10).toFixed(1)}%`;
const formatMonth = (date: string) => date.slice(0, 7).replace('-', '.');

/** Assets a projection can reference: the Nasdaq family, broad indices, dividends, and gold. */
const PROJECTION_ASSET_OPTIONS: readonly { value: AssetType; label: string }[] = [
  { value: 'QQQ', label: 'Nasdaq 100 (QQQ)' },
  { value: 'QLD', label: 'Nasdaq 100 2x (QLD)' },
  { value: 'TQQQ', label: 'Nasdaq 100 3x (TQQQ)' },
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'KOSPI', label: 'KOSPI 200' },
  { value: 'SCHD', label: 'Dividend Equity (SCHD)' },
  { value: 'GOLD', label: 'Gold Futures (GC=F)' },
];
const BACKTEST_ASSET_OPTIONS: readonly { value: AssetType; label: string }[] = [
  { value: 'QQQ', label: 'Nasdaq 100 (QQQ)' },
  { value: 'QLD', label: 'Nasdaq 100 2x (QLD)' },
  { value: 'TQQQ', label: 'Nasdaq 100 3x (TQQQ)' },
  { value: 'AMD', label: 'Advanced Micro Devices (AMD)' },
  { value: 'AMDL', label: 'AMD 2x (AMDL)' },
  { value: 'TSLA', label: 'Tesla (TSLA)' },
  { value: 'TSLL', label: 'Tesla 2x (TSLL)' },
  { value: 'SOXX', label: 'Semiconductors (SOXX)' },
  { value: 'SOXL', label: 'Semiconductors 3x (SOXL)' },
  { value: 'KOSPI', label: 'KOSPI 200' },
  { value: 'KOSDAQ', label: 'KOSDAQ' },
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'SCHD', label: 'Dividend Equity (SCHD)' },
  { value: 'GOLD', label: 'Gold Futures (GC=F)' },
];

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
  const market = isProjection ? getProjectionMarket(localParams.assetType, localParams.excludedCrises) : undefined;
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
      if (key === 'excludedCrises' && !sameCrises(value as MarketCrisisId[] | undefined, previous.excludedCrises)) delete next.annualRateOverride;
      if (key === 'strategyType' && value === 'VALUE_AVERAGING') next.cycle = 'MONTHLY';
      return next;
    });
  };
  const setCrisisIncluded = (id: MarketCrisisId, included: boolean) => {
    const current = localParams.excludedCrises ?? [];
    const next = MARKET_CRISIS_IDS.filter((crisis) => (crisis === id ? !included : current.includes(crisis)));
    updateParam('excludedCrises', next.length > 0 ? next : undefined);
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
            {(isProjection ? PROJECTION_ASSET_OPTIONS : BACKTEST_ASSET_OPTIONS).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </Field>
        {isProjection && (localParams.assetType === 'CUSTOM' ? (
          <Field htmlFor="annual-rate-input" label="기대 수익률 (%)" hint="연평균 수익률입니다. 버튼은 0.5%p씩 움직입니다.">
            <Stepper decreaseLabel="기대 수익률 0.5%p 낮추기" increaseLabel="기대 수익률 0.5%p 높이기"
              onDecrease={() => updateParam('rate', toFraction(stepOnGrid(toPercent(localParams.rate), RATE_STEP_PERCENT, -1)))}
              onIncrease={() => updateParam('rate', toFraction(stepOnGrid(toPercent(localParams.rate), RATE_STEP_PERCENT, 1)))}>
              <DecimalInput allowNegative value={toPercent(localParams.rate)} onChange={(percent) => updateParam('rate', toFraction(percent))} />
            </Stepper>
          </Field>
        ) : market && (
          <div className="ui-field">
            <span className="ui-field-label">기대 수익률 (CAGR)</span>
            <output className="ui-input flex items-center justify-between gap-2" aria-label="과거 데이터 기대 수익률">
              <span className="text-fine-print text-apple-ink-muted-48">{localParams.annualRateOverride === undefined ? '과거 데이터 자동 적용' : '저장한 수익률 적용'}</span>
              <span className="shrink-0">약 {formatPercent(localParams.annualRateOverride ?? market.cagr)}</span>
            </output>
            <dl className="grid grid-cols-3 gap-2 px-1 text-fine-print" aria-label="과거 데이터 요약">
              <div><dt className="text-apple-ink-muted-48">과거 CAGR</dt><dd className="mt-1 font-semibold tabular-nums text-apple-ink">{formatPercent(market.cagr)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">변동성</dt><dd className="mt-1 font-semibold tabular-nums text-apple-ink">{formatPercent(market.volatility)}</dd></div>
              <div><dt className="text-apple-ink-muted-48">최대낙폭</dt><dd className="mt-1 font-semibold tabular-nums text-apple-ink">{formatDrawdown(market.maxDrawdown)}</dd></div>
            </dl>
            {market.crises.length > 0 && (
              <fieldset className="mt-2 px-1">
                <legend className="text-fine-print text-apple-ink-muted-48">계산에 넣을 폭락 구간</legend>
                {market.crises.map((crisis) => (
                  <label key={crisis.id} className="flex min-h-control cursor-pointer items-center gap-2 text-caption text-apple-ink">
                    <input type="checkbox" checked={!(localParams.excludedCrises ?? []).includes(crisis.id)}
                      onChange={(event) => setCrisisIncluded(crisis.id, event.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-apple-hairline text-apple-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2" />
                    <span className="min-w-0 flex-1">{crisis.label}</span>
                    <span className="shrink-0 text-fine-print tabular-nums text-apple-ink-muted-48">
                      {formatMonth(crisis.peakDate)}–{formatMonth(crisis.troughDate)} · {formatDrawdown(crisis.drawdown)}
                    </span>
                  </label>
                ))}
                {market.excludedCrises.length > 0 && (
                  <p className="ui-field-hint">뺀 구간은 고점 다음 날부터 바닥까지를 지우고 앞뒤를 이어 붙여 다시 계산합니다. 같은 폭락이 다시 오면 결과보다 나빠집니다.</p>
                )}
              </fieldset>
            )}
            <p className="ui-field-hint">
              {formatMonth(market.startDate)}~{formatMonth(market.endDate)} 배당 포함 실제 데이터
              {market.rebuiltUntil ? ` (${formatMonth(market.rebuiltUntil)} 이전은 QQQ 일간 수익률 ×${localParams.assetType === 'QLD' ? 2 : 3}로 재구성)` : ''}.
              범위는 이 기간의 1년 구간을 무작위로 이어 붙여 만들어, 폭락과 회복을 그대로 담습니다.
            </p>
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
        {isValueAveraging && <p className="ui-field-hint">매월 목표 자산에 부족한 금액만 매수합니다. 월간 목표 증가액은 기본 입력에서 조정합니다.</p>}
        <Field htmlFor="exchange-rate-input" label="기준 환율 (KRW/USD)" hint="원화·달러 전환 및 시나리오 비교에 적용합니다.">
          <DecimalInput value={localExchangeRate} onChange={(rate) => setLocalExchangeRate(Math.max(1, rate))} />
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
          <DecimalInput allowNegative value={toPercent(localParams.inflationRate)} onChange={(percent) => updateParam('inflationRate', toFraction(percent))} />
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
