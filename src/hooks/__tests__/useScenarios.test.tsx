// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScenarios } from '../useScenarios';

const database = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  insert: vi.fn(),
  patch: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('../../db/database', () => ({ getDatabase: database.getDatabase }));

const scenario = (assetType: string, simulationMode = 'BACKTEST') => ({
  id: 'scenario-1',
  name: 'legacy',
  simulationMode,
  principal: 100,
  annualRate: 0.08,
  years: 1,
  dailyContribution: 1,
  strategyType: 'FIXED',
  strategyBaseAmount: 10,
  assetType,
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
});

beforeEach(() => {
  database.insert.mockReset();
  database.patch.mockReset();
  database.subscribe.mockReset();
  database.getDatabase.mockReset();
  database.subscribe.mockImplementation(({ next }) => {
    next([{ toJSON: () => scenario('QQQM') }]);
    return { unsubscribe: vi.fn() };
  });
  database.getDatabase.mockResolvedValue({
    scenarios: {
      find: () => ({ $: { subscribe: database.subscribe } }),
      insert: database.insert,
      findOne: () => ({
        exec: async () => ({
          toJSON: () => scenario('QQQM'),
          patch: database.patch,
        }),
      }),
    },
  });
  vi.stubGlobal('crypto', { randomUUID: () => 'new-scenario' });
});

describe('scenario persistence boundaries', () => {
  it('normalizes a legacy RxDB document before exposing loaded state', async () => {
    const { result } = renderHook(() => useScenarios());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.scenarios[0].assetType).toBe('QQQ');
  });

  it('normalizes a legacy asset before an RxDB add', async () => {
    const { result } = renderHook(() => useScenarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addScenario(scenario('QQQM') as never);
    });

    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'QQQ' }));
  });

  it('normalizes an unknown asset before an RxDB update', async () => {
    const { result } = renderHook(() => useScenarios());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateScenario('scenario-1', { assetType: 'CORRUPT' } as never);
    });

    expect(database.patch).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'SPY' }));
  });
});
