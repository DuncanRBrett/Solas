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

  retirementExpensePhases: {
    phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
    phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
    phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
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

  // User-configurable platforms
  platforms: [
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
  ],
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

  // Metadata
  priceUrl: '', // Link to check price
  factSheetUrl: '', // Link to fact sheet
  lastUpdated: new Date().toISOString(),
  notes: '',
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
  type: 'Work', // Work, Investment
  monthlyAmount: 0,
  currency: 'ZAR',
  startAge: null,
  endAge: null, // null = lifetime
  isTaxable: true,
  isInflationAdjusted: true,
  notes: '',
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
  marketReturn: 9.0, // % nominal return
  inflationRate: 4.5, // %
  retirementAge: 65,
  lifeExpectancy: 90,
  monthlySavings: 0,
  useExpensesModule: true, // If false, use annualExpenses below
  annualExpenses: 0,

  // Shocks
  marketCrashes: [
    // { age: 70, dropPercentage: 40, description: 'Major market crash' }
  ],
  unexpectedExpenses: [
    // { age: 75, amount: 500000, description: 'Medical emergency' }
  ],

  // Results (populated after running)
  results: null,
  lastRun: null,
});

// Age-based expense planning
export const createDefaultAgeBasedExpensePlan = () => ({
  enabled: false,
  phases: [
    { startAge: 40, endAge: 60, expenses: {} }, // Will be populated with category/subcategory amounts
    { startAge: 60, endAge: 75, expenses: {} },
    { startAge: 75, endAge: 90, expenses: {} },
  ],
});

export const createDefaultProfile = (name = 'Duncan') => ({
  name,
  assets: [],
  liabilities: [],
  income: [],
  expenses: [], // Legacy expenses
  expenseCategories: [], // New hierarchical expense categories
  ageBasedExpensePlan: createDefaultAgeBasedExpensePlan(),
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
