// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DecimalInput, formatDecimal } from '../DecimalInput';

afterEach(cleanup);

function Controlled({ initial, onValue, allowNegative }: { initial: number; onValue?: (value: number) => void; allowNegative?: boolean }) {
  const [value, setValue] = useState(initial);
  return <>
    <DecimalInput aria-label="수익률" allowNegative={allowNegative} value={value} onChange={(next) => { setValue(next); onValue?.(next); }} />
    <output aria-label="값">{value}</output>
  </>;
}

describe('DecimalInput', () => {
  it('hides floating-point tails', () => {
    expect(formatDecimal(0.07 * 100, 2)).toBe('7');
    expect(formatDecimal(0.029 * 100, 2)).toBe('2.9');
    render(<Controlled initial={0.07 * 100} />);
    expect((screen.getByRole('textbox', { name: '수익률' }) as HTMLInputElement).value).toBe('7');
  });

  it('can be cleared and retyped without turning into 0', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={8} />);
    const input = screen.getByRole('textbox', { name: '수익률' }) as HTMLInputElement;
    await user.clear(input);
    expect(input.value).toBe('');
    expect(screen.getByLabelText('값').textContent).toBe('8');
    await user.type(input, '6.5');
    expect(input.value).toBe('6.5');
    expect(screen.getByLabelText('값').textContent).toBe('6.5');
  });

  it('keeps a trailing point while typing and shows the last value after leaving empty', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={8} />);
    const input = screen.getByRole('textbox', { name: '수익률' }) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '7.');
    expect(input.value).toBe('7.');
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe('7');
  });

  it('allows a minus sign only when asked, and limits decimals', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Controlled initial={0} allowNegative onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: '수익률' }) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '-1.2345');
    expect(input.value).toBe('-1.23');
    expect(onValue).toHaveBeenLastCalledWith(-1.23);
    cleanup();

    render(<Controlled initial={3} />);
    const positive = screen.getByRole('textbox', { name: '수익률' }) as HTMLInputElement;
    await user.clear(positive);
    await user.type(positive, '-2');
    expect(positive.value).toBe('2');
  });
});
