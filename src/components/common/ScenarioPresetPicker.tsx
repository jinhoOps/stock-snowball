import React from 'react';
import { motion } from 'framer-motion';

export interface PresetScenario {
  name: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
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

interface ScenarioPresetPickerProps {
  onSelect: (preset: PresetScenario) => void;
  activePresetName?: string;
}

const ScenarioPresetPicker: React.FC<ScenarioPresetPickerProps> = ({ onSelect, activePresetName }) => {
  return (
    <div className="flex flex-wrap gap-2 w-full mt-4">
      {PRESET_SCENARIOS.map((preset) => (
        <motion.button
          key={preset.name}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(preset)}
          title={preset.description}
          className={`px-4 py-2 rounded-pill text-[12px] font-bold border transition-all shadow-sm ${
            activePresetName === preset.name
              ? 'bg-apple-primary text-white border-apple-primary'
              : 'bg-white text-apple-ink border-apple-hairline hover:bg-apple-canvas-parchment'
          }`}
        >
          {preset.name}
        </motion.button>
      ))}
    </div>
  );
};

export default ScenarioPresetPicker;
