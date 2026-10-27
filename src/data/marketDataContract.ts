import type { HistoricalAssetType } from '../types/finance';
export type MarketBenchmarkId = 'NASDAQ100' | 'SP500' | 'KOSPI_INDEX';
export interface IndexPoint { date: string; price: number; dividendYield: number }
export interface HistoricalCoverage {
  assetId: HistoricalAssetType; ticker: string; displayName: string; currency: string;
  kind: 'asset'; frequency: 'daily'; startDate: string; endDate: string; rowCount: number;
}
export interface BenchmarkPoint { date: string; close: number }
export interface MarketBenchmarkDataset {
  id: MarketBenchmarkId; ticker: string; label: string; currency: string;
  startDate: string; endDate: string; points: BenchmarkPoint[];
}
export interface RawMarketCatalog { manifestText: string; csvByFilename: Record<string, string> }
export interface ReleaseRef { releaseId: string; publishedAt: string; releaseSha256: string }
export interface LatestPointer { transportVersion: 1; current: ReleaseRef; previous?: ReleaseRef }
export interface ReleaseManifest {
  transportVersion: 1; releaseId: string; publishedAt: string; dataHash: string;
  files: Record<string, { bytes: number; sha256: string }>;
}
export interface MarketDataSnapshot { releaseId: string; publishedAt: string | null; raw: RawMarketCatalog }
export interface PreparedMarketCatalog {
  assets: Record<HistoricalAssetType, { data: IndexPoint[]; coverage: HistoricalCoverage; dailyReturns: number[] }>;
  benchmarks: Record<MarketBenchmarkId, MarketBenchmarkDataset>;
}
export const STORAGE_BASE_URL = 'https://olqdftjssrzqvcindekh.supabase.co/storage/v1/object/public/stock-snowball-market-data/';
export const LIMITS = { pointer: 8192, release: 262144, file: 6 * 1024 * 1024, total: 30 * 1024 * 1024 } as const;
export const REGISTRY = {
  "QQQ": {
    "assetId": "QQQ",
    "ticker": "QQQ",
    "displayName": "Invesco QQQ",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "qqq.csv"
  },
  "QLD": {
    "assetId": "QLD",
    "ticker": "QLD",
    "displayName": "ProShares Ultra QQQ",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "qld.csv"
  },
  "TQQQ": {
    "assetId": "TQQQ",
    "ticker": "TQQQ",
    "displayName": "ProShares UltraPro QQQ",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "tqqq.csv"
  },
  "AMD": {
    "assetId": "AMD",
    "ticker": "AMD",
    "displayName": "Advanced Micro Devices",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "amd.csv"
  },
  "AMDL": {
    "assetId": "AMDL",
    "ticker": "AMDL",
    "displayName": "GraniteShares 2x Long AMD Daily ETF",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "amdl.csv"
  },
  "TSLA": {
    "assetId": "TSLA",
    "ticker": "TSLA",
    "displayName": "Tesla",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "tsla.csv"
  },
  "TSLL": {
    "assetId": "TSLL",
    "ticker": "TSLL",
    "displayName": "Direxion Daily TSLA Bull 2X Shares",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "tsll.csv"
  },
  "SOXX": {
    "assetId": "SOXX",
    "ticker": "SOXX",
    "displayName": "iShares Semiconductor ETF",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "soxx.csv"
  },
  "SOXL": {
    "assetId": "SOXL",
    "ticker": "SOXL",
    "displayName": "Direxion Daily Semiconductor Bull 3X Shares",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "soxl.csv"
  },
  "SPY": {
    "assetId": "SPY",
    "ticker": "SPY",
    "displayName": "SPDR S&P 500 ETF Trust",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "spy.csv"
  },
  "SCHD": {
    "assetId": "SCHD",
    "ticker": "SCHD",
    "displayName": "Schwab U.S. Dividend Equity ETF",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "schd.csv"
  },
  "KOSPI": {
    "assetId": "KOSPI",
    "ticker": "^KS200",
    "displayName": "KOSPI 200",
    "currency": "KRW",
    "kind": "asset",
    "frequency": "daily",
    "filename": "kospi.csv"
  },
  "KOSDAQ": {
    "assetId": "KOSDAQ",
    "ticker": "^KQ11",
    "displayName": "KOSDAQ",
    "currency": "KRW",
    "kind": "asset",
    "frequency": "daily",
    "filename": "kosdaq.csv"
  },
  "GOLD": {
    "assetId": "GOLD",
    "ticker": "GC=F",
    "displayName": "Gold Futures",
    "currency": "USD",
    "kind": "asset",
    "frequency": "daily",
    "filename": "gold.csv"
  },
  "NASDAQ100": {
    "assetId": "NASDAQ100",
    "ticker": "^NDX",
    "displayName": "나스닥100",
    "currency": "USD",
    "kind": "benchmark",
    "frequency": "weekly",
    "filename": "nasdaq100.csv",
    "calendar": "XNYS"
  },
  "SP500": {
    "assetId": "SP500",
    "ticker": "^GSPC",
    "displayName": "S&P 500",
    "currency": "USD",
    "kind": "benchmark",
    "frequency": "weekly",
    "filename": "sp500.csv",
    "calendar": "XNYS"
  },
  "KOSPI_INDEX": {
    "assetId": "KOSPI_INDEX",
    "ticker": "^KS11",
    "displayName": "코스피",
    "currency": "KRW",
    "kind": "benchmark",
    "frequency": "weekly",
    "filename": "kospi-index.csv",
    "calendar": "XKRX"
  }
} as const;
export const DATA_FILENAMES = ['manifest.json', ...Object.values(REGISTRY).map(asset => asset.filename)];
export const isReleaseId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
export const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value));
