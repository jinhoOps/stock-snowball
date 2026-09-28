// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { toPng } from 'html-to-image';
import { useImageExport } from '../useImageExport';

vi.mock('html-to-image', () => ({ toPng: vi.fn() }));

let downloads: string[];
beforeEach(() => {
  downloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

function setup() {
  const hook = renderHook(() => useImageExport('장기/투자'));
  hook.result.current.cardRef.current = document.createElement('div');
  return hook;
}

it('locks immediately against repeated clicks and restores the control after one PNG download', async () => {
  let finish!: (url: string) => void;
  const pending = new Promise<string>(resolve => { finish = resolve; });
  vi.mocked(toPng).mockReturnValue(pending);
  const { result } = setup();
  let saving!: Promise<void>;
  act(() => {
    saving = result.current.exportImage();
    void result.current.exportImage();
  });
  expect(result.current.isExporting).toBe(true);
  expect(downloads).toEqual([]);
  await act(async () => { finish('data:image/png;base64,test'); await saving; });
  expect(downloads).toHaveLength(1);
  expect(downloads[0]).toMatch(/^stock-snowball-장기_투자-\d+\.png$/);
  expect(result.current.isExporting).toBe(false);
  expect(result.current.error).toBeNull();
});

it('reports a failure without downloading and allows a successful retry', async () => {
  vi.mocked(toPng).mockRejectedValueOnce(new Error('canvas unavailable')).mockResolvedValueOnce('data:image/png;base64,test');
  const { result } = setup();
  await act(() => result.current.exportImage());
  expect(result.current.error).toContain('다시 시도');
  expect(result.current.isExporting).toBe(false);
  expect(downloads).toEqual([]);
  await act(() => result.current.exportImage());
  expect(result.current.error).toBeNull();
  expect(downloads).toHaveLength(1);
});

it('does not trigger a late download after the export owner unmounts', async () => {
  let finish!: (url: string) => void;
  vi.mocked(toPng).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result, unmount } = setup();
  let saving!: Promise<void>;
  act(() => { saving = result.current.exportImage(); });
  unmount();
  await act(async () => { finish('data:image/png;base64,test'); await saving; });
  expect(downloads).toEqual([]);
});
