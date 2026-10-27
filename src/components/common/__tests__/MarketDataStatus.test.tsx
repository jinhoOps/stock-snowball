// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarketDataStatus from '../MarketDataStatus';
vi.mock('../../../data/marketDataBootstrap',()=>({checkForMarketDataUpdate:vi.fn()}));
import { checkForMarketDataUpdate } from '../../../data/marketDataBootstrap';
afterEach(cleanup);
describe('market data status',()=>{
  it('offers explicit refresh only after a complete cached update',async()=>{
    vi.mocked(checkForMarketDataUpdate).mockResolvedValue('ready');const reload=vi.fn();
    render(<MarketDataStatus date="2026-10-23" onReload={reload}/>);
    await waitFor(()=>expect(screen.getByText('새 시세가 준비됐어요')).toBeTruthy());
    expect(screen.getByText(/2026-10-23/)).toBeTruthy();expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'새로고침해 적용'}));expect(reload).toHaveBeenCalledTimes(1);
  });
  it('keeps the data date and offers retry on update failure',async()=>{
    vi.mocked(checkForMarketDataUpdate).mockRejectedValue(new Error('offline'));
    render(<MarketDataStatus date="2026-10-23"/>);
    await waitFor(()=>expect(screen.getByRole('button',{name:'다시 확인'})).toBeTruthy());
    expect(screen.getByText(/보관된 데이터로 계산합니다/)).toBeTruthy();
    vi.mocked(checkForMarketDataUpdate).mockResolvedValue('unchanged');
    fireEvent.click(screen.getByRole('button',{name:'다시 확인'}));
    await waitFor(()=>expect(screen.queryByRole('button',{name:'다시 확인'})).toBeNull());
  });
});
