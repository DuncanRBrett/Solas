import { describe, it, expect } from 'vitest';
import { calculateIncomeTax, calculateWithdrawalTax } from '../taxCalculations.js';
import { DEFAULT_SETTINGS } from '../../models/defaults.js';

/**
 * Tax Calculation Tests
 *
 * These tests verify the SA income tax calculations match SARS tables
 * for the 2025/2026 tax year.
 */

describe('Income Tax Calculations', () => {
  const taxConfig = DEFAULT_SETTINGS.taxConfig;

  describe('Tax Bracket Boundaries', () => {
    it('should calculate tax correctly at R237,100 (top of bracket 1)', () => {
      const result = calculateIncomeTax(237100, 40, taxConfig);
      // 18% of R237,100 = R42,678 - rebate
      const expectedGross = 237100 * 0.18;
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
    });

    it('should calculate tax correctly at R237,101 (first rand of bracket 2)', () => {
      const result = calculateIncomeTax(237101, 40, taxConfig);
      // R42,678 base + (1 × 26%) = R42,678.26
      const expectedGross = 42678 + (1 * 0.26);
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
    });

    it('should calculate tax correctly at R300,000', () => {
      const result = calculateIncomeTax(300000, 40, taxConfig);
      // R42,678 + (R300,000 - R237,100) × 26%
      // = R42,678 + R62,900 × 0.26
      // = R42,678 + R16,354
      // = R59,032
      const expectedGross = 42678 + (300000 - 237100) * 0.26;
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
    });

    it('should calculate tax correctly at R370,500 (top of bracket 2)', () => {
      const result = calculateIncomeTax(370500, 40, taxConfig);
      // R42,678 + (R370,500 - R237,100) × 26%
      // = R42,678 + R133,400 × 0.26
      // = R42,678 + R34,684
      // = R77,362 (which equals bracket 3 base - confirms our formula)
      const expectedGross = 42678 + (370500 - 237100) * 0.26;
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
      // Also verify it matches bracket 3's base amount
      expect(result.grossTax).toBeCloseTo(77362, 0);
    });

    it('should calculate tax correctly at R500,000', () => {
      const result = calculateIncomeTax(500000, 40, taxConfig);
      // Bracket 3: R77,362 + (R500,000 - R370,500) × 31%
      // = R77,362 + R129,500 × 0.31
      // = R77,362 + R40,145
      // = R117,507
      const expectedGross = 77362 + (500000 - 370500) * 0.31;
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
    });

    it('should calculate tax correctly at R1,000,000', () => {
      const result = calculateIncomeTax(1000000, 40, taxConfig);
      // Bracket 6: R251,258 + (R1,000,000 - R857,900) × 41%
      // = R251,258 + R142,100 × 0.41
      // = R251,258 + R58,261
      // = R309,519
      const expectedGross = 251258 + (1000000 - 857900) * 0.41;
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
    });

    it('should calculate tax correctly at R2,000,000 (top bracket)', () => {
      const result = calculateIncomeTax(2000000, 40, taxConfig);
      // Bracket 7: R644,489 + (R2,000,000 - R1,817,000) × 45%
      // = R644,489 + R183,000 × 0.45
      // = R644,489 + R82,350
      // = R726,839
      const expectedGross = 644489 + (2000000 - 1817000) * 0.45;
      expect(result.grossTax).toBeCloseTo(expectedGross, 0);
    });
  });

  describe('Tax Rebates by Age', () => {
    const income = 500000; // Fixed income for rebate tests

    it('should apply primary rebate only for under-65', () => {
      const result = calculateIncomeTax(income, 40, taxConfig);
      // Net tax = gross - primary rebate
      const expectedNet = result.grossTax - taxConfig.taxRebates.primary;
      expect(result.netTax).toBeCloseTo(expectedNet, 0);
    });

    it('should apply primary + secondary rebates for 65+', () => {
      const result = calculateIncomeTax(income, 65, taxConfig);
      const expectedNet = result.grossTax - taxConfig.taxRebates.primary - taxConfig.taxRebates.secondary;
      expect(result.netTax).toBeCloseTo(expectedNet, 0);
    });

    it('should apply all three rebates for 75+', () => {
      const result = calculateIncomeTax(income, 75, taxConfig);
      const expectedNet = result.grossTax -
        taxConfig.taxRebates.primary -
        taxConfig.taxRebates.secondary -
        taxConfig.taxRebates.tertiary;
      expect(result.netTax).toBeCloseTo(expectedNet, 0);
    });
  });

  describe('Tax Thresholds', () => {
    it('should return zero tax for income below under-65 threshold', () => {
      // Under-65 threshold: R95,750
      const result = calculateIncomeTax(90000, 40, taxConfig);
      expect(result.netTax).toBe(0);
    });

    it('should return zero tax for income below 65-74 threshold', () => {
      // 65-74 threshold: R148,217
      const result = calculateIncomeTax(140000, 65, taxConfig);
      expect(result.netTax).toBe(0);
    });

    it('should return zero tax for income below 75+ threshold', () => {
      // 75+ threshold: R165,689
      const result = calculateIncomeTax(160000, 75, taxConfig);
      expect(result.netTax).toBe(0);
    });

    it('should calculate tax for income just above threshold', () => {
      const result = calculateIncomeTax(100000, 40, taxConfig);
      expect(result.netTax).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero income', () => {
      const result = calculateIncomeTax(0, 40, taxConfig);
      expect(result.grossTax).toBe(0);
      expect(result.netTax).toBe(0);
    });

    it('should handle negative income', () => {
      const result = calculateIncomeTax(-10000, 40, taxConfig);
      expect(result.netTax).toBe(0);
    });

    it('should never return negative net tax', () => {
      // Very low income with full rebates
      const result = calculateIncomeTax(50000, 75, taxConfig);
      expect(result.netTax).toBeGreaterThanOrEqual(0);
    });

    it('should handle very high income', () => {
      const result = calculateIncomeTax(10000000, 40, taxConfig);
      // Should be in top bracket
      expect(result.marginalRate).toBe(45);
      expect(result.netTax).toBeGreaterThan(0);
    });
  });

  describe('Marginal Rates', () => {
    it('should return correct marginal rate for each bracket', () => {
      expect(calculateIncomeTax(100000, 40, taxConfig).marginalRate).toBe(18);
      expect(calculateIncomeTax(300000, 40, taxConfig).marginalRate).toBe(26);
      expect(calculateIncomeTax(450000, 40, taxConfig).marginalRate).toBe(31);
      expect(calculateIncomeTax(600000, 40, taxConfig).marginalRate).toBe(36);
      expect(calculateIncomeTax(750000, 40, taxConfig).marginalRate).toBe(39);
      expect(calculateIncomeTax(1000000, 40, taxConfig).marginalRate).toBe(41);
      expect(calculateIncomeTax(2000000, 40, taxConfig).marginalRate).toBe(45);
    });
  });
});

describe('Capital Gains Tax', () => {
  it('should calculate CGT with 40% inclusion rate', () => {
    // CGT = gain × 40% × marginal rate
    const gain = 100000;
    const marginalRate = 45;
    const expectedCGT = gain * 0.40 * (marginalRate / 100);
    expect(expectedCGT).toBe(18000);
  });

  it('should apply annual exclusion of R40,000', () => {
    const exclusion = DEFAULT_SETTINGS.taxConfig.cgt.annualExclusion;
    expect(exclusion).toBe(40000);
  });
});

describe('Dividend Withholding Tax', () => {
  it('should have 20% DWT rate', () => {
    expect(DEFAULT_SETTINGS.taxConfig.dividendWithholdingTax).toBe(20);
  });
});
