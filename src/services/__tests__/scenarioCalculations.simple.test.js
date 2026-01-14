import { describe, it, expect } from 'vitest';
import {
  getExpenseMultiplier,
  calculateDividendIncomeFromAssets,
  calculateInterestIncomeFromAssets,
  calculateIncomeAtAge,
} from '../scenarioCalculations.js';

/**
 * Simplified Test Suite: Scenario Calculation Helper Functions
 *
 * These tests verify the key calculation helper functions that power
 * the retirement projections. Full integration tests for runScenario
 * are complex and depend on the exact profile/scenario structure.
 */

const STANDARD_RATES = {
  'USD/ZAR': 18.5,
  'EUR/ZAR': 19.8,
  'GBP/ZAR': 23.2,
};

describe('Expense Phase Multipliers', () => {
  it('should apply 100% multiplier for ages 60-69', () => {
    const expensePhases = {
      phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
      phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
      phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
    };

    expect(getExpenseMultiplier(60, expensePhases)).toBe(1.0);
    expect(getExpenseMultiplier(65, expensePhases)).toBe(1.0);
    expect(getExpenseMultiplier(69, expensePhases)).toBe(1.0);
  });

  it('should apply 80% multiplier for ages 70-79', () => {
    const expensePhases = {
      phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
      phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
      phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
    };

    expect(getExpenseMultiplier(70, expensePhases)).toBe(0.8);
    expect(getExpenseMultiplier(75, expensePhases)).toBe(0.8);
    expect(getExpenseMultiplier(79, expensePhases)).toBe(0.8);
  });

  it('should apply 60% multiplier for ages 80+', () => {
    const expensePhases = {
      phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
      phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
      phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
    };

    expect(getExpenseMultiplier(80, expensePhases)).toBe(0.6);
    expect(getExpenseMultiplier(85, expensePhases)).toBe(0.6);
    expect(getExpenseMultiplier(90, expensePhases)).toBe(0.6);
  });

  it('should handle custom expense phases', () => {
    const customPhases = {
      phase1: { ageStart: 55, ageEnd: 64, percentage: 120 },
      phase2: { ageStart: 65, ageEnd: 74, percentage: 90 },
      phase3: { ageStart: 75, ageEnd: 90, percentage: 50 },
    };

    expect(getExpenseMultiplier(60, customPhases)).toBe(1.2);
    expect(getExpenseMultiplier(70, customPhases)).toBe(0.9);
    expect(getExpenseMultiplier(80, customPhases)).toBe(0.5);
  });

  it('should return 1.0 before retirement phases start', () => {
    const phases = {
      phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
      phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
      phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
    };

    expect(getExpenseMultiplier(55, phases)).toBe(1.0);
    expect(getExpenseMultiplier(40, phases)).toBe(1.0);
  });
});

describe('Dividend Income Calculations', () => {
  it('should calculate dividend income from single asset', () => {
    const assets = [
      {
        ticker: 'SATRIX40',
        assetClass: 'SA Equity',
        assetType: 'Investible',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        dividendYield: 4.0,
      },
    ];

    const result = calculateDividendIncomeFromAssets(assets, STANDARD_RATES);
    expect(result).toBeCloseTo(4000, 1); // R100,000 × 4% = R4,000
  });

  it('should handle multi-currency dividend assets', () => {
    const assets = [
      {
        ticker: 'SATRIX40',
        assetClass: 'SA Equity',
        assetType: 'Investible',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        dividendYield: 4.0, // R100,000 × 4% = R4,000
      },
      {
        ticker: 'VANGUARD',
        assetClass: 'Offshore Equity',
        assetType: 'Investible',
        units: 500,
        currentPrice: 50,
        currency: 'USD',
        dividendYield: 2.5, // $25,000 × 2.5% = $625 = R11,562.50
      },
    ];

    const result = calculateDividendIncomeFromAssets(assets, STANDARD_RATES);
    expect(result).toBeCloseTo(15562.5, 1);
  });

  it('should ignore assets without dividend yields', () => {
    const assets = [
      {
        ticker: 'BTC',
        assetClass: 'Crypto',
        assetType: 'Investible',
        units: 1,
        currentPrice: 1000000,
        currency: 'ZAR',
        // No dividendYield
      },
    ];

    const result = calculateDividendIncomeFromAssets(assets, STANDARD_RATES);
    expect(result).toBe(0);
  });

  it('should ignore lifestyle assets', () => {
    const assets = [
      {
        ticker: 'HOME',
        assetClass: 'Property',
        assetType: 'Lifestyle',
        units: 1,
        currentPrice: 5000000,
        currency: 'ZAR',
        dividendYield: 3.0, // Even if it has a yield, it's not investible
      },
    ];

    const result = calculateDividendIncomeFromAssets(assets, STANDARD_RATES);
    expect(result).toBe(0);
  });

  it('should use incomeYield if dividendYield not present', () => {
    const assets = [
      {
        ticker: 'REIT',
        assetClass: 'Property',
        assetType: 'Investible',
        units: 1000,
        currentPrice: 200,
        currency: 'ZAR',
        incomeYield: 5.0, // R200,000 × 5% = R10,000
      },
    ];

    const result = calculateDividendIncomeFromAssets(assets, STANDARD_RATES);
    expect(result).toBeCloseTo(10000, 1);
  });
});

describe('Interest Income Calculations', () => {
  it('should calculate interest income taxed at marginal rate', () => {
    const assets = [
      {
        ticker: 'CASH',
        assetClass: 'Cash',
        assetType: 'Investible',
        units: 100000,
        currentPrice: 1,
        currency: 'ZAR',
        interestYield: 8.0,
      },
    ];

    const result = calculateInterestIncomeFromAssets(assets, STANDARD_RATES, 45);

    // Gross: R100,000 × 8% = R8,000
    // Net: R8,000 × (1 - 0.45) = R4,400
    expect(result.gross).toBeCloseTo(8000, 1);
    expect(result.net).toBeCloseTo(4400, 1);
    expect(result.tax).toBeCloseTo(3600, 1);
  });

  it('should handle multiple interest-bearing assets', () => {
    const assets = [
      {
        ticker: 'CASH_ZAR',
        assetClass: 'Cash',
        assetType: 'Investible',
        units: 100000,
        currentPrice: 1,
        currency: 'ZAR',
        interestYield: 8.0, // R8,000
      },
      {
        ticker: 'CASH_USD',
        assetClass: 'Cash',
        assetType: 'Investible',
        units: 5000,
        currentPrice: 1,
        currency: 'USD',
        interestYield: 5.0, // $250 = R4,625
      },
    ];

    const result = calculateInterestIncomeFromAssets(assets, STANDARD_RATES, 39);

    // Gross: R8,000 + R4,625 = R12,625
    // Net: R12,625 × (1 - 0.39) = R7,701.25
    expect(result.gross).toBeCloseTo(12625, 1);
    expect(result.net).toBeCloseTo(7701.25, 1);
  });

  it('should ignore assets without interest yields', () => {
    const assets = [
      {
        ticker: 'SATRIX40',
        assetClass: 'SA Equity',
        assetType: 'Investible',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        // No interestYield
      },
    ];

    const result = calculateInterestIncomeFromAssets(assets, STANDARD_RATES, 45);
    expect(result.gross).toBe(0);
    expect(result.net).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('should ignore lifestyle assets', () => {
    const assets = [
      {
        ticker: 'CAR',
        assetClass: 'Vehicles',
        assetType: 'Lifestyle',
        units: 1,
        currentPrice: 500000,
        currency: 'ZAR',
        interestYield: 5.0, // Even if it has interest (bizarre), it's not investible
      },
    ];

    const result = calculateInterestIncomeFromAssets(assets, STANDARD_RATES, 45);
    expect(result.gross).toBe(0);
    expect(result.net).toBe(0);
  });
});

describe('Income Source Age Filtering', () => {
  it('should include active income at current age', () => {
    const incomeSources = [
      {
        name: 'Salary',
        monthlyAmount: 50000,
        currency: 'ZAR',
        startAge: 40,
        endAge: 65,
        isInflationAdjusted: false,
        isTaxable: true,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 5);

    // R50,000/month × 12 = R600,000/year
    expect(result.totalIncome).toBeCloseTo(600000, 1);
    expect(result.taxableIncome).toBeCloseTo(600000, 1);
  });

  it('should exclude income that has not started yet', () => {
    const incomeSources = [
      {
        name: 'Pension',
        monthlyAmount: 30000,
        currency: 'ZAR',
        startAge: 65,
        endAge: null,
        isInflationAdjusted: false,
        isTaxable: false,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 0);

    expect(result.totalIncome).toBe(0);
    expect(result.taxableIncome).toBe(0);
  });

  it('should exclude income that has ended', () => {
    const incomeSources = [
      {
        name: 'Early Career',
        monthlyAmount: 30000,
        currency: 'ZAR',
        startAge: 25,
        endAge: 50,
        isInflationAdjusted: false,
        isTaxable: true,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 0);

    expect(result.totalIncome).toBe(0);
    expect(result.taxableIncome).toBe(0);
  });

  it('should handle lifetime income (null endAge)', () => {
    const incomeSources = [
      {
        name: 'Pension',
        monthlyAmount: 25000,
        currency: 'ZAR',
        startAge: 65,
        endAge: null,
        isInflationAdjusted: false,
        isTaxable: false,
      },
    ];

    const result = calculateIncomeAtAge(75, incomeSources, STANDARD_RATES, 4.5, 0);

    // R25,000/month × 12 = R300,000/year
    expect(result.totalIncome).toBeCloseTo(300000, 1);
    expect(result.taxableIncome).toBe(0); // Not taxable
  });

  it('should apply inflation to inflation-adjusted income', () => {
    const incomeSources = [
      {
        name: 'Salary',
        monthlyAmount: 50000,
        currency: 'ZAR',
        startAge: 40,
        endAge: 65,
        isInflationAdjusted: true,
        isTaxable: true,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 5);

    // R50,000 × (1.045^5) = R50,000 × 1.246 = R62,300/month
    // Annual: R747,600
    const inflationFactor = Math.pow(1.045, 5);
    const expected = 50000 * 12 * inflationFactor;

    expect(result.totalIncome).toBeCloseTo(expected, -2); // Within R100
  });

  it('should NOT inflate fixed income', () => {
    const incomeSources = [
      {
        name: 'Fixed Pension',
        monthlyAmount: 20000,
        currency: 'ZAR',
        startAge: 65,
        endAge: null,
        isInflationAdjusted: false,
        isTaxable: false,
      },
    ];

    const result = calculateIncomeAtAge(70, incomeSources, STANDARD_RATES, 4.5, 5);

    // Should still be R20,000/month even after 5 years
    expect(result.totalIncome).toBeCloseTo(240000, 1);
  });

  it('should handle multiple income sources correctly', () => {
    const incomeSources = [
      {
        name: 'Salary',
        monthlyAmount: 50000,
        currency: 'ZAR',
        startAge: 40,
        endAge: 65,
        isInflationAdjusted: false,
        isTaxable: true,
      },
      {
        name: 'Rental Income',
        monthlyAmount: 10000,
        currency: 'ZAR',
        startAge: 50,
        endAge: null,
        isInflationAdjusted: false,
        isTaxable: true,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 0);

    // R50,000 + R10,000 = R60,000/month = R720,000/year
    expect(result.totalIncome).toBeCloseTo(720000, 1);
    expect(result.taxableIncome).toBeCloseTo(720000, 1);
  });

  it('should correctly separate taxable and non-taxable income', () => {
    const incomeSources = [
      {
        name: 'Taxable Income',
        monthlyAmount: 30000,
        currency: 'ZAR',
        startAge: 40,
        endAge: null,
        isInflationAdjusted: false,
        isTaxable: true,
      },
      {
        name: 'Tax-Free Income',
        monthlyAmount: 20000,
        currency: 'ZAR',
        startAge: 40,
        endAge: null,
        isInflationAdjusted: false,
        isTaxable: false,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 0);

    // Total: R50,000/month = R600,000/year
    // Taxable: R30,000/month = R360,000/year
    expect(result.totalIncome).toBeCloseTo(600000, 1);
    expect(result.taxableIncome).toBeCloseTo(360000, 1);
  });

  it('should handle USD income with currency conversion', () => {
    const incomeSources = [
      {
        name: 'USD Salary',
        monthlyAmount: 5000,
        currency: 'USD',
        startAge: 40,
        endAge: 65,
        isInflationAdjusted: false,
        isTaxable: true,
      },
    ];

    const result = calculateIncomeAtAge(60, incomeSources, STANDARD_RATES, 4.5, 0);

    // $5,000 × 18.5 = R92,500/month = R1,110,000/year
    expect(result.totalIncome).toBeCloseTo(1110000, 1);
  });
});
