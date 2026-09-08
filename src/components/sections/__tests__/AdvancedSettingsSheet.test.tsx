// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { DEFAULT_PROJECTION_PARAMS, type SimulationParams } from '../../../types/finance';
import AdvancedSettingsSheet from '../AdvancedSettingsSheet';

afterEach(cleanup);

function SettingsHarness() {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<SimulationParams>({ ...DEFAULT_PROJECTION_PARAMS, cycle: 'DAILY' });
  const [rate, setRate] = useState(1450);
  return <>
    <button onClick={() => setOpen(true)}>설정 열기</button>
    <output aria-label="적용된 납입 주기">{params.cycle}</output>
    <AdvancedSettingsSheet isOpen={open} onClose={() => setOpen(false)} params={params}
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
