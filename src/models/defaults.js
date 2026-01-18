// Default data models and initial values for Solas v3

// All available currencies with their symbols
// Users can enable/disable currencies in settings
export const ALL_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  ZAR: { symbol: 'R', name: 'South African Rand' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
  SEK: { symbol: 'kr', name: 'Swedish Krona' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', name: 'Danish Krone' },
  PLN: { symbol: 'zł', name: 'Polish Zloty' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  MXN: { symbol: '$', name: 'Mexican Peso' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
};

// Default enabled currencies (user can customize)
export const DEFAULT_ENABLED_CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP'];

// Default exchange rates relative to ZAR (as default reporting currency)
// Rate means: 1 unit of foreign currency = X units of reporting currency
export const DEFAULT_EXCHANGE_RATES = {
  USD: 18.50,  // 1 USD = 18.50 ZAR
  EUR: 19.80,  // 1 EUR = 19.80 ZAR
  GBP: 23.20,  // 1 GBP = 23.20 ZAR
};

export const DEFAULT_SETTINGS = {
  profile: {
    name: 'Default',
    age: 55,
    marginalTaxRate: 39, // %
    retirementAge: 65,
    lifeExpectancy: 90,
    monthlySavings: 0,
    annualExpenses: 0, // Optional - can use Expenses module instead
    defaultCGT: 18, // % - Default capital gains tax rate (40% inclusion x 45% marginal)
    expectedInflation: 4.5, // % p.a. - Expected inflation rate
    incomeGrowth: 5.0, // % p.a. - Expected annual income growth rate
  },

  // Currency configuration
  // reportingCurrency is the base - all values displayed in this currency
  // exchangeRates are relative to reportingCurrency (1 foreign = X reporting)
  reportingCurrency: 'ZAR',
  enabledCurrencies: ['ZAR', 'USD', 'EUR', 'GBP'], // Currencies available in dropdowns
  exchangeRates: {
    USD: 18.50,  // 1 USD = 18.50 ZAR
    EUR: 19.80,  // 1 EUR = 19.80 ZAR
    GBP: 23.20,  // 1 GBP = 23.20 ZAR
    // Note: reporting currency (ZAR) is always 1.0, not stored
  },

  // Legacy currency object - kept for backward compatibility during migration
  currency: {
    reporting: 'ZAR',
    exchangeRates: {
      'USD/ZAR': 18.50,
      'GBP/ZAR': 23.20,
      'EUR/ZAR': 19.80,
    },
  },

  expectedReturns: {
    'Offshore Equity': 11.0,
    'SA Equity': 12.0,
    'SA Bonds': 8.5,
    'Offshore Bonds': 6.5,
    'Cash': 5.0,
    'Property': 9.0,
    'Crypto': 15.0,
  },

  targetAllocation: {
    'Offshore Equity': 40,
    'SA Equity': 20,
    'SA Bonds': 15,
    'Offshore Bonds': 10,
    'Cash': 10,
    'Property': 5,
    'Crypto': 0,
  },

  thresholds: {
    singleAsset: 10, // % - warn if single asset > 10% of portfolio
    assetClass: 50, // % - warn if single asset class > 50%
    currency: 70, // % - warn if single currency > 70%
    sector: 30, // % - warn if single sector > 30%
    region: 80, // % - warn if single region > 80%
    platform: 40, // % - warn if single platform > 40%
    staleness: 7, // days - warn if price older than 7 days
    rebalancingDrift: 5, // % - suggest rebalancing if drift > 5%
  },

  // Life phases for expense and income planning - used across Age-Based, Retirement Prep, and Scenarios
  // All 4 phases with configurable age ranges and expense percentages
  // Note: ageStart for phase 1 typically comes from profile.age
  // Note: ageEnd for phase 4 typically comes from profile.lifeExpectancy
  lifePhases: {
    working: { name: 'Working', ageStart: 55, ageEnd: 64, percentage: 100 },
    activeRetirement: { name: 'Active Retirement', ageStart: 65, ageEnd: 72, percentage: 100 },
    slowerPace: { name: 'Slower Pace', ageStart: 73, ageEnd: 80, percentage: 80 },
    laterYears: { name: 'Later Years', ageStart: 81, ageEnd: 90, percentage: 60 },
  },

  withdrawalRates: {
    conservative: 3.0, // % - Very safe
    safe: 4.0, // % - Standard safe withdrawal rate
    aggressive: 5.0, // % - Higher risk
  },

  inflation: 4.5, // % p.a.

  // Portfolio quality assessment thresholds
  qualityThresholds: {
    diversification: {
      excellent: 0.15, // HHI below this = excellent
      good: 0.25, // HHI below this = good
      fair: 0.40, // HHI below this = fair
    },
    balance: {
      excellent: 3, // Total drift % below this = excellent
      good: 7, // Below this = good
      fair: 12, // Below this = fair
    },
    resilience: {
      minLiquidityRatio: 0.60, // At least 60% should be liquid
      minDefensiveRatio: 0.15, // At least 15% in bonds+cash
      targetEmergencyMonths: 6, // 6 months expenses in cash
    },
  },

  // South African Tax Configuration (2025/2026 tax year)
  // Tax brackets, rebates, and CGT settings
  taxConfig: {
    taxYear: '2025/2026', // For reference
    effectiveDate: '2025-03-01', // When these rates took effect

    // Progressive income tax brackets
    // Each bracket: { min, max (null = no limit), rate (%), baseAmount }
    // Tax = baseAmount + rate% of (income - min)
    incomeTaxBrackets: [
      { min: 0, max: 237100, rate: 18, baseAmount: 0 },
      { min: 237101, max: 370500, rate: 26, baseAmount: 42678 },
      { min: 370501, max: 512800, rate: 31, baseAmount: 77362 },
      { min: 512801, max: 673000, rate: 36, baseAmount: 121475 },
      { min: 673001, max: 857900, rate: 39, baseAmount: 179147 },
      { min: 857901, max: 1817000, rate: 41, baseAmount: 251258 },
      { min: 1817001, max: null, rate: 45, baseAmount: 644489 },
    ],

    // Tax rebates by age
    taxRebates: {
      primary: 17235, // All taxpayers
      secondary: 9444, // Age 65 and older
      tertiary: 3145, // Age 75 and older
    },

    // Tax thresholds (income below which no tax is payable)
    taxThresholds: {
      under65: 95750,
      age65to74: 148217,
      age75plus: 165689,
    },

    // Capital Gains Tax settings
    cgt: {
      inclusionRate: 40, // % of capital gain included in taxable income
      annualExclusion: 40000, // Annual exclusion for individuals
      // Effective rate = inclusionRate% × marginalRate%
      // e.g., 40% × 45% = 18% max effective CGT rate
    },

    // Dividend Withholding Tax
    dividendWithholdingTax: 20, // % withheld on dividends

    // Interest exemption (annual)
    interestExemption: {
      under65: 23800,
      age65plus: 34500,
    },
  },

  // User-configurable expense categories
  expenseCategories: [
    'Housing',
    'Food',
    'Transport',
    'Healthcare',
    'Insurance',
    'Entertainment',
    'Education',
    'Utilities',
    'Other',
  ],

  // Expense levels for retirement planning
  expenseLevels: ['Essential', 'Discretionary', 'Luxury'],

  // User-configurable platforms with fee structures
  platforms: [
    {
      id: 'credo',
      name: 'Credo',
      feeStructure: {
        type: 'tiered-percentage',
        tiers: [
          { upTo: 500000, rate: 0.50 },     // 0.50% on first R500k
          { upTo: 2000000, rate: 0.35 },    // 0.35% on next R1.5M
          { upTo: Infinity, rate: 0.25 }    // 0.25% on rest
        ]
      }
    },
    {
      id: 'easyequities',
      name: 'Easy Equities',
      feeStructure: {
        type: 'fixed',
        amount: 50,         // R50/month
        currency: 'ZAR',
        frequency: 'monthly' // 'monthly' | 'quarterly' | 'annual'
      }
    },
    {
      id: 'psg',
      name: 'PSG',
      feeStructure: {
        type: 'percentage',
        rate: 0.50          // 0.50% p.a.
      }
    },
    {
      id: 'personaltrust',
      name: 'Personal Trust',
      feeStructure: {
        type: 'percentage',
        rate: 0.35          // 0.35% p.a.
      }
    },
    {
      id: 'allangray',
      name: 'Allan Gray',
      feeStructure: {
        type: 'percentage',
        rate: 0.75          // 0.75% p.a.
      }
    },
    {
      id: 'luno',
      name: 'Luno',
      feeStructure: {
        type: 'percentage',
        rate: 0.00          // Free (trading fees apply separately)
      }
    },
    {
      id: 'other',
      name: 'Other',
      feeStructure: {
        type: 'percentage',
        rate: 0.50          // Default 0.50% p.a.
      }
    }
  ],

  // Advisor fee configuration
  advisorFee: {
    enabled: false,
    type: 'percentage',   // 'percentage' or 'fixed'
    amount: 1.0,          // 1% p.a. or fixed annual amount
    currency: 'ZAR',      // Only used if type='fixed'
  },
};

export const createDefaultAsset = () => ({
  id: crypto.randomUUID(),
  name: '',

  // Classification
  assetClass: 'Offshore Equity', // Offshore Equity, SA Equity, SA Bonds, Offshore Bonds, Cash, Property, Crypto
  sector: '', // Technology, Healthcare, Financial, Consumer, Industrial, etc.
  currency: 'ZAR', // ZAR, USD, GBP, EUR
  region: 'Offshore', // South Africa, Offshore
  portfolio: 'Growth', // Growth, Income, Preservation, Speculative

  // Asset type - CRITICAL for retirement calculations
  assetType: 'Investible', // Investible (generates returns) vs Non-Investible (appreciates but no yield)
  // Investible: shares, ETFs, bonds, cash, investment property, crypto
  // Non-Investible: primary home, collectibles, art, personal use property

  // Platform/Institution
  platform: '', // Personal Trust, Satrix, Easy Equities, Credo, Luno, etc.

  // Account type (for tax calculations)
  accountType: 'Taxable', // TFSA, RA, Taxable

  // Holdings
  units: 0,
  currentPrice: 0,
  costPrice: 0,

  // Income yields (manual entry)
  dividendYield: 0, // % - Dividend yield (after 20% dividend withholding tax)
  interestYield: 0, // % - Interest yield (taxed as income at marginal rate)
  expectedReturn: null, // % p.a. - Override default expected return for this asset (null = use asset class default)

  // Fees (Total Expense Ratio / Total Investment Cost)
  ter: 0, // % p.a. - Total Expense Ratio (fund management fees)
  // Note: TER reduces effective returns. A fund with 10% return and 1.5% TER has ~8.5% net return

  // Advisor fee exclusion
  excludeFromAdvisorFee: false, // Set to true to exclude this asset from advisor fee calculations

  // Metadata
  priceUrl: '', // Link to check price
  factSheetUrl: '', // Link to fact sheet
  lastUpdated: new Date().toISOString(),
  notes: '',

  // Performance fee notes (informational only - for complex fee structures that can't be calculated)
  performanceFeeNotes: '', // e.g., "1.5% + 20% of profits above benchmark"
});

export const createDefaultLiability = () => ({
  id: crypto.randomUUID(),
  name: '',
  principal: 0,
  currency: 'ZAR',
  interestRate: 0, // % p.a.
  monthlyPayment: 0,
  maturityDate: '',
  platform: '', // Where the debt is held
  notes: '',
});

export const createDefaultIncome = () => ({
  id: crypto.randomUUID(),
  name: '',
  type: 'Work', // Work, Investment, Pension, Rental, Annuity, Other
  monthlyAmount: 0,
  currency: 'ZAR',
  startAge: null,
  endAge: null, // null = lifetime
  isTaxable: true,
  isInflationAdjusted: true,
  notes: '',
  // Annuity-specific fields (only used when type === 'Annuity')
  annuityType: null, // 'living' or 'life'
  capitalValue: null, // Current capital (living) or purchase price (life)
  escalationRate: null, // % annual increase
  guaranteedPeriod: null, // Years (life annuity only), informational
  provider: '', // e.g., Allan Gray, Coronation
});

// Helper to create a new annuity with sensible defaults
export const createDefaultAnnuity = () => ({
  ...createDefaultIncome(),
  type: 'Annuity',
  isTaxable: true,
  isInflationAdjusted: false, // Annuities use escalationRate instead
  annuityType: 'living',
  capitalValue: 0,
  escalationRate: 5, // 5% default escalation
  guaranteedPeriod: null,
  provider: '',
});

// New hierarchical expense structure
export const createDefaultExpenseCategory = () => ({
  id: crypto.randomUUID(),
  name: '',
  subcategories: [], // Array of subcategory objects
});

export const createDefaultExpenseSubcategory = () => ({
  id: crypto.randomUUID(),
  name: '',
  monthlyAmount: 0,
  currency: 'ZAR', // ZAR, USD, GBP, EUR
  frequency: 'Monthly', // Monthly or Annual
  expenseType: 'Variable Discretionary', // Fixed Non-Discretionary, Variable Discretionary, Luxury, Wealth Building
  notes: '',
});

// Legacy expense model (for backward compatibility)
export const createDefaultExpense = () => ({
  id: crypto.randomUUID(),
  name: '',
  amount: 0,
  frequency: 'Monthly', // Monthly, Annual
  category: 'Housing', // User-configurable categories
  level: 'Essential', // Essential, Discretionary, Luxury
  budget: 0, // Optional budget for this expense
  notes: '',
});

export const createDefaultScenario = () => ({
  id: crypto.randomUUID(),
  name: 'Base Case',
  description: 'Current assumptions',

  // Assumptions
  inflationRate: 4.5, // %
  retirementAge: 65,
  lifeExpectancy: 90,
  monthlySavings: 0,
  useExpensesModule: true, // If false, use annualExpenses below
  annualExpenses: 0,

  // Asset class returns - if useCustomReturns is true, overrides settings.expectedReturns
  useCustomReturns: false,
  expectedReturns: {
    'Offshore Equity': 11.0,
    'SA Equity': 12.0,
    'SA Bonds': 8.5,
    'Offshore Bonds': 6.5,
    'Cash': 5.0,
    'Property': 9.0,
    'Crypto': 15.0,
  },

  // Currency appreciation/depreciation for non-reporting currency assets
  // Expressed as annual percentage change (positive = appreciation vs reporting currency)
  useCurrencyMovement: false,
  currencyMovement: {
    USD: 0, // e.g., 2 means USD strengthens 2% p.a. vs ZAR
    EUR: 0,
    GBP: 0,
  },

  // Expense phases - uses 4-phase life phases structure
  // If useCustomExpensePhases is false, uses settings.lifePhases percentages
  useCustomExpensePhases: false,
  expensePhases: {
    working: { ageStart: 55, ageEnd: 64, percentage: 100 },
    activeRetirement: { ageStart: 65, ageEnd: 72, percentage: 100 },
    slowerPace: { ageStart: 73, ageEnd: 80, percentage: 80 },
    laterYears: { ageStart: 81, ageEnd: 90, percentage: 60 },
  },

  // Shocks
  marketCrashes: [
    // { age: 70, description: 'Major market crash', assetClassDrops: { 'Offshore Equity': 40, 'SA Equity': 40 } }
  ],
  unexpectedExpenses: [
    // { age: 75, amount: 500000, description: 'Medical emergency' }
  ],

  // Results (populated after running)
  results: null,
  lastRun: null,
});

// Age-based expense planning - 4 phases with category-level amounts
// Note: This stores category totals (not individual line items) for each phase
// Amounts are in today's money (reporting currency) - inflation adjusted in projections
export const createDefaultAgeBasedExpensePlan = (settings) => {
  const lifePhases = settings?.lifePhases || DEFAULT_SETTINGS.lifePhases;
  const profileAge = settings?.profile?.age || 55;
  const lifeExpectancy = settings?.profile?.lifeExpectancy || 90;

  return {
    enabled: false,
    // categoryExpenses stores { categoryName: amount } for each phase
    // amount is monthly amount in reporting currency (today's money)
    phases: [
      {
        key: 'working',
        name: lifePhases.working?.name || 'Working',
        startAge: profileAge,
        endAge: lifePhases.working?.ageEnd || 64,
        categoryExpenses: {}, // { "Insurance": 7326, "Housing": 15000, ... }
      },
      {
        key: 'activeRetirement',
        name: lifePhases.activeRetirement?.name || 'Active Retirement',
        startAge: lifePhases.activeRetirement?.ageStart || 65,
        endAge: lifePhases.activeRetirement?.ageEnd || 72,
        categoryExpenses: {},
      },
      {
        key: 'slowerPace',
        name: lifePhases.slowerPace?.name || 'Slower Pace',
        startAge: lifePhases.slowerPace?.ageStart || 73,
        endAge: lifePhases.slowerPace?.ageEnd || 80,
        categoryExpenses: {},
      },
      {
        key: 'laterYears',
        name: lifePhases.laterYears?.name || 'Later Years',
        startAge: lifePhases.laterYears?.ageStart || 81,
        endAge: lifeExpectancy,
        categoryExpenses: {},
      },
    ],
  };
};

export const createDefaultProfile = (name = 'Duncan') => ({
  name,
  assets: [],
  liabilities: [],
  income: [],
  expenses: [], // Legacy expenses
  expenseCategories: [], // New hierarchical expense categories
  ageBasedExpensePlan: createDefaultAgeBasedExpensePlan(DEFAULT_SETTINGS),
  scenarios: [createDefaultScenario()],
  settings: DEFAULT_SETTINGS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Asset class options
export const ASSET_CLASSES = [
  'Offshore Equity',
  'SA Equity',
  'SA Bonds',
  'Offshore Bonds',
  'Cash',
  'Property',
  'Crypto',
];

// Region options
export const REGIONS = [
  'South Africa',
  'Offshore',
];

// Sector options (can be extended)
export const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial',
  'Consumer',
  'Industrial',
  'Energy',
  'Materials',
  'Utilities',
  'Real Estate',
  'Communications',
  'Diversified',
];

// Currency options - now derived from ALL_CURRENCIES
// Legacy export for backwards compatibility
export const CURRENCIES = Object.keys(ALL_CURRENCIES);

// Currency symbols - derived from ALL_CURRENCIES
export const CURRENCY_SYMBOLS = Object.fromEntries(
  Object.entries(ALL_CURRENCIES).map(([code, info]) => [code, info.symbol])
);

// Helper to get symbol for a currency
export const getCurrencySymbol = (currencyCode) => {
  return ALL_CURRENCIES[currencyCode]?.symbol || currencyCode;
};

// Helper to get currency name
export const getCurrencyName = (currencyCode) => {
  return ALL_CURRENCIES[currencyCode]?.name || currencyCode;
};

// Asset type options
export const ASSET_TYPES = [
  'Investible', // Generates returns (shares, bonds, cash, investment property)
  'Non-Investible', // Appreciates but no yield (primary home, collectibles)
];

// Account type options
export const ACCOUNT_TYPES = ['TFSA', 'RA', 'Taxable'];

// Portfolio options
export const PORTFOLIOS = ['Growth', 'Income', 'Preservation', 'Speculative'];

// Default platform options (used when settings.platforms is not set)
export const DEFAULT_PLATFORMS = [
  'Personal Trust',
  'PSG',
  'Trust',
  'The Research LampPost',
  'Satrix',
  'Easy Equities',
  'Credo',
  'Luno',
  'Standard Bank',
  'Absa',
  'FNB',
  'Nedbank',
  'Allan Gray',
  'Coronation',
];

// Legacy export for backwards compatibility
export const PLATFORMS = DEFAULT_PLATFORMS;

// Default expense categories (can be overridden in settings)
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing',
  'Food',
  'Transport',
  'Healthcare',
  'Insurance',
  'Entertainment',
  'Education',
  'Utilities',
  'Other',
];

// Expense levels (legacy)
export const EXPENSE_LEVELS = ['Essential', 'Discretionary', 'Luxury'];

// Expense types for new hierarchical structure
export const EXPENSE_TYPES = [
  'Fixed Non-Discretionary',
  'Variable Discretionary',
  'Luxury',
  'Wealth Building',
];

// Expense frequency options
export const EXPENSE_FREQUENCIES = ['Monthly', 'Annual'];
