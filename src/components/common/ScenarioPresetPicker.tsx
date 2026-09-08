import { parseDate } from '@internationalized/date';
import React, { useId, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { HistoricalCoverage } from '../../data/historicalAssets';
import Button from './Button';
import { usePrefersReducedMotion } from '../../lib/animation/usePrefersReducedMotion';

export interface PresetScenario {
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  label?: string;
  isDuration?: boolean;
  disabled?: boolean;
  reason?: string;
}

export const getDurationPresets = (coverage: HistoricalCoverage): PresetScenario[] => {
  const today = parseDate(coverage.endDate);
  const formatDate = (date: ReturnType<typeof parseDate>) => date.toString();
  const ytdStart = today.set({ month: 1, day: 1 });
  const subMonths = (date: ReturnType<typeof parseDate>, months: number) => date.subtract({ months });
  const subYears = (date: ReturnType<typeof parseDate>, years: number) => date.subtract({ years });

  return [
    { name: "YTD", startDate: formatDate(ytdStart), endDate: coverage.endDate, description: "올해 초부터 현재까지", isDuration: true },
    { name: "1M", startDate: formatDate(subMonths(today, 1)), endDate: coverage.endDate, description: "최근 1개월", isDuration: true },
    { name: "6M", startDate: formatDate(subMonths(today, 6)), endDate: coverage.endDate, description: "최근 6개월", isDuration: true },
    { name: "1Y", startDate: formatDate(subYears(today, 1)), endDate: coverage.endDate, description: "최근 1년", isDuration: true },
    { name: "5Y", startDate: formatDate(subYears(today, 5)), endDate: coverage.endDate, description: "최근 5년", isDuration: true },
    { name: "10Y", startDate: formatDate(subYears(today, 10)), endDate: coverage.endDate, description: "최근 10년", isDuration: true },
  ];
};

export const HISTORICAL_SCENARIOS: PresetScenario[] = [
  { name: 'Dot-com Crash', label: '닷컴 버블 붕괴', startDate: '2000-03-24', endDate: '2002-10-09', description: '기술주 거품 붕괴에 따른 하락 구간' },
  { name: 'Financial Crisis', label: '리먼 금융위기', startDate: '2007-10-09', endDate: '2009-03-09', description: '리먼 사태를 포함한 글로벌 금융위기 하락 구간' },
  { name: 'European Debt Crisis', label: '2011 유럽 재정위기', startDate: '2011-07-22', endDate: '2011-11-25', description: '유럽 재정 불안과 미국 신용등급 강등이 겹친 구간' },
  { name: 'China Slowdown', label: '2015 중국발 충격', startDate: '2015-05-20', endDate: '2015-09-23', description: '중국 증시 급락과 위안화 절하에 따른 시장 불안' },
  { name: '2018 Tightening', label: '2018 긴축·무역갈등', startDate: '2018-10-01', endDate: '2018-12-31', description: '금리 인상과 무역갈등이 겹친 4분기 · 연말 반등 포함' },
  { name: 'COVID-19', label: '코로나 급락', startDate: '2020-02-19', endDate: '2020-03-23', description: '팬데믹 초기 급락 구간 · 이후 반등은 제외' },
  { name: '2022 Bear Market', label: '2022 금리 인상', startDate: '2022-01-03', endDate: '2022-10-12', description: '인플레이션과 금리 인상기의 하락 구간' },
  { name: '2023 Banking Crisis', label: '2023 미국 은행 위기', startDate: '2023-03-06', endDate: '2023-03-24', description: 'SVB·시그니처 은행 파산 전후 3주 관찰 구간' },
  { name: 'April 2025', label: '2025 관세 충격', startDate: '2025-04-02', endDate: '2025-04-08', description: '상호 관세 발표 직후의 단기 충격 구간' },
  { name: 'GFC Recovery', label: '금융위기 이후 장기 구간', startDate: '2009-03-10', endDate: '2024-01-01', description: '회복과 이후 위기를 함께 포함한 장기 비교 구간' },
];

export const isPresetSupported = (preset: PresetScenario, coverage: HistoricalCoverage): boolean =>
  preset.startDate >= coverage.startDate &&
  preset.endDate <= coverage.endDate &&
  preset.startDate <= preset.endDate;

export const getPresetScenarios = (coverage: HistoricalCoverage): PresetScenario[] => [
  ...getDurationPresets(coverage),
  ...HISTORICAL_SCENARIOS,
];

export interface ScenarioPresetPickerProps {
  onSelect: (preset: PresetScenario) => void;
  coverage: HistoricalCoverage;
  activePresetName?: string;
  quickPresets?: PresetScenario[];
  familyPresets?: readonly PresetScenario[];
}

const ScenarioPresetPicker: React.FC<ScenarioPresetPickerProps> = ({
  onSelect,
  coverage,
  activePresetName,
  familyPresets,
  quickPresets,
}) => {
  const panelId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);
  const isFamilySelection = familyPresets !== undefined;
  const durationPresets = useMemo(
    () => familyPresets ?? getDurationPresets(coverage),
    [coverage, familyPresets],
  );
  
  // Basic scenarios to show when not expanded (YTD, 1Y, 5Y)
  const basicScenarios = useMemo(() =>
    isFamilySelection
      ? durationPresets
      : quickPresets ?? durationPresets.filter(p => ["YTD", "1Y", "5Y"].includes(p.name)),
    [durationPresets, isFamilySelection, quickPresets],
  );
  const familyDisabledReason = (familyPresets ?? quickPresets)?.find((preset) => preset.disabled)?.reason;
  const familyDisabledReasonId = familyDisabledReason
    ? 'family-preset-disabled-reason'
    : undefined;

  return (
    <div role="group" aria-label="기간 프리셋" className="flex flex-col gap-3 w-full mt-1">
      <div className="flex flex-wrap gap-2 items-center">
        {basicScenarios.map((preset) => (
          <ScenarioButton 
            key={preset.name}
            preset={preset}
            isActive={activePresetName === preset.name}
            disabled={preset.disabled ?? !isPresetSupported(preset, coverage)}
            disabledReasonId={familyDisabledReasonId}
            onClick={() => onSelect(preset)}
          />
        ))}
        
        {!isFamilySelection && <Button
          variant="secondary"
          size="compact"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? panelId : undefined}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '추가 기간 접기' : '추가 기간'}
          <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>}
      </div>

      {quickPresets && <p className="text-fine-print leading-relaxed text-apple-secondary">최근 기간 기준: {coverage.endDate} (마지막 데이터)</p>}
      {familyDisabledReason && (
        <p
          id={familyDisabledReasonId}
          className="px-1 text-left text-fine-print leading-relaxed text-apple-ink-muted-64"
        >
          {familyDisabledReason}
        </p>
      )}

      <AnimatePresence>
        {!isFamilySelection && isExpanded && (
          <motion.div
            id={panelId}
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
            className="ui-surface ui-surface-compact flex flex-col gap-4 overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              <span className="text-micro-legal font-bold text-apple-ink-muted-48 ml-1 tracking-widest uppercase">간편 기간 설정</span>
              <div className="flex flex-wrap gap-2">
                {durationPresets.filter(p => quickPresets ? ["YTD", "1M", "6M"].includes(p.name) : !["YTD", "1Y", "5Y"].includes(p.name)).map((preset) => (
                  <ScenarioButton 
                    key={preset.name}
                    preset={preset}
                    isActive={activePresetName === preset.name}
                    disabled={preset.disabled ?? !isPresetSupported(preset, coverage)}
                    onClick={() => onSelect(preset)}
                  />
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ScenarioButton = ({ 
  preset, 
  isActive, 
  disabled,
  disabledReasonId,
  onClick 
}: { 
  preset: PresetScenario; 
  isActive: boolean; 
  disabled: boolean;
  disabledReasonId?: string;
  onClick: () => void;
}) => (
  <Button
    variant={isActive ? 'primary' : 'secondary'}
    size="compact"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={isActive}
    aria-describedby={disabled ? disabledReasonId : undefined}
    title={preset.description}
  >
    {preset.name}
  </Button>
);

export default ScenarioPresetPicker;
