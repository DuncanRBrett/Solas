/**
 * Zod validation schemas for Solas data models
 *
 * This file defines comprehensive validation rules for all data types
 * to prevent invalid data from entering the system.
 */

import { z } from 'zod';
import {
  ASSET_CLASSES,
  REGIONS,
  SECTORS,
  ASSET_TYPES,
  ACCOUNT_TYPES,
  PORTFOLIOS,
  EXPENSE_TYPES,
  EXPENSE_FREQUENCIES,
  ALL_CURRENCIES,
} from './defaults.js';

// =============================================================================
// Shared validation rules
// =============================================================================

const currencyCodes = Object.keys(ALL_CURRENCIES);

const CurrencySchema = z.enum(currencyCodes, {
  errorMap: () => ({ message: 'Invalid currency code' }),
});

const PositiveNumberSchema = z.number()
  .positive('Must be a positive number')
  .finite('Must be a valid number');

const NonNegativeNumberSchema = z.number()
  .nonnegative('Cannot be negative')
  .finite('Must be a valid number');

const PercentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100')
  .finite('Must be a valid number');

const ISODateSchema = z.string().datetime({ message: 'Must be a valid ISO date string' });

const OptionalISODateSchema = z.union([
  z.string().datetime({ message: 'Must be a valid ISO date string' }),
  z.string().length(0),
  z.null(),
]).optional();

const URLSchema = z.union([
  z.string().url('Must be a valid URL').min(1),
  z.string().length(0),
  z.literal(''),
]).optional();

// =============================================================================
// Asset Validation
// =============================================================================

export const AssetSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Asset name is required')
    .max(100, 'Asset name too long (max 100 characters)'),

  // Classification
  assetClass: z.enum(ASSET_CLASSES, {
    errorMap: () => ({ message: 'Invalid asset class' }),
  }),

  sector: z.string()
    .max(50, 'Sector name too long')
    .optional()
    .default(''),

  currency: CurrencySchema,

  region: z.enum(REGIONS, {
    errorMap: () => ({ message: 'Invalid region' }),
  }),

  portfolio: z.enum(PORTFOLIOS, {
    errorMap: () => ({ message: 'Invalid portfolio type' }),
  }),

  assetType: z.enum(ASSET_TYPES, {
    errorMap: () => ({ message: 'Invalid asset type' }),
  }),

  platform: z.string()
    .max(100, 'Platform name too long')
    .optional()
    .default(''),

  accountType: z.enum(ACCOUNT_TYPES, {
    errorMap: () => ({ message: 'Invalid account type' }),
  }),

  // Holdings
  units: PositiveNumberSchema.refine(
    val => val < 1e12,
    'Units value is unreasonably large'
  ),

  currentPrice: NonNegativeNumberSchema.refine(
    val => val < 1e15,
    'Current price is unreasonably large'
  ),

  costPrice: NonNegativeNumberSchema.refine(
    val => val < 1e15,
    'Cost price is unreasonably large'
  ),

  // Yields
  dividendYield: PercentageSchema.optional().default(0),
  interestYield: PercentageSchema.optional().default(0),

  expectedReturn: z.union([
    z.number().min(-50, 'Return too low').max(100, 'Return too high'),
    z.null(),
  ]).optional().default(null),

  // Fees
  ter: PercentageSchema.optional().default(0),

  // Advisor fee exclusion
  excludeFromAdvisorFee: z.boolean().optional().default(false),

  // Performance fee notes (informational only - complex structures that can't be calculated)
  performanceFeeNotes: z.string()
    .max(500, 'Performance fee notes too long (max 500 characters)')
    .optional()
    .default(''),

  // Metadata
  priceUrl: URLSchema,
  factSheetUrl: URLSchema,
  lastUpdated: ISODateSchema,
  notes: z.string().max(1000, 'Notes too long (max 1000 characters)').optional().default(''),
}).refine(
  data => data.units * data.currentPrice < 1e15,
  {
    message: 'Total asset value exceeds reasonable limit (>1 quadrillion)',
    path: ['currentPrice'],
  }
);

// =============================================================================
// Liability Validation
// =============================================================================

export const LiabilitySchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Liability name is required')
    .max(100, 'Liability name too long (max 100 characters)'),

  principal: PositiveNumberSchema.refine(
    val => val < 1e12,
    'Principal amount is unreasonably large'
  ),

  currency: CurrencySchema,

  interestRate: z.number()
    .min(0, 'Interest rate cannot be negative')
    .max(100, 'Interest rate unreasonably high (>100%)')
    .finite('Must be a valid number'),

  monthlyPayment: NonNegativeNumberSchema.refine(
    val => val < 1e10,
    'Monthly payment is unreasonably large'
  ),

  maturityDate: OptionalISODateSchema,

  platform: z.string()
    .max(100, 'Platform name too long')
    .optional()
    .default(''),

  notes: z.string()
    .max(1000, 'Notes too long (max 1000 characters)')
    .optional()
    .default(''),
}).refine(
  data => {
    // If monthly payment is set, it should be reasonable relative to principal
    if (data.monthlyPayment > 0 && data.monthlyPayment > data.principal) {
      return false;
    }
    return true;
  },
  {
    message: 'Monthly payment cannot exceed principal amount',
    path: ['monthlyPayment'],
  }
);

// =============================================================================
// Income Validation
// =============================================================================

// Valid income types
const INCOME_TYPES = ['Work', 'Investment', 'Pension', 'Rental', 'Annuity', 'Other'];

// Annuity types
const ANNUITY_TYPES = ['living', 'life'];

export const IncomeSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Income name is required')
    .max(100, 'Income name too long (max 100 characters)'),

  type: z.enum(INCOME_TYPES, {
    errorMap: () => ({ message: `Income type must be one of: ${INCOME_TYPES.join(', ')}` }),
  }),

  monthlyAmount: PositiveNumberSchema.refine(
    val => val < 1e10,
    'Monthly income is unreasonably large'
  ),

  currency: CurrencySchema,

  startAge: z.union([
    z.number()
      .int('Age must be a whole number')
      .min(0, 'Age cannot be negative')
      .max(120, 'Age unreasonably high'),
    z.null(),
  ]).optional().default(null),

  endAge: z.union([
    z.number()
      .int('Age must be a whole number')
      .min(0, 'Age cannot be negative')
      .max(120, 'Age unreasonably high'),
    z.null(),
  ]).optional().default(null),

  isTaxable: z.boolean().default(true),
  isInflationAdjusted: z.boolean().default(true),

  notes: z.string()
    .max(1000, 'Notes too long (max 1000 characters)')
    .optional()
    .default(''),

  // Annuity-specific fields (only used when type === 'Annuity')
  annuityType: z.enum(ANNUITY_TYPES).nullable().optional().default(null),

  capitalValue: z.number()
    .min(0, 'Capital value cannot be negative')
    .max(1e12, 'Capital value unreasonably large')
    .nullable()
    .optional()
    .default(null),

  escalationRate: z.number()
    .min(0, 'Escalation rate cannot be negative')
    .max(20, 'Escalation rate unreasonably high (max 20%)')
    .nullable()
    .optional()
    .default(null),

  guaranteedPeriod: z.number()
    .int('Guaranteed period must be a whole number')
    .min(0, 'Guaranteed period cannot be negative')
    .max(30, 'Guaranteed period unreasonably long (max 30 years)')
    .nullable()
    .optional()
    .default(null),

  provider: z.string()
    .max(100, 'Provider name too long (max 100 characters)')
    .optional()
    .default(''),

}).refine(
  data => {
    // If both ages are set, endAge must be >= startAge
    if (data.startAge !== null && data.endAge !== null && data.endAge < data.startAge) {
      return false;
    }
    return true;
  },
  {
    message: 'End age must be greater than or equal to start age',
    path: ['endAge'],
  }
).refine(
  data => {
    // If type is Annuity, annuityType is required
    if (data.type === 'Annuity' && !data.annuityType) {
      return false;
    }
    return true;
  },
  {
    message: 'Annuity type (living or life) is required for annuities',
    path: ['annuityType'],
  }
).refine(
  data => {
    // If type is Annuity, capitalValue is required and must be positive
    if (data.type === 'Annuity' && (!data.capitalValue || data.capitalValue <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Capital value is required for annuities',
    path: ['capitalValue'],
  }
).refine(
  data => {
    // Living annuity drawdown rate must be between 2.5% and 17.5%
    if (data.type === 'Annuity' && data.annuityType === 'living' && data.capitalValue > 0) {
      const annualDrawdown = data.monthlyAmount * 12;
      const drawdownRate = (annualDrawdown / data.capitalValue) * 100;
      if (drawdownRate < 2.5 || drawdownRate > 17.5) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Living annuity drawdown rate must be between 2.5% and 17.5% of capital',
    path: ['monthlyAmount'],
  }
);

// =============================================================================
// Expense Validation (Legacy)
// =============================================================================

export const ExpenseSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Expense name is required')
    .max(100, 'Expense name too long (max 100 characters)'),

  amount: PositiveNumberSchema.refine(
    val => val < 1e10,
    'Expense amount is unreasonably large'
  ),

  frequency: z.enum(EXPENSE_FREQUENCIES, {
    errorMap: () => ({ message: 'Frequency must be "Monthly" or "Annual"' }),
  }),

  category: z.string()
    .max(50, 'Category name too long')
    .optional()
    .default('Other'),

  level: z.enum(['Essential', 'Discretionary', 'Luxury'], {
    errorMap: () => ({ message: 'Invalid expense level' }),
  }).optional().default('Essential'),

  budget: NonNegativeNumberSchema.optional().default(0),

  notes: z.string()
    .max(1000, 'Notes too long (max 1000 characters)')
    .optional()
    .default(''),
});

// =============================================================================
// Expense Subcategory Validation (New)
// =============================================================================

export const ExpenseSubcategorySchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Subcategory name is required')
    .max(100, 'Subcategory name too long (max 100 characters)'),

  monthlyAmount: NonNegativeNumberSchema.refine(
    val => val < 1e10,
    'Monthly amount is unreasonably large'
  ),

  currency: CurrencySchema,

  frequency: z.enum(EXPENSE_FREQUENCIES, {
    errorMap: () => ({ message: 'Frequency must be "Monthly" or "Annual"' }),
  }),

  expenseType: z.enum(EXPENSE_TYPES, {
    errorMap: () => ({ message: 'Invalid expense type' }),
  }),

  notes: z.string()
    .max(500, 'Notes too long (max 500 characters)')
    .optional()
    .default(''),
});

// =============================================================================
// Expense Category Validation (New)
// =============================================================================

export const ExpenseCategorySchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name too long (max 100 characters)'),

  subcategories: z.array(ExpenseSubcategorySchema)
    .max(50, 'Too many subcategories (max 50)')
    .default([]),
});

// =============================================================================
// Scenario Validation
// =============================================================================

const MarketCrashSchema = z.object({
  age: z.number()
    .int('Age must be a whole number')
    .min(18, 'Age must be at least 18')
    .max(120, 'Age unreasonably high'),

  // Legacy single drop percentage (kept for backward compatibility)
  dropPercentage: z.number()
    .min(0, 'Drop percentage cannot be negative')
    .max(100, 'Drop percentage cannot exceed 100')
    .finite('Must be a valid number')
    .optional(),

  // New: per-asset-class drop percentages
  assetClassDrops: z.record(z.string(), z.number().min(0).max(100))
    .optional()
    .default({}),

  // Legacy: affected asset classes (kept for backward compatibility)
  affectedAssetClasses: z.array(z.string()).optional(),

  description: z.string()
    .max(200, 'Description too long (max 200 characters)')
    .default('Market crash'),
});

const UnexpectedExpenseSchema = z.object({
  age: z.number()
    .int('Age must be a whole number')
    .min(18, 'Age must be at least 18')
    .max(120, 'Age unreasonably high'),

  amount: PositiveNumberSchema.refine(
    val => val < 1e12,
    'Expense amount is unreasonably large'
  ),

  description: z.string()
    .max(200, 'Description too long (max 200 characters)')
    .default('Unexpected expense'),
});

const ExpensePhaseSchema = z.object({
  name: z.string()
    .max(50, 'Phase name too long')
    .optional(),

  ageStart: z.number()
    .int('Age must be a whole number')
    .min(40, 'Age must be at least 40')
    .max(120, 'Age unreasonably high'),

  ageEnd: z.number()
    .int('Age must be a whole number')
    .min(40, 'Age must be at least 40')
    .max(120, 'Age unreasonably high'),

  percentage: z.number()
    .min(0, 'Percentage cannot be negative')
    .max(200, 'Percentage cannot exceed 200')
    .finite('Must be a valid number'),
});

// Support both legacy 3-phase and new 4-phase expense structures
const ExpensePhasesSchema = z.object({
  // Legacy 3-phase structure
  phase1: ExpensePhaseSchema.optional(),
  phase2: ExpensePhaseSchema.optional(),
  phase3: ExpensePhaseSchema.optional(),
  // New 4-phase structure
  working: ExpensePhaseSchema.optional(),
  activeRetirement: ExpensePhaseSchema.optional(),
  slowerPace: ExpensePhaseSchema.optional(),
  laterYears: ExpensePhaseSchema.optional(),
}).passthrough(); // Allow additional fields for backward compatibility

export const ScenarioSchema = z.object({
  id: z.string().uuid('Must be a valid UUID'),

  name: z.string()
    .min(1, 'Scenario name is required')
    .max(100, 'Scenario name too long (max 100 characters)'),

  description: z.string()
    .max(500, 'Description too long (max 500 characters)')
    .optional()
    .default(''),

  // Assumptions
  // Legacy: single market return (kept for backward compatibility)
  marketReturn: z.number()
    .min(-50, 'Market return too low (<-50%)')
    .max(50, 'Market return unreasonably high (>50%)')
    .finite('Must be a valid number')
    .optional()
    .default(9),

  inflationRate: z.number()
    .min(-10, 'Inflation rate too low')
    .max(100, 'Inflation rate unreasonably high (>100%)')
    .finite('Must be a valid number'),

  retirementAge: z.number()
    .int('Retirement age must be a whole number')
    .min(40, 'Retirement age too low (minimum 40)')
    .max(100, 'Retirement age too high (maximum 100)'),

  lifeExpectancy: z.number()
    .int('Life expectancy must be a whole number')
    .min(50, 'Life expectancy too low (minimum 50)')
    .max(120, 'Life expectancy too high (maximum 120)'),

  monthlySavings: NonNegativeNumberSchema.refine(
    val => val < 1e10,
    'Monthly savings is unreasonably large'
  ),

  useExpensesModule: z.boolean().default(true),

  annualExpenses: NonNegativeNumberSchema.refine(
    val => val < 1e10,
    'Annual expenses is unreasonably large'
  ),

  // Asset class returns - new weighted return approach
  useCustomReturns: z.boolean().optional().default(false),
  expectedReturns: z.record(z.string(), z.number().min(-50).max(100))
    .optional()
    .default({}),

  // Currency movement modeling
  useCurrencyMovement: z.boolean().optional().default(false),
  currencyMovement: z.record(z.string(), z.number().min(-50).max(50))
    .optional()
    .default({}),

  // Shocks
  marketCrashes: z.array(MarketCrashSchema)
    .max(20, 'Too many market crashes (max 20)')
    .default([]),

  unexpectedExpenses: z.array(UnexpectedExpenseSchema)
    .max(50, 'Too many unexpected expenses (max 50)')
    .default([]),

  // Custom expense phases for this scenario
  useCustomExpensePhases: z.boolean().optional().default(false),
  expensePhases: ExpensePhasesSchema.optional().nullable().default(null),

  // Results
  results: z.any().nullable().optional().default(null),
  lastRun: z.union([ISODateSchema, z.null()]).optional().default(null),
}).refine(
  data => data.lifeExpectancy >= data.retirementAge,
  {
    message: 'Life expectancy must be greater than or equal to retirement age',
    path: ['lifeExpectancy'],
  }
).refine(
  data => {
    // Real return (market return - inflation) should be reasonable
    const realReturn = data.marketReturn - data.inflationRate;
    return realReturn > -30 && realReturn < 40;
  },
  {
    message: 'Real return (market return - inflation) is unrealistic. Check your assumptions.',
    path: ['marketReturn'],
  }
);

// =============================================================================
// Settings Validation
// =============================================================================

const ProfileSettingsSchema = z.object({
  name: z.string()
    .min(1, 'Profile name is required')
    .max(50, 'Profile name too long (max 50 characters)'),

  age: z.union([
    z.number()
      .int('Age must be a whole number')
      .min(18, 'Age must be at least 18')
      .max(120, 'Age unreasonably high'),
    z.null(),
  ]).optional().default(null),

  marginalTaxRate: PercentageSchema,

  retirementAge: z.number()
    .int('Retirement age must be a whole number')
    .min(40, 'Retirement age too low (minimum 40)')
    .max(100, 'Retirement age too high (maximum 100)'),

  lifeExpectancy: z.number()
    .int('Life expectancy must be a whole number')
    .min(50, 'Life expectancy too low (minimum 50)')
    .max(120, 'Life expectancy too high (maximum 120)'),

  monthlySavings: NonNegativeNumberSchema,
  annualExpenses: NonNegativeNumberSchema,
});

const ExchangeRatesSchema = z.record(
  z.string(),
  z.number()
    .positive('Exchange rate must be positive')
    .finite('Must be a valid number')
    .refine(val => val < 1e6, 'Exchange rate unreasonably large')
);

const ExpectedReturnsSchema = z.record(
  z.string(),
  z.number()
    .min(-50, 'Expected return too low')
    .max(100, 'Expected return unreasonably high')
    .finite('Must be a valid number')
);

const TargetAllocationSchema = z.record(
  z.string(),
  PercentageSchema
).refine(
  data => {
    // Sum of all allocations should be 100%
    const sum = Object.values(data).reduce((acc, val) => acc + val, 0);
    return Math.abs(sum - 100) < 0.1; // Allow small rounding errors
  },
  {
    message: 'Target allocation must sum to 100%',
  }
);

const ThresholdsSchema = z.object({
  singleAsset: PercentageSchema,
  assetClass: PercentageSchema,
  currency: PercentageSchema,
  sector: PercentageSchema,
  region: PercentageSchema,
  platform: PercentageSchema,
  staleness: z.number()
    .int('Staleness days must be a whole number')
    .min(1, 'Staleness threshold must be at least 1 day')
    .max(365, 'Staleness threshold too high (max 365 days)'),
  rebalancingDrift: PercentageSchema,
});

export const SettingsSchema = z.object({
  profile: ProfileSettingsSchema,
  reportingCurrency: CurrencySchema,
  enabledCurrencies: z.array(CurrencySchema)
    .min(1, 'At least one currency must be enabled')
    .max(currencyCodes.length, 'Too many currencies enabled'),
  exchangeRates: ExchangeRatesSchema,
  expectedReturns: ExpectedReturnsSchema,
  targetAllocation: TargetAllocationSchema,
  thresholds: ThresholdsSchema,
  expenseCategories: z.array(z.string().max(50))
    .max(50, 'Too many expense categories (max 50)')
    .default([]),
  platforms: z.array(z.string().max(100))
    .max(100, 'Too many platforms (max 100)')
    .default([]),
}).refine(
  data => data.profile.retirementAge <= data.profile.lifeExpectancy,
  {
    message: 'Retirement age must be less than or equal to life expectancy',
    path: ['profile', 'retirementAge'],
  }
).refine(
  data => data.enabledCurrencies.includes(data.reportingCurrency),
  {
    message: 'Reporting currency must be in the list of enabled currencies',
    path: ['reportingCurrency'],
  }
);

// =============================================================================
// Profile Validation
// =============================================================================

export const ProfileSchema = z.object({
  name: z.string()
    .min(1, 'Profile name is required')
    .max(50, 'Profile name too long (max 50 characters)'),

  assets: z.array(AssetSchema)
    .max(1000, 'Too many assets (max 1000)')
    .default([]),

  liabilities: z.array(LiabilitySchema)
    .max(100, 'Too many liabilities (max 100)')
    .default([]),

  income: z.array(IncomeSchema)
    .max(100, 'Too many income sources (max 100)')
    .default([]),

  expenses: z.array(ExpenseSchema)
    .max(500, 'Too many expenses (max 500)')
    .default([]),

  expenseCategories: z.array(ExpenseCategorySchema)
    .max(50, 'Too many expense categories (max 50)')
    .default([]),

  scenarios: z.array(ScenarioSchema)
    .max(50, 'Too many scenarios (max 50)')
    .default([]),

  settings: SettingsSchema,

  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,

  dataVersion: z.string()
    .optional()
    .default('3.0.0'),
});

// =============================================================================
// Validation helper functions
// =============================================================================

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, errors?: string[] }}
 */
export function validateData(schema, data) {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    // Handle both error.errors (array) and error.issues (Zod v4)
    const errorList = result.error?.issues || result.error?.errors || [];
    return {
      success: false,
      errors: errorList.map(err => {
        const path = err.path && err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      }),
    };
  }
}

/**
 * Validate and return data, throwing on validation error
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {any} Validated and potentially transformed data
 * @throws {Error} If validation fails
 */
export function validateOrThrow(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle both error.errors and error.issues
      const errorList = error.issues || error.errors || [];
      const errorMessages = errorList.map(err => {
        const path = err.path && err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });
      throw new Error(`Validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Get user-friendly error message from validation result
 * @param {string[]} errors - Array of error messages
 * @returns {string} Combined error message
 */
export function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) {
    return 'Unknown validation error';
  }

  if (errors.length === 1) {
    return errors[0];
  }

  return `Multiple validation errors:\n• ${errors.join('\n• ')}`;
}
