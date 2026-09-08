// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import DateRangeControl from '../DateRangeControl';

afterEach(cleanup);
const base = { startDate: '2010-01-01', endDate: '2024-01-01', minDate: '2000-01-01', maxDate: '2026-09-02' };

it('keeps partially edited dates local and commits the complete range once', async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<DateRangeControl {...base} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: '백테스트 기간 변경' }));
  await screen.findByLabelText('백테스트 시작일');
  const dialog = within(screen.getByRole('dialog', { name: '백테스트 기간 선택' }));
  const start = dialog.getByLabelText('백테스트 시작일');
  await user.clear(start);
  await user.type(start, '2025-03-01');
  expect(onChange).not.toHaveBeenCalled();
  expect(dialog.getByRole('button', { name: '기간 적용' }).hasAttribute('disabled')).toBe(true);
  const end = dialog.getByLabelText('백테스트 종료일');
  await user.clear(end);
  await user.type(end, '2026-03-01');
  await user.click(dialog.getByRole('button', { name: '기간 적용' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith({ startDate: '2025-03-01', endDate: '2026-03-01' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('discards edits on Escape and restores the opener and original dates', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DateRangeControl {...base} onChange={onChange} />);
  const opener = screen.getByRole('button', { name: '백테스트 기간 변경' });
  await user.click(opener);
  await screen.findByLabelText('백테스트 시작일');
  await user.clear(screen.getByLabelText('백테스트 시작일'));
  await user.keyboard('{Escape}');
  expect(onChange).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(opener);
  await user.click(opener);
  await screen.findByLabelText('백테스트 시작일');
  expect((screen.getByLabelText('백테스트 시작일') as HTMLInputElement).value).toBe(base.startDate);
});

it.each(['2025-02-29', '1999-12-31', '2026-09-03'])('blocks invalid or unsupported date %s', async (date) => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DateRangeControl {...base} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: '백테스트 기간 변경' }));
  await screen.findByLabelText('백테스트 시작일');
  const input = screen.getByLabelText('백테스트 종료일');
  await user.clear(input);
  await user.type(input, date);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: '기간 적용' }).hasAttribute('disabled')).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
});

it('includes the final supported year even when coverage starts later in the year', async () => {
  const user = userEvent.setup();
  render(<DateRangeControl {...base} startDate="2026-01-01" minDate="2011-10-20" onChange={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '백테스트 기간 변경' }));
  const year = await screen.findByLabelText('달력 연도');
  expect(within(year).getByRole('option', { name: '2026년' })).toBeTruthy();
  expect((year as HTMLSelectElement).value).toBe('2026');
});
