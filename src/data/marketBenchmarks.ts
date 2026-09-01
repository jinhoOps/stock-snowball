import type { HistoricalAssetType } from '../types/finance';
import manifest from './indices/manifest.json';
import kospiIndexCsv from './indices/kospi-index.csv?raw';
import nasdaq100Csv from './indices/nasdaq100.csv?raw';
import sp500Csv from './indices/sp500.csv?raw';
import { parseHistoricalCsv } from './historicalAssets';

export type MarketBenchmarkId = 'NASDAQ100' | 'SP500' | 'KOSPI_INDEX';

export interface BenchmarkPoint {
  date: string;
  close: number;
}

export interface MarketBenchmarkDataset {
  id: MarketBenchmarkId;
  ticker: string;
  label: string;
  currency: string;
  startDate: string;
  endDate: string;
  points: BenchmarkPoint[];
}

const manifestAssets = manifest.assets;

const REVIEWED_WEEKLY_CLOSE_OVERRIDES = [
  {
    assetId: 'NASDAQ100',
    ticker: '^NDX',
    date: '2026-08-28',
    close: 29433.43,
    sourceUrl: 'https://finance.yahoo.com/quote/%5ENDX/history/',
    retrievedAt: '2026-09-01T05:26:33Z',
    reason: 'yfinance daily history omitted this completed-week final trading-day close',
  },
  {
    assetId: 'SP500',
    ticker: '^GSPC',
    date: '2026-08-28',
    close: 7711.76,
    sourceUrl: 'https://finance.yahoo.com/quote/%5EGSPC/history/',
    retrievedAt: '2026-09-01T05:26:33Z',
    reason: 'yfinance daily history omitted this completed-week final trading-day close',
  },
  {
    assetId: 'KOSPI_INDEX',
    ticker: '^KS11',
    date: '2026-08-28',
    close: 6788.88,
    sourceUrl: 'https://finance.yahoo.com/quote/%5EKS11/history/',
    retrievedAt: '2026-09-01T05:26:33Z',
    reason: 'yfinance daily history omitted this completed-week final trading-day close',
  },
] as const;

const REVIEWED_HISTORICAL_DATE_REMOVALS = [] as const;
const REVIEWED_DAILY_GAP_ALLOWANCES = [] as const;
const REVIEWED_DAILY_BACKFILLS = [
  {
    assetId: 'KOSPI',
    ticker: '^KS200',
    records: [
      { date: '2026-07-20', close: 1032.52, dividend: 0 },
      { date: '2026-07-21', close: 1073.39, dividend: 0 },
      { date: '2026-07-22', close: 1080.22, dividend: 0 },
      { date: '2026-07-23', close: 1126.33, dividend: 0 },
      { date: '2026-07-24', close: 1055.58, dividend: 0 },
      { date: '2026-07-27', close: 1069.22, dividend: 0 },
      { date: '2026-07-28', close: 945.69, dividend: 0 },
      { date: '2026-07-29', close: 887.2, dividend: 0 },
      { date: '2026-07-30', close: 872.49, dividend: 0 },
      { date: '2026-07-31', close: 1046.81, dividend: 0 },
      { date: '2026-08-03', close: 986.72, dividend: 0 },
      { date: '2026-08-04', close: 1000.03, dividend: 0 },
      { date: '2026-08-05', close: 1038.59, dividend: 0 },
      { date: '2026-08-06', close: 982.92, dividend: 0 },
      { date: '2026-08-07', close: 974.73, dividend: 0 },
      { date: '2026-08-10', close: 977.84, dividend: 0 },
      { date: '2026-08-11', close: 987.4, dividend: 0 },
      { date: '2026-08-12', close: 1029.43, dividend: 0 },
      { date: '2026-08-13', close: 1071.24, dividend: 0 },
      { date: '2026-08-14', close: 1098.18, dividend: 0 },
      { date: '2026-08-18', close: 1082, dividend: 0 },
      { date: '2026-08-19', close: 1012.61, dividend: 0 },
      { date: '2026-08-20', close: 1080.98, dividend: 0 },
      { date: '2026-08-21', close: 1096.25, dividend: 0 },
      { date: '2026-08-24', close: 1054.01, dividend: 0 },
      { date: '2026-08-25', close: 1060.68, dividend: 0 },
      { date: '2026-08-26', close: 1071.16, dividend: 0 },
      { date: '2026-08-27', close: 1088.61, dividend: 0 },
      { date: '2026-08-28', close: 1065.7, dividend: 0 },
      { date: '2026-08-31', close: 1071.85, dividend: 0 },
    ],
    sourceUrl: 'https://fchart.stock.naver.com/sise.nhn?symbol=KPI200&timeframe=day&count=100&requestType=0',
    retrievedAt: '2026-09-01T06:57:29Z',
    reason: 'Yahoo Finance ^KS200 history omitted valid KOSPI 200 trading dates',
  },
] as const;

const MARKET_DATA_SOURCE = {
  provider: 'Yahoo Finance',
  client: 'yfinance',
  staticCalendar: {
    provider: 'exchange_calendars',
    version: '4.13.2',
  },
  reviewedWeeklyCloseOverrides: REVIEWED_WEEKLY_CLOSE_OVERRIDES,
  reviewedHistoricalDateRemovals: REVIEWED_HISTORICAL_DATE_REMOVALS,
  reviewedDailyGapAllowances: REVIEWED_DAILY_GAP_ALLOWANCES,
  reviewedDailyBackfills: REVIEWED_DAILY_BACKFILLS,
};

export const validateMarketDataManifest = (candidate: unknown): void => {
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    (candidate as { schemaVersion?: unknown }).schemaVersion !== 4
  ) {
    throw new Error('manifest.json must use market-data schema version 4');
  }
  if (
    JSON.stringify((candidate as { source?: unknown }).source) !== JSON.stringify(MARKET_DATA_SOURCE)
  ) {
    throw new Error('manifest.json reviewed weekly close override provenance does not match');
  }
};

validateMarketDataManifest(manifest);

export const validateReviewedWeeklyCloseValues = (
  id: MarketBenchmarkId,
  points: BenchmarkPoint[],
  filename: string,
): void => {
  const override = REVIEWED_WEEKLY_CLOSE_OVERRIDES.find((candidate) => candidate.assetId === id);
  if (!override) return;
  const point = points.find((candidate) => candidate.date === override.date);
  if (!point) {
    throw new Error(`${filename} reviewed weekly close override ${id} is missing ${override.date}`);
  }
  if (point.close !== override.close) {
    throw new Error(`${filename} reviewed weekly close override ${id} does not match ${override.date}`);
  }
};

const isoWeekStart = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
  return parsed.toISOString().slice(0, 10);
};

export const validateCompletedWeeklyPoints = (
  points: BenchmarkPoint[],
  filename: string,
  expectedEndDate?: string,
): BenchmarkPoint[] => {
  let previousWeekStart = '';
  let previousDate = '';
  for (const point of points) {
    const weekStart = isoWeekStart(point.date);
    if (weekStart === previousWeekStart) {
      throw new Error(
        `${filename} must contain one completed-week close per ISO week; ${previousDate} is non-final because ${point.date} is later in the same week`,
      );
    }
    previousWeekStart = weekStart;
    previousDate = point.date;
  }
  if (expectedEndDate !== undefined && points.at(-1)?.date !== expectedEndDate) {
    throw new Error(
      `${filename} must end on static-calendar final trading day ${expectedEndDate}`,
    );
  }
  return points;
};

const createDataset = (
  id: MarketBenchmarkId,
  ticker: string,
  label: string,
  currency: string,
  csv: string,
  filename: string,
): MarketBenchmarkDataset => {
  const parsed = parseHistoricalCsv(csv, filename);
  const coverage = manifestAssets[id];
  if (!coverage) {
    throw new Error(`manifest.json has no coverage for ${id}`);
  }
  if (
    coverage.assetId !== id ||
    coverage.ticker !== ticker ||
    coverage.displayName !== label ||
    coverage.currency !== currency ||
    coverage.kind !== 'benchmark' ||
    coverage.frequency !== 'weekly' ||
    coverage.calendar !== (id === 'KOSPI_INDEX' ? 'XKRX' : 'XNYS') ||
    coverage.expectedEndDate !== parsed.at(-1)?.date ||
    coverage.startDate !== parsed[0].date ||
    coverage.endDate !== parsed.at(-1)?.date ||
    coverage.rowCount !== parsed.length
  ) {
    throw new Error(`manifest.json coverage does not match ${filename}`);
  }

  const points = validateCompletedWeeklyPoints(parsed.map(({ date, price, dividendYield }) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (dividendYield !== 0 || weekday === 0 || weekday === 6) {
      throw new Error(`${filename} must contain weekday completed-week closes with zero dividends`);
    }
    return { date, close: price };
  }), filename, coverage.expectedEndDate);
  validateReviewedWeeklyCloseValues(id, points, filename);

  return {
    id,
    ticker,
    label,
    currency,
    startDate: coverage.startDate,
    endDate: coverage.endDate,
    points,
  };
};

const datasets: Record<MarketBenchmarkId, MarketBenchmarkDataset> = {
  NASDAQ100: createDataset('NASDAQ100', '^NDX', '나스닥100', 'USD', nasdaq100Csv, 'nasdaq100.csv'),
  SP500: createDataset('SP500', '^GSPC', 'S&P 500', 'USD', sp500Csv, 'sp500.csv'),
  KOSPI_INDEX: createDataset('KOSPI_INDEX', '^KS11', '코스피', 'KRW', kospiIndexCsv, 'kospi-index.csv'),
};

const PRIMARY_BENCHMARK: Partial<Record<HistoricalAssetType, MarketBenchmarkId>> = {
  QQQ: 'NASDAQ100',
  QLD: 'NASDAQ100',
  TQQQ: 'NASDAQ100',
  SPY: 'SP500',
  KOSPI: 'KOSPI_INDEX',
};

export const getMarketBenchmarkForAsset = (asset: HistoricalAssetType): MarketBenchmarkId | null =>
  PRIMARY_BENCHMARK[asset] ?? null;

export const getMarketBenchmarkData = (id: MarketBenchmarkId): MarketBenchmarkDataset =>
  datasets[id];
