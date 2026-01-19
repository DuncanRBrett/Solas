import { describe, it, expect, beforeEach } from 'vitest';
import { runScenario } from '../scenarioCalculations.js';
import { createDefaultProfile, createDefaultScenario, createDefaultAsset, DEFAULT_SETTINGS } from '../../models/defaults.js';

/**
 * Integration Tests for runScenario
 *
 * These tests verify the complete retirement projection engine works correctly
 * with realistic data and edge cases.
 */

// Helper to create a basic profile with assets
const createTestProfile = (overrides = {}) => {
  const profile = createDefaultProfile('Test');
  profile.settings = {
    ...DEFAULT_SETTINGS,
    profile: {
      ...DEFAULT_SETTINGS.profile,
      age: 55,
      marginalTaxRate: 39,
      retirementAge: 65,
      lifeExpectancy: 90,
    },
    exchangeRates: {
      USD: 18.50,
      EUR: 19.80,
      GBP: 23.20,
    },
    reportingCurrency: 'ZAR',
    ...overrides.settings,
  };
  return { ...profile, ...overrides };
};

// Helper to create a basic scenario
const createTestScenario = (overrides = {}) => {
  const scenario = createDefaultScenario();
  return {
    ...scenario,
    inflationRate: 4.5,
    retirementAge: 65,
    lifeExpectancy: 90,
    monthlySavings: 0,
    useExpensesModule: false,
    annualExpenses: 600000, // R600k/year = R50k/month
    marketCrashes: [],
    unexpectedExpenses: [],
    ...overrides,
  };
};

// Helper to create an investible asset
const createTestAsset = (overrides = {}) => {
  const asset = createDefaultAsset();
  return {
    ...asset,
    name: 'Test Asset',
    assetClass: 'Offshore Equity',
    assetType: 'Investible',
    accountType: 'Taxable',
    units: 1000,
    currentPrice: 10000, // R10M value
    costPrice: 5000, // 50% gain
    currency: 'ZAR',
    ...overrides,
  };
};

describe('runScenario Integration Tests', () => {
  describe('Basic Functionality', () => {
    it('should return results with all required fields', () => {
      const profile = createTestProfile({
        assets: [createTestAsset()],
      });
      const scenario = createTestScenario();

      const result = runScenario(scenario, profile);

      // Check all required fields are present
      expect(result).toHaveProperty('trajectory');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('depletionAge');
      expect(result).toHaveProperty('finalValue');
      expect(result).toHaveProperty('shortfall');
      expect(result).toHaveProperty('totalWithdrawn');
      expect(result).toHaveProperty('totalWithdrawalTax');
      expect(result).toHaveProperty('totalIncome');
      expect(result).toHaveProperty('totalExpenses');
      expect(result).toHaveProperty('expenseCoverageBreakdown');
      expect(result).toHaveProperty('metrics');
    });

    it('should handle missing profile data gracefully', () => {
      const scenario = createTestScenario();
      const result = runScenario(scenario, null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required profile data');
      expect(result.trajectory).toEqual([]);
    });

    it('should handle empty assets array', () => {
      const profile = createTestProfile({ assets: [] });
      const scenario = createTestScenario();

      const result = runScenario(scenario, profile);

      expect(result.success).toBe(false);
      expect(result.finalValue).toBe(0);
    });
  });

  describe('Portfolio Growth (Pre-Retirement)', () => {
    it('should grow portfolio at expected returns before retirement', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 1000,
            currentPrice: 1000, // R1M value
            assetClass: 'Cash', // 5% return
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 5.0 };
      profile.settings.profile.age = 60;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 66, // Short projection for testing
        annualExpenses: 100000,
        monthlySavings: 0,
      });

      const result = runScenario(scenario, profile);

      // After 5 years of 5% growth from R1M
      // Year 1: 1M × 1.05 = 1.05M
      // Year 2: 1.05M × 1.05 = 1.1025M
      // etc.
      // Trajectory should show increasing values
      expect(result.trajectory.length).toBeGreaterThan(0);
      expect(result.trajectory[1].netWorth).toBeGreaterThan(result.trajectory[0].netWorth);
    });

    it('should add monthly savings to portfolio pre-retirement', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 100,
            currentPrice: 1000, // R100k value
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 }; // No growth to isolate savings effect
      profile.settings.profile.age = 64;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 66,
        monthlySavings: 10000, // R10k/month = R120k/year
        annualExpenses: 50000,
      });

      const result = runScenario(scenario, profile);

      // Should have savings added in pre-retirement year
      const firstYearData = result.trajectory[0];
      expect(firstYearData.savings).toBeGreaterThan(0);
    });
  });

  describe('Expense Withdrawals (Post-Retirement)', () => {
    it('should withdraw from portfolio to cover expenses', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 500,
            currentPrice: 10000, // R5M value
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 }; // No growth
      profile.settings.profile.age = 65; // Start at retirement

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 67, // 2 years
        annualExpenses: 600000, // R600k/year
      });

      const result = runScenario(scenario, profile);

      // Should withdraw to cover expenses
      expect(result.totalWithdrawn).toBeGreaterThan(0);
      expect(result.totalExpenses).toBeGreaterThan(0);
    });

    it('should calculate withdrawal tax correctly for taxable accounts', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 1000,
            currentPrice: 10000, // R10M value
            costPrice: 5000, // 50% gain
            assetClass: 'Cash',
            accountType: 'Taxable',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 };
      profile.settings.profile.age = 65;
      profile.settings.profile.marginalTaxRate = 45;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 66,
        annualExpenses: 1000000, // R1M expenses
      });

      const result = runScenario(scenario, profile);

      // Should have CGT on withdrawals
      // CGT = withdrawal × gainRatio × 40% × 45%
      // gainRatio = 50% (R5M gain on R10M value)
      expect(result.totalWithdrawalTax).toBeGreaterThan(0);
    });

    it('should not tax TFSA withdrawals', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 100,
            currentPrice: 10000, // R1M value
            costPrice: 5000,
            assetClass: 'Cash',
            accountType: 'TFSA',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 66,
        annualExpenses: 200000,
      });

      const result = runScenario(scenario, profile);

      // TFSA should have no withdrawal tax
      expect(result.totalWithdrawalTax).toBe(0);
    });
  });

  describe('Expense Phase Multipliers', () => {
    it('should apply expense multipliers for different life phases', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 5000,
            currentPrice: 10000, // R50M value
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 85, // 20 years to see phase changes
        annualExpenses: 600000,
        useCustomExpensePhases: true,
        expensePhases: {
          working: { ageStart: 55, ageEnd: 64, percentage: 100 },
          activeRetirement: { ageStart: 65, ageEnd: 72, percentage: 100 },
          slowerPace: { ageStart: 73, ageEnd: 80, percentage: 80 },
          laterYears: { ageStart: 81, ageEnd: 90, percentage: 60 },
        },
      });

      const result = runScenario(scenario, profile);

      // Find expenses at different ages
      const age70 = result.trajectory.find(t => t.age === 70);
      const age75 = result.trajectory.find(t => t.age === 75);
      const age82 = result.trajectory.find(t => t.age === 82);

      // Age 70: 100% of base expenses (active retirement phase)
      // Age 75: 80% of base expenses (slower pace phase)
      // Age 82: 60% of base expenses (later years phase)
      // Note: expenses are inflation-adjusted, so compare ratios not absolute values
      expect(age75.expenses).toBeLessThan(age70.expenses * 1.5); // 80% < 100%×inflation
      expect(age82.expenses).toBeLessThan(age75.expenses); // 60% < 80%
    });
  });

  describe('Market Crashes', () => {
    it('should apply market crash correctly using new format', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 1000,
            currentPrice: 1000, // R1M in equities
            assetClass: 'Offshore Equity',
          }),
        ],
      });
      profile.settings.expectedReturns = { 'Offshore Equity': 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 68,
        annualExpenses: 0, // No expenses to isolate crash effect
        marketCrashes: [
          {
            age: 66,
            assetClassDrops: { 'Offshore Equity': 40 }, // 40% crash
            description: 'Market crash',
          },
        ],
      });

      const result = runScenario(scenario, profile);

      // Portfolio should drop by 40% at age 66
      const beforeCrash = result.trajectory.find(t => t.age === 66);
      const afterCrash = result.trajectory.find(t => t.age === 67);

      // After 40% drop, value should be roughly 60% of before (accounting for fees)
      expect(afterCrash.netWorth).toBeLessThan(beforeCrash.netWorth);
    });

    it('should handle legacy crash format', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 1000,
            currentPrice: 1000,
            assetClass: 'SA Equity',
          }),
        ],
      });
      profile.settings.expectedReturns = { 'SA Equity': 0 };
      profile.settings.profile.age = 70;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 73,
        annualExpenses: 0,
        marketCrashes: [
          {
            age: 71,
            dropPercentage: 30, // Legacy format
            description: 'Legacy crash',
          },
        ],
      });

      const result = runScenario(scenario, profile);

      // Should still apply the crash
      const beforeCrash = result.trajectory.find(t => t.age === 71);
      const afterCrash = result.trajectory.find(t => t.age === 72);

      expect(afterCrash.netWorth).toBeLessThan(beforeCrash.netWorth);
    });
  });

  describe('Unexpected Expenses', () => {
    it('should deduct unexpected expenses at specified age', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 500,
            currentPrice: 10000, // R5M
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 };
      profile.settings.profile.age = 70;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 73,
        annualExpenses: 0,
        unexpectedExpenses: [
          { age: 71, amount: 500000, description: 'Medical emergency' },
        ],
      });

      const result = runScenario(scenario, profile);

      const beforeExpense = result.trajectory.find(t => t.age === 71);
      const afterExpense = result.trajectory.find(t => t.age === 72);

      // Portfolio should drop by R500k
      expect(afterExpense.netWorth).toBeLessThan(beforeExpense.netWorth);
    });
  });

  describe('Portfolio Depletion', () => {
    it('should detect portfolio depletion and set success to false', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 10,
            currentPrice: 10000, // R100k only
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 90, // 25 years
        annualExpenses: 600000, // R600k/year - will deplete quickly
      });

      const result = runScenario(scenario, profile);

      expect(result.success).toBe(false);
      expect(result.depletionAge).toBeGreaterThan(65);
      expect(result.depletionAge).toBeLessThan(90);
    });

    it('should succeed when portfolio lasts until life expectancy', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 10000,
            currentPrice: 10000, // R100M
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 5 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 90,
        annualExpenses: 600000,
      });

      const result = runScenario(scenario, profile);

      expect(result.success).toBe(true);
      expect(result.depletionAge).toBeNull();
      expect(result.finalValue).toBeGreaterThan(0);
    });
  });

  describe('Income Sources', () => {
    it('should include income sources in calculations', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 100,
            currentPrice: 1000, // R100k
            assetClass: 'Cash',
          }),
        ],
        income: [
          {
            id: 'income-1',
            name: 'Pension',
            monthlyAmount: 30000, // R30k/month = R360k/year
            currency: 'ZAR',
            startAge: 65,
            endAge: null, // Lifetime
            isTaxable: false,
            isInflationAdjusted: false,
          },
        ],
      });
      profile.settings.expectedReturns = { Cash: 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 67,
        annualExpenses: 360000, // Exactly matches pension income
      });

      const result = runScenario(scenario, profile);

      // With income matching expenses, should need minimal withdrawals
      expect(result.totalWithdrawn).toBeLessThan(100000);
      expect(result.totalIncome).toBeGreaterThan(0);
    });
  });

  describe('Multi-Currency Assets', () => {
    it('should convert foreign currency assets correctly', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 100,
            currentPrice: 1000, // $1000 × 100 = $100k = R1.85M
            currency: 'USD',
            assetClass: 'Offshore Equity',
          }),
        ],
      });
      profile.settings.exchangeRates = { USD: 18.50, EUR: 19.80, GBP: 23.20 };
      profile.settings.expectedReturns = { 'Offshore Equity': 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 66,
        annualExpenses: 0,
      });

      const result = runScenario(scenario, profile);

      // Portfolio should be valued at ~R1.85M
      expect(result.trajectory[0].netWorth).toBeCloseTo(1850000, -4);
    });
  });

  describe('Expense Coverage Breakdown', () => {
    it('should track expense coverage by income, returns, and capital', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 1000,
            currentPrice: 5000, // R5M
            assetClass: 'Cash',
          }),
        ],
        income: [
          {
            id: 'income-1',
            name: 'Pension',
            monthlyAmount: 20000, // R240k/year
            currency: 'ZAR',
            startAge: 65,
            endAge: null,
            isTaxable: false,
            isInflationAdjusted: false,
          },
        ],
      });
      profile.settings.expectedReturns = { Cash: 5 }; // 5% = R250k returns
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 67,
        annualExpenses: 600000, // R600k/year
      });

      const result = runScenario(scenario, profile);

      // Should have breakdown
      expect(result.expenseCoverageBreakdown.byIncome.amount).toBeGreaterThan(0);
      expect(result.expenseCoverageBreakdown.byIncome.percentage).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero expenses', () => {
      const profile = createTestProfile({
        assets: [createTestAsset()],
      });

      const scenario = createTestScenario({
        annualExpenses: 0,
        useExpensesModule: false,
      });

      const result = runScenario(scenario, profile);

      expect(result.success).toBe(true);
      expect(result.totalExpenses).toBe(0);
    });

    it('should handle retirement age equal to current age', () => {
      const profile = createTestProfile({
        assets: [createTestAsset()],
      });
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 70,
      });

      const result = runScenario(scenario, profile);

      expect(result.trajectory.length).toBeGreaterThan(0);
      // First year should already be in retirement
      expect(result.trajectory[0].phase).toBe('retired');
    });

    it('should handle very high inflation', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            units: 10000,
            currentPrice: 10000, // R100M
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 5 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        inflationRate: 15, // 15% inflation
        retirementAge: 65,
        lifeExpectancy: 90,
        annualExpenses: 600000,
      });

      const result = runScenario(scenario, profile);

      // High inflation should erode purchasing power
      expect(result.metrics.realReturn).toBeLessThan(result.metrics.nominalReturn);
    });

    it('should handle non-investible assets', () => {
      const profile = createTestProfile({
        assets: [
          createTestAsset({
            name: 'Primary Home',
            assetType: 'Non-Investible', // Not counted for retirement
            units: 1,
            currentPrice: 5000000,
            assetClass: 'Property',
          }),
          createTestAsset({
            name: 'Investments',
            assetType: 'Investible',
            units: 100,
            currentPrice: 10000, // R1M
            assetClass: 'Cash',
          }),
        ],
      });
      profile.settings.expectedReturns = { Cash: 0, Property: 0 };
      profile.settings.profile.age = 65;

      const scenario = createTestScenario({
        retirementAge: 65,
        lifeExpectancy: 67,
        annualExpenses: 200000,
      });

      const result = runScenario(scenario, profile);

      // Starting portfolio should only include investible assets (R1M, not R6M)
      expect(result.metrics.startingPortfolio).toBeCloseTo(1000000, -4);
    });
  });
});

describe('Calculation Accuracy Tests', () => {
  it('should calculate real return correctly using Fisher equation', () => {
    const profile = createTestProfile({
      assets: [createTestAsset({ assetClass: 'Cash' })],
    });
    profile.settings.expectedReturns = { Cash: 10 };
    profile.settings.profile.age = 65;

    const scenario = createTestScenario({
      inflationRate: 4.5,
      retirementAge: 65,
      lifeExpectancy: 66,
      annualExpenses: 0,
    });

    const result = runScenario(scenario, profile);

    // Real return = (1 + 0.10) / (1 + 0.045) - 1 = 0.0526 = 5.26%
    const expectedRealReturn = ((1.10 / 1.045) - 1) * 100;
    expect(result.metrics.realReturn).toBeCloseTo(expectedRealReturn, 1);
  });

  it('should apply inflation to expenses correctly', () => {
    const profile = createTestProfile({
      assets: [
        createTestAsset({
          units: 10000,
          currentPrice: 10000, // R100M
          assetClass: 'Cash',
        }),
      ],
    });
    profile.settings.expectedReturns = { Cash: 0 };
    profile.settings.profile.age = 65;

    const scenario = createTestScenario({
      inflationRate: 10, // 10% for easy calculation
      retirementAge: 65,
      lifeExpectancy: 68,
      annualExpenses: 100000,
    });

    const result = runScenario(scenario, profile);

    // Year 1 (age 66): R100k × 1.10 = R110k
    // Year 2 (age 67): R100k × 1.21 = R121k
    const year1 = result.trajectory.find(t => t.age === 66);
    const year2 = result.trajectory.find(t => t.age === 67);

    expect(year1.expenses).toBeCloseTo(110000, -3);
    expect(year2.expenses).toBeCloseTo(121000, -3);
  });
});
