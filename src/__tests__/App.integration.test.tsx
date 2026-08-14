// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const backtestRun = vi.hoisted(() => vi.fn());
const scenarioState = vi.hoisted(() => ({ scenarios: [] as Record<string, unknown>[] }));

vi.mock('../core/BacktestEngine', () => ({ BacktestEngine: { run: backtestRun } }));
vi.mock('../core/ProductPerformance', () => ({
  calculateProductPerformance: vi.fn(() => ({
    points: [{ date: '2024-01-01', value: 100 }, { date: '2025-01-01', value: 121 }],
    metrics: { cumulativeReturn: 0.21, cagr: 0.21, mdd: 0, volatility: 0 },
  })),
}));

vi.mock('../hooks/useScenarios', () => ({
  useScenarios: () => ({
    scenarios: scenarioState.scenarios,
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
vi.mock('../components/sections/KPIGrid', () => ({
  default: ({ totalAsset, cagr }: { totalAsset: number; cagr: number }) => (
    <output data-testid="kpi-values">{totalAsset.toFixed(6)}|{cagr.toFixed(6)}</output>
  ),
}));
vi.mock('../components/common/ShareCard', () => ({ default: () => null }));
vi.mock('../components/sections/SimulationControls', () => ({
  default: ({
    setMode,
    params,
  }: {
    setMode: (mode: 'BACKTEST') => void;
    params: { startDate?: string; endDate?: string };
  }) => (
    <>
      <button onClick={() => setMode('BACKTEST')}>open backtest</button>
      <output data-testid="control-dates">{params.startDate}|{params.endDate}</output>
    </>
  ),
}));
vi.mock('../components/sections/AdvancedSettingsSheet', () => ({
  default: ({
    onReset,
    params,
    onUpdate,
  }: {
    onReset: () => void;
    params: { assetType: string };
    onUpdate: (params: { assetType: string }) => void;
  }) => (
    <>
      <output data-testid="settings-asset">{params.assetType}</output>
      <button onClick={onReset}>reset settings</button>
      <button onClick={() => onUpdate({ assetType: 'AMDL' })}>change primary to AMDL</button>
    </>
  ),
}));
vi.mock('../components/sections/BacktestView', () => ({
  default: ({
    primaryAsset,
    comparisonAssets,
    onFamilySelect,
    results,
    onValueBasisChange,
    onResultViewChange,
    valueBasis,
    resultView,
    onComparisonAssetsChange,
  }: {
    primaryAsset: string;
    comparisonAssets: string[];
    onFamilySelect: (familyId: 'NASDAQ') => void;
    results: Array<{ status: string; portfolio?: { history: Array<{ value: number }> } }>;
    onValueBasisChange: (basis: 'REAL') => void;
    onResultViewChange: (view: 'NORMALIZED') => void;
    valueBasis: string;
    resultView: string;
    onComparisonAssetsChange: (assets: string[]) => void;
  }) => (
    <>
      <output data-testid="backtest-selection">
        {primaryAsset}|{comparisonAssets.join(',')}
      </output>
      <button onClick={() => onFamilySelect('NASDAQ')}>select NASDAQ family</button>
      <output data-testid="prepared-final-value">
        {results.find((result) => result.status === 'success')?.portfolio?.history.at(-1)?.value}
      </output>
      <button onClick={() => onValueBasisChange('REAL')}>show real basis</button>
      <button onClick={() => onResultViewChange('NORMALIZED')}>show normalized</button>
      <button onClick={() => onComparisonAssetsChange(['QLD', 'QLD', primaryAsset, 'TQQQ'])}>
        send invalid comparisons
      </button>
      <output data-testid="presentation-state">{valueBasis}|{resultView}</output>
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
  backtestRun.mockReset();
  scenarioState.scenarios = [];
  backtestRun.mockReturnValue({
    history: [
      { date: '2024-01-01', value: 100, principal: 100 },
      { date: '2025-01-01', value: 121, principal: 100 },
    ],
    metrics: {
      totalReturn: 0.1, cagr: 0.1, irr: 0.1, mdd: 0, volatility: 0,
      finalValue: 110, totalPrincipal: 100, finalAnnualDividend: 0,
      estimatedTax: 11, totalFees: 0,
    },
  });
});

afterEach(() => {
  cleanup();
  testStorage.clear();
  vi.restoreAllMocks();
});

describe('App backtest selection', () => {
  it('mounts and rewrites a legacy QQQM projection cache as QQQ', async () => {
    testStorage.setItem('projection_params', JSON.stringify({
      principal: 100,
      contribution: 0,
      cycle: 'MONTHLY',
      assetType: 'QQQM',
      years: 1,
      rate: 0.08,
      accountType: 'GENERAL',
      inflationRate: 0.02,
      strategyType: 'FIXED',
      strategyIncreaseRate: 0.05,
    }));

    render(<App />);

    expect(screen.getByTestId('settings-asset').textContent).toBe('QQQ');
    await waitFor(() => {
      expect(JSON.parse(testStorage.getItem('projection_params')!).assetType).toBe('QQQ');
    });
  });

  it('mounts and rewrites a legacy QQQM backtest cache as QQQ', async () => {
    testStorage.setItem('backtest_params', JSON.stringify({
      principal: 100,
      contribution: 0,
      cycle: 'MONTHLY',
      assetType: 'QQQM',
      years: 1,
      rate: 0.08,
      accountType: 'GENERAL',
      inflationRate: 0.02,
      strategyType: 'FIXED',
      strategyIncreaseRate: 0.05,
      startDate: '2011-01-01',
      endDate: '2012-01-01',
    }));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));

    await waitFor(() => expect(screen.getByTestId('backtest-selection').textContent).toBe('QQQ|'));
    expect(JSON.parse(testStorage.getItem('backtest_params')!).assetType).toBe('QQQ');
  });

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

  it('clears stale family comparisons and clamps coverage after an advanced primary change', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    fireEvent.click(await screen.findByRole('button', { name: 'select NASDAQ family' }));
    await waitFor(() => expect(screen.getByTestId('backtest-selection').textContent).toBe('QQQ|QLD,TQQQ'));

    fireEvent.click(screen.getByRole('button', { name: 'change primary to AMDL' }));

    await waitFor(() => {
      expect(screen.getByTestId('backtest-selection').textContent).toBe('AMDL|');
      expect(screen.getByTestId('control-dates').textContent).toBe('2024-03-18|2026-08-13');
    });
  });

  it('normalizes comparison updates at the parent boundary', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    fireEvent.click(await screen.findByRole('button', { name: 'send invalid comparisons' }));

    await waitFor(() => {
      expect(screen.getByTestId('backtest-selection').textContent).toBe('SPY|QLD,TQQQ');
    });
  });

  it('loads a saved backtest with clamped dates and a reset comparison presentation contract', async () => {
    scenarioState.scenarios = [{
      id: 'saved-amdl',
      name: 'saved AMDL',
      simulationMode: 'BACKTEST',
      backtestStartDate: '2000-01-01',
      backtestEndDate: '2099-01-01',
      principal: 100,
      annualRate: 0.08,
      years: 1,
      dailyContribution: 1,
      strategyType: 'FIXED',
      strategyBaseAmount: 10,
      contributionCycle: 'MONTHLY',
      assetType: 'AMDL',
      accountType: 'GENERAL',
      inflationRate: 0.02,
      buyFeeRate: 0.00015,
      sellFeeRate: 0.00015,
      taxDividendRate: 0.154,
      taxCapitalGainRate: 0.22,
      taxIsaLimit: 2_000_000,
      taxIsaReducedRate: 0.095,
      currency: 'USD',
      exchangeRate: 1,
      exchangeAnnualChangeRate: 0,
      createdAt: 1,
      updatedAt: 1,
    }];
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    fireEvent.click(await screen.findByRole('button', { name: 'select NASDAQ family' }));
    fireEvent.click(screen.getByRole('button', { name: 'show real basis' }));
    fireEvent.click(screen.getByRole('button', { name: 'show normalized' }));
    await waitFor(() => expect(screen.getByTestId('presentation-state').textContent).toBe('REAL|NORMALIZED'));

    fireEvent.click(screen.getByText('saved AMDL'));

    await waitFor(() => {
      expect(screen.getByTestId('backtest-selection').textContent).toBe('AMDL|');
      expect(screen.getByTestId('control-dates').textContent).toBe('2024-03-18|2026-08-13');
      expect(screen.getByTestId('presentation-state').textContent).toBe('NOMINAL|PORTFOLIO');
    });
  });

  it('propagates the after-tax final value and basis-consistent CAGR to headline metrics', async () => {
    testStorage.setItem('backtest_params', JSON.stringify({
      principal: 100,
      contribution: 0,
      cycle: 'MONTHLY',
      assetType: 'SPY',
      years: 1,
      rate: 0.08,
      accountType: 'ISA',
      inflationRate: 0.1,
      strategyType: 'FIXED',
      strategyIncreaseRate: 0.05,
      startDate: '2024-01-01',
      endDate: '2025-01-01',
    }));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    await waitFor(() => expect(screen.getByTestId('prepared-final-value').textContent).toBe('110'));
    expect(screen.getByText('110원')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'show real basis' }));
    await waitFor(() => {
      expect(screen.getByTestId('kpi-values').textContent).toBe('99.980431|-0.019529');
    });
  });
});
