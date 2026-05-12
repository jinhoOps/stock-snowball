import { useState, useMemo } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import GlobalNav from './components/layout/GlobalNav';
import ProductHero from './components/sections/ProductHero';
import SnowballChart from './components/charts/SnowballChart';
import KPIGrid from './components/sections/KPIGrid';
import SimulationControls from './components/sections/SimulationControls';
import AdvancedSettingsSheet from './components/sections/AdvancedSettingsSheet';
import { SnowballEngine } from './core/SnowballEngine';
import { useScenarios } from './hooks/useScenarios';
import { AccountType, StrategyType, StrategyConfig, SimulationResult, AssetType } from './types/finance';

function App() {
  const { scenarios, addScenario, loading } = useScenarios();
  
  // Basic State
  const [assetType, setAssetType] = useState<AssetType>('CUSTOM');
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

  // Comparison State
  const [comparingScenarioIds, setComparingScenarioIds] = useState<string[]>([]);

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

  const activeResult: SimulationResult = activeSimulation[activeSimulation.length - 1];
  const totalReturn = activeResult.postTaxValue - activeResult.totalContribution;
  const returnPercentage = (totalReturn / activeResult.totalContribution) * 100;
  const cagr = years > 0 ? (Math.pow(activeResult.postTaxValue / activeResult.totalContribution, 1 / years) - 1) * 100 : 0;

  const chartScenarios = useMemo(() => {
    const main = {
      id: 'active',
      name: scenarioName || '현재 설정',
      color: '#0066cc',
      points: activeSimulation.map(r => ({ date: r.date, value: r.postTaxValue }))
    };

    const comparing = scenarios
      .filter(s => comparingScenarioIds.includes(s.id))
      .map(s => {
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
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), // Random color for comparison
          points: sim.map(r => ({ date: r.date, value: r.postTaxValue }))
        };
      });

    return [main, ...comparing];
  }, [activeSimulation, scenarioName, scenarios, comparingScenarioIds]);

  const handleSaveScenario = async () => {
    await addScenario({
      name: scenarioName,
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
    alert('시나리오가 저장되었습니다.');
  };

  const toggleComparison = (id: string) => {
    setComparingScenarioIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-apple-canvas font-text">
      <GlobalNav />
      
      <main>
        <LayoutGroup>
          <ProductHero 
            title="부의 눈덩이를 설계하세요."
            subtitle="세금, 수수료, 과거 데이터까지 반영한 정교한 시뮬레이션"
          >
            <div className="w-full flex flex-col items-center">
              
              <SimulationControls 
                principal={principal} setPrincipal={setPrincipal}
                years={years} setYears={setYears}
                strategyBaseAmount={strategyBaseAmount} setStrategyBaseAmount={setStrategyBaseAmount}
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
              />

              <motion.div layout className="flex gap-4 mb-12">
                <input 
                  type="text" 
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="시나리오 이름"
                  className="bg-apple-canvas border border-apple-hairline rounded-sm px-4 py-2 text-caption outline-none focus:border-apple-primary transition-all"
                />
                <motion.button 
                  onClick={handleSaveScenario}
                  whileTap={{ scale: 0.95 }}
                  className="bg-apple-primary text-apple-on-dark px-8 py-2 rounded-pill text-button-utility font-medium hover:bg-apple-primary-focus transition-colors shadow-sm"
                >
                  저장하기
                </motion.button>
              </motion.div>

              <motion.div 
                layout
                key={activeResult.postTaxValue}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                className="mb-8 text-center"
              >
                <span className="text-caption text-apple-ink-muted-48 block mb-1 tracking-tight">{years}년 후 예상 자산 (세후 실질 가치)</span>
                <span className="text-display-md text-apple-primary font-display tracking-tight">
                  {SnowballEngine.formatKoreanWon(activeResult.postTaxValue)}
                </span>
              </motion.div>

              <motion.div layout className="w-full max-w-[1000px] mb-8 h-[450px]">
                <SnowballChart scenarios={chartScenarios} />
              </motion.div>

              <motion.div layout className="w-full max-w-[1000px]">
                <KPIGrid 
                  totalAsset={activeResult.postTaxValue}
                  totalContribution={activeResult.totalContribution}
                  totalReturn={totalReturn}
                  returnPercentage={returnPercentage}
                  cagr={cagr}
                  currency="KRW"
                />
              </motion.div>
            </div>
          </ProductHero>
        </LayoutGroup>

        <section className="bg-apple-canvas py-section px-4 flex flex-col items-center">
          <div className="w-full max-w-[1000px]">
            <h2 className="text-display-sm text-apple-ink mb-8 tracking-tight">저장된 시나리오</h2>
            {loading ? (
              <p>불러오는 중...</p>
            ) : scenarios.length === 0 ? (
              <p className="text-apple-ink-muted-48">저장된 시나리오가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scenarios.map((s) => (
                  <motion.div 
                    key={s.id} 
                    whileTap={{ scale: 0.98 }}
                    className={`bg-apple-canvas-parchment border rounded-lg p-6 transition-all cursor-pointer ${comparingScenarioIds.includes(s.id) ? 'border-apple-primary ring-1 ring-apple-primary' : 'border-apple-hairline hover:border-apple-primary/30'}`}
                    onClick={() => {
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-body-strong text-apple-ink tracking-tight">{s.name}</h3>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComparison(s.id);
                        }}
                        className={`text-caption-strong px-2 py-1 rounded-sm border ${comparingScenarioIds.includes(s.id) ? 'bg-apple-primary text-white border-apple-primary' : 'bg-white text-apple-ink border-apple-hairline'}`}
                      >
                        비교 {comparingScenarioIds.includes(s.id) ? '취소' : ''}
                      </button>
                    </div>
                    <p className="text-caption text-apple-ink-muted-48">
                      {SnowballEngine.formatKoreanWon(s.principal)} + 월 {SnowballEngine.formatKoreanWon(s.strategyBaseAmount)}
                    </p>
                    <p className="text-caption text-apple-ink-muted-48">
                      {s.years}년 | {s.assetType === 'CUSTOM' ? `${(s.annualRate * 100).toFixed(1)}%` : s.assetType} | {s.accountType}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-apple-canvas-parchment border-t border-apple-hairline py-12 px-4 text-center">
        <p className="text-fine-print text-apple-ink-muted-48 tracking-tight">
          &copy; 2026 Stock Snowball. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App;


