// @vitest-environment jsdom

import { StrictMode, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Sheet from '../Sheet';

function SettingsExample({ closeResult = 'Closed' }: { closeResult?: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('');

  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <output aria-label="Close result">{result}</output>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setResult(closeResult);
        }}
        title="Settings"
        footer={<button>Save settings</button>}
      >
        <label>
          Amount
          <input defaultValue="10" />
        </label>
        <button disabled>Unavailable setting</button>
        <button hidden>Hidden setting</button>
      </Sheet>
    </>
  );
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  document.body.style.removeProperty('overflow');
});

describe('Sheet', () => {
  it('opens a labelled portal dialog and returns focus after its close button is used', async () => {
    const user = userEvent.setup();
    const { container } = render(<SettingsExample />);
    const opener = screen.getByRole('button', { name: 'Open settings' });

    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    const closeButton = screen.getByRole('button', { name: 'Settings 닫기' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes with Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<SettingsExample />);
    const opener = screen.getByRole('button', { name: 'Open settings' });

    await user.click(opener);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Close result').textContent).toBe('Closed');
    expect(document.activeElement).toBe(opener);
  });

  it('wraps Tab and Shift+Tab inside the dialog while skipping unavailable controls', async () => {
    const user = userEvent.setup();
    render(<SettingsExample />);
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    const closeButton = screen.getByRole('button', { name: 'Settings 닫기' });
    const saveButton = screen.getByRole('button', { name: 'Save settings' });

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(saveButton);
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Amount' }));
    await user.tab();
    expect(document.activeElement).toBe(saveButton);
  });

  it('keeps focus in a sheet with no interactive content', async () => {
    const user = userEvent.setup();
    render(<Sheet open title="Information" onClose={() => undefined}>Read this information.</Sheet>);
    const closeButton = screen.getByRole('button', { name: 'Information 닫기' });

    await user.tab();
    expect(document.activeElement).toBe(closeButton);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(closeButton);
  });

  it('contains focus when another part of the page tries to take it', async () => {
    const user = userEvent.setup();
    render(<SettingsExample />);
    const opener = screen.getByRole('button', { name: 'Open settings' });
    await user.click(opener);

    opener.focus();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Settings 닫기' }));
  });

  it('uses the latest close callback without restarting focus on a parent rerender', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SettingsExample />);
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    const input = screen.getByRole('textbox', { name: 'Amount' });
    await user.click(input);

    rerender(<SettingsExample closeResult="Updated callback" />);

    expect(document.activeElement).toBe(input);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Close result').textContent).toBe('Updated callback');
  });

  it('locks scrolling only while open and restores the previous overflow value and priority', async () => {
    const user = userEvent.setup();
    document.body.style.setProperty('overflow', 'scroll', 'important');
    render(<SettingsExample />);
    expect(document.body.style.overflow).toBe('scroll');

    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');

    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.getPropertyPriority('overflow')).toBe('important');
  });

  it('restores existing inert states without changing nested background elements', async () => {
    const user = userEvent.setup();
    const preexistingBackground = document.createElement('aside');
    preexistingBackground.setAttribute('inert', 'preserve-me');
    const nestedBackground = document.createElement('div');
    nestedBackground.setAttribute('inert', 'nested-state');
    preexistingBackground.append(nestedBackground);
    document.body.append(preexistingBackground);
    const { container } = render(<SettingsExample />);

    await user.click(screen.getByRole('button', { name: 'Open settings' }));

    expect(container.hasAttribute('inert')).toBe(true);
    expect(preexistingBackground.hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('dialog').closest('[inert]')).toBeNull();
    await user.keyboard('{Escape}');

    expect(container.hasAttribute('inert')).toBe(false);
    expect(preexistingBackground.getAttribute('inert')).toBe('preserve-me');
    expect(nestedBackground.getAttribute('inert')).toBe('nested-state');
  });

  it('restores the page and opener after an open sheet unmounts in StrictMode', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Original opener';
    document.body.append(opener);
    opener.focus();
    document.body.style.overflow = 'auto';
    const { container, unmount } = render(
      <StrictMode>
        <Sheet open title="Settings" onClose={() => undefined}>Settings content</Sheet>
      </StrictMode>,
    );

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Settings 닫기' }));
    expect(document.body.style.overflow).toBe('hidden');
    expect(container.hasAttribute('inert')).toBe(true);

    unmount();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('auto');
    expect(container.hasAttribute('inert')).toBe(false);
    expect(opener.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('does not change the page when an initially closed sheet mounts or unmounts', () => {
    document.body.style.overflow = 'clip';
    const { container, unmount } = render(
      <Sheet open={false} title="Settings" onClose={() => undefined}>Settings content</Sheet>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('clip');
    expect(container.hasAttribute('inert')).toBe(false);
    unmount();
    expect(document.body.style.overflow).toBe('clip');
    expect(container.hasAttribute('inert')).toBe(false);
  });
});
