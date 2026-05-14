import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PresetScenario {
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  isDuration?: boolean;
}

// Today is 2026-05-14
const TODAY = "2026-05-14";

const getDurationPresets = (): PresetScenario[] => {
  const today = new Date(TODAY);
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
    { name: "YTD", startDate: formatDate(ytdStart), endDate: TODAY, description: "올해 초부터 현재까지", isDuration: true },
    { name: "1M", startDate: formatDate(subMonths(today, 1)), endDate: TODAY, description: "최근 1개월", isDuration: true },
    { name: "6M", startDate: formatDate(subMonths(today, 6)), endDate: TODAY, description: "최근 6개월", isDuration: true },
    { name: "1Y", startDate: formatDate(subYears(today, 1)), endDate: TODAY, description: "최근 1년", isDuration: true },
    { name: "5Y", startDate: formatDate(subYears(today, 5)), endDate: TODAY, description: "최근 5년", isDuration: true },
    { name: "10Y", startDate: formatDate(subYears(today, 10)), endDate: TODAY, description: "최근 10년", isDuration: true },
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

export const PRESET_SCENARIOS = [...getDurationPresets(), ...HISTORICAL_SCENARIOS];

interface ScenarioPresetPickerProps {
  onSelect: (preset: PresetScenario) => void;
  activePresetName?: string;
}

const ScenarioPresetPicker: React.FC<ScenarioPresetPickerProps> = ({ onSelect, activePresetName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const durationPresets = useMemo(() => getDurationPresets(), []);
  
  // Basic scenarios to show when not expanded (YTD, 1Y, 5Y)
  const basicScenarios = useMemo(() => 
    durationPresets.filter(p => ["YTD", "1Y", "5Y"].includes(p.name)), 
    [durationPresets]
  );

  return (
    <div className="flex flex-col gap-3 w-full mt-1">
      <div className="flex flex-wrap gap-2 items-center">
        {basicScenarios.map((preset) => (
          <ScenarioButton 
            key={preset.name}
            preset={preset}
            isActive={activePresetName === preset.name}
            onClick={() => onSelect(preset)}
          />
        ))}
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1.5 rounded-pill text-[11px] font-bold border border-apple-hairline bg-apple-surface-pearl text-apple-primary transition-colors hover:bg-apple-divider-soft flex items-center gap-1 shadow-sm"
        >
          {isExpanded ? '시나리오 접기' : '더 많은 시나리오'}
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>
            ↓
          </motion.span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden flex flex-col gap-4 bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-apple-hairline/50"
          >
            <div className="flex flex-col gap-2">
              <span className="text-micro-legal font-bold text-apple-ink-muted-48 ml-1 tracking-widest uppercase">간편 기간 설정</span>
              <div className="flex flex-wrap gap-2">
                {durationPresets.filter(p => !["YTD", "1Y", "5Y"].includes(p.name)).map((preset) => (
                  <ScenarioButton 
                    key={preset.name}
                    preset={preset}
                    isActive={activePresetName === preset.name}
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
  onClick 
}: { 
  preset: PresetScenario; 
  isActive: boolean; 
  onClick: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    title={preset.description}
    className={`px-4 py-2 rounded-pill text-[12px] font-bold border transition-all relative overflow-hidden ${
      isActive
        ? 'bg-apple-primary text-white border-apple-primary shadow-md scale-105 z-10'
        : 'bg-white text-apple-ink border-apple-hairline hover:bg-apple-canvas-parchment shadow-sm hover:border-apple-primary/30'
    }`}
  >
    {isActive && (
      <motion.div 
        layoutId="active-highlight"
        className="absolute inset-0 bg-white/10"
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
    <span className="relative z-10">{preset.name}</span>
  </motion.button>
);

export default ScenarioPresetPicker;
