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
    <output aria-label="적용된 계좌 유형">{params.accountType}</output>
    <output aria-label="적용된 수익률">{params.rate}</output>
    <output aria-label="적용된 물가상승률">{params.inflationRate}</output>
    <output aria-label="적용된 환율">{rate}</output>
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
  const account = () => within(screen.getByRole('group', { name: '계좌 유형 선택' }));
  await user.click(account().getByRole('button', { name: 'ISA 절세 계좌 선택' }));
  expect(screen.getByLabelText('적용된 계좌 유형').textContent).toBe('GENERAL');
  await user.click(screen.getByRole('button', { name: '취소' }));
  expect(document.activeElement).toBe(opener);
  await user.click(opener);
  expect(account().getByRole('button', { name: '일반 계좌 선택' }).getAttribute('aria-pressed')).toBe('true');
  await user.click(account().getByRole('button', { name: 'ISA 절세 계좌 선택' }));
  await user.click(screen.getByRole('button', { name: '설정 적용' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByLabelText('적용된 계좌 유형').textContent).toBe('ISA');
});

it('leaves the contribution cycle to the main inputs', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  expect(screen.queryByRole('group', { name: '납입 주기' })).toBeNull();
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

it('references only the projection assets and shows their past growth, swings, and worst fall', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness initialParams={{ ...DEFAULT_PROJECTION_PARAMS, assetType: 'TQQQ' }} />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  const options = within(screen.getByLabelText('참조 자산')).getAllByRole('option').map((option) => (option as HTMLOptionElement).value);
  expect(options).toEqual(['CUSTOM', 'QQQ', 'QLD', 'TQQQ', 'SPY', 'KOSPI', 'SCHD', 'GOLD']);
  const summary = within(screen.getByLabelText('과거 데이터 요약'));
  expect(summary.getByText('과거 CAGR')).toBeTruthy();
  expect(summary.getByText('변동성')).toBeTruthy();
  expect(summary.getByText('최대낙폭')).toBeTruthy();
  expect(screen.getByText(/2010\.02 이전은 QQQ 일간 수익률 ×3로 재구성/)).toBeTruthy();
});

it('keeps every asset for a backtest', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness mode="BACKTEST" initialParams={DEFAULT_BACKTEST_PARAMS} />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  expect(within(screen.getByLabelText('투자 자산')).getAllByRole('option')).toHaveLength(14);
});

it('edits a custom rate without float tails, by typing or by 0.5%p steps', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness initialParams={{ ...DEFAULT_PROJECTION_PARAMS, assetType: 'CUSTOM', rate: 0.07 }} />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  const rate = screen.getByLabelText('기대 수익률 (%)') as HTMLInputElement;
  expect(rate.value).toBe('7');

  await user.click(screen.getByRole('button', { name: '기대 수익률 0.5%p 높이기' }));
  expect(rate.value).toBe('7.5');
  await user.clear(rate);
  expect(rate.value).toBe('');
  await user.type(rate, '9.25');
  await user.click(screen.getByRole('button', { name: '기대 수익률 0.5%p 낮추기' }));
  expect(rate.value).toBe('9');
  await user.click(screen.getByRole('button', { name: '설정 적용' }));
  expect(screen.getByLabelText('적용된 수익률').textContent).toBe('0.09');
});

it('lets inflation and exchange rate fields be cleared and retyped', async () => {
  const user = userEvent.setup();
  render(<SettingsHarness />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  const inflation = screen.getByLabelText('물가상승률 (%)') as HTMLInputElement;
  expect(inflation.value).toBe('3.25');
  await user.clear(inflation);
  await user.type(inflation, '2.9');
  expect(inflation.value).toBe('2.9');

  const exchange = screen.getByLabelText('기준 환율 (KRW/USD)') as HTMLInputElement;
  await user.clear(exchange);
  expect(exchange.value).toBe('');
  await user.type(exchange, '1380.5');
  await user.click(screen.getByRole('button', { name: '설정 적용' }));
  expect(screen.getByLabelText('적용된 물가상승률').textContent).toBe('0.029');
  expect(screen.getByLabelText('적용된 환율').textContent).toBe('1380.5');
});
