import type { HistoricalAssetType, SimulationParams } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';
import Surface from '../common/Surface';

interface BacktestConditionsSummaryProps {
  params: SimulationParams;
  selectedAssets: HistoricalAssetType[];
  currency: 'KRW' | 'USD';
}

const CYCLE_LABEL = { DAILY: '매일', WEEKLY: '매주', MONTHLY: '매월' } as const;

export default function BacktestConditionsSummary({ params, selectedAssets, currency }: BacktestConditionsSummaryProps) {
  const format = (value: number) => SnowballEngine.formatBigNumber(value, currency);
  return <Surface role="region" aria-label="백테스트 적용 조건" padding="compact" className="mb-6 w-full max-w-content text-left">
    <h2 className="text-caption-strong text-apple-ink">적용 조건</h2>
    <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-caption text-apple-ink">
      <span><strong>{selectedAssets[0]}</strong> 기준{selectedAssets.length > 1 && ' · ' + selectedAssets.slice(1).join(', ') + ' 비교'}</span>
      <span className="tabular-nums">{params.startDate} ~ {params.endDate}</span>
      <span>초기 {format(params.principal)}{params.contribution > 0
        ? ' + ' + CYCLE_LABEL[params.cycle] + ' ' + format(params.contribution)
        : ' · 추가 납입 없음'}</span>
    </p>
    <p className="mt-2 text-fine-print text-apple-secondary">조건을 변경하면 결과에 자동 반영됩니다.</p>
  </Surface>;
}
