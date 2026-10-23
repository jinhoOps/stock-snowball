// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SegmentedControl from '../SegmentedControl';

afterEach(cleanup);

const options = [{ value: 'a', label: '가' }, { value: 'b', label: '나' }] as const;

it('keeps the selected button painted itself until the sliding pill can be measured', () => {
  const onChange = vi.fn();
  render(<SegmentedControl label="보기" value="a" options={options} onChange={onChange} />);
  const group = screen.getByRole('group', { name: '보기' });
  // jsdom has no layout, so the pill stays off and the pressed button keeps its own background.
  expect(group.hasAttribute('data-indicator')).toBe(false);
  expect(group.querySelector('.ui-segment-indicator')?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByRole('button', { name: '가' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '나' }));
  expect(onChange).toHaveBeenCalledWith('b');
});
