// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import Sheet from '../Sheet';
import Tooltip from '../Tooltip';

afterEach(cleanup);

it('reveals a linked explanation on keyboard focus and dismisses it when focus leaves', async () => {
  const user = userEvent.setup();
  render(<><Tooltip content="입력 금액에 대한 설명" /><button>다음 입력</button></>);

  await user.tab();
  const trigger = screen.getByRole('button', { name: '정보 보기' });
  const tooltip = screen.getByRole('tooltip');
  expect(document.activeElement).toBe(trigger);
  expect(tooltip.textContent).toBe('입력 금액에 대한 설명');
  expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);

  await user.tab();
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  expect(trigger.hasAttribute('aria-describedby')).toBe(false);
});

it('keeps the explanation open on the first pointer click and toggles on subsequent clicks', async () => {
  const user = userEvent.setup();
  render(<Tooltip content="첫 클릭으로 읽을 수 있는 설명" />);
  const trigger = screen.getByRole('button', { name: '정보 보기' });

  await user.click(trigger);
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip.textContent).toBe('첫 클릭으로 읽을 수 있는 설명');
  expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  await user.click(trigger);
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  await user.click(trigger);
  expect(screen.getByRole('tooltip')).toBeTruthy();
});

function SheetWithTooltip() {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>설정 열기</button>
    <Sheet open={open} onClose={() => setOpen(false)} title="설정">
      <Tooltip content="설정 도움말" />
    </Sheet>
  </>;
}

it('uses the first Escape to dismiss the tooltip and lets the next Escape close its sheet', async () => {
  const user = userEvent.setup();
  render(<SheetWithTooltip />);
  const opener = screen.getByRole('button', { name: '설정 열기' });
  await user.click(opener);
  await user.tab();
  const trigger = screen.getByRole('button', { name: '정보 보기' });
  expect(screen.getByRole('tooltip')).toBeTruthy();

  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  expect(screen.getByRole('dialog', { name: '설정' })).toBeTruthy();
  expect(document.activeElement).toBe(trigger);
  expect(trigger.hasAttribute('aria-describedby')).toBe(false);

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
});

it('dismisses hover help with Escape even when keyboard focus remains elsewhere in the sheet', async () => {
  const user = userEvent.setup();
  render(<SheetWithTooltip />);
  await user.click(screen.getByRole('button', { name: '설정 열기' }));
  const closeButton = screen.getByRole('button', { name: '설정 닫기' });
  await user.hover(screen.getByRole('button', { name: '정보 보기' }));
  expect(screen.getByRole('tooltip')).toBeTruthy();
  expect(document.activeElement).toBe(closeButton);

  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  expect(screen.getByRole('dialog', { name: '설정' })).toBeTruthy();
  expect(document.activeElement).toBe(closeButton);
});

it('adds the focus explanation to a custom trigger without losing its existing description or click action', async () => {
  const user = userEvent.setup();
  function Example() {
    const [count, setCount] = useState(0);
    return <>
      <p id="existing-description">기존 설명</p>
      <Tooltip content="추가 설명">
        <button aria-describedby="existing-description" onClick={() => setCount(count + 1)}>직접 만든 버튼</button>
      </Tooltip>
      <output aria-label="실행 횟수">{count}</output>
    </>;
  }
  render(<Example />);
  await user.tab();
  const trigger = screen.getByRole('button', { name: '직접 만든 버튼' });
  const tooltip = screen.getByRole('tooltip');
  expect(trigger.getAttribute('aria-describedby')?.split(' ')).toEqual(['existing-description', tooltip.id]);
  await user.click(trigger);
  expect(screen.getByLabelText('실행 횟수').textContent).toBe('1');
  expect(screen.getByRole('tooltip')).toBeTruthy();
});
