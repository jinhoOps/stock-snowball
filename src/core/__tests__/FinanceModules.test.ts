import { describe, it, expect } from 'vitest';
import { SnowballEngine } from '../SnowballEngine';
import { TaxConfig } from '../../types/finance';

describe('SnowballEngine - Finance Modules', () => {
  const defaultTaxConfig: TaxConfig = {
    dividendTaxRate: 0.154,
    capitalGainTaxRate: 0.22,
    isaTaxFreeLimit: 2000000,
    isaReducedTaxRate: 0.095,
  };

  describe('calculateTax', () => {
    it('should calculate general dividend tax correctly', () => {
      const gains = 1000000;
      const tax = SnowballEngine.calculateTax(gains, 'GENERAL', defaultTaxConfig);
      expect(tax.toNumber()).toBe(154000); // 1,000,000 * 0.154
    });

    it('should apply ISA tax-free limit correctly (below limit)', () => {
      const gains = 1500000;
      const tax = SnowballEngine.calculateTax(gains, 'ISA', defaultTaxConfig);
      expect(tax.toNumber()).toBe(0);
    });

    it('should apply ISA tax-free limit correctly (above limit)', () => {
      const gains = 3000000;
      const tax = SnowballEngine.calculateTax(gains, 'ISA', defaultTaxConfig);
      // (3,000,000 - 2,000,000) * 0.095 = 1,000,000 * 0.095 = 95,000
      expect(tax.toNumber()).toBe(95000);
    });

    it('should return 0 tax if gains are 0 or negative', () => {
      expect(SnowballEngine.calculateTax(0, 'GENERAL', defaultTaxConfig).toNumber()).toBe(0);
      expect(SnowballEngine.calculateTax(-100, 'GENERAL', defaultTaxConfig).toNumber()).toBe(0);
    });
  });

  describe('simulate with strategies', () => {
    it('should calculate STEP_UP strategy correctly (contribution increases over time)', () => {
      const principal = 1000000;
      const annualRate = 0; // No growth to isolate contribution
      const years = 2;
      const strategy: any = { type: 'STEP_UP', baseAmount: 1000000, increaseRate: 0.1 }; // 10% increase per year

      const results = SnowballEngine.simulate(principal, annualRate, years, strategy, 0, 'GENERAL', undefined, { buyFeeRate: 0, sellFeeRate: 0 }, undefined, 365);
      
      const year1 = results[1]; // d=365
      const year2 = results[2]; // d=730
      
      // Year 1 total contribution: 1M (init) + 12 * 1M = 13M approx
      // Year 2 total contribution: 13M + 12 * 1.1M = 26.2M approx
      expect(year2.totalContribution).toBeGreaterThan(year1.totalContribution * 2);
    });

    it('should calculate VALUE_AVERAGING strategy (contributes more when value is low)', () => {
      // This is harder to test simply, but let's check it doesn't crash
      const principal = 1000000;
      const annualRate = 0.05;
      const years = 1;
      const strategy: any = { type: 'VALUE_AVERAGING', targetGrowth: 100000 }; // 100k growth per month

      const results = SnowballEngine.simulate(principal, annualRate, years, strategy);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('exchange rate simulation', () => {
    it('should reflect exchange rate changes in nominal value', () => {
      const principal = 1000; // 1000 USD
      const annualRate = 0;
      const years = 1;
      const exchangeRateConfig = { base: 1300, annualChangeRate: 0.1 }; // 10% increase in KRW/USD (USD strengthens)

      const results = SnowballEngine.simulate(
        principal,
        annualRate,
        years,
        { type: 'FIXED', baseAmount: 0 },
        0,
        'GENERAL',
        undefined,
        { buyFeeRate: 0, sellFeeRate: 0 },
        exchangeRateConfig,
        365
      );

      const lastResult = results[results.length - 1];
      // Expected with compounding: 1000 * 1300 * (1 + 0.1/365)^365 ≈ 1,436,721
      expect(lastResult.nominalValue).toBeGreaterThan(1430000);
      expect(lastResult.nominalValue).toBeLessThan(1440000);
    });
  });

  describe('comparison tests', () => {
    it('should show higher post-tax value for ISA than General account for high gains', () => {
      const principal = 10000000;
      const annualRate = 0.2;
      const years = 10;
      
      const genResults = SnowballEngine.simulate(principal, annualRate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'GENERAL');
      const isaResults = SnowballEngine.simulate(principal, annualRate, years, { type: 'FIXED', baseAmount: 0 }, 0, 'ISA');
      
      const genLast = genResults[genResults.length - 1];
      const isaLast = isaResults[isaResults.length - 1];
      
      expect(isaLast.postTaxValue).toBeGreaterThan(genLast.postTaxValue);
    });
  });
});
