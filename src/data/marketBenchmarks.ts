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

interface ManifestBenchmark {
  assetId: MarketBenchmarkId;
  ticker: string;
  displayName: string;
  currency: string;
  kind: 'benchmark';
  frequency: 'weekly';
  startDate: string;
  endDate: string;
  rowCount: number;
}

const manifestAssets = manifest.assets as Record<string, ManifestBenchmark>;

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

const MARKET_DATA_SOURCE = {
  provider: 'Yahoo Finance',
  client: 'yfinance',
  reviewedWeeklyCloseOverrides: REVIEWED_WEEKLY_CLOSE_OVERRIDES,
};

export const validateMarketDataManifest = (candidate: unknown): void => {
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    (candidate as { schemaVersion?: unknown }).schemaVersion !== 3
  ) {
    throw new Error('manifest.json must use market-data schema version 3');
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
  }), filename);
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
