import { AssetType } from '../types/finance';
import goldData from './indices/gold.json';
import kosdaqData from './indices/kosdaq.json';
import kospiData from './indices/kospi.json';
import qldData from './indices/qld.json';
import qqqData from './indices/qqq.json';
import schdData from './indices/schd.json';
import spyData from './indices/spy.json';
import tqqqData from './indices/tqqq.json';

interface IndexPoint {
  date: string;
  price: number;
  dividendYield: number;
}

interface IndexDataset {
  id: string;
  data: IndexPoint[];
}

const processReturns = (dataset: IndexDataset): number[] => {
  const returns: number[] = [];
  const points = dataset.data;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    // 일간 수익률 = (현재가 / 이전가) - 1 + 배당수익률(일간)
    const priceReturn = (curr.price / prev.price) - 1;
    const totalReturn = priceReturn + (curr.dividendYield || 0);
    
    returns.push(totalReturn);
  }
  
  return returns;
};

/**
 * 주요 자산별 실제 과거 일간 수익률 데이터셋
 */
export const HISTORICAL_DAILY_RETURNS: Record<Exclude<AssetType, 'CUSTOM'>, number[]> = {
  QQQM: processReturns(qqqData),
  QLD: processReturns(qldData),
  TQQQ: processReturns(tqqqData),
  KOSPI: processReturns(kospiData),
  KOSDAQ: processReturns(kosdaqData),
  SPY: processReturns(spyData),
  SCHD: processReturns(schdData),
  GOLD: processReturns(goldData),
};

export const getDailyReturn = (asset: AssetType, dayIndex: number, defaultRate: number): number => {
  if (asset === 'CUSTOM') return defaultRate / 365;
  const returns = HISTORICAL_DAILY_RETURNS[asset];
  if (!returns || returns.length === 0) return defaultRate / 365;
  
  // 데이터셋의 범위를 넘어가면 순환 반복 (Backtesting 목적)
  return returns[dayIndex % returns.length];
};
