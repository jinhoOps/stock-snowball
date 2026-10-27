import type { HistoricalAssetType } from '../types/finance';
import { REGISTRY, isTimestamp, type RawMarketCatalog, type PreparedMarketCatalog, type IndexPoint, type MarketBenchmarkId, type BenchmarkPoint } from './marketDataContract';
const validDate = (date: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
type Review = { assetId: keyof typeof REGISTRY; ticker: string; sourceUrl: string; retrievedAt: string; reason: string };
type ExceptionReview = Omit<Review, 'ticker'>;
type GapReview = ExceptionReview & { previousDate: string; nextDate: string };
type RemovalReview = ExceptionReview & { date: string };
type WeeklyReview = Review & { date: string; close: number };
type DailyReview = Review & { records: { date: string; close: number; dividend: number }[] };
type AutomaticReview = DailyReview & { verification: { overlapCount: number; controlTicker: string; controlDates: string[]; maximumControlDifference: number } };
export interface MarketManifest {
  schemaVersion: 4; generatedAt: string; dataThrough?: string;
  source: { provider: string; client: string; staticCalendar: { provider: string; version: string };
    reviewedWeeklyCloseOverrides: WeeklyReview[]; reviewedDailyBackfills: DailyReview[]; automaticDailyBackfills?: AutomaticReview[];
    reviewedHistoricalDateRemovals: RemovalReview[]; reviewedDailyGapAllowances: GapReview[] };
  assets: Record<string, { assetId: string; ticker: string; displayName: string; currency: string; kind: string; frequency: string;
    calendar?: string; expectedEndDate?: string; startDate: string; endDate: string; rowCount: number }>;
}
export function validateMarketDataManifest(candidate: unknown): asserts candidate is MarketManifest {
  const m = candidate as MarketManifest | null;
  if (!m || m.schemaVersion !== 4) throw new Error('manifest.json must use market-data schema version 4');
  if (m.dataThrough !== undefined && (!validDate(m.dataThrough) || m.dataThrough > m.generatedAt.slice(0,10))) throw new Error('Invalid dataThrough cutoff');
  const source = m.source;
  const error = () => { throw new Error('manifest.json reviewed weekly close override provenance does not match'); };
  if (!isTimestamp(m.generatedAt) || !source || source.provider !== 'Yahoo Finance' || source.client !== 'yfinance'
    || source.staticCalendar?.provider !== 'exchange_calendars' || source.staticCalendar?.version !== '4.13.2'
    || !Array.isArray(source.reviewedWeeklyCloseOverrides) || !Array.isArray(source.reviewedDailyBackfills)
    || !Array.isArray(source.reviewedHistoricalDateRemovals) || !Array.isArray(source.reviewedDailyGapAllowances)) error();
  if (source.automaticDailyBackfills !== undefined && !Array.isArray(source.automaticDailyBackfills)) error();
  for (const review of [...source.reviewedWeeklyCloseOverrides, ...source.reviewedDailyBackfills, ...(source.automaticDailyBackfills ?? [])]) {
    if (!review || !Object.hasOwn(REGISTRY, review.assetId) || REGISTRY[review.assetId].ticker !== review.ticker
      || typeof review.reason !== 'string' || !review.reason.trim() || !isTimestamp(review.retrievedAt)
      || typeof review.sourceUrl !== 'string' || !/^https:\/\//.test(review.sourceUrl)) error();
  }
  for (const review of [...source.reviewedHistoricalDateRemovals, ...source.reviewedDailyGapAllowances]) {
    if (!review || !Object.hasOwn(REGISTRY, review.assetId) || typeof review.reason !== 'string' || !review.reason.trim()
      || !isTimestamp(review.retrievedAt) || typeof review.sourceUrl !== 'string' || !/^https:\/\//.test(review.sourceUrl)) error();
  }
  for (const review of source.reviewedHistoricalDateRemovals) if (!validDate(review.date)) error();
  for (const review of source.reviewedDailyGapAllowances) {
    if (!validDate(review.previousDate) || !validDate(review.nextDate) || review.previousDate >= review.nextDate || REGISTRY[review.assetId].kind !== 'asset') error();
  }
  for (const review of source.reviewedWeeklyCloseOverrides) {
    if (REGISTRY[review.assetId].kind !== 'benchmark' || !validDate(review.date) || !Number.isFinite(review.close) || review.close <= 0) error();
  }
  for (const review of [...source.reviewedDailyBackfills, ...(source.automaticDailyBackfills ?? [])]) {
    if (REGISTRY[review.assetId].kind !== 'asset' || !Array.isArray(review.records) || review.records.length === 0) error();
    for (const row of review.records) {
      if (!row || !validDate(row.date) || !Number.isFinite(row.close) || row.close <= 0 || !Number.isFinite(row.dividend) || row.dividend < 0) error();
    }
  }

  for (const review of source.automaticDailyBackfills ?? []) {
    const v=review.verification;
    if (!['KOSPI','KOSDAQ'].includes(review.assetId) || review.sourceUrl !== 'https://fchart.stock.naver.com/sise.nhn?symbol='+(review.assetId==='KOSPI'?'KPI200':'KOSDAQ')+'&timeframe=day&count=100&requestType=0'
      || !v || !Number.isInteger(v.overlapCount) || v.overlapCount < 3 || v.controlTicker !== '^KS11'
      || !Array.isArray(v.controlDates) || v.controlDates.length < 3 || v.controlDates.some((day,index)=>!validDate(day) || (index>0 && day<=v.controlDates[index-1]))
      || v.controlDates.at(-1)! > review.records.at(-1)!.date || Date.parse(review.records.at(-1)!.date)-Date.parse(v.controlDates.at(-1)!) > 14*86400000
      || !Number.isFinite(v.maximumControlDifference) || v.maximumControlDifference < 0 || v.maximumControlDifference > 0.02) {
      throw new Error('Invalid automatic KOSPI verification provenance');
    }
  }
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
      extra.length > 0 || closeText?.trim() === '' || dividendText?.trim() === '' ||
      !validDate(date) ||
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

export const validateReviewedWeeklyCloseValues = (id: MarketBenchmarkId, points: BenchmarkPoint[], filename: string, source: MarketManifest['source']): void => {
  for (const override of source.reviewedWeeklyCloseOverrides.filter(row => row.assetId === id)) {
    const point = points.find(row => row.date === override.date);
    if (!point) throw new Error(filename + ' reviewed weekly close override ' + id + ' is missing ' + override.date);
    if (point.close !== override.close) throw new Error(filename + ' reviewed weekly close override ' + id + ' does not match ' + override.date);
  }
};
export const buildMarketDataCatalog = (raw: RawMarketCatalog): PreparedMarketCatalog => {
  const manifest: unknown = JSON.parse(raw.manifestText);
  validateMarketDataManifest(manifest);
  const expected = Object.values(REGISTRY).map(row => row.filename).sort();
  if (JSON.stringify(Object.keys(raw.csvByFilename).sort()) !== JSON.stringify(expected)
    || JSON.stringify(Object.keys(manifest.assets).sort()) !== JSON.stringify(Object.keys(REGISTRY).sort())) throw new Error('Catalog members do not match');
  const assets = {} as PreparedMarketCatalog['assets'];
  const benchmarks = {} as PreparedMarketCatalog['benchmarks'];
  for (const [id, entry] of Object.entries(REGISTRY)) {
    const data = parseHistoricalCsv(raw.csvByFilename[entry.filename], entry.filename);
    const coverage = manifest.assets[id];
    for (const key of ['assetId', 'ticker', 'displayName', 'currency', 'kind', 'frequency'] as const) {
      if (coverage?.[key] !== entry[key]) throw new Error('manifest.json coverage does not match ' + entry.filename);
    }
    if (coverage.startDate !== data[0].date || coverage.endDate !== data.at(-1)!.date || coverage.rowCount !== data.length
      || coverage.endDate > (manifest.dataThrough ?? manifest.generatedAt.slice(0, 10))) throw new Error('manifest.json coverage does not match ' + entry.filename);
    if (entry.kind === 'asset') {
      const dailyReturns = data.slice(1).map((row, index) => row.price / data[index].price * (1 + row.dividendYield) - 1);
      assets[id as HistoricalAssetType] = { data, coverage: coverage as PreparedMarketCatalog['assets'][HistoricalAssetType]['coverage'], dailyReturns };
    } else {
      if (coverage.calendar !== entry.calendar || coverage.expectedEndDate !== coverage.endDate) throw new Error('Invalid benchmark calendar');
      const points = data.map(row => {
        const weekday = new Date(row.date).getUTCDay();
        if (row.dividendYield !== 0 || weekday === 0 || weekday === 6 || row.date >= isoWeekStart(manifest.generatedAt.slice(0, 10))) throw new Error('Invalid completed-week close');
        return { date: row.date, close: row.price };
      });
      validateCompletedWeeklyPoints(points, entry.filename, coverage.expectedEndDate);
      validateReviewedWeeklyCloseValues(id as MarketBenchmarkId, points, entry.filename, manifest.source);
      benchmarks[id as MarketBenchmarkId] = { id: id as MarketBenchmarkId, ticker: entry.ticker, label: entry.displayName,
        currency: entry.currency, startDate: coverage.startDate, endDate: coverage.endDate, points };
    }
  }
  for (const review of [...manifest.source.reviewedDailyBackfills, ...(manifest.source.automaticDailyBackfills ?? [])]) {
    const rows = assets[review.assetId as HistoricalAssetType].data;
    for (const record of review.records) {
      const row = rows.find(row => row.date === record.date);
      if (!row || row.price !== record.close || Math.abs(row.dividendYield * row.price - record.dividend) > 1e-10) throw new Error('Daily reviewed backfill does not match');
    }
  }
  const rawDates = (id: keyof typeof REGISTRY): string[] => {
    if (REGISTRY[id].kind === 'asset') return assets[id as HistoricalAssetType].data.map(row => row.date);
    return benchmarks[id as MarketBenchmarkId].points.map(row => row.date);
  };
  for (const review of manifest.source.reviewedHistoricalDateRemovals) {
    if (rawDates(review.assetId).includes(review.date)) throw new Error('Reviewed removal is still present');
  }
  for (const review of manifest.source.reviewedDailyGapAllowances) {
    const dates=rawDates(review.assetId); const index=dates.indexOf(review.previousDate);
    if (index < 0 || dates[index+1] !== review.nextDate) throw new Error('Reviewed daily gap does not match');
  }
  return { assets, benchmarks };
};
