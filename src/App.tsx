import { useState, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import GlobalNav from './components/layout/GlobalNav';
import ProductHero from './components/sections/ProductHero';
import SnowballChart from './components/charts/SnowballChart';
import KPIGrid from './components/sections/KPIGrid';
import { SnowballEngine } from './core/SnowballEngine';
import { useScenarios } from './hooks/useScenarios';

function App() {
  const { scenarios, addScenario, loading } = useScenarios();
  const [principal, setPrincipal] = useState(10000000); // 1,000만원
  const [rate, setRate] = useState(0.05); // 5%
  const [years, setYears] = useState(10); // 10년
  const [dailyContribution, setDailyContribution] = useState(30000); // 일 3만원
  const [scenarioName, setScenarioName] = useState('기본 시나리오');

  const chartData = useMemo(() => {
    return SnowballEngine.generateSeries(principal, rate, years, dailyContribution);
  }, [principal, rate, years, dailyContribution]);

  const finalAmount = chartData[chartData.length - 1]?.value || 0;
  const totalContribution = principal + (dailyContribution * years * 365);
  const totalReturn = finalAmount - totalContribution;
  const returnPercentage = (totalReturn / totalContribution) * 100;
  
  // CAGR = (Final Value / Initial Value)^(1/years) - 1
  const cagr = years > 0 ? (Math.pow(finalAmount / totalContribution, 1 / years) - 1) * 100 : 0;

  const handleSaveScenario = async () => {
    await addScenario({
      name: scenarioName,
      principal,
      annualRate: rate,
      years,
      dailyContribution,
      inflationRate: 0.02, // 기본 2%
      currency: 'KRW',
      exchangeRate: 1350,
    });
    alert('시나리오가 저장되었습니다.');
  };

  return (
    <div className="min-h-screen bg-apple-canvas font-text">
      <GlobalNav />
      
      <main>
        <LayoutGroup>
          <ProductHero 
            title="당신의 자산이 눈덩이처럼 불어납니다."
            subtitle="작은 습관이 만드는 거대한 변화를 시각화하세요."
          >
            <div className="w-full flex flex-col items-center">
              {/* Controls */}
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 w-full max-w-[1000px]">
                <div className="flex flex-col items-start">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">초기 자산 (원)</label>
                  <input 
                    type="number" 
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">매일 불입액 (원)</label>
                  <input 
                    type="number" 
                    value={dailyContribution}
                    onChange={(e) => setDailyContribution(Number(e.target.value))}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">연이율 (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={rate * 100}
                    onChange={(e) => setRate(Number(e.target.value) / 100)}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <label className="text-caption-strong text-apple-ink mb-2 tracking-tight">기간 (년)</label>
                  <input 
                    type="number" 
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary focus:ring-1 focus:ring-apple-primary transition-all"
                  />
                </div>
              </motion.div>

              {/* Scenario Actions */}
              <motion.div layout className="flex gap-4 mb-8">
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

              {/* Final Result Display */}
              <motion.div 
                layout
                key={finalAmount}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                className="mb-8 text-center"
              >
                <span className="text-caption text-apple-ink-muted-48 block mb-1 tracking-tight">{years}년 후 예상 자산</span>
                <span className="text-display-md text-apple-primary font-display tracking-tight">
                  {SnowballEngine.formatKoreanWon(finalAmount)}
                </span>
              </motion.div>

              {/* Chart */}
              <motion.div layout className="w-full max-w-[1000px] mb-8">
                <SnowballChart data={chartData} />
              </motion.div>

              {/* KPI Grid */}
              <motion.div layout className="w-full max-w-[1000px]">
                <KPIGrid 
                  totalAsset={finalAmount}
                  totalContribution={totalContribution}
                  totalReturn={totalReturn}
                  returnPercentage={returnPercentage}
                  cagr={cagr}
                  currency="KRW"
                />
              </motion.div>
            </div>
          </ProductHero>
        </LayoutGroup>

        {/* Saved Scenarios List */}
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
                    className="bg-apple-canvas-parchment border border-apple-hairline rounded-lg p-6 hover:border-apple-primary/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setPrincipal(s.principal);
                      setRate(s.annualRate);
                      setYears(s.years);
                      setDailyContribution(s.dailyContribution);
                      setScenarioName(s.name);
                    }}
                  >
                    <h3 className="text-body-strong text-apple-ink mb-2 tracking-tight">{s.name}</h3>
                    <p className="text-caption text-apple-ink-muted-48">
                      {SnowballEngine.formatKoreanWon(s.principal)} + 매일 {SnowballEngine.formatKoreanWon(s.dailyContribution)}
                    </p>
                    <p className="text-caption text-apple-ink-muted-48">
                      {s.years}년 | {(s.annualRate * 100).toFixed(1)}%
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Store Style Info Section */}
        <section className="bg-apple-canvas-parchment py-section px-4 flex flex-col items-center justify-center text-center">
          <div className="max-w-[600px]">
            <h2 className="text-display-lg text-apple-ink mb-4 tracking-tight">복리의 마법</h2>
            <p className="text-lead text-apple-ink-muted-80 mb-8 tracking-tight">
              시간은 투자자의 가장 강력한 무기입니다. 알베르트 아인슈타인은 복리를 '세계 8대 불가사의'라고 불렀습니다.
            </p>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="bg-apple-surface-black text-apple-on-dark px-[22px] py-[11px] rounded-sm text-button-utility hover:opacity-90 transition-opacity"
            >
              더 알아보기
            </motion.button>
          </div>
        </section>
      </main>

      <footer className="bg-apple-canvas-parchment border-t border-apple-hairline py-12 px-4 text-center">
        <p className="text-fine-print text-apple-ink-muted-48 tracking-tight">
          &copy; 2024 Stock Snowball. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App;
