import React from 'react';
import { Snowflake, Settings } from 'lucide-react';
import Button from '../common/Button';
import SegmentedControl from '../common/SegmentedControl';
import type { SimulationMode } from '../../types/finance';

interface GlobalNavProps {
  mode: SimulationMode;
  onModeChange: (mode: SimulationMode) => void;
  currency: 'KRW' | 'USD';
  onCurrencyChange: (currency: 'KRW' | 'USD') => void;
  onOpenAdvanced?: () => void;
}

/** Tool header: mode, currency and settings are always one tap away. */
const GlobalNav: React.FC<GlobalNavProps> = ({ mode, onModeChange, currency, onCurrencyChange, onOpenAdvanced }) => {
  return (
    <nav aria-label="주요 설정" className="fixed inset-x-0 top-0 z-nav h-nav border-b border-apple-hairline/70 bg-apple-surface-pearl/80 backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-analysis items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <a
          href={import.meta.env.BASE_URL}
          aria-label="Stock Snowball 홈"
          className="hidden min-h-control shrink-0 items-center gap-2 rounded-pill pr-2 transition-opacity hover:opacity-80 motion-reduce:transition-none sm:flex"
        >
          <Snowflake size={20} className="text-apple-primary" aria-hidden="true" />
          <span className="font-display text-body-strong tracking-tight text-apple-ink">Stock Snowball</span>
        </a>

        <div className="flex min-w-0 flex-1 sm:justify-center">
          <SegmentedControl
            label="계산 모드"
            value={mode}
            onChange={onModeChange}
            size="compact"
            options={[
              { value: 'PROJECTION', label: '스노우볼', ariaLabel: '스노우볼 모드' },
              { value: 'BACKTEST', label: '백테스트', ariaLabel: '과거 백테스트 모드' },
            ]}
          />
        </div>

        <SegmentedControl
          label="표시 통화"
          value={currency}
          onChange={onCurrencyChange}
          size="compact"
          options={[{ value: 'KRW', label: 'KRW' }, { value: 'USD', label: 'USD' }]}
        />

        <Button size="icon" variant="ghost" onClick={onOpenAdvanced} aria-label="고급 설정 열기">
          <Settings size={20} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
};

export default GlobalNav;
