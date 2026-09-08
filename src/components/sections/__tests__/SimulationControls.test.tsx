// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SimulationControls from '../SimulationControls';
import { getHistoricalCoverage } from '../../../data/historicalAssets';

afterEach(cleanup);

describe('SimulationControls', () => {
  const baseProjectionProps = {
    mode: 'PROJECTION' as const,
    setMode: () => undefined,
    params: {
      principal: 10_000_000,
      contribution: 30_000,
      cycle: 'DAILY' as const,
      assetType: 'QQQ' as const,
      years: 10,
      rate: 0.08,
      accountType: 'GENERAL' as const,
      inflationRate: 0.02,
      strategyType: 'FIXED' as const,
      strategyIncreaseRate: 0.05,
      startDate: '2010-01-01',
      endDate: '2024-01-01',
    },
    onUpdate: () => undefined,
    currency: 'KRW' as const,
    setCurrency: () => undefined,
    exchangeRate: 1450,
    onOpenAdvanced: () => undefined,
    selectedAssets: ['QQQ' as const],
  };

  it('exposes named single-choice controls and sends the selected values', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const setMode = vi.fn();
    const setCurrency = vi.fn();
    render(<SimulationControls {...baseProjectionProps} onUpdate={onUpdate} setMode={setMode} setCurrency={setCurrency} />);

    await user.click(within(screen.getByRole('group', { name: '계산 모드' })).getByRole('button', { name: '과거 백테스트 모드' }));
    await user.click(within(screen.getByRole('group', { name: '표시 통화' })).getByRole('button', { name: 'USD' }));
    const cycle = within(screen.getByRole('group', { name: '납입 주기' }));
    expect(cycle.getByRole('button', { name: '일' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(cycle.getByRole('button', { name: '월' }));

    expect(setMode).toHaveBeenCalledWith('BACKTEST');
    expect(setCurrency).toHaveBeenCalledWith('USD');
    expect(onUpdate).toHaveBeenCalledWith({ cycle: 'MONTHLY' });
    expect(screen.getByLabelText('초기 자산 (KRW)').getAttribute('aria-describedby')).toBeTruthy();
  });

  it('renders family duration presets for an exact selected leverage family', () => {
    const markup = renderToStaticMarkup(React.createElement(SimulationControls, {
      mode: 'BACKTEST',
      setMode: () => undefined,
      params: {
        principal: 10_000_000,
        contribution: 30_000,
        cycle: 'DAILY',
        assetType: 'QQQ',
        years: 10,
        rate: 0.08,
        accountType: 'GENERAL',
        inflationRate: 0.02,
        strategyType: 'FIXED',
        strategyIncreaseRate: 0.05,
        startDate: '2010-01-01',
        endDate: '2024-01-01',
      },
      onUpdate: () => undefined,
      currency: 'KRW',
      setCurrency: () => undefined,
      exchangeRate: 1450,
      onOpenAdvanced: () => undefined,
      selectedAssets: ['QQQ', 'QLD', 'TQQQ'],
    }));

    expect(markup).toContain('1년');
    expect(markup).toContain('3년');
    expect(markup).toContain('5년');
    expect(markup).toContain('10년');
    expect(markup).toContain('전체');
    expect(markup).not.toContain('YTD');
  });

  it('lets the existing parent normalization handle a cleared duration', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<SimulationControls {...baseProjectionProps} onUpdate={onUpdate} />);
    await user.clear(screen.getByRole('textbox', { name: '투자 기간 직접 입력' }));
    await user.tab();
    expect(onUpdate).toHaveBeenLastCalledWith({ years: 0 });
  });

  it('explains an unavailable period and applies full common coverage only after confirmation', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const coverage = getHistoricalCoverage('AMDL');

    render(<SimulationControls {...baseProjectionProps}
      mode="BACKTEST"
      params={{
        ...baseProjectionProps.params,
        assetType: 'AMDL',
        startDate: '2010-01-01',
        endDate: '2011-01-01',
      }}
      selectedAssets={['AMDL']}
      rangeNotice="종목은 변경했지만 기존 기간은 유지했습니다."
      onUpdate={onUpdate}
    />);

    expect(screen.getByRole('alert').textContent).toContain('공통 데이터');
    expect(screen.getByRole('status').textContent).toContain('기존 기간은 유지');
    expect(screen.getByRole('button', { name: '백테스트 기간 변경' }).getAttribute('aria-describedby')).toBe('backtest-range-error');

    await user.click(screen.getByRole('button', { name: '가능한 전체 기간 적용' }));

    expect(onUpdate).toHaveBeenCalledWith({
      startDate: coverage.startDate,
      endDate: coverage.endDate,
    });
  });
});
