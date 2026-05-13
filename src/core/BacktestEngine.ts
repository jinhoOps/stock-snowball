import { Decimal } from 'decimal.js';
import { 
  BacktestParams, 
  BacktestResult, 
  BacktestHistoryPoint 
} from '../types/finance';
import { SnowballEngine } from './SnowballEngine';

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
    let cash = new Decimal(0);
    const history: BacktestHistoryPoint[] = [];
    
    let maxDrawdown = new Decimal(0);
    let isLiquidated = false;

    // MDD 계산을 위한 '단위 가격(Unit Price)' 추적 (자금 투입 영향 배제)
    let unitPricePeak = new Decimal(-Infinity);
    let currentUnitPrice = new Decimal(100); // 기준가 100으로 시작

    let lastInvestmentDate = '';

    // 시뮬레이션 루프
    for (let i = 0; i < filteredData.length; i++) {
      const point = filteredData[i];
      const currentPrice = new Decimal(point.price);
      
      if (isLiquidated) {
        history.push({
          date: point.date,
          value: 0,
          principal: SnowballEngine.bankersRounding(totalPrincipal).toNumber(),
          isLiquidated: true
        });
        continue;
      }

      // 이전 가격 대비 수익률 계산 (MDD용 단위 가격 추적)
      if (i > 0) {
        const prevPrice = new Decimal(filteredData[i-1].price);
        const assetReturn = currentPrice.minus(prevPrice).dividedBy(prevPrice);
        currentUnitPrice = currentUnitPrice.times(assetReturn.plus(1));
      }

      // 1. 자금 투입 로직
      let shouldInvest = false;
      if (i === 0) {
        shouldInvest = true;
      } else {
        const currentDate = new Date(point.date);
        const prevInvestDate = new Date(lastInvestmentDate);
        
        if (cycle === 'DAILY') {
          shouldInvest = true;
        } else if (cycle === 'WEEKLY') {
          const diffDays = Math.floor((currentDate.getTime() - prevInvestDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 7) {
            shouldInvest = true;
          }
        } else if (cycle === 'MONTHLY') {
          if (currentDate.getMonth() !== prevInvestDate.getMonth() || currentDate.getFullYear() !== prevInvestDate.getFullYear()) {
            shouldInvest = true;
          }
        }
      }

      if (shouldInvest) {
        // 첫 투입 시 초기 자본과 첫 적립금을 동시에 투입
        let totalInjection = new Decimal(0);
        if (i === 0) {
          totalInjection = totalInjection.plus(initialPrincipal).plus(monthlyInstallment);
        } else {
          totalInjection = totalInjection.plus(monthlyInstallment);
        }
        
        if (totalInjection.gt(0)) {
          // 매수 수수료 적용
          const fee = totalInjection.times(buyFeeRate);
          const netInjection = totalInjection.minus(fee);
          
          cash = cash.plus(netInjection);
          totalPrincipal = totalPrincipal.plus(totalInjection);
        }
        lastInvestmentDate = point.date;
      }

      // 2. 보유 수량에 따른 현재 가치 계산 (배당 포함 전)
      if (cash.gt(0) && currentPrice.gt(0)) {
        currentShares = currentShares.plus(cash.dividedBy(currentPrice));
        cash = new Decimal(0);
      }

      let currentValue = currentShares.times(currentPrice);

      // 3. 배당금 재투자 (TR)
      // 배당금이 누락된 경우 자산의 일반적인 배당률을 사용할 수 있으나, 여기서는 0으로 처리하거나 
      // 데이터가 있는 경우에만 처리 (Task 3: robust dividend handling)
      if (reinvestDividends && point.dividendYield && point.dividendYield > 0) {
        const dy = new Decimal(point.dividendYield);
        const dividendAmount = currentValue.times(dy);
        
        if (currentPrice.gt(0)) {
          // 배당 재투자 시에도 매수 수수료가 발생하는지? (보통 발생하지 않거나 낮음, 여기서는 0으로 가정)
          currentShares = currentShares.plus(dividendAmount.dividedBy(currentPrice));
          currentValue = currentShares.times(currentPrice);
          // 단위 가격에도 배당 반영하여 TR(Total Return) 지수화
          currentUnitPrice = currentUnitPrice.times(dy.plus(1));
        }
      }

      // 4. 청산 체크 (자산 가치가 원금의 1% 미만으로 떨어지면 청산)
      if (currentValue.lt(totalPrincipal.times(0.01)) || (currentShares.gt(0) && currentPrice.lte(0))) {
        isLiquidated = true;
        currentValue = new Decimal(0);
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

      history.push({
        date: point.date,
        value: SnowballEngine.bankersRounding(currentValue).toNumber(),
        principal: SnowballEngine.bankersRounding(totalPrincipal).toNumber(),
        isLiquidated: isLiquidated
      });
    }

    let finalValue = history[history.length - 1].value;
    const finalTotalPrincipal = SnowballEngine.bankersRounding(totalPrincipal).toNumber();

    // 6. 세금 계산 (ISA 특례 적용)
    let estimatedTax = 0;
    if (accountType === 'ISA' && finalValue > finalTotalPrincipal) {
      const gains = finalValue - finalTotalPrincipal;
      if (gains > taxIsaLimit) {
        estimatedTax = (gains - taxIsaLimit) * taxIsaReducedRate;
      }
    }
    // 일반 계좌의 경우 매도 시점에 양도소득세가 발생하지만, 백테스트 종료 시점의 '미실현 수익'에 대한
    // 보수적 추정을 위해 여기서는 일단 ISA만 적용하거나 추후 확장 가능
    finalValue = finalValue - estimatedTax;

    const totalReturn = finalTotalPrincipal > 0 ? (finalValue - finalTotalPrincipal) / finalTotalPrincipal : 0;

    // 최종 연 배당금 계산
    const lastPoint = filteredData[filteredData.length - 1];
    const finalAnnualDividend = !isLiquidated && lastPoint.dividendYield 
      ? SnowballEngine.bankersRounding(currentShares.times(lastPoint.price).times(lastPoint.dividendYield).times(12)).toNumber()
      : 0;

    // CAGR 계산
    const actualStartDate = new Date(filteredData[0].date);
    const actualEndDate = new Date(filteredData[filteredData.length - 1].date);
    const diffDays = Math.ceil(Math.abs(actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    const cagr = years > 0 && finalValue > 0 && initialPrincipal > 0 
      ? Math.pow(finalValue / initialPrincipal, 1 / years) - 1 
      : 0;

    // IRR 계산 (월수 기준)
    const monthsForIRR = Math.max(1, Math.round(diffDays / 30.4375));
    const irr = this.calculateIRR(initialPrincipal, monthlyInstallment, finalValue, monthsForIRR).toNumber();

    return {
      metrics: {
        totalReturn: SnowballEngine.bankersRounding(totalReturn, 6).toNumber(),
        cagr: SnowballEngine.bankersRounding(cagr, 6).toNumber(),
        irr: SnowballEngine.bankersRounding(irr, 6).toNumber(),
        mdd: SnowballEngine.bankersRounding(maxDrawdown, 6).toNumber(),
        finalValue,
        totalPrincipal: finalTotalPrincipal,
        finalAnnualDividend,
      },
      history
    };
  }

  /**
   * 내부 수익률(IRR)을 계산합니다 (이분법 사용, Decimal.js 기반)
   */
  static calculateIRR(
    initial: Decimal | number, 
    monthly: Decimal | number, 
    final: Decimal | number, 
    months: number
  ): Decimal {
    const P = new Decimal(initial);
    const M = new Decimal(monthly);
    const F = new Decimal(final);
    const n = new Decimal(months);

    if (n.isZero() || (P.isZero() && M.isZero())) return new Decimal(0);

    const f = (r: Decimal): Decimal => {
      if (r.abs().lt(1e-12)) return P.plus(M.times(n)).minus(F);
      const compound = r.plus(1).pow(n);
      return P.times(compound).plus(M.times(compound.minus(1).dividedBy(r))).minus(F);
    };

    let low = new Decimal(-0.999999);
    let high = new Decimal(10.0);

    // 해가 존재하는지 확인
    if (f(low).times(f(high)).gt(0)) {
        if (f(high).lt(0)) return new Decimal(10.0);
        return new Decimal(-0.999);
    }

    for (let i = 0; i < 60; i++) { // 정밀도를 위해 반복 횟수 증가
      const mid = low.plus(high).dividedBy(2);
      if (f(mid).gt(0)) high = mid;
      else low = mid;
    }

    const monthlyRate = low.plus(high).dividedBy(2);
    // 연율화: (1 + monthlyRate)^12 - 1
    return monthlyRate.plus(1).pow(12).minus(1);
  }
}
