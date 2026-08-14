// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../hooks/useScenarios', () => ({
  useScenarios: () => ({
    scenarios: [],
    addScenario: vi.fn(),
    removeScenario: vi.fn(),
    loading: false,
  }),
}));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../components/layout/GlobalNav', () => ({ default: () => null }));
vi.mock('../components/sections/ProductHero', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/charts/SnowballChart', () => ({ default: () => null }));
vi.mock('../components/sections/KPIGrid', () => ({ default: () => null }));
vi.mock('../components/common/ShareCard', () => ({ default: () => null }));
vi.mock('../components/sections/SimulationControls', () => ({
  default: ({ setMode }: { setMode: (mode: 'BACKTEST') => void }) => (
    <button onClick={() => setMode('BACKTEST')}>open backtest</button>
  ),
}));
vi.mock('../components/sections/AdvancedSettingsSheet', () => ({
  default: ({ onReset }: { onReset: () => void }) => (
    <button onClick={onReset}>reset settings</button>
  ),
}));
vi.mock('../components/sections/BacktestView', () => ({
  default: ({
    primaryAsset,
    comparisonAssets,
    onFamilySelect,
  }: {
    primaryAsset: string;
    comparisonAssets: string[];
    onFamilySelect: (familyId: 'NASDAQ') => void;
  }) => (
    <>
      <output data-testid="backtest-selection">
        {primaryAsset}|{comparisonAssets.join(',')}
      </output>
      <button onClick={() => onFamilySelect('NASDAQ')}>select NASDAQ family</button>
    </>
  ),
}));

let testStorage: Storage;

beforeEach(() => {
  const values = new Map<string, string>();
  testStorage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: testStorage,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: testStorage,
  });
});

afterEach(() => {
  testStorage.clear();
  vi.restoreAllMocks();
});

describe('App backtest selection', () => {
  it('propagates family selection and reset through parent-owned child props', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    await screen.findByTestId('backtest-selection');

    fireEvent.click(screen.getByRole('button', { name: 'select NASDAQ family' }));
    await waitFor(() => {
      expect(screen.getByTestId('backtest-selection').textContent).toBe('QQQ|QLD,TQQQ');
    });

    fireEvent.click(screen.getByRole('button', { name: 'reset settings' }));
    await waitFor(() => {
      expect(screen.getByTestId('backtest-selection').textContent).toBe('SPY|');
    });
  });
});
