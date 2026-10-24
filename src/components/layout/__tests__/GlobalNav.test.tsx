// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalNav from '../GlobalNav';

afterEach(cleanup);

describe('GlobalNav', () => {
  it('switches mode and currency and opens settings from the header', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const onCurrencyChange = vi.fn();
    const onOpenAdvanced = vi.fn();
    render(<GlobalNav mode="PROJECTION" onModeChange={onModeChange} currency="KRW" onCurrencyChange={onCurrencyChange} onOpenAdvanced={onOpenAdvanced} />);

    const modes = within(screen.getByRole('group', { name: '계산 모드' }));
    expect(modes.getByRole('button', { name: '스노우볼 모드' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(modes.getByRole('button', { name: '과거 백테스트 모드' }));
    await user.click(within(screen.getByRole('group', { name: '표시 통화' })).getByRole('button', { name: 'USD' }));
    await user.click(screen.getByRole('button', { name: '고급 설정 열기' }));

    expect(onModeChange).toHaveBeenCalledWith('BACKTEST');
    expect(onCurrencyChange).toHaveBeenCalledWith('USD');
    expect(onOpenAdvanced).toHaveBeenCalledTimes(1);
  });
});
