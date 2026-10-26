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
import nasdaq100Csv from './indices/nasdaq100.csv?raw';
import sp500Csv from './indices/sp500.csv?raw';
import kospiIndexCsv from './indices/kospi-index.csv?raw';
import type { MarketDataSnapshot } from './marketDataContract';
export const createBundledSnapshot = (): MarketDataSnapshot => ({
  releaseId: 'bundled-' + manifest.generatedAt.replace(/[^0-9]/g, ''),
  publishedAt: null,
  raw: { manifestText: JSON.stringify(manifest), csvByFilename: {
    'qqq.csv': qqqCsv,
    'qld.csv': qldCsv,
    'tqqq.csv': tqqqCsv,
    'amd.csv': amdCsv,
    'amdl.csv': amdlCsv,
    'tsla.csv': tslaCsv,
    'tsll.csv': tsllCsv,
    'soxx.csv': soxxCsv,
    'soxl.csv': soxlCsv,
    'spy.csv': spyCsv,
    'schd.csv': schdCsv,
    'kospi.csv': kospiCsv,
    'kosdaq.csv': kosdaqCsv,
    'gold.csv': goldCsv,
    'nasdaq100.csv': nasdaq100Csv,
    'sp500.csv': sp500Csv,
    'kospi-index.csv': kospiIndexCsv,
  } },
});
