import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import Disclosure from '../common/Disclosure';
import { HISTORICAL_ASSET_IDS, type HistoricalAssetType, type LeverageFamilyId } from '../../types/finance';
import { getHistoricalCoverage } from '../../data/historicalAssets';
import { LEVERAGE_FAMILIES, type LeverageFamily } from '../../data/leverageFamilies';
import Button from '../common/Button';
import { Field, Select } from '../common/Field';
import Surface from '../common/Surface';

export interface BacktestAssetSelectorProps {
  primaryAsset: HistoricalAssetType;
  comparisonAssets: HistoricalAssetType[];
  onFamilySelect: (familyId: LeverageFamilyId) => void;
  onComparisonAssetsChange: (assets: HistoricalAssetType[], primaryAsset?: HistoricalAssetType) => void;
}

const families: readonly LeverageFamily[] = Object.values(LEVERAGE_FAMILIES);
const ASSET_OPTIONS = HISTORICAL_ASSET_IDS;
const targetMultipleOf = (asset: HistoricalAssetType): 1 | 2 | 3 => families
  .flatMap((family) => family.members).find((member) => member.assetId === asset)?.targetMultiple ?? 1;
const MetricBadge = ({ multiple }: { multiple: 1 | 2 | 3 }) =>
  <span className="rounded-sm bg-apple-canvas px-1.5 py-0.5 text-micro-legal font-bold text-apple-ink">{multiple}×</span>;

export default function BacktestAssetSelector({ primaryAsset, comparisonAssets, onFamilySelect, onComparisonAssetsChange }: BacktestAssetSelectorProps) {
  const [isEditingPrimary, setIsEditingPrimary] = useState(false);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const selectedGroupRef = useRef<HTMLDivElement>(null);
  const focusAfterSelection = useRef<HistoricalAssetType | null>(null);
  const selectedAssets = useMemo(() => [primaryAsset, ...comparisonAssets], [primaryAsset, comparisonAssets]);
  const completeFamily = families.find((family) => family.members.length === selectedAssets.length
    && family.members.every((member) => selectedAssets.includes(member.assetId)));
  useLayoutEffect(() => {
    const asset = focusAfterSelection.current;
    if (asset) {
      selectedGroupRef.current?.querySelector<HTMLElement>('[data-selected-asset="' + asset + '"]')?.focus();
      focusAfterSelection.current = null;
    }
  }, [selectedAssets]);
  const replacePrimary = (asset: HistoricalAssetType) => {
    focusAfterSelection.current = asset;
    onComparisonAssetsChange(selectedAssets.includes(asset)
      ? selectedAssets.filter((selected) => selected !== asset) : comparisonAssets, asset);
    setIsEditingPrimary(false);
  };
  const toggleAsset = (asset: HistoricalAssetType) => {
    if (asset === primaryAsset) {
      if (comparisonAssets.length > 0) onComparisonAssetsChange(comparisonAssets.slice(1), comparisonAssets[0]);
    } else if (comparisonAssets.includes(asset)) {
      onComparisonAssetsChange(comparisonAssets.filter((selected) => selected !== asset));
    } else if (comparisonAssets.length < 2) {
      onComparisonAssetsChange([...comparisonAssets, asset]);
    }
  };

  return (
    <Surface role="region" aria-label="백테스트 종목 선택" className="w-full text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-apple-ink">투자 종목</h2>
        <span id="asset-selection-limit" className="text-caption text-apple-secondary">
          {selectedAssets.length} / 3개 선택
          <span className="sr-only">. 기준 종목 1개와 비교 종목 최대 2개를 고를 수 있고, 최소 1개는 유지합니다.</span>
        </span>
      </div>
      <div role="group" aria-label="선택 자산" ref={selectedGroupRef} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {selectedAssets.map((asset) => {
          const isPrimary = asset === primaryAsset;
          return <div key={asset} data-selected-asset={asset} tabIndex={-1} role="group" aria-label={`${asset} ${isPrimary ? '기준 종목' : '비교 종목'}`} className="rounded-card border border-apple-hairline bg-apple-canvas p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-primary">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold">{asset} <MetricBadge multiple={targetMultipleOf(asset)} /></span>
              <Button variant="ghost" size="icon" disabled={selectedAssets.length === 1}
                aria-label={`${asset} ${isPrimary ? '기준 자산 제거' : '비교 자산 제거'}`}
                aria-describedby={selectedAssets.length === 1 ? 'asset-selection-limit' : undefined}
                onClick={() => { focusAfterSelection.current = isPrimary ? comparisonAssets[0] : primaryAsset; toggleAsset(asset); }}><X size={16} aria-hidden="true" /></Button>
            </div>
            {isPrimary ? <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-h-control items-center gap-1 text-caption font-semibold text-apple-primary"><Check size={16} aria-hidden="true" />기준 종목</span>
              <Button ref={changeButtonRef} size="compact" aria-label={asset + ' 기준 종목 변경'}
                aria-expanded={isEditingPrimary} aria-controls={isEditingPrimary ? 'primary-asset-editor' : undefined}
                onClick={() => setIsEditingPrimary((open) => !open)}>변경</Button>
            </div>
              : <Button variant="ghost" size="compact" aria-label={`${asset} 기준으로 설정`}
                  onClick={() => { focusAfterSelection.current = asset; onComparisonAssetsChange(selectedAssets.filter((selected) => selected !== asset), asset); }}>기준으로 설정</Button>}
          </div>;
        })}
      </div>
      {isEditingPrimary && <div id="primary-asset-editor" className="mt-4">
        <Field htmlFor="primary-asset-select" label="새 기준 종목" hint="종목을 고르면 바로 적용됩니다. 비교 종목은 유지합니다.">
          <Select autoFocus value={primaryAsset}
            onChange={(event) => replacePrimary(event.target.value as HistoricalAssetType)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsEditingPrimary(false);
                changeButtonRef.current?.focus();
              }
            }}>
            {HISTORICAL_ASSET_IDS.map((asset) => <option key={asset} value={asset}>{asset} · {getHistoricalCoverage(asset).displayName}</option>)}
          </Select>
        </Field>
      </div>}
      <Disclosure
        className="mt-4"
        icon={<Plus size={16} />}
        title="종목 추가 · 레버리지 비교"
        summary={completeFamily ? `${completeFamily.label} 레버리지 묶음 비교 중` : undefined}
      >
        <h4 className="text-caption-strong text-apple-ink">레버리지 묶음</h4>
        <p className="mt-1 text-fine-print leading-relaxed text-apple-secondary">같은 기초자산의 1×·2×·3× 상품으로 바꿔 한 번에 비교합니다. 다시 누르면 기준 종목만 남습니다.</p>
        <div role="group" aria-label="레버리지 묶음" className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-2">
          {(Object.keys(LEVERAGE_FAMILIES) as LeverageFamilyId[]).map((familyId) => {
            const family = LEVERAGE_FAMILIES[familyId];
            const selected = completeFamily?.id === familyId;
            return <Button key={familyId} variant={selected ? 'primary' : 'secondary'}
              aria-label={`${family.label} 레버리지 묶음 선택`} aria-pressed={selected}
              className="h-auto flex-col items-start rounded-card px-4 py-3 text-left"
              onClick={() => selected ? onComparisonAssetsChange([]) : onFamilySelect(familyId)}>
              <span className="flex w-full items-center justify-between gap-2">{family.label}{selected && <Check size={16} aria-hidden="true" />}</span>
              <span className="text-fine-print font-normal">{family.members.map((member) => member.assetId).join(' · ')}</span>
            </Button>;
          })}
        </div>

        <h4 className="mt-5 text-caption-strong text-apple-ink">개별 종목</h4>
        <p className="mt-1 text-fine-print leading-relaxed text-apple-secondary">다시 누르면 해제됩니다. 기준 종목을 해제하면 다음 종목이 기준이 됩니다.</p>
        <div role="group" className="mt-3 flex flex-wrap gap-2" aria-label="개별 자산 선택">
          {ASSET_OPTIONS.map((asset) => {
            const selected = selectedAssets.includes(asset);
            const limitReached = !selected && selectedAssets.length >= 3;
            const lastAsset = selected && selectedAssets.length === 1;
            return <Button key={asset} variant={selected ? 'primary' : 'secondary'} size="compact"
              aria-pressed={selected} aria-label={`${asset} 개별 자산 ${selected ? '해제' : '선택'}`}
              aria-describedby={limitReached || lastAsset ? 'asset-selection-limit' : undefined}
              disabled={limitReached || lastAsset}
              title={limitReached ? '비교 자산은 최대 3개까지 선택할 수 있습니다.' : lastAsset ? '최소 1개 종목을 유지해야 합니다.' : undefined}
              onClick={() => toggleAsset(asset)}>
              {selected && <Check size={14} aria-hidden="true" />}{asset} <MetricBadge multiple={targetMultipleOf(asset)} />
            </Button>;
          })}
        </div>
      </Disclosure>
    </Surface>

  );
}
