import { Decimal } from 'decimal.js';
import { 
  BacktestParams, 
  BacktestResult, 
  BacktestHistoryPoint 
} from '../types/finance';
import { SnowballEngine } from './SnowballEngine';
import { calculateMoneyWeightedReturn } from './MoneyWeightedReturn';

// Decimal 설정: SnowballEngine과 동일하게 유지
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

/**
 * BacktestEngine: 과거 데이터를 기반으로 투자 시나리오를 검증하는 고정밀 엔진
 */
export class BacktestEngine {
  /**
   * 백테스트를 실행합니다.
   * @param params 백테스트 파라미터
   * @param historicalData 자산별 역사적 데이터 (날짜별 가격 및 배당률)
   */
  static run(
    params: BacktestParams,
    historicalData: { date: string; price: number; dividendYield?: number }[]
  ): BacktestResult {
    const { 
      initialPrincipal, 
      monthlyInstallment, 
      cycle,
      startDate, 
      endDate, 
      reinvestDividends,
      accountType,
      buyFeeRate,
      taxIsaLimit,
      taxIsaReducedRate
    } = params;

    // 기간 내 데이터 필터링 및 정렬
    const filteredData = historicalData
      .filter(p => p.date >= startDate && p.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (filteredData.length === 0) {
      throw new Error('시뮬레이션 기간 내의 데이터가 없습니다.');
    }

    let currentShares = new Decimal(0);
    let totalPrincipal = new Decimal(0);
    let totalFees = new Decimal(0);
    let cash = new Decimal(0);
    let dividendCash = new Decimal(0);
    const history: BacktestHistoryPoint[] = [];
    
    let maxDrawdown = new Decimal(0);
    let isLiquidated = false;

    // 납입과 무관한 기준 투자 100의 성과. 미재투자 배당은 현금으로 보유합니다.
    let unitPricePeak = new Decimal(-Infinity);
    let currentUnitPrice = new Decimal(100); // 기준가 100으로 시작
    let lastUnitPrice = new Decimal(100);
    let unitShares = new Decimal(100).dividedBy(filteredData[0].price);
    let unitCash = new Decimal(0);
    const dailyReturns: Decimal[] = [];

    let lastInvestmentDate = '';

    // 시뮬레이션 루프
    for (let i = 0; i < filteredData.length; i++) {
      const point = filteredData[i];
      const currentPrice = new Decimal(point.price);
      
      if (isLiquidated) {
        history.push({
          date: point.date,
          value: cash.plus(dividendCash).toNumber(),
          principal: totalPrincipal.toNumber(),
          isLiquidated: true
        });
        continue;
      }

      // CSV 배당은 배당락일의 주당 현금 배당입니다. 해당 종가로 새로 산 주식은
      // 배당 권리가 없으므로 납입/매수 전에 기존 보유 수량에만 지급합니다.
      const dividendPerShare = currentPrice.times(point.dividendYield || 0);
      const dividendAmount = currentShares.times(dividendPerShare);
      if (reinvestDividends) {
        cash = cash.plus(dividendAmount);
      } else {
        dividendCash = dividendCash.plus(dividendAmount);
      }

      if (i > 0 && dividendPerShare.gt(0)) {
        const unitDividend = unitShares.times(dividendPerShare);
        if (reinvestDividends && currentPrice.gt(0)) {
          unitShares = unitShares.plus(unitDividend.dividedBy(currentPrice));
        } else {
          unitCash = unitCash.plus(unitDividend);
        }
      }
      currentUnitPrice = unitShares.times(currentPrice).plus(unitCash);

      // 1. 자금 투입 로직
      let shouldInvest = false;
      let injectionAmount = new Decimal(0);
      
      const currentDate = new Date(point.date);
      const dayOfWeek = currentDate.getUTCDay();
      const isBizDay = dayOfWeek !== 0 && dayOfWeek !== 6;

      if (i === 0) {
        shouldInvest = true;
        // 첫 투입 시 초기 자본과 첫 적립금을 동시에 투입
        injectionAmount = new Decimal(initialPrincipal).plus(monthlyInstallment);
      } else {
        const prevInvestDate = lastInvestmentDate ? new Date(lastInvestmentDate) : null;
        
        if (cycle === 'DAILY' && isBizDay) {
          shouldInvest = true;
          injectionAmount = new Decimal(monthlyInstallment);
        } else if (cycle === 'WEEKLY' && prevInvestDate) {
          const diffDays = Math.floor((currentDate.getTime() - prevInvestDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 7) {
            shouldInvest = true;
            injectionAmount = new Decimal(monthlyInstallment);
          }
        } else if (cycle === 'MONTHLY' && prevInvestDate) {
          if (currentDate.getUTCMonth() !== prevInvestDate.getUTCMonth() || currentDate.getUTCFullYear() !== prevInvestDate.getUTCFullYear()) {
            shouldInvest = true;
            injectionAmount = new Decimal(monthlyInstallment);
          }
        }
      }

      if (shouldInvest && injectionAmount.gt(0)) {
        // 매수 수수료 적용
        const fee = injectionAmount.times(buyFeeRate);
        const netInjection = injectionAmount.minus(fee);
        
        totalFees = totalFees.plus(fee);
        cash = cash.plus(netInjection);
        totalPrincipal = totalPrincipal.plus(injectionAmount);
        lastInvestmentDate = point.date;
      }
      
      // 2. 보유 수량에 따른 현재 가치 계산 (배당 포함 전)
      if (cash.gt(0) && currentPrice.gt(0)) {
        currentShares = currentShares.plus(cash.dividedBy(currentPrice));
        cash = new Decimal(0);
      }

      let currentValue = currentShares.times(currentPrice).plus(cash).plus(dividendCash);

      // 양수 가격의 급락은 보유 수량을 소멸시키지 않습니다.
      if (currentShares.gt(0) && currentPrice.lte(0)) {
        isLiquidated = true;
        currentValue = cash.plus(dividendCash);
        currentShares = new Decimal(0);
      }

      // 5. MDD 계산 (단위 가격 기준)
      if (currentUnitPrice.gt(unitPricePeak)) {
        unitPricePeak = currentUnitPrice;
      }
      const drawdown = unitPricePeak.gt(0) ? unitPricePeak.minus(currentUnitPrice).dividedBy(unitPricePeak) : new Decimal(0);
      if (drawdown.gt(maxDrawdown)) {
        maxDrawdown = drawdown;
      }

      // 변동성 계산을 위한 일일 수익률 수집
      if (i > 0) {
        const dailyRet = currentUnitPrice.minus(lastUnitPrice).dividedBy(lastUnitPrice);
        dailyReturns.push(dailyRet);
      }
      lastUnitPrice = currentUnitPrice;

      history.push({
        date: point.date,
        value: currentValue.toNumber(),
        principal: totalPrincipal.toNumber(),
        isLiquidated: isLiquidated
      });
    }

    let finalValue = currentShares.times(filteredData.at(-1)!.price).plus(cash).plus(dividendCash);

    // 6. 변동성 계산
    let annualizedVol = new Decimal(0);
    if (dailyReturns.length > 1) {
      const mean = dailyReturns.reduce((sum, r) => sum.plus(r), new Decimal(0)).dividedBy(dailyReturns.length);
      const variance = dailyReturns.reduce((sum, r) => sum.plus(r.minus(mean).pow(2)), new Decimal(0)).dividedBy(dailyReturns.length - 1);
      const dailyStdDev = variance.sqrt();
      // 연율화: 일일 표준편차 * sqrt(252)
      annualizedVol = dailyStdDev.times(new Decimal(252).sqrt());
    }

    // 7. 세금 계산 (ISA 특례 적용)
    let estimatedTax = new Decimal(0);
    if (accountType === 'ISA' && finalValue.gt(totalPrincipal)) {
      const gains = finalValue.minus(totalPrincipal);
      if (gains.gt(taxIsaLimit)) {
        estimatedTax = gains.minus(taxIsaLimit).times(taxIsaReducedRate);
      }
    }
    // 일반 계좌의 경우 매도 시점에 양도소득세가 발생하지만, 백테스트 종료 시점의 '미실현 수익'에 대한
    // 보수적 추정을 위해 여기서는 일단 ISA만 적용하거나 추후 확장 가능
    finalValue = finalValue.minus(estimatedTax);

    const totalReturn = totalPrincipal.gt(0) ? finalValue.minus(totalPrincipal).dividedBy(totalPrincipal) : new Decimal(0);

    // 종료 보유 수량 × 직전 12개월의 실제 주당 배당 합계 (예상 연 현금 배당).
    const actualEndDate = new Date(filteredData.at(-1)!.date);
    const dividendStart = new Date(actualEndDate);
    dividendStart.setUTCFullYear(dividendStart.getUTCFullYear() - 1);
    const dividendStartDate = dividendStart.toISOString().slice(0, 10);
    const annualDividendPerShare = historicalData
      .filter(point => point.date > dividendStartDate && point.date <= filteredData.at(-1)!.date)
      .reduce((sum, point) => sum.plus(new Decimal(point.price).times(point.dividendYield || 0)), new Decimal(0));
    const finalAnnualDividend = currentShares.times(annualDividendPerShare).toNumber();

    // CAGR 계산
    const actualStartDate = new Date(filteredData[0].date);
    const diffDays = Math.ceil(Math.abs(actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    const cagr = years > 0
      ? Math.pow(currentUnitPrice.dividedBy(100).toNumber(), 1 / years) - 1
      : 0;

    history[history.length - 1].value = finalValue.toNumber();
    const irr = calculateMoneyWeightedReturn(history);

    return {
      metrics: {
        totalReturn: SnowballEngine.bankersRounding(totalReturn, 6).toNumber(),
        cagr: Number.isFinite(cagr) ? SnowballEngine.bankersRounding(cagr, 6).toNumber() : 0,
        irr: irr === null ? null : SnowballEngine.bankersRounding(irr, 6).toNumber(),
        mdd: SnowballEngine.bankersRounding(maxDrawdown, 6).toNumber(),
        volatility: SnowballEngine.bankersRounding(annualizedVol, 6).toNumber(),
        finalValue: finalValue.toNumber(),
        totalPrincipal: totalPrincipal.toNumber(),
        finalAnnualDividend,
        estimatedTax: estimatedTax.toNumber(),
        totalFees: totalFees.toNumber(),
      },
      history
    };
  }
}
