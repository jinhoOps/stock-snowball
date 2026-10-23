// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumericInput } from '../NumericInput';

afterEach(cleanup);

function Controlled({ initial, onValue }: { initial: number; onValue?: (value: number) => void }) {
  const [value, setValue] = useState(initial);
  return <NumericInput aria-label="금액" value={value} onChange={(next) => { setValue(next); onValue?.(next); }} />;
}

describe('NumericInput', () => {
  it('shows thousands separators and reports the plain number', async () => {
    const onValue = vi.fn();
    render(<Controlled initial={0} onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: '금액' }) as HTMLInputElement;
    expect(input.value).toBe('0');

    await userEvent.type(input, '10000000');
    expect(input.value).toBe('10,000,000');
    expect(onValue).toHaveBeenLastCalledWith(10_000_000);
  });

  it('keeps the caret next to the digit being edited in the middle', async () => {
    render(<Controlled initial={1000} />);
    const input = screen.getByRole('textbox', { name: '금액' }) as HTMLInputElement;
    expect(input.value).toBe('1,000');

    // Caret after "1": typing "2" gives 12,000 with the caret still right after "2".
    input.focus();
    input.setSelectionRange(1, 1);
    await userEvent.keyboard('2');
    expect(input.value).toBe('12,000');
    expect(input.selectionStart).toBe(2);
  });

  it('deletes the digit in front of a separator on backspace', async () => {
    const onValue = vi.fn();
    render(<Controlled initial={1000} onValue={onValue} />);
    const input = screen.getByRole('textbox', { name: '금액' }) as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2, 2); // right after the comma in "1,000"
    await userEvent.keyboard('{Backspace}');
    expect(input.value).toBe('0');
    expect(onValue).toHaveBeenLastCalledWith(0);
  });
});
