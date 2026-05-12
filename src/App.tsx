import { useState, useMemo } from 'react';
import GlobalNav from './components/layout/GlobalNav';
import ProductHero from './components/sections/ProductHero';
import SnowballChart from './components/charts/SnowballChart';
import { SnowballEngine } from './core/SnowballEngine';

function App() {
  const [principal, setPrincipal] = useState(10000000); // 1,000만원
  const [rate, setRate] = useState(0.05); // 5%
  const [years, setYears] = useState(10); // 10년

  const chartData = useMemo(() => {
    return SnowballEngine.generateSeries(principal, rate, years);
  }, [principal, rate, years]);

  const finalAmount = chartData[chartData.length - 1]?.value || 0;

  return (
    <div className="min-h-screen bg-apple-canvas font-text">
      <GlobalNav />
      
      <main>
        <ProductHero 
          title="당신의 자산이 눈덩이처럼 불어납니다."
          subtitle="작은 습관이 만드는 거대한 변화를 시각화하세요."
        >
          <div className="w-full flex flex-col items-center">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-[800px]">
              <div className="flex flex-col items-start">
                <label className="text-caption-strong text-apple-ink mb-2">초기 자산 (원)</label>
                <input 
                  type="number" 
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary transition-colors"
                />
              </div>
              <div className="flex flex-col items-start">
                <label className="text-caption-strong text-apple-ink mb-2">연이율 (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={rate * 100}
                  onChange={(e) => setRate(Number(e.target.value) / 100)}
                  className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary transition-colors"
                />
              </div>
              <div className="flex flex-col items-start">
                <label className="text-caption-strong text-apple-ink mb-2">기간 (년)</label>
                <input 
                  type="number" 
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full bg-apple-canvas border border-apple-hairline rounded-sm p-3 text-body outline-none focus:border-apple-primary transition-colors"
                />
              </div>
            </div>

            {/* Final Result Display */}
            <div className="mb-8 text-center">
              <span className="text-caption text-apple-ink-muted-48 block mb-1">{years}년 후 예상 자산</span>
              <span className="text-display-md text-apple-primary font-display">
                {Math.round(finalAmount).toLocaleString()}원
              </span>
            </div>

            {/* Chart */}
            <SnowballChart data={chartData} />
          </div>
        </ProductHero>

        {/* Store Style Info Section */}
        <section className="bg-apple-canvas-parchment py-section px-4 flex flex-col items-center justify-center text-center">
          <div className="max-w-[600px]">
            <h2 className="text-display-lg text-apple-ink mb-4">복리의 마법</h2>
            <p className="text-lead text-apple-ink-muted-80 mb-8">
              시간은 투자자의 가장 강력한 무기입니다. 알베르트 아인슈타인은 복리를 '세계 8대 불가사의'라고 불렀습니다.
            </p>
            <button className="bg-apple-surface-black text-apple-on-dark px-[22px] py-[11px] rounded-sm text-button-utility hover:opacity-90 transition-opacity">
              더 알아보기
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-apple-canvas-parchment border-t border-apple-hairline py-12 px-4 text-center">
        <p className="text-fine-print text-apple-ink-muted-48">
          &copy; 2024 Stock Snowball. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App;
