import { ChevronDown } from 'lucide-react';
import type { HistoricalAssetType, SimulationParams } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';
import Button from '../common/Button';
import Surface from '../common/Surface';
import { CYCLE_LABEL } from '../../lib/format/cycleLabel';

interface BacktestConditionsSummaryProps {
  params: SimulationParams;
  selectedAssets: HistoricalAssetType[];
  currency: 'KRW' | 'USD';
  /** Whether the full condition editor is open. */
  expanded: boolean;
  onToggle: () => void;
  controlsId: string;
}

/** Compact view of the applied conditions; the full editor opens from here on small screens. */
export default function BacktestConditionsSummary({ params, selectedAssets, currency, expanded, onToggle, controlsId }: BacktestConditionsSummaryProps) {
  const format = (value: number) => SnowballEngine.formatBigNumber(value, currency);
  return <Surface role="region" aria-label="백테스트 적용 조건" padding="compact" className="w-full text-left">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-caption-strong text-apple-ink">적용 조건</h2>
      <Button size="compact" aria-expanded={expanded} aria-controls={controlsId} onClick={onToggle} className="shrink-0">
        {expanded ? '접기' : '조건 편집'}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
      </Button>
    </div>
    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-caption">
      <dt className="text-apple-ink-muted-48">종목</dt>
      <dd className="min-w-0 text-apple-ink"><strong>{selectedAssets[0]}</strong> 기준{selectedAssets.length > 1 && ' · ' + selectedAssets.slice(1).join(', ') + ' 비교'}</dd>
      <dt className="text-apple-ink-muted-48">기간</dt>
      <dd className="whitespace-nowrap tabular-nums text-apple-ink">{params.startDate} ~ {params.endDate}</dd>
      <dt className="text-apple-ink-muted-48">투자</dt>
      <dd className="text-apple-ink">초기 {format(params.principal)}{params.contribution > 0
        ? ' + ' + CYCLE_LABEL[params.cycle] + ' ' + format(params.contribution)
        : ' · 추가 납입 없음'}</dd>
    </dl>
  </Surface>;
}
