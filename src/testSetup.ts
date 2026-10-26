import { installMarketData } from './data/marketDataRuntime';
import { createBundledSnapshot } from './data/bundledMarketData';
installMarketData(createBundledSnapshot());
