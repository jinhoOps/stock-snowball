// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { findPointOnOrBefore, getHistoricalData } from '../data/historicalAssets';

const backtestRun = vi.hoisted(() => vi.fn());
const scenarioState = vi.hoisted(() => ({ scenarios: [] as Record<string, unknown>[] }));
const preparePortfolioDisplayResultCalls = vi.hoisted(() => vi.fn());

vi.mock('../core/BacktestEngine', () => ({ BacktestEngine: { run: backtestRun } }));
vi.mock('../core/ValueBasis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/ValueBasis')>();
  return {
    ...actual,
    preparePortfolioDisplayResult: (
      ...args: Parameters<typeof actual.preparePortfolioDisplayResult>
    ) => {
      preparePortfolioDisplayResultCalls(...args);
      return actual.preparePortfolioDisplayResult(...args);
    },
  };
});
vi.mock('../core/ProductPerformance', async (importOriginal) => ({
  ...await importOriginal<typeof import('../core/ProductPerformance')>(),
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
vi.mock('../components/charts/SnowballChart', () => ({
  default: ({
    scenarios,
    onShowRealValueChange,
  }: {
    scenarios: Array<{ name: string; color: string; points: Array<{ value: number; contribution?: number }> }>;
    onShowRealValueChange?: (show: boolean) => void;
  }) => (
    <>
      <output data-testid="chart-scenarios">
        {scenarios.map((scenario) => {
          const last = scenario.points.at(-1);
          return `${scenario.name}:${last?.value.toFixed(6)}:${last?.contribution?.toFixed(6) ?? '-'}`;
        }).join('|')}
      </output>
      <output data-testid="chart-colors">{scenarios.map((scenario) => scenario.color).join('|')}</output>
      {onShowRealValueChange && <button onClick={() => onShowRealValueChange(true)}>legacy real toggle</button>}
    </>
  ),
}));
vi.mock('../components/sections/KPIGrid', () => ({
  default: ({
    totalAsset,
    cagr,
    cagrLabel,
  }: {
    totalAsset: number;
    cagr: number;
    cagrLabel?: string;
  }) => (
    <>
      <output data-testid="kpi-values">{totalAsset.toFixed(6)}|{cagr.toFixed(6)}</output>
      <output data-testid="kpi-rate-label">{cagrLabel}</output>
    </>
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
    goldBasisError,
  }: {
    primaryAsset: string;
    comparisonAssets: string[];
    onFamilySelect: (familyId: 'NASDAQ' | 'AMD') => void;
    results: Array<{
      status: string;
      display?: { portfolioHistory: Array<{ value: number }> };
    }>;
    onValueBasisChange: (basis: 'NOMINAL' | 'REAL' | 'GOLD') => void;
    onResultViewChange: (view: 'NORMALIZED') => void;
    valueBasis: string;
    resultView: string;
    onComparisonAssetsChange: (assets: string[]) => void;
    goldBasisError: string | null;
  }) => (
    <>
      <output data-testid="backtest-selection">
        {primaryAsset}|{comparisonAssets.join(',')}
      </output>
      <button onClick={() => onFamilySelect('NASDAQ')}>select NASDAQ family</button>
      <button onClick={() => onFamilySelect('AMD')}>select AMD family</button>
      <output data-testid="prepared-final-value">
        {results.find((result) => result.status === 'success')?.display?.portfolioHistory.at(-1)?.value}
      </output>
      <button onClick={() => onValueBasisChange('REAL')}>show real basis</button>
      <button onClick={() => onValueBasisChange('NOMINAL')}>show nominal basis</button>
      <button
        disabled={Boolean(goldBasisError)}
        title={goldBasisError ?? undefined}
        onClick={() => onValueBasisChange('GOLD')}
      >
        show gold basis
      </button>
      {goldBasisError && <p role="status">{goldBasisError}</p>}
      <button onClick={() => onResultViewChange('NORMALIZED')}>show normalized</button>
      <button onClick={() => onComparisonAssetsChange(['QLD', 'QLD', primaryAsset, 'TQQQ'])}>
        send invalid comparisons
      </button>
      <output data-testid="presentation-state">{valueBasis}|{resultView}</output>
    </>
  ),
}));

let testStorage: Storage;

const savedScenario = (overrides: Record<string, unknown> = {}) => ({
  id: 'saved-scenario',
  name: 'saved scenario',
  simulationMode: 'BACKTEST',
  backtestStartDate: '2024-01-01',
  backtestEndDate: '2025-01-01',
  principal: 100,
  annualRate: 0.08,
  years: 1,
  dailyContribution: 1,
  strategyType: 'FIXED',
  strategyBaseAmount: 0,
  contributionCycle: 'MONTHLY',
  assetType: 'SPY',
  accountType: 'ISA',
  inflationRate: 0.1,
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
  ...overrides,
});

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
  preparePortfolioDisplayResultCalls.mockReset();
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
    scenarioState.scenarios = [savedScenario({
      id: 'saved-amdl',
      name: 'saved AMDL',
      backtestStartDate: '2000-01-01',
      backtestEndDate: '2099-01-01',
      strategyBaseAmount: 10,
      assetType: 'AMDL',
      accountType: 'GENERAL',
      inflationRate: 0.02,
    })];
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

  it('uses portfolio IRR and normalized product CAGR in the headline rate card', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));

    await waitFor(() => {
      expect(screen.getByTestId('kpi-rate-label').textContent).toBe('내부수익률 (IRR)');
      expect(screen.getByTestId('kpi-values').textContent).toBe('110.000000|9.978518');
    });

    fireEvent.click(screen.getByRole('button', { name: 'show normalized' }));
    await waitFor(() => {
      expect(screen.getByTestId('kpi-rate-label').textContent).toBe('연복리 수익률 (CAGR)');
      expect(screen.getByTestId('kpi-values').textContent).toBe('110.000000|20.952745');
    });
  });

  it('keeps nominal, real, and gold values numerically aligned across active surfaces', async () => {
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
    expect(screen.getByTestId('kpi-values').textContent).toContain('110.000000|');
    expect(screen.getByTestId('chart-scenarios').textContent).toContain('기본 시나리오:110.000000:100.000000');
    expect(screen.queryByRole('button', { name: 'legacy real toggle' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'show real basis' }));
    await waitFor(() => {
      expect(screen.getByTestId('kpi-values').textContent).toBe('99.980431|-0.019529');
      expect(screen.getByTestId('chart-scenarios').textContent).toContain('기본 시나리오:99.980431:100.000000');
    });

    const gold = getHistoricalData('GOLD');
    const startGold = findPointOnOrBefore(gold, '2024-01-01')!;
    const endGold = findPointOnOrBefore(gold, '2025-01-01')!;
    const expectedGoldValue = 110 / (endGold.price / startGold.price);
    const expectedGoldPrincipal = 100;

    fireEvent.click(screen.getByRole('button', { name: 'show gold basis' }));
    await waitFor(() => {
      expect(Number(screen.getByTestId('prepared-final-value').textContent)).toBeCloseTo(expectedGoldValue, 8);
      expect(screen.getByTestId('kpi-values').textContent).toContain(`${expectedGoldValue.toFixed(6)}|`);
      expect(screen.getByTestId('chart-scenarios').textContent).toContain(
        `기본 시나리오:${expectedGoldValue.toFixed(6)}:${expectedGoldPrincipal.toFixed(6)}`,
      );
    });
  });

  it('reconciles and basis-transforms a saved ISA comparison line', async () => {
    scenarioState.scenarios = [savedScenario({ name: 'saved ISA' })];
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    await screen.findByTestId('backtest-selection');
    fireEvent.click(screen.getByRole('button', { name: 'show real basis' }));
    fireEvent.click(screen.getByRole('button', { name: '비교하기' }));

    await waitFor(() => {
      expect(screen.getByTestId('chart-scenarios').textContent).toContain('saved ISA:99.980431:100.000000');
    });
  });

  it('falls back before rendering when a selected saved overlay lacks GOLD coverage', async () => {
    scenarioState.scenarios = [savedScenario({
      id: 'pre-gold-qqq',
      name: 'pre-GOLD QQQ',
      assetType: 'QQQ',
      backtestStartDate: '1999-03-10',
      backtestEndDate: '2026-08-13',
    })];
    backtestRun.mockImplementation((params: { startDate: string }) => {
      const startsBeforeGold = params.startDate === '1999-03-10';
      return {
        history: startsBeforeGold
          ? [
            { date: '1999-03-10', value: 100, principal: 100 },
            { date: '2026-08-13', value: 110, principal: 100 },
          ]
          : [
            { date: '2024-03-18', value: 100, principal: 100 },
            { date: '2026-08-13', value: 110, principal: 100 },
          ],
        metrics: {
          totalReturn: 0.1, cagr: 0.1, irr: 0.1, mdd: 0, volatility: 0,
          finalValue: 110, totalPrincipal: 100, finalAnnualDividend: 0,
          estimatedTax: 0, totalFees: 0,
        },
      };
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    fireEvent.click(await screen.findByRole('button', { name: 'select AMD family' }));
    await waitFor(() => expect(screen.getByTestId('backtest-selection').textContent).toBe('AMD|AMDL'));

    fireEvent.click(screen.getByRole('button', { name: 'show gold basis' }));
    await waitFor(() => expect(screen.getByTestId('presentation-state').textContent).toBe('GOLD|PORTFOLIO'));

    fireEvent.click(screen.getByRole('button', { name: '비교하기' }));

    await waitFor(() => {
      expect(screen.getByTestId('presentation-state').textContent).toBe('NOMINAL|PORTFOLIO');
      expect((screen.getByRole('button', { name: 'show gold basis' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText(/저장된 시나리오.*pre-GOLD QQQ/).textContent).toContain('pre-GOLD QQQ');
      expect(screen.getByTestId('chart-scenarios').textContent).toContain('pre-GOLD QQQ:110.000000:100.000000');
    });
    expect(preparePortfolioDisplayResultCalls.mock.calls).not.toContainEqual([
      expect.objectContaining({
        history: expect.arrayContaining([expect.objectContaining({ date: '1999-03-10' })]),
      }),
      'GOLD',
      expect.anything(),
    ]);

    fireEvent.click(screen.getByRole('button', { name: '비교 중' }));
    await waitFor(() => {
      expect(screen.queryByText(/저장된 시나리오.*pre-GOLD QQQ/)).toBeNull();
      expect((screen.getByRole('button', { name: 'show gold basis' }) as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('keeps active and saved comparison lines out of the legacy orange/green palette', async () => {
    scenarioState.scenarios = [savedScenario({ name: 'saved comparison' })];
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'open backtest' }));
    fireEvent.click(await screen.findByRole('button', { name: '비교하기' }));

    await waitFor(() => {
      expect(screen.getByTestId('chart-colors').textContent).toBe('#0066cc|#1d1d1f');
    });
    expect(screen.getByTestId('chart-colors').textContent).not.toMatch(/#FF9500|#34C759/i);
  });
});
