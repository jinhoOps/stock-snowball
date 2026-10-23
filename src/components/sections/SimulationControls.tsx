import React from 'react';
import { HistoricalAssetType, SimulationMode, SimulationParams } from '../../types/finance';
import Button from '../common/Button';
import { Field } from '../common/Field';
import HistoricalScenarioPicker from '../common/HistoricalScenarioPicker';
import DateRangeControl from '../common/DateRangeControl';
import SegmentedControl from '../common/SegmentedControl';
import Surface from '../common/Surface';
import Notice from '../common/Notice';
import { BigNumberHelper } from '../common/BigNumberHelper';
import { NumericInput } from '../common/NumericInput';
import ScenarioPresetPicker, { getPresetScenarios } from '../common/ScenarioPresetPicker';
import { getHistoricalCoverage } from '../../data/historicalAssets';
import { getCommonCoverage, getFamilyDurationPresets, LEVERAGE_FAMILIES } from '../../data/leverageFamilies';

interface SimulationControlsProps {
  mode: SimulationMode;
  params: SimulationParams;
  onUpdate: (p: Partial<SimulationParams>) => void;
  currency: 'KRW' | 'USD';
  exchangeRate: number;
  selectedAssets: HistoricalAssetType[];
  rangeNotice?: string | null;
  backtestAssetSelection?: React.ReactNode;
}

const SimulationControls: React.FC<SimulationControlsProps> = (props) => {
  const isValueAveraging = props.mode === 'PROJECTION' && props.params.strategyType === 'VALUE_AVERAGING';
  const contributionInput = isValueAveraging ? props.params.strategyTargetGrowth ?? props.params.contribution : props.params.contribution;
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
  const quickPresets = getFamilyDurationPresets(commonCoverage);
  const selectablePresets = [...(familyPresets ?? quickPresets), ...presetScenarios];

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    props.onUpdate({ [key]: value });
  };

  const investmentFields = (<>
    <Field label={`초기 자산 (${props.currency})`} htmlFor="principal-input"
      hint={<BigNumberHelper value={props.params.principal} currency={props.currency} exchangeRate={props.exchangeRate} showDual={false} />}>
      <NumericInput value={props.params.principal} onChange={(value) => updateParam('principal', value)} />
    </Field>

    <Field label={`${isValueAveraging ? '월간 목표 증가액' : '납입액'} (${props.currency})`} htmlFor="monthly-investment-input"
      hint={<BigNumberHelper value={contributionInput} currency={props.currency} exchangeRate={props.exchangeRate} showDual={false} showExchangeRate />}>
      <NumericInput value={contributionInput} onChange={(value) => props.onUpdate({ contribution: value,
        ...(isValueAveraging ? { strategyTargetGrowth: value } : {}),
      })} />
    </Field>

    {isValueAveraging ? <p className="ui-field-hint self-center">매월 목표 자산에 부족한 금액만 매수합니다.</p> : <div className="ui-field">
      <span className="ui-field-label">납입 주기</span>
      <SegmentedControl label="납입 주기" value={props.params.cycle} fullWidth size="compact"
        options={[{ value: 'DAILY', label: '일' }, { value: 'WEEKLY', label: '주' }, { value: 'MONTHLY', label: '월' }]}
        onChange={(cycle) => updateParam('cycle', cycle)} />
    </div>}
  </>);

  const projectionPeriod = (
    <div className="ui-field">
      <label htmlFor="years-range" className="ui-field-label">투자 기간 (년)</label>
      <div className="flex h-field min-w-0 items-center gap-3">
        <div className="flex h-field min-w-0 flex-1 items-center rounded-pill border border-apple-hairline bg-apple-canvas px-4">
          <input id="years-range" type="range" min="1" max={props.params.cycle === 'DAILY' ? 30 : 50}
            value={props.params.years} onChange={(event) => updateParam('years', Number(event.target.value))}
            aria-label="투자 기간 조절" className="h-11 w-full cursor-pointer accent-apple-primary" />
        </div>
        <NumericInput id="years-number" aria-label="투자 기간 직접 입력" value={props.params.years}
          onChange={(value) => updateParam('years', value)}
          className="w-20 shrink-0 text-center" />
      </div>
    </div>
  );

  const backtestPeriod = (
    <fieldset className="min-w-0 md:col-span-2">
      <legend className="ui-field-label mb-2">백테스트 기간</legend>
      <div className="flex flex-col gap-4">
        <DateRangeControl startDate={startDate} endDate={endDate}
          minDate={historicalCoverage.startDate} maxDate={historicalCoverage.endDate}
          errorId={historicalRangeError ? 'backtest-range-error' : undefined}
          onChange={(range) => props.onUpdate(range)} />
        {historicalRangeError && (
          <Notice tone="error" id="backtest-range-error">
            <p>{historicalRangeError}</p>
            <Button size="compact" onClick={() => props.onUpdate({ startDate: historicalCoverage.startDate, endDate: historicalCoverage.endDate })} className="mt-3">
              가능한 전체 기간 적용
            </Button>
          </Notice>
        )}
        {props.rangeNotice && <Notice>{props.rangeNotice}</Notice>}
        <ScenarioPresetPicker coverage={historicalCoverage}
          onSelect={(preset) => props.onUpdate({ startDate: preset.startDate, endDate: preset.endDate })}
          activePresetName={selectablePresets.find((preset) => preset.startDate === props.params.startDate && preset.endDate === props.params.endDate)?.name}
          familyPresets={familyPresets} quickPresets={quickPresets} />
      </div>
    </fieldset>
  );

  if (props.mode === 'BACKTEST') {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4">
        {props.backtestAssetSelection}
        <Surface className="w-full text-left">
          <div className="flex flex-col gap-6">
            {backtestPeriod}
            <HistoricalScenarioPicker coverage={historicalCoverage}
              startDate={startDate} endDate={endDate}
              onSelect={(preset) => props.onUpdate({ startDate: preset.startDate, endDate: preset.endDate })} />
            <div className="border-t border-apple-hairline pt-6">
              <h3 className="mb-4 text-body font-semibold text-apple-ink">투자 조건</h3>
              <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-1">{investmentFields}</div>
            </div>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <Surface className="w-full text-left">
      <div className="grid items-start gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-4">
        {investmentFields}
        {projectionPeriod}
      </div>
    </Surface>
  );
};

export default SimulationControls;
