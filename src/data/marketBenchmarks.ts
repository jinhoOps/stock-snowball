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

const createDataset = (
  id: MarketBenchmarkId,
  ticker: string,
  label: string,
  currency: string,
  csv: string,
  filename: string,
): MarketBenchmarkDataset => {
  if (manifest.schemaVersion !== 2) {
    throw new Error('manifest.json must use market-data schema version 2');
  }

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

  const points = parsed.map(({ date, price, dividendYield }) => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (dividendYield !== 0 || weekday === 0 || weekday === 6) {
      throw new Error(`${filename} must contain weekday completed-week closes with zero dividends`);
    }
    return { date, close: price };
  });

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
