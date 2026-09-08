import { useId } from 'react';
import type { HistoricalCoverage } from '../../data/historicalAssets';
import Button from './Button';
import { HISTORICAL_SCENARIOS, isPresetSupported, type PresetScenario } from './ScenarioPresetPicker';

export default function HistoricalScenarioPicker({ coverage, startDate, endDate, onSelect }: {
  coverage: HistoricalCoverage;
  startDate: string;
  endDate: string;
  onSelect: (preset: PresetScenario) => void;
}) {
  const id = useId();
  return <section aria-labelledby={`${id}-title`} className="mt-6 border-t border-apple-hairline pt-6">
    <h3 id={`${id}-title`} className="text-body font-semibold text-apple-ink">경제 위기 시나리오</h3>
    <p className="mt-2 text-caption text-apple-secondary">닷컴버블 이후 주요 경제 사건을 현재 자산과 납입 조건으로 비교하세요.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {HISTORICAL_SCENARIOS.filter((preset) => preset.name !== 'GFC Recovery').map((preset, index) => {
        const supported = isPresetSupported(preset, coverage);
        const active = startDate === preset.startDate && endDate === preset.endDate;
        const descriptionId = `${id}-${index}`;
        return <div key={preset.name} className="rounded-card border border-apple-hairline p-4">
          <Button variant={active ? 'primary' : 'secondary'} className="w-full" disabled={!supported}
            aria-label={`${preset.label} 기간 적용`} aria-pressed={active} aria-describedby={descriptionId}
            onClick={() => onSelect(preset)}>{preset.label}</Button>
          <div id={descriptionId} className="mt-3 text-fine-print leading-relaxed text-apple-secondary">
            <p className="tabular-nums">{preset.startDate} ~ {preset.endDate}</p>
            <p className="mt-1">{preset.description}</p>
            {!supported && <p className="mt-2">데이터 부족 · 공통 데이터 {coverage.startDate} ~ {coverage.endDate}로는 이 구간 전체를 계산할 수 없습니다.</p>}
          </div>
        </div>;
      })}
    </div>
    <details className="mt-4 text-caption text-apple-secondary">
      <summary className="flex min-h-control cursor-pointer items-center underline underline-offset-4">회복 이후 장기 구간도 비교하기</summary>
      {HISTORICAL_SCENARIOS.filter((preset) => preset.name === 'GFC Recovery').map((preset) =>
        <div key={preset.name} className="mt-2">
          <Button disabled={!isPresetSupported(preset, coverage)}
            aria-pressed={startDate === preset.startDate && endDate === preset.endDate}
            aria-describedby={`${id}-recovery`} onClick={() => onSelect(preset)}>{preset.label}</Button>
          <p id={`${id}-recovery`} className="mt-2 text-fine-print">{preset.startDate} ~ {preset.endDate} · {preset.description}
            {!isPresetSupported(preset, coverage) && ` · 데이터 부족: 공통 데이터 ${coverage.startDate} ~ ${coverage.endDate}`}</p>
        </div>)}
    </details>
    <p className="mt-3 text-fine-print leading-relaxed text-apple-secondary">대표 시장 사건의 관찰 구간이며, 종목별 고점·저점과 다를 수 있습니다. 날짜를 변경해 전후 회복 구간도 살펴볼 수 있습니다.</p>
  </section>;
}
