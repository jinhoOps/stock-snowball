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
import { AccountType, StrategyType, StrategyConfig, SimulationResult, AssetType, SimulationMode, ContributionCycle } from './types/finance';
import { getHistoricalData } from './data/historicalAssets';

const MILESTONES = [100_000_000, 500_000_000, 1_000_000_000, 5_000_000_000, 10_000_000_000];
// ... (omitting SCENARIO_COLORS for brevity in thoughts, but will include in actual call)

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
  const { scenarios, addScenario, loading } = useScenarios();
  const lastCelebratedMilestone = useRef<number>(0);
  
  // Basic State
  const [mode, setMode] = useState<SimulationMode>('PROJECTION');
  const [assetType, setAssetType] = useState<AssetType>('CUSTOM');
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW');
  const [exchangeRate, setExchangeRate] = useState(1450); // 기본 환율
  const [contributionCycle, setContributionCycle] = useState<ContributionCycle>('MONTHLY');
  const [principal, setPrincipal] = useState(10000000); 
  const [rate, setRate] = useState(0.08); 
  const [years, setYears] = useState(10);
  const [scenarioName, setScenarioName] = useState('기본 시나리오');

  // Advanced State
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [strategyType, setStrategyType] = useState<StrategyType>('FIXED');
  const [strategyBaseAmount, setStrategyBaseAmount] = useState(1000000); // 월 100만원
  const [strategyIncreaseRate, setStrategyIncreaseRate] = useState(0.05);
  const [accountType, setAccountType] = useState<AccountType>('GENERAL');
  const [inflationRate, setInflationRate] = useState(0.02);

  // Backtest specific state (dates)
  const [backtestStartDate, _setBacktestStartDate] = useState('2010-01-01');
  const [backtestEndDate, _setBacktestEndDate] = useState('2024-01-01');

  // Comparison State
  const [comparingScenarioIds, setComparingScenarioIds] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ date: Date; points: { name: string; value: number; color: string }[] } | null>(null);

  const activeSimulation = useMemo(() => {
    const strategy: StrategyConfig = {
      type: strategyType,
      baseAmount: strategyBaseAmount,
      increaseRate: strategyIncreaseRate,
    };

    return SnowballEngine.simulate(
      principal,
      rate,
      years,
      strategy,
      inflationRate,
      accountType,
      undefined,
      undefined,
      undefined,
      30,
      assetType
    );
  }, [principal, rate, years, strategyType, strategyBaseAmount, strategyIncreaseRate, inflationRate, accountType, assetType]);

  const activeBacktest = useMemo(() => {
    if (mode !== 'BACKTEST') return null;
    
    // SPY 데이터를 기본으로 사용 (자산 선택 로직은 추후 고도화)
    const data = getHistoricalData(assetType === 'CUSTOM' ? 'SPY' : assetType);
    
    const params = {
      initialPrincipal: principal,
      monthlyInstallment: strategyBaseAmount,
      startDate: backtestStartDate,
      endDate: backtestEndDate,
      reinvestDividends: true,
      assetId: assetType,
    };

    try {
      return BacktestEngine.run(params, data);
    } catch (e) {
      console.error('Backtest error:', e);
      return null;
    }
  }, [mode, assetType, principal, strategyBaseAmount, backtestStartDate, backtestEndDate]);

  const activeResult: SimulationResult = activeSimulation[activeSimulation.length - 1];
  const totalReturn = activeResult.postTaxValue - activeResult.totalContribution;
  const returnPercentage = (totalReturn / activeResult.totalContribution) * 100;
  const cagr = years > 0 ? (Math.pow(activeResult.postTaxValue / activeResult.totalContribution, 1 / years) - 1) * 100 : 0;
  
  // Milestone Celebration Effect
  useEffect(() => {
    const currentAsset = mode === 'PROJECTION' ? activeResult.postTaxValue : (activeBacktest?.metrics.finalValue || 0);
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
  }, [activeResult.postTaxValue, activeBacktest?.metrics.finalValue, mode]);

  const chartScenarios = useMemo(() => {
    const main = {
      id: 'active-scenario',
      name: scenarioName || '현재 설정',
      color: SCENARIO_COLORS[0],
      points: activeSimulation.map(r => ({ date: r.date, value: r.postTaxValue }))
    };

    const comparing = scenarios
      .filter(s => comparingScenarioIds.includes(s.id))
      .map((s, index) => {
        const sim = SnowballEngine.simulate(
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
          points: sim.map(r => ({ date: r.date, value: r.postTaxValue }))
        };
      });

    return [main, ...comparing];
  }, [activeSimulation, scenarioName, scenarios, comparingScenarioIds]);

  const handleSaveScenario = async () => {
    try {
      await addScenario({
        name: scenarioName,
        simulationMode: mode,
        backtestStartDate,
        backtestEndDate,
        reinvestDividends: true,
        principal,
        annualRate: rate,
        years,
        dailyContribution: strategyBaseAmount / 30.42, // legacy field
        strategyType,
        strategyBaseAmount,
        strategyIncreaseRate,
        assetType,
        accountType,
        inflationRate,
        buyFeeRate: 0.00015,
        sellFeeRate: 0.00015,
        taxDividendRate: 0.154,
        taxCapitalGainRate: 0.22,
        taxIsaLimit: 2000000,
        taxIsaReducedRate: 0.095,
        currency: 'KRW',
        exchangeRate: 1,
        exchangeAnnualChangeRate: 0,
      });
      // Use a more subtle feedback if needed, but for now just console log to avoid blocking thread
      console.log('Scenario saved successfully');
    } catch (e) {
      console.error('Failed to save scenario:', e);
    }
  };

  const toggleComparison = (id: string) => {
    setComparingScenarioIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
                principal={principal} setPrincipal={setPrincipal}
                years={years} setYears={setYears}
                strategyBaseAmount={strategyBaseAmount} setStrategyBaseAmount={setStrategyBaseAmount}
                currency={currency} setCurrency={setCurrency}
                exchangeRate={exchangeRate}
                contributionCycle={contributionCycle}
                onOpenAdvanced={() => setIsAdvancedOpen(true)}
              />

              <AdvancedSettingsSheet 
                isOpen={isAdvancedOpen}
                onClose={() => setIsAdvancedOpen(false)}
                assetType={assetType} setAssetType={setAssetType}
                annualRate={rate} setAnnualRate={setRate}
                strategyType={strategyType} setStrategyType={setStrategyType}
                accountType={accountType} setAccountType={setAccountType}
                inflationRate={inflationRate} setInflationRate={setInflationRate}
                exchangeRate={exchangeRate} setExchangeRate={setExchangeRate}
                contributionCycle={contributionCycle} setContributionCycle={setContributionCycle}
              />

              <motion.div layout className="flex gap-4 mb-16 w-full max-w-[500px]">
                <input 
                  type="text" 
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
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
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
                  className="w-full flex flex-col items-center"
                >
                  {mode === 'PROJECTION' ? (
                    <>
                      <div className="mb-10 text-center">
                        <span className="text-caption-strong text-apple-ink-muted-48 block mb-2 tracking-tight uppercase font-display">{years}년 후 예상 자산 (세후 실질 가치)</span>
                        <span className="text-display-lg text-apple-primary font-display tracking-tight">
                          {SnowballEngine.formatBigNumber(activeResult.postTaxValue, currency)}
                        </span>
                      </div>

                      <div className="w-full max-w-[1000px] mb-8 h-[480px] bg-apple-canvas border border-apple-hairline rounded-lg p-6 shadow-sm">
                        <SnowballChart 
                          scenarios={chartScenarios} 
                          onPointHover={(d) => d && setSelectedPoint(d)}
                          onPointSelect={(d) => setSelectedPoint(d)}
                        />
                      </div>

                      {/* Selected Point Details */}
                      <AnimatePresence>
                        {selectedPoint && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full max-w-[1000px] mb-12 overflow-hidden"
                          >
                            <div className="bg-apple-canvas-parchment/50 backdrop-blur-sm border border-apple-hairline rounded-lg p-6 shadow-inner">
                              <div className="flex items-center justify-between mb-4 border-b border-apple-hairline pb-2">
                                <span className="text-body-strong text-apple-ink font-display">
                                  {selectedPoint.date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준 상세 자산
                                </span>
                                <button 
                                  onClick={() => setSelectedPoint(null)}
                                  className="text-caption text-apple-ink-muted-48 hover:text-apple-ink transition-colors"
                                >
                                  닫기
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {selectedPoint.points.map((p, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-apple-canvas rounded-pill border border-apple-hairline shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                      <span className="text-caption text-apple-gray truncate max-w-[100px]">{p.name}</span>
                                    </div>
                                    <span className="font-bold text-apple-ink text-body-strong">
                                      {SnowballEngine.formatBigNumber(p.value, currency)}
                                    </span>
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
                          isMilestoneReached={currency === 'KRW' && MILESTONES.some(m => activeResult.postTaxValue >= m)}
                        />
                      </div>
                    </>
                  ) : (
                    activeBacktest && (
                      <div className="w-full max-w-[1200px]">
                        <BacktestView result={activeBacktest} assetName={assetType === 'CUSTOM' ? 'SPY' : assetType} />
                      </div>
                    )
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
                    key={s.id} 
                    whileTap={{ scale: 0.98 }}
                    className={`bg-apple-canvas border rounded-lg p-6 transition-all cursor-pointer shadow-sm relative overflow-hidden ${comparingScenarioIds.includes(s.id) ? 'border-apple-primary ring-2 ring-apple-primary/20' : 'border-apple-hairline hover:border-apple-primary/30'}`}
                    onClick={() => {
                      setMode(s.simulationMode || 'PROJECTION');
                      if (s.backtestStartDate) _setBacktestStartDate(s.backtestStartDate);
                      if (s.backtestEndDate) _setBacktestEndDate(s.backtestEndDate);
                      setAssetType(s.assetType || 'CUSTOM');
                      setPrincipal(s.principal);
                      setRate(s.annualRate);
                      setYears(s.years);
                      setStrategyType(s.strategyType);
                      setStrategyBaseAmount(s.strategyBaseAmount);
                      setStrategyIncreaseRate(s.strategyIncreaseRate || 0.05);
                      setAccountType(s.accountType);
                      setInflationRate(s.inflationRate);
                      setScenarioName(s.name);
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-body-strong text-apple-ink tracking-tight font-display">{s.name}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComparison(s.id);
                        }}
                        className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-pill border transition-all ${comparingScenarioIds.includes(s.id) ? 'bg-apple-primary text-white border-apple-primary shadow-sm' : 'bg-apple-canvas-parchment text-apple-ink border-apple-hairline hover:bg-apple-canvas'}`}
                      >
                        {comparingScenarioIds.includes(s.id) ? '비교 중' : '비교하기'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-caption text-apple-ink-muted-48 font-text">
                        초기 {SnowballEngine.formatKoreanWon(s.principal)}
                      </p>
                      <p className="text-caption text-apple-ink-muted-48 font-text">
                        월 {SnowballEngine.formatKoreanWon(s.strategyBaseAmount)} ({s.years}년)
                      </p>
                      <p className="text-caption-strong text-apple-primary font-display mt-2">
                        {s.assetType === 'CUSTOM' ? `수익률 ${(s.annualRate * 100).toFixed(1)}%` : s.assetType} | {s.accountType}
                      </p>
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
          <p className="text-fine-print text-apple-ink-muted-48 tracking-tight font-text mb-2">
            본 시뮬레이션은 과거 데이터를 기반으로 하며, 미래의 수익을 보장하지 않습니다.
          </p>
          <p className="text-fine-print text-apple-ink-muted-48 tracking-tight font-text">
            &copy; 2026 Stock Snowball. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;


