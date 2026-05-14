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

/**
 * 주요 자산별 원본 시계열 데이터셋 반환
 */
export const getHistoricalData = (asset: AssetType): IndexPoint[] => {
  if (asset === 'CUSTOM') return spyData.data; // 기본값으로 SPY 제공
  
  const datasets: Record<Exclude<AssetType, 'CUSTOM'>, IndexDataset> = {
    QQQM: qqqData,
    QLD: qldData,
    TQQQ: tqqqData,
    KOSPI: kospiData,
    KOSDAQ: kosdaqData,
    SPY: spyData,
    SCHD: schdData,
    GOLD: goldData,
  };
  
  return datasets[asset]?.data || spyData.data;
};

/**
 * 자산별 과거 데이터를 기반으로 1년 단위 구르는(Rolling) 연평균 수익률(CAGR)의 중앙값을 계산합니다.
 * @param asset 자산 유형
 * @returns 중앙값 수익률 (예: 0.12 for 12%)
 */
export const calculateMedianCAGR = (asset: AssetType): number => {
  if (asset === 'CUSTOM') return 0.08; // 기본값 8%
  
  const data = getHistoricalData(asset);
  if (!data || data.length < 365) return 0.1; // 데이터 부족 시 10% 기본값

  const annualReturns: number[] = [];
  const windowSize = 365; // 약 1년 (휴장일 포함 데이터일 경우 252일이 적절하나, 현재 데이터셋 형식을 따름)

  for (let i = 0; i <= data.length - windowSize; i++) {
    const start = data[i].price;
    const end = data[i + windowSize - 1].price;
    
    if (start === 0) continue;

    // 단순 수익률 (1년 기간이므로 CAGR와 동일)
    // 배당 수익률은 현재 포인트 데이터에 dividendYield(연간/365 추정)가 포함되어 있으나 
    // 여기서는 단순 가격 변동 중앙값을 기준으로 함 (보수적 접근)
    const annualReturn = (end / start) - 1;
    annualReturns.push(annualReturn);
  }

  if (annualReturns.length === 0) return 0.1;

  // 중앙값 계산
  annualReturns.sort((a, b) => a - b);
  const mid = Math.floor(annualReturns.length / 2);
  
  if (annualReturns.length % 2 === 0) {
    return (annualReturns[mid - 1] + annualReturns[mid]) / 2;
  }
  return annualReturns[mid];
};

export const getDailyReturn = (asset: AssetType, dayIndex: number, defaultRate: number): number => {
  if (asset === 'CUSTOM') return defaultRate / 365;
  const returns = HISTORICAL_DAILY_RETURNS[asset];
  if (!returns || returns.length === 0) return defaultRate / 365;
  
  // 데이터셋의 범위를 넘어가면 순환 반복 (Backtesting 목적)
  return returns[dayIndex % returns.length];
};
