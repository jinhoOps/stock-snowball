import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import GlobalNav from './components/layout/GlobalNav';
import ProductHero from './components/sections/ProductHero';
import SnowballChart from './components/charts/SnowballChart';
import KPIGrid from './components/sections/KPIGrid';
import BacktestView from './components/sections/BacktestView';
import SimulationControls from './components/sections/SimulationControls';
import AdvancedSettingsSheet from './components/sections/AdvancedSettingsSheet';
import { SnowballEngine } from './core/SnowballEngine';
import { BacktestEngine } from './core/BacktestEngine';
import { useScenarios } from './hooks/useScenarios';
import { StrategyConfig, SimulationResult, SimulationMode, SimulationParams, SimulationRangeResult } from './types/finance';
import { getHistoricalData, calculateMedianCAGR } from './data/historicalAssets';

const MILESTONES = [100_000_000, 500_000_000, 1_000_000_000, 5_000_000_000, 10_000_000_000];

// Fixed colors for scenarios to avoid re-renders
const SCENARIO_COLORS = [
  '#0066cc', // Main
  '#FF9500', // Orange
  '#34C759', // Green
  '#AF52DE', // Purple
  '#FF2D55', // Red
  '#5AC8FA', // Blue
  '#FFCC00', // Yellow
];

function App() {
  const { scenarios, addScenario, removeScenario, loading } = useScenarios();
  const lastCelebratedMilestone = useRef<number>(0);

  // Basic State
  const [mode, setMode] = useState<SimulationMode>('PROJECTION');
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW');
  const [exchangeRate, setExchangeRate] = useState(1450); // 기본 환율
  const [scenarioName, setScenarioName] = useState('기본 시나리오');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Decoupled Parameters
  const [projectionParams, setProjectionParams] = useState<SimulationParams>({
    principal: 10000000,
    contribution: 1000000,
    cycle: 'MONTHLY',
    assetType: 'CUSTOM',
    years: 10,
    rate: 0.08,
    accountType: 'GENERAL',
    inflationRate: 0.02,
    strategyType: 'FIXED',
    strategyIncreaseRate: 0.05,
  });

  const [backtestParams, setBacktestParams] = useState<SimulationParams>({
    principal: 10000000,
    contribution: 1000000,
    cycle: 'MONTHLY',
    assetType: 'SPY',
    years: 10,
    rate: 0.08,
    accountType: 'GENERAL',
    inflationRate: 0.02,
    strategyType: 'FIXED',
    strategyIncreaseRate: 0.05,
    startDate: '2010-01-01',
    endDate: '2024-01-01',
  });

  const activeParams = mode === 'PROJECTION' ? projectionParams : backtestParams;
  
  const handleUpdateParams = (newParams: Partial<SimulationParams>) => {
    if (mode === 'PROJECTION') {
      setProjectionParams(prev => ({ ...prev, ...newParams }));
    } else {
      setBacktestParams(prev => ({ ...prev, ...newParams }));
    }
  };

  const handleCurrencyChange = (newCurrency: 'KRW' | 'USD') => {
    if (newCurrency === currency) return;

    // Convert values for both modes
    const convert = (params: SimulationParams) => ({
      ...params,
      principal: SnowballEngine.convertCurrency(params.principal, exchangeRate, newCurrency),
      contribution: SnowballEngine.convertCurrency(params.contribution, exchangeRate, newCurrency),
    });

    setProjectionParams(convert(projectionParams));
    setBacktestParams(convert(backtestParams));
    setCurrency(newCurrency);
  };

  // Comparison State
  const [comparingScenarioIds, setComparingScenarioIds] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ date: Date; points: { name: string; value: number; color: string; pessimistic?: number; optimistic?: number }[] } | null>(null);

  const activeSimulation: SimulationRangeResult = useMemo(() => {
    const strategy: StrategyConfig = {
      type: projectionParams.strategyType,
      baseAmount: projectionParams.contribution,
      increaseRate: projectionParams.strategyIncreaseRate,
    };

    // 자산별 Median CAGR 자동 적용 (커스텀이 아닐 경우)
    const effectiveRate = projectionParams.assetType === 'CUSTOM' 
      ? projectionParams.rate 
      : calculateMedianCAGR(projectionParams.assetType);

    return SnowballEngine.simulateRange(
      projectionParams.principal,
      effectiveRate,
      projectionParams.years,
      strategy,
      projectionParams.inflationRate,
      projectionParams.accountType,
      undefined,
      undefined,
      undefined,
      30,
      projectionParams.assetType
    );
  }, [projectionParams]);

  const activeBacktest = useMemo(() => {
    if (mode !== 'BACKTEST') return null;
    
    // 선택된 자산의 과거 데이터 사용
    const data = getHistoricalData(backtestParams.assetType);
    
    const params = {
      initialPrincipal: backtestParams.principal,
      monthlyInstallment: backtestParams.contribution,
      cycle: backtestParams.cycle,
      startDate: backtestParams.startDate || '2010-01-01',
      endDate: backtestParams.endDate || '2024-01-01',
      reinvestDividends: true,
      assetId: backtestParams.assetType,
      accountType: backtestParams.accountType,
      buyFeeRate: 0.00015,
      sellFeeRate: 0.00015,
      taxDividendRate: 0.154,
      taxCapitalGainRate: 0.22,
      taxIsaLimit: 2000000,
      taxIsaReducedRate: 0.095,
    };

    try {
      return BacktestEngine.run(params, data);
    } catch (e) {
      console.error('Backtest error:', e);
      return null;
    }
  }, [mode, backtestParams]);

  const activeResult: SimulationResult = mode === 'PROJECTION' 
    ? activeSimulation.average[activeSimulation.average.length - 1]
    : ({ 
        postTaxValue: activeBacktest?.metrics.finalValue || 0, 
        totalContribution: activeBacktest?.metrics.totalPrincipal || 0,
        nominalValue: activeBacktest?.metrics.finalValue || 0,
        realValue: activeBacktest?.metrics.finalValue || 0,
        totalGains: (activeBacktest?.metrics.finalValue || 0) - (activeBacktest?.metrics.totalPrincipal || 0),
        totalFees: 0,
        estimatedTax: 0,
        date: new Date()
      } as SimulationResult);

  const totalReturn = activeResult.postTaxValue - activeResult.totalContribution;
  const returnPercentage = activeResult.totalContribution > 0 ? (totalReturn / activeResult.totalContribution) * 100 : 0;
  const cagr = mode === 'PROJECTION' && projectionParams.years > 0 
    ? (Math.pow(activeResult.postTaxValue / activeResult.totalContribution, 1 / projectionParams.years) - 1) * 100 
    : (activeBacktest?.metrics.cagr || 0) * 100;
  
  // Milestone Celebration Effect
  useEffect(() => {
    const currentAsset = activeResult.postTaxValue;
    const milestoneReached = MILESTONES.findLast((m: number) => currentAsset >= m);
    
    if (milestoneReached && milestoneReached > lastCelebratedMilestone.current) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0066cc', '#5AC8FA', '#FFFFFF'],
        disableForReducedMotion: true
      });
      lastCelebratedMilestone.current = milestoneReached;
    } else if (!milestoneReached) {
      lastCelebratedMilestone.current = 0;
    }
  }, [activeResult.postTaxValue, mode]);

  const chartScenarios = useMemo(() => {
    const main = {
      id: 'active-scenario',
      name: scenarioName || (mode === 'PROJECTION' ? '현재 예측' : '현재 백테스트'),
      color: mode === 'PROJECTION' ? SCENARIO_COLORS[0] : '#FF9500',
      points: mode === 'PROJECTION' 
        ? activeSimulation.average.map((r, i) => ({ 
            date: r.date, 
            value: r.postTaxValue,
            pessimistic: activeSimulation.pessimistic[i].postTaxValue,
            optimistic: activeSimulation.optimistic[i].postTaxValue,
            contribution: r.totalContribution
          }))
        : (activeBacktest?.history.map(r => ({ date: new Date(r.date), value: r.value, contribution: r.principal })) || [])
    };

    const comparing = scenarios
      .filter(s => comparingScenarioIds.includes(s.id))
      .map((s, index) => {
        if (s.simulationMode === 'BACKTEST') {
          const data = getHistoricalData(s.assetType || 'SPY');
          const bt = BacktestEngine.run({
            initialPrincipal: s.principal,
            monthlyInstallment: s.strategyBaseAmount,
            cycle: s.contributionCycle || 'MONTHLY',
            startDate: s.backtestStartDate || '2010-01-01',
            endDate: s.backtestEndDate || '2024-01-01',
            reinvestDividends: true,
            assetId: s.assetType || 'SPY',
            accountType: s.accountType,
            buyFeeRate: 0.00015,
            sellFeeRate: 0.00015,
            taxDividendRate: 0.154,
            taxCapitalGainRate: 0.22,
            taxIsaLimit: 2000000,
            taxIsaReducedRate: 0.095,
          }, data);
          return {
            id: s.id,
            name: s.name,
            color: SCENARIO_COLORS[(index + 1) % SCENARIO_COLORS.length],
            points: bt.history.map(r => ({ date: new Date(r.date), value: r.value, contribution: r.principal }))
          };
        }

        const sim = SnowballEngine.simulateRange(
          s.principal,
          s.annualRate,
          s.years,
          { type: s.strategyType, baseAmount: s.strategyBaseAmount, increaseRate: s.strategyIncreaseRate },
          s.inflationRate,
          s.accountType,
          undefined,
          undefined,
          undefined,
          30,
          s.assetType || 'CUSTOM'
        );
        return {
          id: s.id,
          name: s.name,
          color: SCENARIO_COLORS[(index + 1) % SCENARIO_COLORS.length],
          points: sim.average.map((r, i) => ({ 
            date: r.date, 
            value: r.postTaxValue,
            pessimistic: sim.pessimistic[i].postTaxValue,
            optimistic: sim.optimistic[i].postTaxValue,
            contribution: r.totalContribution
          }))
        };
      });

    return [main, ...comparing];
  }, [activeSimulation, activeBacktest, scenarioName, scenarios, comparingScenarioIds, mode]);

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      alert('시나리오 이름을 입력해주세요.');
      return;
    }

    try {
      await addScenario({
        name: scenarioName,
        simulationMode: mode,
        backtestStartDate: activeParams.startDate,
        backtestEndDate: activeParams.endDate,
        reinvestDividends: true,
        principal: activeParams.principal,
        annualRate: mode === 'PROJECTION' ? (activeParams.assetType === 'CUSTOM' ? activeParams.rate : calculateMedianCAGR(activeParams.assetType)) : activeParams.rate,
        years: activeParams.years,
        dailyContribution: activeParams.contribution / 30.42,
        strategyType: activeParams.strategyType,
        strategyBaseAmount: activeParams.contribution,
        strategyIncreaseRate: activeParams.strategyIncreaseRate,
        contributionCycle: activeParams.cycle,
        assetType: activeParams.assetType,
        accountType: activeParams.accountType,
        inflationRate: activeParams.inflationRate,
        buyFeeRate: 0.00015,
        sellFeeRate: 0.00015,
        taxDividendRate: 0.154,
        taxCapitalGainRate: 0.22,
        taxIsaLimit: 2000000,
        taxIsaReducedRate: 0.095,
        currency: currency,
        exchangeRate: exchangeRate,
        exchangeAnnualChangeRate: 0,
      });
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.8 }, colors: ['#34C759', '#30B0C7', '#FFFFFF'] });
      alert(`'${scenarioName}' 시나리오가 저장되었습니다.`);
    } catch (e) {
      console.error('Failed to save scenario:', e);
      alert('시나리오 저장에 실패했습니다.');
    }
  };

  const toggleComparison = (id: string) => {
    setComparingScenarioIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-apple-canvas font-text">
      <GlobalNav onOpenAdvanced={() => setIsAdvancedOpen(true)} />
      
      <main>
        <LayoutGroup>
          <ProductHero 
            title={mode === 'BACKTEST' ? "과거가 보여주는 부의 지도." : "부의 눈덩이를 설계하세요."}
            subtitle={mode === 'BACKTEST' ? "실제 역사적 데이터를 통한 투자 전략 검증" : "세금, 수수료, 과거 데이터까지 반영한 정교한 시뮬레이션"}
          >
            <div className="w-full flex flex-col items-center">
              
              <SimulationControls 
                mode={mode} setMode={setMode}
                params={activeParams}
                onUpdate={handleUpdateParams}
                currency={currency} setCurrency={handleCurrencyChange}
                exchangeRate={exchangeRate}
                onOpenAdvanced={() => setIsAdvancedOpen(true)}
              />

              <AdvancedSettingsSheet 
                isOpen={isAdvancedOpen}
                onClose={() => setIsAdvancedOpen(false)}
                params={activeParams}
                onUpdate={handleUpdateParams}
                exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
              />

              <motion.div layout className="flex gap-4 mb-16 w-full max-w-[500px]">
                <input 
                  type="text" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="시나리오 이름 입력"
                  className="flex-1 h-12 bg-apple-canvas border border-apple-hairline rounded-pill px-6 text-body outline-none focus:border-apple-primary transition-all font-text shadow-sm"
                />
                <motion.button 
                  onClick={handleSaveScenario}
                  whileTap={{ scale: 0.95 }}
                  className="h-12 bg-apple-primary text-apple-on-dark px-10 rounded-pill text-button-utility font-semibold hover:bg-apple-primary-focus transition-all shadow-md"
                >
                  저장하기
                </motion.button>
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div 
                  key={mode}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
                  className="w-full flex flex-col items-center"
                >
                  <div className="mb-10 text-center">
                    <span className="text-caption-strong text-apple-ink-muted-48 block mb-2 tracking-tight uppercase font-display">
                      {mode === 'PROJECTION' ? `${projectionParams.years}년 후 예상 자산 (세후 실질 가치)` : '백테스트 최종 자산'}
                    </span>
                    <span className="text-display-lg text-apple-primary font-display tracking-tight">
                      {SnowballEngine.formatDualCurrency(activeResult.postTaxValue, currency, exchangeRate)}
                    </span>
                  </div>

                  <div className="w-full max-w-[1000px] mb-8 h-[480px] bg-apple-canvas border border-apple-hairline rounded-lg p-6 shadow-sm">
                    <SnowballChart 
                      scenarios={chartScenarios} 
                      mode={mode}
                      comparisonMode={comparingScenarioIds.length > 0}
                      onPointHover={(d) => d && setSelectedPoint(d as any)}
                      onPointSelect={(d) => setSelectedPoint(d as any)}
                    />
                  </div>

                  <AnimatePresence>
                    {selectedPoint && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="w-full max-w-[1000px] mb-12 overflow-hidden"
                      >
                        <div className="bg-apple-canvas-parchment/50 backdrop-blur-sm border border-apple-hairline rounded-lg p-6 shadow-inner">
                          <div className="flex items-center justify-between mb-4 border-b border-apple-hairline pb-2">
                            <span className="text-body-strong text-apple-ink font-display">
                              {comparingScenarioIds.length > 0 ? '경과 개월수 기준 상세' : selectedPoint.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' 기준 상세'}
                            </span>
                            <button onClick={() => setSelectedPoint(null)} className="text-caption text-apple-ink-muted-48 hover:text-apple-ink transition-colors">닫기</button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedPoint.points.map((p, i) => (
                              <div key={i} className="flex flex-col p-4 bg-apple-canvas rounded-xl border border-apple-hairline shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                  <span className="text-caption text-apple-gray truncate">{p.name}</span>
                                </div>
                                <span className="font-bold text-apple-ink text-body-strong mb-1">{SnowballEngine.formatBigNumber(p.value, currency)}</span>
                                {p.optimistic && p.pessimistic && (
                                  <span className="text-[10px] text-apple-ink-muted-48">범위: {SnowballEngine.formatBigNumber(p.pessimistic, currency)} ~ {SnowballEngine.formatBigNumber(p.optimistic, currency)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full max-w-[1000px]">
                    <KPIGrid 
                      totalAsset={activeResult.postTaxValue}
                      totalContribution={activeResult.totalContribution}
                      totalReturn={totalReturn}
                      returnPercentage={returnPercentage}
                      cagr={cagr}
                      currency={currency}
                      exchangeRate={exchangeRate}
                      isMilestoneReached={currency === 'KRW' && MILESTONES.some(m => activeResult.postTaxValue >= m)}
                    />
                  </div>

                  {mode === 'BACKTEST' && activeBacktest && (
                    <div className="w-full max-w-[1200px] mt-12">
                      <BacktestView result={activeBacktest} assetName={backtestParams.assetType} />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ProductHero>
        </LayoutGroup>

        <section className="bg-apple-canvas-parchment py-section px-4 flex flex-col items-center border-t border-apple-hairline">
          <div className="w-full max-w-[1000px]">
            <h2 className="text-display-sm text-apple-ink mb-10 tracking-tight font-display">저장된 시나리오</h2>
            {loading ? (
              <p className="font-text text-apple-ink-muted-48">불러오는 중...</p>
            ) : scenarios.length === 0 ? (
              <p className="text-apple-ink-muted-48 font-text">저장된 시나리오가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scenarios.map((s) => (
                  <motion.div 
                    key={s.id} whileTap={{ scale: 0.98 }}
                    className={`bg-apple-canvas border rounded-lg p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden ${comparingScenarioIds.includes(s.id) ? 'border-apple-primary ring-2 ring-apple-primary/20' : 'border-apple-hairline hover:border-apple-primary/30'}`}
                    onClick={() => {
                      setMode(s.simulationMode || 'PROJECTION');
                      const newParams: SimulationParams = {
                        principal: s.principal,
                        contribution: s.strategyBaseAmount,
                        cycle: s.contributionCycle || 'MONTHLY',
                        assetType: s.assetType || 'CUSTOM',
                        years: s.years,
                        rate: s.annualRate,
                        accountType: s.accountType,
                        inflationRate: s.inflationRate,
                        strategyType: s.strategyType,
                        strategyIncreaseRate: s.strategyIncreaseRate || 0.05,
                        startDate: s.backtestStartDate,
                        endDate: s.backtestEndDate,
                      };
                      if (s.simulationMode === 'BACKTEST') setBacktestParams(newParams);
                      else setProjectionParams(newParams);
                      setScenarioName(s.name);
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-body-strong text-apple-ink tracking-tight font-display">{s.name}</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleComparison(s.id); }}
                          className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-pill border transition-all ${comparingScenarioIds.includes(s.id) ? 'bg-apple-primary text-white border-apple-primary shadow-sm' : 'bg-apple-canvas-parchment text-apple-ink border-apple-hairline hover:bg-apple-canvas'}`}
                        >
                          {comparingScenarioIds.includes(s.id) ? '비교 중' : '비교하기'}
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('정말 삭제하시겠습니까?')) {
                              try { await removeScenario(s.id); } catch (err) { alert('삭제에 실패했습니다.'); }
                            }
                          }}
                          className="p-1.5 rounded-full hover:bg-apple-error/10 text-apple-ink-muted-48 hover:text-apple-error transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-caption text-apple-ink-muted-48 font-text">초기 {SnowballEngine.formatKoreanWon(s.principal)}</p>
                      <p className="text-caption text-apple-ink-muted-48 font-text">월 {SnowballEngine.formatKoreanWon(s.strategyBaseAmount)} ({s.years}년)</p>
                      <p className="text-caption-strong text-apple-primary font-display mt-2">{s.assetType === 'CUSTOM' ? `수익률 ${(s.annualRate * 100).toFixed(1)}%` : s.assetType} | {s.accountType}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-apple-canvas-parchment border-t border-apple-hairline py-16 px-4 text-center">
        <div className="max-w-[1000px] mx-auto">
          <p className="text-fine-print text-apple-ink-muted-48 tracking-tight font-text mb-2">본 시뮬레이션은 과거 데이터를 기반으로 하며, 미래의 수익을 보장하지 않습니다.</p>
          <p className="text-fine-print text-apple-ink-muted-48 tracking-tight font-text">&copy; 2026 Stock Snowball. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
