// Schema constants for Excel import/export - Single Source of Truth
// These constants ensure Safari and Chrome use identical keys for data mapping

// Excel sheet names
export const EXCEL_SHEETS = {
  ASSETS: 'Assets',
  LIABILITIES: 'Liabilities',
  INCOME: 'Income',
  EXPENSES_LEGACY: 'Expenses',
  EXPENSE_CATEGORIES: 'Expense Categories',
  SCENARIOS: 'Scenarios',
  HISTORY: 'History',
  PROFILE: 'Profile',
  CURRENCY: 'Currency',
  EXCHANGE_RATES: 'Exchange Rates',
  ENABLED_CURRENCIES: 'Enabled Currencies',
  EXPECTED_RETURNS: 'Expected Returns',
  TARGET_ALLOCATION: 'Target Allocation',
  THRESHOLDS: 'Thresholds',
  LIFE_PHASES: 'Life Phases',
  WITHDRAWAL_RATES: 'Withdrawal Rates',
  AGE_BASED_EXPENSES: 'Age Based Expenses',
  TAX_CONFIG: 'Tax Config',
  PLATFORMS: 'Platforms',
  ADVISOR_FEE: 'Advisor Fee',
  UI_PREFERENCES: 'UI Preferences',
  OTHER: 'Other',
};

// Profile settings keys
export const PROFILE_KEYS = {
  NAME: 'Name',
  AGE: 'Age',
  MARGINAL_TAX_RATE: 'Marginal Tax Rate (%)',
  RETIREMENT_AGE: 'Retirement Age',
  LIFE_EXPECTANCY: 'Life Expectancy',
  MONTHLY_SAVINGS: 'Monthly Savings',
  ANNUAL_EXPENSES: 'Annual Expenses',
  ANNUAL_TAXABLE_INCOME: 'Annual Taxable Income',
  EXPECTED_INFLATION: 'Expected Inflation (%)',
  INCOME_GROWTH: 'Income Growth (%)',
  DEFAULT_CGT: 'Default CGT Rate (%)',
};

// Asset column keys
export const ASSET_KEYS = {
  ID: 'ID',
  NAME: 'Name',
  ASSET_CLASS: 'Asset Class',
  SECTOR: 'Sector',
  CURRENCY: 'Currency',
  REGION: 'Region',
  PORTFOLIO: 'Portfolio',
  ASSET_TYPE: 'Asset Type',
  PLATFORM: 'Platform',
  ACCOUNT_TYPE: 'Account Type',
  UNITS: 'Units',
  CURRENT_PRICE: 'Current Price',
  COST_PRICE: 'Cost Price',
  DIVIDEND_YIELD: 'Dividend Yield (%)',
  INTEREST_YIELD: 'Interest Yield (%)',
  TER: 'TER (%)',
  EXPECTED_RETURN: 'Expected Forward Return (% p.a.)',
  VALUE_ZAR: 'Value (ZAR)',
  PERCENT_OF_TOTAL: '% of Total',
  EXPECTED_RETURN_USED: 'Expected Return Used (% p.a.)',
  UNREALIZED_GAIN: 'Unrealized Gain/Loss',
  CGT_IF_SOLD: 'CGT (if sold)',
  NET_VALUE_AFTER_CGT: 'Net Value After CGT',
  PRICE_URL: 'Price URL',
  FACT_SHEET_URL: 'Fact Sheet URL',
  LAST_UPDATED: 'Last Updated',
  NOTES: 'Notes',
  EXCLUDE_FROM_ADVISOR_FEE: 'Exclude From Advisor Fee',
  IS_LIQUID: 'Is Liquid',
};

// Liability column keys
export const LIABILITY_KEYS = {
  ID: 'ID',
  NAME: 'Name',
  PRINCIPAL: 'Principal',
  CURRENCY: 'Currency',
  INTEREST_RATE: 'Interest Rate (%)',
  MONTHLY_PAYMENT: 'Monthly Payment',
  MATURITY_DATE: 'Maturity Date',
  PLATFORM: 'Platform',
  NOTES: 'Notes',
};

// Income column keys
export const INCOME_KEYS = {
  ID: 'ID',
  NAME: 'Name',
  TYPE: 'Type',
  MONTHLY_AMOUNT: 'Monthly Amount',
  CURRENCY: 'Currency',
  START_AGE: 'Start Age',
  END_AGE: 'End Age',
  IS_TAXABLE: 'Is Taxable',
  IS_INFLATION_ADJUSTED: 'Is Inflation Adjusted',
  ANNUITY_TYPE: 'Annuity Type',
  CAPITAL_VALUE: 'Capital Value',
  ESCALATION_RATE: 'Escalation Rate (%)',
  GUARANTEED_PERIOD: 'Guaranteed Period',
  PROVIDER: 'Provider',
  NOTES: 'Notes',
};

// Expense column keys (legacy)
export const EXPENSE_KEYS = {
  ID: 'ID',
  NAME: 'Name',
  AMOUNT: 'Amount',
  FREQUENCY: 'Frequency',
  CATEGORY: 'Category',
  LEVEL: 'Level',
  BUDGET: 'Budget',
  NOTES: 'Notes',
};

// Expense category column keys
export const EXPENSE_CATEGORY_KEYS = {
  CATEGORY_ID: 'Category ID',
  CATEGORY_NAME: 'Category Name',
  SUBCATEGORY_ID: 'Subcategory ID',
  SUBCATEGORY_NAME: 'Subcategory Name',
  AMOUNT: 'Amount',
  CURRENCY: 'Currency',
  FREQUENCY: 'Frequency',
  EXPENSE_TYPE: 'Expense Type',
  NOTES: 'Notes',
};

// Scenario column keys
export const SCENARIO_KEYS = {
  ID: 'ID',
  NAME: 'Name',
  DESCRIPTION: 'Description',
  MARKET_RETURN: 'Market Return (%)',
  INFLATION_RATE: 'Inflation Rate (%)',
  RETIREMENT_AGE: 'Retirement Age',
  LIFE_EXPECTANCY: 'Life Expectancy',
  MONTHLY_SAVINGS: 'Monthly Savings',
  USE_EXPENSES_MODULE: 'Use Expenses Module',
  ANNUAL_EXPENSES: 'Annual Expenses',
  USE_CUSTOM_RETURNS: 'Use Custom Returns',
  USE_CURRENCY_MOVEMENT: 'Use Currency Movement',
  USE_CUSTOM_EXPENSE_PHASES: 'Use Custom Expense Phases',
  MARKET_CRASHES: 'Market Crashes',
  UNEXPECTED_EXPENSES: 'Unexpected Expenses',
  CUSTOM_RETURNS: 'Custom Returns',
  CURRENCY_MOVEMENT: 'Currency Movement',
  EXPENSE_PHASES: 'Expense Phases',
};

// History column keys
export const HISTORY_KEYS = {
  ID: 'ID',
  DATE: 'Date',
  NET_WORTH: 'Net Worth',
  GROSS_ASSETS: 'Gross Assets',
  INVESTIBLE_ASSETS: 'Investible Assets',
  NON_INVESTIBLE_ASSETS: 'Non-Investible Assets',
  LIABILITIES: 'Liabilities',
  CGT_LIABILITY: 'CGT Liability',
  REALISABLE_NET_WORTH: 'Realisable Net Worth',
  NOTES: 'Notes',
  ALLOCATION: 'Allocation',
};

// Currency settings keys
export const CURRENCY_KEYS = {
  SETTING: 'Setting',
  VALUE: 'Value',
  REPORTING_CURRENCY: 'Reporting Currency',
  CURRENCY_PAIR: 'Currency Pair',
  CURRENCY_CODE: 'Currency Code',
  RATE: 'Rate',
  CURRENCY: 'Currency',
};

// Expected returns keys
export const EXPECTED_RETURNS_KEYS = {
  ASSET_CLASS: 'Asset Class',
  EXPECTED_RETURN: 'Expected Return (%)',
};

// Target allocation keys
export const TARGET_ALLOCATION_KEYS = {
  ASSET_CLASS: 'Asset Class',
  TARGET: 'Target (%)',
};

// Threshold keys
export const THRESHOLD_KEYS = {
  THRESHOLD: 'Threshold',
  VALUE: 'Value',
  SINGLE_ASSET: 'Single Asset (%)',
  ASSET_CLASS: 'Asset Class (%)',
  CURRENCY: 'Currency (%)',
  SECTOR: 'Sector (%)',
  REGION: 'Region (%)',
  PLATFORM: 'Platform (%)',
  STALENESS: 'Staleness (days)',
  REBALANCING_DRIFT: 'Rebalancing Drift (%)',
};

// Life phases keys
export const LIFE_PHASES_KEYS = {
  PHASE_KEY: 'Phase Key',
  NAME: 'Name',
  AGE_START: 'Age Start',
  AGE_END: 'Age End',
  PERCENTAGE: 'Percentage (%)',
};

// Withdrawal rates keys
export const WITHDRAWAL_RATES_KEYS = {
  STRATEGY: 'Strategy',
  RATE: 'Rate',
  CONSERVATIVE: 'Conservative (%)',
  SAFE: 'Safe (%)',
  AGGRESSIVE: 'Aggressive (%)',
};

// Platform keys
export const PLATFORM_KEYS = {
  ID: 'ID',
  NAME: 'Name',
  FEE_TYPE: 'Fee Type',
  FEE_RATE: 'Fee Rate',
  FEE_AMOUNT: 'Fee Amount',
  FEE_FREQUENCY: 'Fee Frequency',
  FEE_CURRENCY: 'Fee Currency',
  FEE_TIERS: 'Fee Tiers',
};

// Advisor fee keys
export const ADVISOR_FEE_KEYS = {
  SETTING: 'Setting',
  VALUE: 'Value',
  ENABLED: 'Enabled',
  TYPE: 'Type',
  AMOUNT: 'Amount',
  CURRENCY: 'Currency',
};

// Tax config keys
export const TAX_CONFIG_KEYS = {
  SETTING: 'Setting',
  VALUE: 'Value',
  TAX_YEAR: 'Tax Year',
  EFFECTIVE_DATE: 'Effective Date',
  INCOME_TAX_BRACKETS: 'Income Tax Brackets',
  PRIMARY_REBATE: 'Primary Rebate',
  SECONDARY_REBATE: 'Secondary Rebate',
  TERTIARY_REBATE: 'Tertiary Rebate',
  THRESHOLD_UNDER_65: 'Threshold Under 65',
  THRESHOLD_AGE_65_74: 'Threshold Age 65-74',
  THRESHOLD_AGE_75_PLUS: 'Threshold Age 75+',
  CGT_INCLUSION_RATE: 'CGT Inclusion Rate',
  CGT_ANNUAL_EXCLUSION: 'CGT Annual Exclusion',
  DIVIDEND_WITHHOLDING_TAX: 'Dividend Withholding Tax',
  INTEREST_EXEMPTION_UNDER_65: 'Interest Exemption Under 65',
  INTEREST_EXEMPTION_AGE_65_PLUS: 'Interest Exemption Age 65+',
};

// Age-based expenses keys (flattened format)
export const AGE_BASED_EXPENSES_KEYS = {
  ROW_TYPE: 'Row Type',
  PHASE_INDEX: 'Phase Index',
  PHASE_KEY: 'Phase Key',
  PHASE_NAME: 'Phase Name',
  START_AGE: 'Start Age',
  END_AGE: 'End Age',
  CATEGORY_ID: 'Category ID',
  CATEGORY_AMOUNT: 'Category Amount',
  // Row type values
  ROW_TYPE_METADATA: 'metadata',
  ROW_TYPE_PHASE: 'phase',
  ROW_TYPE_EXPENSE: 'expense',
};

// UI Preferences keys
export const UI_PREFERENCES_KEYS = {
  SETTING: 'Setting',
  VALUE: 'Value',
  FEES_PROJECTION_YEARS: 'Fees Projection Years',
  FEES_INFLATION_RATE: 'Fees Inflation Rate',
  FEES_PORTFOLIO_GROWTH_RATE: 'Fees Portfolio Growth Rate',
  SCENARIO_DEFAULT_CURRENCY_MOVEMENT: 'Scenario Default Currency Movement',
  SCENARIO_DEFAULT_CRASH_ASSET_CLASSES: 'Scenario Default Crash Asset Classes',
};

// Other settings keys
export const OTHER_SETTINGS_KEYS = {
  SETTING: 'Setting',
  VALUE: 'Value',
  INFLATION_RATE: 'Inflation Rate (%)',
};
