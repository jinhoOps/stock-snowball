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
  isDuration?: boolean;
  disabled?: boolean;
  reason?: string;
}

export const getDurationPresets = (coverage: HistoricalCoverage): PresetScenario[] => {
  const today = new Date(coverage.endDate);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const ytdStart = new Date(today.getFullYear(), 0, 1);
  
  const subMonths = (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() - months);
    return d;
  };
  
  const subYears = (date: Date, years: number) => {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() - years);
    return d;
  };

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
  {
    name: "Dot-com Crash",
    startDate: "2000-03-24",
    endDate: "2002-10-09",
    description: "기술주 거품 붕괴의 정점"
  },
  {
    name: "Financial Crisis",
    startDate: "2007-10-09",
    endDate: "2009-03-09",
    description: "리먼 브라더스 사태 포함 최악의 금융 위기"
  },
  {
    name: "COVID-19",
    startDate: "2020-02-19",
    endDate: "2020-03-23",
    description: "역사상 가장 빠른 하락 및 V자 반등"
  },
  {
    name: "GFC Recovery",
    startDate: "2009-03-10",
    endDate: "2024-01-01",
    description: "역사상 가장 긴 강세장의 시작점"
  },
  {
    name: "April 2025 (Projected)",
    startDate: "2025-04-02",
    endDate: "2026-12-31",
    description: "관세 충격 및 스태그플레이션 우려 시점"
  }
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
  familyPresets?: readonly PresetScenario[];
}

const ScenarioPresetPicker: React.FC<ScenarioPresetPickerProps> = ({
  onSelect,
  coverage,
  activePresetName,
  familyPresets,
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
      : durationPresets.filter(p => ["YTD", "1Y", "5Y"].includes(p.name)),
    [durationPresets, isFamilySelection],
  );
  const familyDisabledReason = isFamilySelection
    ? durationPresets.find((preset) => preset.disabled)?.reason
    : undefined;
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
          {isExpanded ? '시나리오 접기' : '더 많은 시나리오'}
          <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>}
      </div>

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
                {durationPresets.filter(p => !["YTD", "1Y", "5Y"].includes(p.name)).map((preset) => (
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

            <div className="flex flex-col gap-2">
              <span className="text-micro-legal font-bold text-apple-ink-muted-48 ml-1 tracking-widest uppercase">역사적 시나리오</span>
              <div className="flex flex-wrap gap-2">
                {HISTORICAL_SCENARIOS.map((preset) => (
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
