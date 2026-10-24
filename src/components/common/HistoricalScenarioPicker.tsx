import { useId } from 'react';
import clsx from 'clsx';
import type { HistoricalCoverage } from '../../data/historicalAssets';
import Disclosure from './Disclosure';
import { HISTORICAL_SCENARIOS, isPresetSupported, type PresetScenario } from './ScenarioPresetPicker';

/** One crisis window as a single selectable card (no nested buttons). */
function CrisisCard({ preset, coverage, active, onSelect, descriptionId }: {
  preset: PresetScenario;
  coverage: HistoricalCoverage;
  active: boolean;
  onSelect: () => void;
  descriptionId: string;
}) {
  const supported = isPresetSupported(preset, coverage);
  return (
    <button
      type="button"
      disabled={!supported}
      aria-label={`${preset.label} 기간 적용`}
      aria-pressed={active}
      aria-describedby={descriptionId}
      onClick={onSelect}
      className={clsx(
        'flex min-h-control w-full flex-col items-start rounded-card border p-4 text-left transition-[color,background-color,border-color,transform] duration-150 enabled:active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'border-apple-primary bg-apple-primary text-apple-on-primary'
          : 'border-apple-hairline bg-apple-surface-white text-apple-ink enabled:hover:border-apple-primary/40',
      )}
    >
      <span className="text-caption-strong">{preset.label}</span>
      <span id={descriptionId} className={clsx('mt-2 text-fine-print leading-relaxed', active ? 'text-apple-on-primary/90' : 'text-apple-secondary')}>
        <span className="block tabular-nums">{preset.startDate} ~ {preset.endDate}</span>
        <span className="mt-1 block">{preset.description}</span>
        {!supported && <span className="mt-2 block">데이터 부족 · 공통 데이터 {coverage.startDate} ~ {coverage.endDate}로는 이 구간 전체를 계산할 수 없습니다.</span>}
      </span>
    </button>
  );
}

export default function HistoricalScenarioPicker({ coverage, startDate, endDate, onSelect }: {
  coverage: HistoricalCoverage;
  startDate: string;
  endDate: string;
  onSelect: (preset: PresetScenario) => void;
}) {
  const id = useId();
  const active = HISTORICAL_SCENARIOS.find((preset) => preset.startDate === startDate && preset.endDate === endDate);
  const crises = HISTORICAL_SCENARIOS.filter((preset) => preset.name !== 'GFC Recovery');
  const recovery = HISTORICAL_SCENARIOS.filter((preset) => preset.name === 'GFC Recovery');
  return (
    <Disclosure
      title="경제 위기 시나리오"
      summary={active ? `선택한 구간: ${active.label} · ${startDate} ~ ${endDate}` : undefined}
    >
      <p className="text-caption text-apple-secondary">닷컴버블 이후 주요 경제 사건을 현재 자산과 납입 조건으로 비교하세요.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {crises.map((preset, index) => (
          <CrisisCard key={preset.name} preset={preset} coverage={coverage} descriptionId={`${id}-${index}`}
            active={startDate === preset.startDate && endDate === preset.endDate} onSelect={() => onSelect(preset)} />
        ))}
      </div>
      <Disclosure className="mt-4" headingLevel="h4" title="회복 이후 장기 구간도 비교하기">
        <div className="grid gap-3">
          {recovery.map((preset) => (
            <CrisisCard key={preset.name} preset={preset} coverage={coverage} descriptionId={`${id}-recovery`}
              active={startDate === preset.startDate && endDate === preset.endDate} onSelect={() => onSelect(preset)} />
          ))}
        </div>
      </Disclosure>
      <p className="mt-3 text-fine-print leading-relaxed text-apple-secondary">대표 시장 사건의 관찰 구간이며, 종목별 고점·저점과 다를 수 있습니다.</p>
    </Disclosure>
  );
}
