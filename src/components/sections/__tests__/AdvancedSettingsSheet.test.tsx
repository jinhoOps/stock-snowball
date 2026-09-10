// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { DEFAULT_BACKTEST_PARAMS, DEFAULT_PROJECTION_PARAMS, type SimulationMode, type SimulationParams } from '../../../types/finance';
import AdvancedSettingsSheet from '../AdvancedSettingsSheet';

afterEach(cleanup);

function SettingsHarness({ mode = 'PROJECTION', initialParams = DEFAULT_PROJECTION_PARAMS }: { mode?: SimulationMode; initialParams?: SimulationParams } = {}) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<SimulationParams>({ ...initialParams });
  const [rate, setRate] = useState(1450);
  return <>
    <button onClick={() => setOpen(true)}>설정 열기</button>
    <output aria-label="적용된 납입 주기">{params.cycle}</output>
    <AdvancedSettingsSheet mode={mode} isOpen={open} onClose={() => setOpen(false)} params={params}
      onUpdate={(next) => setParams((previous) => ({ ...previous, ...next }))}
      exchangeRate={rate} setExchangeRate={setRate} onReset={() => undefined} />
  </>;
}

it('discards draft selections on cancel and updates them only when applied', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness />);
  const opener = screen.getByRole('button', { name: '설정 열기' });
  await user.click(opener);
  const cycle = () => within(screen.getByRole('group', { name: '납입 주기' }));
  await user.click(cycle().getByRole('button', { name: '월' }));
  expect(screen.getByLabelText('적용된 납입 주기').textContent).toBe('DAILY');
  await user.click(screen.getByRole('button', { name: '취소' }));
  expect(document.activeElement).toBe(opener);
  await user.click(opener);
  expect(cycle().getByRole('button', { name: '일' }).getAttribute('aria-pressed')).toBe('true');
  await user.click(cycle().getByRole('button', { name: '월' }));
  await user.click(screen.getByRole('button', { name: '설정 적용' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByLabelText('적용된 납입 주기').textContent).toBe('MONTHLY');
});

it('offers only settings that affect a historical backtest', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness mode="BACKTEST" initialParams={DEFAULT_BACKTEST_PARAMS} />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  expect(screen.queryByRole('option', { name: '사용자 정의 (고정 수익률)' })).toBeNull();
  expect(screen.queryByText('기대 수익률 (CAGR)')).toBeNull();
  expect(screen.queryByLabelText('투자 전략')).toBeNull();
  expect(screen.getByLabelText('투자 자산')).toBeTruthy();
});

it('describes value averaging as a monthly target and applies a monthly cycle', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  await user.selectOptions(screen.getByLabelText('투자 전략'), 'VALUE_AVERAGING');
  expect(screen.queryByRole('group', { name: '납입 주기' })).toBeNull();
  expect(screen.getByText(/매월 목표 자산에 부족한 금액만 매수/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: '설정 적용' }));
  expect(screen.getByLabelText('적용된 납입 주기').textContent).toBe('MONTHLY');
});

it('displays the saved reference rate used by the projection', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness initialParams={{ ...DEFAULT_PROJECTION_PARAMS, assetType: 'SPY', annualRateOverride: 0.123 }} />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  expect(screen.getByLabelText('과거 데이터 기대 수익률').textContent).toContain('12.3%');
});
