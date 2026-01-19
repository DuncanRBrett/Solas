/**
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  AssetSchema,
  LiabilitySchema,
  IncomeSchema,
  ExpenseSchema,
  ExpenseSubcategorySchema,
  ExpenseCategorySchema,
  ScenarioSchema,
  SettingsSchema,
  ProfileSchema,
  validateData,
  validateOrThrow,
  formatValidationErrors,
} from '../validation.js';
import {
  createDefaultAsset,
  createDefaultLiability,
  createDefaultIncome,
  createDefaultExpense,
  createDefaultExpenseSubcategory,
  createDefaultExpenseCategory,
  createDefaultScenario,
  createDefaultProfile,
  DEFAULT_SETTINGS,
} from '../defaults.js';

// =============================================================================
// Asset Validation Tests
// =============================================================================

describe('AssetSchema', () => {
  it('validates a valid asset', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test Asset';
    asset.units = 100;
    asset.currentPrice = 500;
    asset.costPrice = 450;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
  });

  it('rejects asset with empty name', () => {
    const asset = createDefaultAsset();
    asset.name = '';

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('name: Asset name is required');
  });

  it('rejects asset with negative units', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = -10;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('positive'))).toBe(true);
  });

  it('rejects asset with negative current price', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.currentPrice = -100;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('negative'))).toBe(true);
  });

  it('rejects asset with invalid currency', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.currency = 'INVALID';

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('currency'))).toBe(true);
  });

  it('rejects asset with unreasonably large value', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 1e10;
    asset.currentPrice = 1e10;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('exceed'))).toBe(true);
  });

  it('accepts asset with valid yields', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 100;
    asset.currentPrice = 50;
    asset.dividendYield = 3.5;
    asset.interestYield = 2.0;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
  });

  it('rejects asset with invalid dividend yield', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.dividendYield = 150; // > 100%

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('exceed 100'))).toBe(true);
  });
});

// =============================================================================
// Liability Validation Tests
// =============================================================================

describe('LiabilitySchema', () => {
  it('validates a valid liability', () => {
    const liability = createDefaultLiability();
    liability.name = 'Mortgage';
    liability.principal = 1000000;
    liability.interestRate = 10.5;
    liability.monthlyPayment = 15000;

    const result = validateData(LiabilitySchema, liability);
    expect(result.success).toBe(true);
  });

  it('rejects liability with negative principal', () => {
    const liability = createDefaultLiability();
    liability.name = 'Test';
    liability.principal = -1000;

    const result = validateData(LiabilitySchema, liability);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('positive'))).toBe(true);
  });

  it('rejects liability with monthly payment > principal', () => {
    const liability = createDefaultLiability();
    liability.name = 'Test';
    liability.principal = 10000;
    liability.monthlyPayment = 20000;

    const result = validateData(LiabilitySchema, liability);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('exceed principal'))).toBe(true);
  });

  it('accepts liability with reasonable values', () => {
    const liability = createDefaultLiability();
    liability.name = 'Car Loan';
    liability.principal = 300000;
    liability.interestRate = 12.5;
    liability.monthlyPayment = 6500;

    const result = validateData(LiabilitySchema, liability);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Income Validation Tests
// =============================================================================

describe('IncomeSchema', () => {
  it('validates a valid income source', () => {
    const income = createDefaultIncome();
    income.name = 'Salary';
    income.monthlyAmount = 50000;
    income.startAge = 25;
    income.endAge = 65;

    const result = validateData(IncomeSchema, income);
    expect(result.success).toBe(true);
  });

  it('rejects income with endAge < startAge', () => {
    const income = createDefaultIncome();
    income.name = 'Test';
    income.monthlyAmount = 10000;
    income.startAge = 65;
    income.endAge = 55;

    const result = validateData(IncomeSchema, income);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('greater than or equal'))).toBe(true);
  });

  it('accepts income with null ages (lifetime)', () => {
    const income = createDefaultIncome();
    income.name = 'Pension';
    income.monthlyAmount = 20000;
    income.startAge = null;
    income.endAge = null;

    const result = validateData(IncomeSchema, income);
    expect(result.success).toBe(true);
  });

  it('rejects income with unreasonably high age', () => {
    const income = createDefaultIncome();
    income.name = 'Test';
    income.monthlyAmount = 10000;
    income.startAge = 150;

    const result = validateData(IncomeSchema, income);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('unreasonably high'))).toBe(true);
  });
});

// =============================================================================
// Expense Validation Tests
// =============================================================================

describe('ExpenseSchema', () => {
  it('validates a valid expense', () => {
    const expense = createDefaultExpense();
    expense.name = 'Rent';
    expense.amount = 15000;
    expense.frequency = 'Monthly';

    const result = validateData(ExpenseSchema, expense);
    expect(result.success).toBe(true);
  });

  it('rejects expense with negative amount', () => {
    const expense = createDefaultExpense();
    expense.name = 'Test';
    expense.amount = -1000;

    const result = validateData(ExpenseSchema, expense);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('positive'))).toBe(true);
  });

  it('validates expense subcategory', () => {
    const subcategory = createDefaultExpenseSubcategory();
    subcategory.name = 'Groceries';
    subcategory.amount = 5000;

    const result = validateData(ExpenseSubcategorySchema, subcategory);
    expect(result.success).toBe(true);
  });

  it('validates expense category with subcategories', () => {
    const category = createDefaultExpenseCategory();
    category.name = 'Food';
    category.subcategories = [
      {
        id: crypto.randomUUID(),
        name: 'Groceries',
        amount: 5000,
        currency: 'ZAR',
        frequency: 'Monthly',
        expenseType: 'Fixed Non-Discretionary',
        notes: '',
      },
    ];

    const result = validateData(ExpenseCategorySchema, category);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Scenario Validation Tests
// =============================================================================

describe('ScenarioSchema', () => {
  it('validates a valid scenario', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Base Case';
    scenario.marketReturn = 9.0;
    scenario.inflationRate = 4.5;
    scenario.retirementAge = 65;
    scenario.lifeExpectancy = 90;

    const result = validateData(ScenarioSchema, scenario);
    expect(result.success).toBe(true);
  });

  it('rejects scenario with lifeExpectancy < retirementAge', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Test';
    scenario.retirementAge = 65;
    scenario.lifeExpectancy = 60;

    const result = validateData(ScenarioSchema, scenario);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('greater than or equal'))).toBe(true);
  });

  it('rejects scenario with unrealistic real return', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Test';
    scenario.marketReturn = 5.0;
    scenario.inflationRate = 50.0; // Real return = -45%

    const result = validateData(ScenarioSchema, scenario);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('unrealistic'))).toBe(true);
  });

  it('validates scenario with market crashes', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Crash Test';
    scenario.marketCrashes = [
      { age: 70, dropPercentage: 40, description: 'Major crash' },
    ];

    const result = validateData(ScenarioSchema, scenario);
    expect(result.success).toBe(true);
  });

  it('validates scenario with unexpected expenses', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Emergency Test';
    scenario.unexpectedExpenses = [
      { age: 75, amount: 500000, description: 'Medical emergency' },
    ];

    const result = validateData(ScenarioSchema, scenario);
    expect(result.success).toBe(true);
  });

  it('rejects market crash with invalid drop percentage', () => {
    const scenario = createDefaultScenario();
    scenario.name = 'Test';
    scenario.marketCrashes = [
      { age: 70, dropPercentage: 150, description: 'Invalid' },
    ];

    const result = validateData(ScenarioSchema, scenario);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('exceed 100'))).toBe(true);
  });
});

// =============================================================================
// Settings Validation Tests
// =============================================================================

describe('SettingsSchema', () => {
  it('validates valid settings', () => {
    const result = validateData(SettingsSchema, DEFAULT_SETTINGS);
    expect(result.success).toBe(true);
  });

  it('rejects settings with retirementAge > lifeExpectancy', () => {
    const settings = { ...DEFAULT_SETTINGS };
    settings.profile = { ...settings.profile, retirementAge: 75, lifeExpectancy: 70 };

    const result = validateData(SettingsSchema, settings);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('less than or equal'))).toBe(true);
  });

  it('rejects settings where reportingCurrency not in enabledCurrencies', () => {
    const settings = { ...DEFAULT_SETTINGS };
    settings.reportingCurrency = 'JPY';
    settings.enabledCurrencies = ['ZAR', 'USD'];

    const result = validateData(SettingsSchema, settings);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('enabled currencies'))).toBe(true);
  });

  it('rejects target allocation not summing to 100%', () => {
    const settings = { ...DEFAULT_SETTINGS };
    settings.targetAllocation = {
      'Offshore Equity': 50,
      'SA Equity': 30,
      // Only 80% - should fail
    };

    const result = validateData(SettingsSchema, settings);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('sum to 100'))).toBe(true);
  });

  it('accepts target allocation with small rounding errors', () => {
    const settings = { ...DEFAULT_SETTINGS };
    settings.targetAllocation = {
      'Offshore Equity': 33.33,
      'SA Equity': 33.33,
      'Cash': 33.34,
    };

    const result = validateData(SettingsSchema, settings);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Profile Validation Tests
// =============================================================================

describe('ProfileSchema', () => {
  it('validates a valid profile', () => {
    const profile = createDefaultProfile('Test User');

    const result = validateData(ProfileSchema, profile);
    expect(result.success).toBe(true);
  });

  it('rejects profile with too many assets', () => {
    const profile = createDefaultProfile('Test');
    profile.assets = new Array(1001).fill(null).map(() => {
      const asset = createDefaultAsset();
      asset.name = 'Test';
      return asset;
    });

    const result = validateData(ProfileSchema, profile);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('Too many assets'))).toBe(true);
  });

  it('validates profile with mixed data', () => {
    const profile = createDefaultProfile('Mixed');

    // Add asset
    const asset = createDefaultAsset();
    asset.name = 'Test Asset';
    asset.units = 100;
    asset.currentPrice = 50;
    profile.assets.push(asset);

    // Add liability
    const liability = createDefaultLiability();
    liability.name = 'Test Loan';
    liability.principal = 100000;
    profile.liabilities.push(liability);

    // Add income
    const income = createDefaultIncome();
    income.name = 'Salary';
    income.monthlyAmount = 30000;
    profile.income.push(income);

    const result = validateData(ProfileSchema, profile);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Validation Helper Function Tests
// =============================================================================

describe('Validation Helpers', () => {
  it('validateData returns success for valid data', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 100;
    asset.currentPrice = 50;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('validateData returns errors for invalid data', () => {
    const asset = createDefaultAsset();
    asset.name = '';
    asset.units = -1;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validateOrThrow throws on invalid data', () => {
    const asset = createDefaultAsset();
    asset.name = '';

    expect(() => {
      validateOrThrow(AssetSchema, asset);
    }).toThrow('Validation failed');
  });

  it('validateOrThrow returns data on valid input', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 100;
    asset.currentPrice = 50;

    const result = validateOrThrow(AssetSchema, asset);
    expect(result).toBeDefined();
    expect(result.name).toBe('Test');
  });

  it('formatValidationErrors creates readable error message', () => {
    const errors = [
      'name: Asset name is required',
      'units: Must be a positive number',
    ];

    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('name: Asset name is required');
    expect(formatted).toContain('units: Must be a positive number');
  });

  it('formatValidationErrors handles single error', () => {
    const errors = ['name: Asset name is required'];

    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('name: Asset name is required');
  });

  it('formatValidationErrors handles empty errors', () => {
    const formatted = formatValidationErrors([]);
    expect(formatted).toBe('Unknown validation error');
  });
});

// =============================================================================
// Edge Case Tests
// =============================================================================

describe('Edge Cases', () => {
  it('handles zero values correctly', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 0; // Should fail - must be positive
    asset.currentPrice = 0; // Should pass - can be zero

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('positive'))).toBe(true);
  });

  it('handles very small decimal values', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 0.0001;
    asset.currentPrice = 0.01;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
  });

  it('handles large but reasonable values', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 1000000;
    asset.currentPrice = 1000;

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
  });

  it('handles optional fields correctly', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 100;
    asset.currentPrice = 50;
    asset.notes = ''; // Optional, can be empty
    asset.priceUrl = ''; // Optional, can be empty

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
  });

  it('validates URL format when provided', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 100;
    asset.currentPrice = 50;
    asset.priceUrl = 'not-a-url'; // Invalid URL

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(false);
    // Check for URL-related error
    expect(result.errors.some(e => e.toLowerCase().includes('url') || e.toLowerCase().includes('invalid'))).toBe(true);
  });

  it('accepts valid URL format', () => {
    const asset = createDefaultAsset();
    asset.name = 'Test';
    asset.units = 100;
    asset.currentPrice = 50;
    asset.priceUrl = 'https://example.com/price';

    const result = validateData(AssetSchema, asset);
    expect(result.success).toBe(true);
  });
});
