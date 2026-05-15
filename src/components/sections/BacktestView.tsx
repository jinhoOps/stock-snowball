import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BacktestResult, AssetType, SimulationParams } from '../../types/finance';
import { SnowballEngine } from '../../core/SnowballEngine';
import { BacktestEngine } from '../../core/BacktestEngine';
import { getHistoricalData } from '../../data/historicalAssets';
import BacktestChart from '../charts/BacktestChart';

interface BacktestViewProps {
  result: BacktestResult; // Primary result
  assetName: string;
  currency: 'KRW' | 'USD';
  params: SimulationParams;
}

const ASSET_OPTIONS: AssetType[] = ['SPY', 'QQQM', 'QLD', 'TQQQ', 'SCHD', 'KOSPI', 'KOSDAQ', 'GOLD'];

const ASSET_COLORS = ['#0066cc', '#34C759', '#FF9500'];

const BacktestView: React.FC<BacktestViewProps> = ({ result, assetName, currency, params }) => {
  const [comparisonAssets, setComparisonAssets] = useState<AssetType[]>([]);

  const allResults = useMemo(() => {
    const results = [
      {
        assetId: assetName as AssetType,
        result,
        color: ASSET_COLORS[0]
      }
    ];

    comparisonAssets.forEach((assetId) => {
      if (assetId === assetName) return; // Skip if same as primary

      const data = getHistoricalData(assetId);
      const btParams = {
        initialPrincipal: params.principal,
        monthlyInstallment: params.contribution,
        cycle: params.cycle,
        startDate: params.startDate || '2010-01-01',
        endDate: params.endDate || '2024-01-01',
        reinvestDividends: true,
        assetId,
        accountType: params.accountType,
        buyFeeRate: 0.00015,
        sellFeeRate: 0.00015,
        taxDividendRate: 0.154,
        taxCapitalGainRate: 0.22,
        taxIsaLimit: 2000000,
        taxIsaReducedRate: 0.095,
      };

      try {
        const res = BacktestEngine.run(btParams, data);
        results.push({
          assetId,
          result: res,
          color: ASSET_COLORS[(results.length) % ASSET_COLORS.length]
        });
      } catch (e) {
        console.error(`Backtest error for ${assetId}:`, e);
      }
    });

    return results;
  }, [result, assetName, comparisonAssets, params]);

  const formatCurrency = (val: number) => {
    if (currency === 'KRW') {
      const truncated = Math.floor(val / 10000) * 10000;
      return SnowballEngine.formatKoreanWon(truncated);
    }
    return SnowballEngine.formatUSD(val);
  };

  const toggleAsset = (asset: AssetType) => {
    if (asset === assetName) return;
    setComparisonAssets(prev => {
      if (prev.includes(asset)) {
        return prev.filter(a => a !== asset);
      }
      if (prev.length >= 2) return prev; // Limit to 3 total
      return [...prev, asset];
    });
  };

  return (
    <div className="flex flex-col items-center w-full gap-8">
      {/* Asset Selector Chips */}
      <div className="w-full max-w-[1200px] px-4 flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-2">
          {ASSET_OPTIONS.map((asset) => {
            const isPrimary = asset === assetName;
            const isSelected = isPrimary || comparisonAssets.includes(asset);
            const colorIndex = allResults.findIndex(r => r.assetId === asset);
            const color = colorIndex >= 0 ? ASSET_COLORS[colorIndex] : null;

            return (
              <button
                key={asset}
                onClick={() => toggleAsset(asset)}
                disabled={isPrimary}
                className={`px-4 py-2 rounded-pill text-caption-strong border transition-all flex items-center gap-2 ${
                  isSelected 
                    ? 'bg-apple-surface-black text-apple-on-dark border-apple-surface-black shadow-md' 
                    : 'bg-apple-surface-pearl text-apple-ink border-white/60 hover:border-apple-primary/30'
                } ${isPrimary ? 'opacity-100 cursor-default' : 'cursor-pointer active:scale-95'}`}
              >
                {isSelected && color && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                )}
                {asset}
                {isPrimary && <span className="text-[9px] bg-apple-primary/20 text-apple-primary px-1.5 py-0.5 rounded-sm ml-1">MAIN</span>}
              </button>
            );
          })}
        </div>
        <p className="text-fine-print text-apple-ink-muted-48">
          비교할 자산을 최대 3개까지 선택할 수 있습니다.
        </p>
      </div>

      {/* Comparison Table / Grid */}
      <div className="w-full max-w-[1200px] px-4 overflow-x-auto">
        <div className="min-w-[800px] bg-apple-surface-pearl border border-white/60 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-apple-canvas-parchment/50 border-b border-apple-hairline">
                <th className="p-4 text-micro-legal font-bold text-apple-ink-muted-48 uppercase tracking-widest">자산</th>
                <th className="p-4 text-micro-legal font-bold text-apple-ink-muted-48 uppercase tracking-widest">최종 자산</th>
                <th className="p-4 text-micro-legal font-bold text-apple-ink-muted-48 uppercase tracking-widest text-center">누적 수익률</th>
                <th className="p-4 text-micro-legal font-bold text-apple-ink-muted-48 uppercase tracking-widest text-center">CAGR</th>
                <th className="p-4 text-micro-legal font-bold text-apple-ink-muted-48 uppercase tracking-widest text-center">MDD</th>
                <th className="p-4 text-micro-legal font-bold text-apple-ink-muted-48 uppercase tracking-widest text-center">변동성</th>
              </tr>
            </thead>
            <tbody>
              {allResults.map((res, i) => (
                <motion.tr 
                  key={res.assetId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-b border-apple-hairline last:border-0 hover:bg-apple-canvas-parchment/30 transition-colors"
                >
                  <td className="p-4 font-display font-semibold text-apple-ink flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: res.color }} />
                    {res.assetId}
                  </td>
                  <td className="p-4 font-display font-bold text-apple-ink">
                    {formatCurrency(res.result.metrics.finalValue)}
                  </td>
                  <td className={`p-4 text-center font-display font-semibold ${res.result.metrics.totalReturn >= 0 ? 'text-apple-primary' : 'text-apple-error'}`}>
                    {(res.result.metrics.totalReturn * 100).toFixed(2)}%
                  </td>
                  <td className="p-4 text-center font-display font-medium text-apple-ink">
                    {(res.result.metrics.cagr * 100).toFixed(2)}%
                  </td>
                  <td className="p-4 text-center font-display font-medium text-apple-error">
                    -{(res.result.metrics.mdd * 100).toFixed(2)}%
                  </td>
                  <td className="p-4 text-center font-display font-medium text-apple-ink-muted-64">
                    {(res.result.metrics.volatility * 100).toFixed(2)}%
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full h-[500px] bg-apple-surface-pearl border border-white/60 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-6 left-8 z-10 pointer-events-none">
          <h3 className="text-body-strong font-semibold text-apple-ink flex items-center gap-2">
            <span className="w-1 h-5 bg-apple-primary rounded-full" />
            자산별 과거 성과 비교
          </h3>
          <p className="text-fine-print text-apple-ink-muted-48 font-medium">
            {allResults[0].result.history[0].date} ~ {allResults[0].result.history[allResults[0].result.history.length - 1].date}
          </p>
        </div>
        <BacktestChart 
          results={allResults}
          currency={currency} 
        />
      </div>
    </div>
  );
};

export default BacktestView;
