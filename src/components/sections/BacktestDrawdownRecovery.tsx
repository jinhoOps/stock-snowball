import type { MaxDrawdownRecovery } from '../../core/ProductPerformance';
import type { HistoricalAssetType, ValueBasis } from '../../types/finance';

interface RecoveryAsset {
  assetId: HistoricalAssetType;
  recovery: MaxDrawdownRecovery;
}

interface BacktestDrawdownRecoveryProps {
  assets: readonly RecoveryAsset[];
  valueBasis: ValueBasis;
}

const basisLabel: Record<ValueBasis, string> = {
  NOMINAL: '명목', REAL: '실질', GOLD: '금',
};

const BacktestDrawdownRecovery = ({ assets, valueBasis }: BacktestDrawdownRecoveryProps) => (
  <section className="w-full max-w-analysis text-left" aria-label="전고점 회복 기간">
    <h3 className="font-display text-body-strong text-apple-ink">전고점 회복까지 걸린 시간</h3>
    <p className="mt-1 text-fine-print leading-relaxed text-apple-ink-muted-48">
      선택 기간의 최대낙폭을 만든 전고점에서 다시 그 값에 도달할 때까지의 달력 일수입니다.
      {' '}{basisLabel[valueBasis]} 기준 · 배당 재투자 포함 · 납입액 영향 제외. 최저점 대비 회복률과는 다른 지표입니다.
    </p>
    <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map(({ assetId, recovery }) => (
        <li key={assetId}>
          <div className="ui-surface ui-surface-compact h-full" role="group" aria-label={`${assetId} 회복 기간`}>
          <p className="font-display text-caption-strong text-apple-ink">{assetId}</p>
          {recovery.status === 'recovered' ? <>
            <p className="mt-1 font-display text-body-strong text-apple-ink">회복 · {recovery.calendarDays}일</p>
            <p className="mt-2 text-fine-print text-apple-ink-muted-64">전고점 → 최저점 → 회복일</p>
            <p className="text-fine-print text-apple-ink-muted-80">{recovery.peakDate} → {recovery.troughDate} → {recovery.recoveryDate}</p>
          </> : recovery.status === 'unrecovered' ? <>
            <p className="mt-1 font-display text-body-strong text-apple-ink">미회복 · {recovery.calendarDays}일 경과</p>
            <p className="mt-2 text-fine-print text-apple-ink-muted-64">전고점 → 최저점 → 마지막 관측일</p>
            <p className="text-fine-print text-apple-ink-muted-80">{recovery.peakDate} → {recovery.troughDate} → {recovery.lastDate}</p>
          </> : <p className="mt-1 font-display text-body-strong text-apple-ink">
            {recovery.status === 'no-drawdown' ? '낙폭 없음' : '데이터 부족'}
          </p>}
          </div>
        </li>
      ))}
    </ul>
  </section>
);

export default BacktestDrawdownRecovery;
