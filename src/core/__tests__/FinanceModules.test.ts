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

  describe('simulate with fees and taxes', () => {
    it('should include fees in the simulation results', () => {
      const principal = 1000000;
      const annualRate = 0.1;
      const years = 1;
      const feeConfig = { buyFeeRate: 0.01, sellFeeRate: 0.01 }; // 1% for easy calculation
      
      const results = SnowballEngine.simulate(
        principal,
        annualRate,
        years,
        0,
        0,
        'GENERAL',
        defaultTaxConfig,
        feeConfig,
        365
      );

      const lastResult = results[results.length - 1];
      
      // Buy fee: 1,000,000 * 0.01 = 10,000
      // Invested principal: 990,000
      // Growth after 1 year (no compounding for simple check): 990,000 * (1 + 0.1/365)^365 ≈ 990,000 * e^0.1 ≈ 1094117.8
      // But our formula uses daily compound: 990,000 * (1 + 0.1/365)^365
      
      expect(lastResult.totalFees).toBeGreaterThan(10000); // buy fee + sell fee
    });

    it('should show higher post-tax value for ISA than General account for high gains', () => {
      const principal = 10000000;
      const annualRate = 0.2;
      const years = 10;
      
      const genResults = SnowballEngine.simulate(principal, annualRate, years, 0, 0, 'GENERAL');
      const isaResults = SnowballEngine.simulate(principal, annualRate, years, 0, 0, 'ISA');
      
      const genLast = genResults[genResults.length - 1];
      const isaLast = isaResults[isaResults.length - 1];
      
      expect(isaLast.postTaxValue).toBeGreaterThan(genLast.postTaxValue);
    });
  });
});
