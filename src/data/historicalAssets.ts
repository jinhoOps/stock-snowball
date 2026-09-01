import { AssetType, HistoricalAssetType } from '../types/finance';
export { HISTORICAL_ASSET_IDS } from '../types/finance';
import amdCsv from './indices/amd.csv?raw';
import amdlCsv from './indices/amdl.csv?raw';
import goldCsv from './indices/gold.csv?raw';
import kosdaqCsv from './indices/kosdaq.csv?raw';
import kospiCsv from './indices/kospi.csv?raw';
import manifest from './indices/manifest.json';
import qldCsv from './indices/qld.csv?raw';
import qqqCsv from './indices/qqq.csv?raw';
import schdCsv from './indices/schd.csv?raw';
import soxxCsv from './indices/soxx.csv?raw';
import soxlCsv from './indices/soxl.csv?raw';
import spyCsv from './indices/spy.csv?raw';
import tslaCsv from './indices/tsla.csv?raw';
import tsllCsv from './indices/tsll.csv?raw';
import tqqqCsv from './indices/tqqq.csv?raw';

export interface IndexPoint {
  date: string;
  price: number;
  dividendYield: number;
}

interface IndexDataset {
  id: HistoricalAssetType;
  data: IndexPoint[];
}

interface ManifestAsset {
  assetId: HistoricalAssetType;
  ticker: string;
  displayName: string;
  currency: string;
  kind: 'asset';
  frequency: 'daily';
  startDate: string;
  endDate: string;
  rowCount: number;
}

export interface HistoricalCoverage extends ManifestAsset {}

const manifestAssets = manifest.assets as Record<HistoricalAssetType, ManifestAsset>;

if (manifest.schemaVersion !== 2) {
  throw new Error('manifest.json must use market-data schema version 2');
}

export const parseHistoricalCsv = (csv: string, filename: string): IndexPoint[] => {
  const lines = csv.trim().split(/\r?\n/);
  if (lines[0] !== 'date,close,dividend') {
    throw new Error(`${filename} must use the date,close,dividend header`);
  }

  const data: IndexPoint[] = [];
  let previousDate = '';
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const [date, closeText, dividendText, ...extra] = line.split(',');
    const close = Number(closeText);
    const dividend = Number(dividendText);

    if (
      extra.length > 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(close) ||
      close <= 0 ||
      !Number.isFinite(dividend) ||
      dividend < 0 ||
      date <= previousDate
    ) {
      throw new Error(`${filename}:${index + 1} is not a valid historical market-data row`);
    }

    data.push({
      date,
      price: close,
      dividendYield: dividend / close,
    });
    previousDate = date;
  }

  if (data.length === 0) {
    throw new Error(`${filename} contains no historical market-data rows`);
  }
  return data;
};

const createDataset = (
  asset: HistoricalAssetType,
  csv: string,
  filename: string,
): IndexDataset => {
  const data = parseHistoricalCsv(csv, filename);
  const coverage = manifestAssets[asset];
  if (!coverage) {
    throw new Error(`manifest.json has no coverage for ${asset}`);
  }
  if (
    coverage.assetId !== asset ||
    coverage.kind !== 'asset' ||
    coverage.frequency !== 'daily' ||
    coverage.startDate !== data[0].date ||
    coverage.endDate !== data.at(-1)?.date ||
    coverage.rowCount !== data.length
  ) {
    throw new Error(`manifest.json coverage does not match ${filename}`);
  }
  return { id: asset, data };
};

const datasets: Record<HistoricalAssetType, IndexDataset> = {
  QQQ: createDataset('QQQ', qqqCsv, 'qqq.csv'),
  QLD: createDataset('QLD', qldCsv, 'qld.csv'),
  TQQQ: createDataset('TQQQ', tqqqCsv, 'tqqq.csv'),
  AMD: createDataset('AMD', amdCsv, 'amd.csv'),
  AMDL: createDataset('AMDL', amdlCsv, 'amdl.csv'),
  TSLA: createDataset('TSLA', tslaCsv, 'tsla.csv'),
  TSLL: createDataset('TSLL', tsllCsv, 'tsll.csv'),
  SOXX: createDataset('SOXX', soxxCsv, 'soxx.csv'),
  SOXL: createDataset('SOXL', soxlCsv, 'soxl.csv'),
  KOSPI: createDataset('KOSPI', kospiCsv, 'kospi.csv'),
  KOSDAQ: createDataset('KOSDAQ', kosdaqCsv, 'kosdaq.csv'),
  SPY: createDataset('SPY', spyCsv, 'spy.csv'),
  SCHD: createDataset('SCHD', schdCsv, 'schd.csv'),
  GOLD: createDataset('GOLD', goldCsv, 'gold.csv'),
};

const processReturns = (dataset: IndexDataset): number[] => {
  const returns: number[] = [];
  for (let index = 1; index < dataset.data.length; index += 1) {
    const previous = dataset.data[index - 1];
    const current = dataset.data[index];
    const priceReturn = current.price / previous.price - 1;
    returns.push(priceReturn + current.dividendYield);
  }
  return returns;
};

/** 주요 자산별 실제 과거 일간 수익률 데이터셋 */
export const HISTORICAL_DAILY_RETURNS: Record<HistoricalAssetType, number[]> = {
  QQQ: processReturns(datasets.QQQ),
  QLD: processReturns(datasets.QLD),
  TQQQ: processReturns(datasets.TQQQ),
  AMD: processReturns(datasets.AMD),
  AMDL: processReturns(datasets.AMDL),
  TSLA: processReturns(datasets.TSLA),
  TSLL: processReturns(datasets.TSLL),
  SOXX: processReturns(datasets.SOXX),
  SOXL: processReturns(datasets.SOXL),
  KOSPI: processReturns(datasets.KOSPI),
  KOSDAQ: processReturns(datasets.KOSDAQ),
  SPY: processReturns(datasets.SPY),
  SCHD: processReturns(datasets.SCHD),
  GOLD: processReturns(datasets.GOLD),
};

const toHistoricalAsset = (asset: AssetType): HistoricalAssetType =>
  asset === 'CUSTOM' ? 'SPY' : asset;

/** 주요 자산별 원본 시계열 데이터셋 반환 */
export const getHistoricalData = (asset: AssetType): IndexPoint[] =>
  datasets[toHistoricalAsset(asset)].data;

export const getHistoricalCoverage = (asset: AssetType): HistoricalCoverage =>
  manifestAssets[toHistoricalAsset(asset)];

export const isHistoricalRangeCovered = (
  asset: AssetType,
  startDate: string,
  endDate: string,
): boolean => {
  const coverage = getHistoricalCoverage(asset);
  return startDate >= coverage.startDate && endDate <= coverage.endDate && startDate <= endDate;
};

export const getHistoricalRangeError = (
  asset: AssetType,
  startDate: string,
  endDate: string,
): string | null => {
  const coverage = getHistoricalCoverage(asset);
  if (startDate > endDate) {
    return '백테스트 시작일은 종료일보다 앞서야 합니다.';
  }
  if (startDate < coverage.startDate || endDate > coverage.endDate) {
    return `${coverage.assetId} 데이터는 ${coverage.startDate}부터 ${coverage.endDate}까지 사용할 수 있습니다.`;
  }
  return null;
};

/** Returns the most recent market-data point on or before a calendar date. */
export const findPointOnOrBefore = (
  points: readonly IndexPoint[],
  date: string,
): IndexPoint | null => {
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (points[middle].date <= date) low = middle + 1;
    else high = middle;
  }
  return low > 0 ? points[low - 1] : null;
};

/**
 * 자산별 과거 데이터를 기반으로 약 1년(252 거래일) 구르는 수익률의 중앙값을 계산합니다.
 */
export const calculateMedianCAGR = (asset: AssetType): number => {
  if (asset === 'CUSTOM') return 0.08;

  const data = getHistoricalData(asset);
  const windowSize = 252;
  if (data.length < windowSize) return 0.1;

  const annualReturns: number[] = [];
  for (let index = 0; index <= data.length - windowSize; index += 1) {
    const start = data[index].price;
    const end = data[index + windowSize - 1].price;
    if (start > 0) annualReturns.push(end / start - 1);
  }

  if (annualReturns.length === 0) return 0.1;
  annualReturns.sort((left, right) => left - right);
  const middle = Math.floor(annualReturns.length / 2);
  return annualReturns.length % 2 === 0
    ? (annualReturns[middle - 1] + annualReturns[middle]) / 2
    : annualReturns[middle];
};

export const getDailyReturn = (asset: AssetType, dayIndex: number, defaultRate: number): number => {
  if (asset === 'CUSTOM') return defaultRate / 365;
  const returns = HISTORICAL_DAILY_RETURNS[asset];
  if (returns.length === 0) return defaultRate / 365;
  return returns[dayIndex % returns.length];
};
