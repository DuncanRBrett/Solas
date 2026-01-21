import * as XLSX from 'xlsx';
import {
  calculateAssetValueZAR,
  calculateUnrealizedGain,
  calculateCGT,
  calculateNetProceeds,
  getExchangeRates,
  migrateLegacyExchangeRates,
} from './calculations';
import {
  EXCEL_SHEETS,
  PROFILE_KEYS,
  ASSET_KEYS,
  AGE_BASED_EXPENSES_KEYS,
} from '../models/schema';

/**
 * Browser-agnostic JSON parser for Excel cells
 * Handles cases where XLSX might have already parsed the object or
 * where strings have inconsistent escaping between Safari/Chrome.
 *
 * @param {any} str - Value to parse (string, object, or other)
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed value or default
 */
export const safeJsonParse = (str, defaultValue = {}) => {
  if (!str || str === '') return defaultValue;
  if (typeof str === 'object') return str; // Already parsed by XLSX

  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      // Fallback for Safari/Excel double-escaping quirks
      const cleaned = String(str)
        .replace(/\\"/g, '"')
        .replace(/^"|"$/g, ''); // Remove outer quotes if wrapped
      return JSON.parse(cleaned);
    } catch (finalError) {
      console.warn('Failed to parse complex data cell:', str);
      return defaultValue;
    }
  }
};

/**
 * Validates imported profile data for completeness and potential "drifts"
 * Returns errors (blocking) and warnings (non-blocking)
 *
 * @param {object} data - Imported profile data
 * @returns {object} Validation result with isValid, errors, warnings
 */
export const validateImportData = (data) => {
  const warnings = [];
  const errors = [];

  // 1. Check for Critical Settings
  if (!data.settings?.profile?.annualTaxableIncome && data.settings?.profile?.annualTaxableIncome !== 0) {
    warnings.push('Annual Taxable Income not found; defaulting to 0. This affects retirement projections.');
  }
  if (!data.settings?.profile?.marginalTaxRate && data.settings?.profile?.marginalTaxRate !== 0) {
    warnings.push('Marginal Tax Rate missing; calculations will use default (45%).');
  }
  if (!data.settings?.profile?.age && data.settings?.profile?.age !== 0) {
    warnings.push('Age not specified; some calculations may be inaccurate.');
  }

  // 2. Check JSON integrity for complex modules
  if (data.ageBasedExpensePlan?.enabled && (!data.ageBasedExpensePlan.phases || data.ageBasedExpensePlan.phases.length === 0)) {
    errors.push('Age-based expense phases failed to load or are empty.');
  }

  // 3. Check Exchange Rate completeness
  const currenciesInAssets = new Set((data.assets || []).map(a => a.currency).filter(Boolean));
  const reportingCurrency = data.settings?.reportingCurrency || 'ZAR';
  currenciesInAssets.delete(reportingCurrency);

  currenciesInAssets.forEach(curr => {
    if (!data.settings?.exchangeRates?.[curr]) {
      warnings.push(`Missing exchange rate for ${curr}. System will use default rates.`);
    }
  });

  // 4. Check for empty critical data
  if (!data.assets || data.assets.length === 0) {
    warnings.push('No assets found in import.');
  }

  // 5. Check scenario integrity
  if (data.scenarios) {
    data.scenarios.forEach((scenario, idx) => {
      if (scenario.marketCrashes && !Array.isArray(scenario.marketCrashes)) {
        warnings.push(`Scenario ${idx + 1}: Market crashes data may be corrupted.`);
      }
      if (scenario.unexpectedExpenses && !Array.isArray(scenario.unexpectedExpenses)) {
        warnings.push(`Scenario ${idx + 1}: Unexpected expenses data may be corrupted.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0,
  };
};

/**
 * Unified mapper for Asset objects to Excel Rows.
 * Uses Schema constants to ensure 100% consistency between export modes.
 * IMPORTANT: Does NOT use Math.round() to preserve precision for HHI calculations.
 *
 * @param {object} asset - Asset object
 * @param {number} totalValue - Total portfolio value for percentage calculation
 * @param {object} exchangeRates - Exchange rates for calculations
 * @param {number} marginalTaxRate - Marginal tax rate for CGT
 * @param {object} expectedReturnsForCalc - Expected returns by asset class
 * @returns {object} Excel row object
 */
export const mapAssetToExcelRow = (asset, totalValue, exchangeRates, marginalTaxRate, expectedReturnsForCalc) => {
  const valueZAR = calculateAssetValueZAR(asset, exchangeRates);
  const unrealizedGain = calculateUnrealizedGain(asset, exchangeRates);
  const cgt = calculateCGT(unrealizedGain, marginalTaxRate);
  const netValueAfterCGT = calculateNetProceeds(asset, exchangeRates, marginalTaxRate);

  // Use asset-specific expected return if set, otherwise use asset class default
  const expectedReturn = asset.expectedReturn !== null && asset.expectedReturn !== undefined
    ? asset.expectedReturn
    : (expectedReturnsForCalc[asset.assetClass] || 0);
  const percentOfTotal = totalValue > 0 ? (valueZAR / totalValue) * 100 : 0;

  return {
    [ASSET_KEYS.ID]: asset.id,
    [ASSET_KEYS.NAME]: asset.name,
    [ASSET_KEYS.ASSET_CLASS]: asset.assetClass,
    [ASSET_KEYS.SECTOR]: asset.sector || '',
    [ASSET_KEYS.CURRENCY]: asset.currency,
    [ASSET_KEYS.REGION]: asset.region || '',
    [ASSET_KEYS.PORTFOLIO]: asset.portfolio || '',
    [ASSET_KEYS.ASSET_TYPE]: asset.assetType,
    [ASSET_KEYS.PLATFORM]: asset.platform || '',
    [ASSET_KEYS.ACCOUNT_TYPE]: asset.accountType || '',
    [ASSET_KEYS.UNITS]: asset.units || 0,
    [ASSET_KEYS.CURRENT_PRICE]: asset.currentPrice || 0,
    [ASSET_KEYS.COST_PRICE]: asset.costPrice || 0,
    [ASSET_KEYS.DIVIDEND_YIELD]: asset.dividendYield || 0,
    [ASSET_KEYS.INTEREST_YIELD]: asset.interestYield || 0,
    [ASSET_KEYS.TER]: asset.ter || 0,
    [ASSET_KEYS.EXPECTED_RETURN]: asset.expectedReturn !== null && asset.expectedReturn !== undefined ? asset.expectedReturn : '',
    // PATCH 2: Raw floats for precision - no Math.round()
    [ASSET_KEYS.VALUE_ZAR]: valueZAR,
    [ASSET_KEYS.PERCENT_OF_TOTAL]: percentOfTotal.toFixed(2),
    [ASSET_KEYS.EXPECTED_RETURN_USED]: expectedReturn,
    [ASSET_KEYS.UNREALIZED_GAIN]: unrealizedGain,
    [ASSET_KEYS.CGT_IF_SOLD]: cgt,
    [ASSET_KEYS.NET_VALUE_AFTER_CGT]: netValueAfterCGT,
    [ASSET_KEYS.PRICE_URL]: asset.priceUrl || '',
    [ASSET_KEYS.FACT_SHEET_URL]: asset.factSheetUrl || '',
    [ASSET_KEYS.LAST_UPDATED]: asset.lastUpdated || '',
    [ASSET_KEYS.NOTES]: asset.notes || '',
    [ASSET_KEYS.EXCLUDE_FROM_ADVISOR_FEE]: asset.excludeFromAdvisorFee ? 'Yes' : 'No',
    [ASSET_KEYS.IS_LIQUID]: asset.isLiquid !== false ? 'Yes' : 'No', // Default to liquid
  };
};

/**
 * Export assets to Excel file
 * Uses unified mapAssetToExcelRow for consistency with complete profile export
 */
export function exportAssetsToExcel(assets, profileName, settings = null) {
  // Get exchange rates using helper function (handles both formats)
  const calcExchangeRates = getExchangeRates(settings || {});
  const marginalTaxRate = settings?.profile?.marginalTaxRate || 45;
  const expectedReturnsForCalc = settings?.expectedReturns || {};

  // Calculate total portfolio value for percentage calculations
  const totalValue = assets.reduce((total, asset) => {
    return total + calculateAssetValueZAR(asset, calcExchangeRates);
  }, 0);

  // Use unified mapper for consistency (Patch 5)
  const assetData = assets.map(asset =>
    mapAssetToExcelRow(asset, totalValue, calcExchangeRates, marginalTaxRate, expectedReturnsForCalc)
  );

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(assetData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, EXCEL_SHEETS.ASSETS);

  // Generate filename with profile name and date
  const date = new Date().toISOString().split('T')[0];
  const filename = `${profileName}_Assets_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Export settings to Excel file
 */
export function exportSettingsToExcel(settings, profileName) {
  // Profile settings
  const profileData = [
    { Setting: 'Name', Value: settings.profile?.name || '' },
    { Setting: 'Age', Value: settings.profile?.age || 0 },
    { Setting: 'Marginal Tax Rate (%)', Value: settings.profile?.marginalTaxRate || 0 },
    { Setting: 'Retirement Age', Value: settings.profile?.retirementAge || 65 },
    { Setting: 'Life Expectancy', Value: settings.profile?.lifeExpectancy || 90 },
    { Setting: 'Monthly Savings', Value: settings.profile?.monthlySavings || 0 },
    { Setting: 'Annual Expenses', Value: settings.profile?.annualExpenses || 0 },
    { Setting: 'Annual Taxable Income', Value: settings.profile?.annualTaxableIncome || 0 },
    { Setting: 'Expected Inflation (%)', Value: settings.profile?.expectedInflation || 4.5 },
    { Setting: 'Income Growth (%)', Value: settings.profile?.incomeGrowth || 5.0 },
    { Setting: 'Default CGT Rate (%)', Value: settings.profile?.defaultCGT || 18 },
  ];

  // Currency settings - support both new and legacy structure
  const reportingCurrency = settings.reportingCurrency || settings.currency?.reporting || 'ZAR';
  const currencyData = [
    { Setting: 'Reporting Currency', Value: reportingCurrency },
  ];

  // Exchange rates - support both new format { USD: 18.5 } and legacy { 'USD/ZAR': 18.5 }
  const exchangeRates = settings.exchangeRates || settings.currency?.exchangeRates || {};
  const exchangeRatesData = Object.entries(exchangeRates).map(([key, rate]) => {
    // Convert new format to display format
    const currencyPair = key.includes('/') ? key : `${key}/${reportingCurrency}`;
    return {
      'Currency Pair': currencyPair,
      'Currency Code': key.includes('/') ? key.split('/')[0] : key,
      'Rate': rate,
    };
  });

  // Expected returns
  const expectedReturnsData = Object.entries(settings.expectedReturns || {}).map(([assetClass, returnRate]) => ({
    'Asset Class': assetClass,
    'Expected Return (%)': returnRate,
  }));

  // Target allocation
  const targetAllocationData = Object.entries(settings.targetAllocation || {}).map(([assetClass, percentage]) => ({
    'Asset Class': assetClass,
    'Target (%)': percentage,
  }));

  // Thresholds
  const thresholdsData = [
    { Threshold: 'Single Asset (%)', Value: settings.thresholds?.singleAsset || 10 },
    { Threshold: 'Asset Class (%)', Value: settings.thresholds?.assetClass || 50 },
    { Threshold: 'Currency (%)', Value: settings.thresholds?.currency || 70 },
    { Threshold: 'Sector (%)', Value: settings.thresholds?.sector || 30 },
    { Threshold: 'Region (%)', Value: settings.thresholds?.region || 80 },
    { Threshold: 'Platform (%)', Value: settings.thresholds?.platform || 40 },
    { Threshold: 'Staleness (days)', Value: settings.thresholds?.staleness || 7 },
    { Threshold: 'Rebalancing Drift (%)', Value: settings.thresholds?.rebalancingDrift || 5 },
  ];

  // Retirement expense phases
  const expensePhasesData = Object.entries(settings.retirementExpensePhases || {}).map(([phase, data]) => ({
    'Phase': phase,
    'Age Start': data.ageStart,
    'Age End': data.ageEnd,
    'Percentage (%)': data.percentage,
  }));

  // Withdrawal rates
  const withdrawalRatesData = [
    { Strategy: 'Conservative (%)', Rate: settings.withdrawalRates?.conservative || 3.0 },
    { Strategy: 'Safe (%)', Rate: settings.withdrawalRates?.safe || 4.0 },
    { Strategy: 'Aggressive (%)', Rate: settings.withdrawalRates?.aggressive || 5.0 },
  ];

  // Other settings
  const otherSettingsData = [
    { Setting: 'Inflation Rate (%)', Value: settings.inflation || 4.5 },
  ];

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  const wsProfile = XLSX.utils.json_to_sheet(profileData);
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Profile');

  const wsCurrency = XLSX.utils.json_to_sheet(currencyData);
  XLSX.utils.book_append_sheet(wb, wsCurrency, 'Currency');

  const wsRates = XLSX.utils.json_to_sheet(exchangeRatesData);
  XLSX.utils.book_append_sheet(wb, wsRates, 'Exchange Rates');

  const wsExpectedReturns = XLSX.utils.json_to_sheet(expectedReturnsData);
  XLSX.utils.book_append_sheet(wb, wsExpectedReturns, 'Expected Returns');

  const wsTargetAllocation = XLSX.utils.json_to_sheet(targetAllocationData);
  XLSX.utils.book_append_sheet(wb, wsTargetAllocation, 'Target Allocation');

  const wsThresholds = XLSX.utils.json_to_sheet(thresholdsData);
  XLSX.utils.book_append_sheet(wb, wsThresholds, 'Thresholds');

  const wsExpensePhases = XLSX.utils.json_to_sheet(expensePhasesData);
  XLSX.utils.book_append_sheet(wb, wsExpensePhases, 'Expense Phases');

  const wsWithdrawal = XLSX.utils.json_to_sheet(withdrawalRatesData);
  XLSX.utils.book_append_sheet(wb, wsWithdrawal, 'Withdrawal Rates');

  const wsOther = XLSX.utils.json_to_sheet(otherSettingsData);
  XLSX.utils.book_append_sheet(wb, wsOther, 'Other');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const filename = `${profileName}_Settings_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Export complete profile (ALL data) to Excel
 * This is a true backup - includes assets, liabilities, income, expenses, scenarios, history, platforms, and all settings
 * Uses unified mapAssetToExcelRow for consistency (Patch 5)
 */
export function exportCompleteProfile(profile) {
  const { name, assets, liabilities, income, expenses, expenseCategories, ageBasedExpensePlan, scenarios, history, settings } = profile;

  // Get exchange rates using helper function (handles both formats)
  const calcExchangeRates = getExchangeRates(settings || {});
  const marginalTaxRate = settings?.profile?.marginalTaxRate || 45;
  const expectedReturnsForCalc = settings?.expectedReturns || {};

  // Calculate total portfolio value for percentage calculations
  const totalValue = (assets || []).reduce((total, asset) => {
    return total + calculateAssetValueZAR(asset, calcExchangeRates);
  }, 0);

  // Use unified mapper for consistency (Patch 5) - no Math.round() for precision
  const assetData = (assets || []).map(asset =>
    mapAssetToExcelRow(asset, totalValue, calcExchangeRates, marginalTaxRate, expectedReturnsForCalc)
  );

  // Prepare liabilities data
  const liabilitiesData = (liabilities || []).map(liability => ({
    'ID': liability.id,
    'Name': liability.name,
    'Principal': liability.principal || 0,
    'Currency': liability.currency || 'ZAR',
    'Interest Rate (%)': liability.interestRate || 0,
    'Monthly Payment': liability.monthlyPayment || 0,
    'Maturity Date': liability.maturityDate || '',
    'Platform': liability.platform || '',
    'Notes': liability.notes || '',
  }));

  // Prepare income data
  const incomeData = (income || []).map(inc => ({
    'ID': inc.id,
    'Name': inc.name,
    'Type': inc.type || 'Other',
    'Monthly Amount': inc.monthlyAmount || 0,
    'Currency': inc.currency || 'ZAR',
    'Start Age': inc.startAge ?? '',
    'End Age': inc.endAge ?? '',
    'Is Taxable': inc.isTaxable ? 'Yes' : 'No',
    'Is Inflation Adjusted': inc.isInflationAdjusted ? 'Yes' : 'No',
    'Annuity Type': inc.annuityType || '',
    'Capital Value': inc.capitalValue ?? '',
    'Escalation Rate (%)': inc.escalationRate ?? '',
    'Guaranteed Period': inc.guaranteedPeriod ?? '',
    'Provider': inc.provider || '',
    'Notes': inc.notes || '',
  }));

  // Prepare expenses data (legacy format)
  const expensesData = (expenses || []).map(exp => ({
    'ID': exp.id,
    'Name': exp.name,
    'Amount': exp.amount || 0,
    'Frequency': exp.frequency || 'Monthly',
    'Category': exp.category || '',
    'Level': exp.level || 'Essential',
    'Budget': exp.budget || 0,
    'Notes': exp.notes || '',
  }));

  // Prepare expense categories data (hierarchical format) - flatten for Excel
  const expenseCategoriesData = [];
  (expenseCategories || []).forEach(cat => {
    (cat.subcategories || []).forEach(sub => {
      expenseCategoriesData.push({
        'Category ID': cat.id,
        'Category Name': cat.name,
        'Subcategory ID': sub.id,
        'Subcategory Name': sub.name,
        'Amount': sub.amount || 0,
        'Currency': sub.currency || 'ZAR',
        'Frequency': sub.frequency || 'Monthly',
        'Expense Type': sub.expenseType || 'Variable Discretionary',
        'Notes': sub.notes || '',
      });
    });
  });

  // Prepare scenarios data - basic info (results are complex and would be recalculated)
  const scenariosData = (scenarios || []).map(scenario => ({
    'ID': scenario.id,
    'Name': scenario.name,
    'Description': scenario.description || '',
    'Market Return (%)': scenario.marketReturn ?? 9,
    'Inflation Rate (%)': scenario.inflationRate || 4.5,
    'Retirement Age': scenario.retirementAge || 65,
    'Life Expectancy': scenario.lifeExpectancy || 90,
    'Monthly Savings': scenario.monthlySavings || 0,
    'Use Expenses Module': scenario.useExpensesModule ? 'Yes' : 'No',
    'Annual Expenses': scenario.annualExpenses || 0,
    'Use Custom Returns': scenario.useCustomReturns ? 'Yes' : 'No',
    'Use Currency Movement': scenario.useCurrencyMovement ? 'Yes' : 'No',
    'Use Custom Expense Phases': scenario.useCustomExpensePhases ? 'Yes' : 'No',
    'Market Crashes': JSON.stringify(scenario.marketCrashes || []),
    'Unexpected Expenses': JSON.stringify(scenario.unexpectedExpenses || []),
    'Custom Returns': scenario.useCustomReturns ? JSON.stringify(scenario.expectedReturns || {}) : '',
    'Currency Movement': scenario.useCurrencyMovement ? JSON.stringify(scenario.currencyMovement || {}) : '',
    'Expense Phases': scenario.useCustomExpensePhases ? JSON.stringify(scenario.expensePhases || {}) : '',
  }));

  // Prepare history data - snapshots of portfolio over time
  // Field names must match what's created in Dashboard.jsx handleSaveToHistory
  const historyData = (history || []).map(snapshot => ({
    'ID': snapshot.id,
    'Date': snapshot.date,
    'Net Worth': snapshot.netWorth ?? '',
    'Gross Assets': snapshot.grossAssets ?? '',
    'Investible Assets': snapshot.investibleAssets ?? '',
    'Non-Investible Assets': snapshot.nonInvestibleAssets ?? '',
    'Liabilities': snapshot.liabilities ?? '',
    'CGT Liability': snapshot.cgtLiability ?? '',
    'Realisable Net Worth': snapshot.realisableNetWorth ?? '',
    'Notes': snapshot.notes || '',
    // Store allocation as JSON (object with asset class -> percentage)
    'Allocation': snapshot.allocation ? JSON.stringify(snapshot.allocation) : '',
  }));

  // Profile settings
  const profileData = [
    { Setting: 'Name', Value: settings.profile?.name || '' },
    { Setting: 'Age', Value: settings.profile?.age || 0 },
    { Setting: 'Marginal Tax Rate (%)', Value: settings.profile?.marginalTaxRate || 0 },
    { Setting: 'Retirement Age', Value: settings.profile?.retirementAge || 65 },
    { Setting: 'Life Expectancy', Value: settings.profile?.lifeExpectancy || 90 },
    { Setting: 'Monthly Savings', Value: settings.profile?.monthlySavings || 0 },
    { Setting: 'Annual Expenses', Value: settings.profile?.annualExpenses || 0 },
    { Setting: 'Annual Taxable Income', Value: settings.profile?.annualTaxableIncome || 0 },
    { Setting: 'Expected Inflation (%)', Value: settings.profile?.expectedInflation || 4.5 },
    { Setting: 'Income Growth (%)', Value: settings.profile?.incomeGrowth || 5.0 },
    { Setting: 'Default CGT Rate (%)', Value: settings.profile?.defaultCGT || 18 },
  ];

  // Currency settings
  const reportingCurrency = settings.reportingCurrency || settings.currency?.reporting || 'ZAR';
  const currencyData = [
    { Setting: 'Reporting Currency', Value: reportingCurrency },
  ];

  // Exchange rates
  const exchangeRates = settings.exchangeRates || settings.currency?.exchangeRates || {};
  const exchangeRatesData = Object.entries(exchangeRates).map(([key, rate]) => {
    const currencyPair = key.includes('/') ? key : `${key}/${reportingCurrency}`;
    return {
      'Currency Pair': currencyPair,
      'Currency Code': key.includes('/') ? key.split('/')[0] : key,
      'Rate': rate,
    };
  });

  // Enabled currencies
  const enabledCurrenciesData = (settings.enabledCurrencies || []).map(curr => ({
    'Currency': curr,
  }));

  const expectedReturnsData = Object.entries(settings.expectedReturns || {}).map(([assetClass, returnRate]) => ({
    'Asset Class': assetClass,
    'Expected Return (%)': returnRate,
  }));

  const targetAllocationData = Object.entries(settings.targetAllocation || {}).map(([assetClass, percentage]) => ({
    'Asset Class': assetClass,
    'Target (%)': percentage,
  }));

  const thresholdsData = [
    { Threshold: 'Single Asset (%)', Value: settings.thresholds?.singleAsset || 10 },
    { Threshold: 'Asset Class (%)', Value: settings.thresholds?.assetClass || 50 },
    { Threshold: 'Currency (%)', Value: settings.thresholds?.currency || 70 },
    { Threshold: 'Sector (%)', Value: settings.thresholds?.sector || 30 },
    { Threshold: 'Region (%)', Value: settings.thresholds?.region || 80 },
    { Threshold: 'Platform (%)', Value: settings.thresholds?.platform || 40 },
    { Threshold: 'Staleness (days)', Value: settings.thresholds?.staleness || 7 },
    { Threshold: 'Rebalancing Drift (%)', Value: settings.thresholds?.rebalancingDrift || 5 },
  ];

  // Life phases
  const lifePhasesData = Object.entries(settings.lifePhases || {}).map(([key, phase]) => ({
    'Phase Key': key,
    'Name': phase.name || key,
    'Age Start': phase.ageStart || 0,
    'Age End': phase.ageEnd || 0,
    'Percentage (%)': phase.percentage || 100,
  }));

  const withdrawalRatesData = [
    { Strategy: 'Conservative (%)', Rate: settings.withdrawalRates?.conservative || 3.0 },
    { Strategy: 'Safe (%)', Rate: settings.withdrawalRates?.safe || 4.0 },
    { Strategy: 'Aggressive (%)', Rate: settings.withdrawalRates?.aggressive || 5.0 },
  ];

  // Platforms - handle both string and object formats
  const platformsData = (settings.platforms || []).map(platform => {
    if (typeof platform === 'string') {
      return { 'ID': platform.toLowerCase().replace(/\s+/g, '-'), 'Name': platform, 'Fee Type': '', 'Fee Rate': '', 'Fee Amount': '', 'Fee Frequency': '', 'Fee Currency': '' };
    }
    return {
      'ID': platform.id || '',
      'Name': platform.name || '',
      'Fee Type': platform.feeStructure?.type || '',
      'Fee Rate': platform.feeStructure?.rate ?? '',
      'Fee Amount': platform.feeStructure?.amount ?? '',
      'Fee Frequency': platform.feeStructure?.frequency || '',
      'Fee Currency': platform.feeStructure?.currency || '',
      'Fee Tiers': platform.feeStructure?.tiers ? JSON.stringify(platform.feeStructure.tiers) : '',
    };
  });

  const otherSettingsData = [
    { Setting: 'Inflation Rate (%)', Value: settings.inflation || 4.5 },
  ];

  // Advisor fee data
  const advisorFeeData = settings.advisorFee ? [
    { Setting: 'Enabled', Value: settings.advisorFee.enabled ? 'Yes' : 'No' },
    { Setting: 'Type', Value: settings.advisorFee.type || 'percentage' },
    { Setting: 'Amount', Value: settings.advisorFee.amount ?? 1.0 },
    { Setting: 'Currency', Value: settings.advisorFee.currency || 'ZAR' },
  ] : [];

  // Tax config data - for custom tax brackets, rebates, etc.
  const taxConfigData = settings.taxConfig ? [
    { Setting: 'Tax Year', Value: settings.taxConfig.taxYear || '' },
    { Setting: 'Effective Date', Value: settings.taxConfig.effectiveDate || '' },
    { Setting: 'Income Tax Brackets', Value: settings.taxConfig.incomeTaxBrackets ? JSON.stringify(settings.taxConfig.incomeTaxBrackets) : '' },
    { Setting: 'Primary Rebate', Value: settings.taxConfig.taxRebates?.primary ?? '' },
    { Setting: 'Secondary Rebate', Value: settings.taxConfig.taxRebates?.secondary ?? '' },
    { Setting: 'Tertiary Rebate', Value: settings.taxConfig.taxRebates?.tertiary ?? '' },
    { Setting: 'Threshold Under 65', Value: settings.taxConfig.taxThresholds?.under65 ?? '' },
    { Setting: 'Threshold Age 65-74', Value: settings.taxConfig.taxThresholds?.age65to74 ?? '' },
    { Setting: 'Threshold Age 75+', Value: settings.taxConfig.taxThresholds?.age75plus ?? '' },
    { Setting: 'CGT Inclusion Rate', Value: settings.taxConfig.cgt?.inclusionRate ?? '' },
    { Setting: 'CGT Annual Exclusion', Value: settings.taxConfig.cgt?.annualExclusion ?? '' },
    { Setting: 'Dividend Withholding Tax', Value: settings.taxConfig.dividendWithholdingTax ?? '' },
    { Setting: 'Interest Exemption Under 65', Value: settings.taxConfig.interestExemption?.under65 ?? '' },
    { Setting: 'Interest Exemption Age 65+', Value: settings.taxConfig.interestExemption?.age65plus ?? '' },
  ] : [];

  // UI Preferences data
  const uiPreferencesData = settings.uiPreferences ? [
    { Setting: 'Fees Projection Years', Value: settings.uiPreferences.fees?.projectionYears ?? 30 },
    { Setting: 'Fees Inflation Rate', Value: settings.uiPreferences.fees?.inflationRate ?? 5.0 },
    { Setting: 'Fees Portfolio Growth Rate', Value: settings.uiPreferences.fees?.portfolioGrowthRate ?? 9.0 },
    { Setting: 'Scenario Default Currency Movement', Value: settings.uiPreferences.scenarios?.defaultCurrencyMovement ? JSON.stringify(settings.uiPreferences.scenarios.defaultCurrencyMovement) : '' },
    { Setting: 'Scenario Default Crash Asset Classes', Value: settings.uiPreferences.scenarios?.defaultCrashAssetClasses ? JSON.stringify(settings.uiPreferences.scenarios.defaultCrashAssetClasses) : '' },
  ] : [];

  // Age-based expense plan data - FULLY FLATTENED: one row per phase × category
  // This avoids JSON-in-a-cell which Excel can corrupt
  const ageBasedExpensePlanData = [];
  if (ageBasedExpensePlan?.enabled !== undefined || ageBasedExpensePlan?.phases) {
    // First row is metadata about enabled status
    ageBasedExpensePlanData.push({
      'Row Type': 'metadata',
      'Phase Index': '',
      'Phase Key': 'enabled',
      'Phase Name': '',
      'Start Age': '',
      'End Age': '',
      'Category ID': '',
      'Category Amount': ageBasedExpensePlan?.enabled ? 'Yes' : 'No',
    });
    // Then export phase metadata rows + category expense rows
    if (ageBasedExpensePlan?.phases) {
      ageBasedExpensePlan.phases.forEach((phase, idx) => {
        // Phase header row
        ageBasedExpensePlanData.push({
          'Row Type': 'phase',
          'Phase Index': idx,
          'Phase Key': phase.key || '',
          'Phase Name': phase.name || '',
          'Start Age': phase.startAge ?? '',
          'End Age': phase.endAge ?? '',
          'Category ID': '',
          'Category Amount': '',
        });
        // Individual category expense rows for this phase
        if (phase.categoryExpenses && typeof phase.categoryExpenses === 'object') {
          Object.entries(phase.categoryExpenses).forEach(([categoryId, amount]) => {
            ageBasedExpensePlanData.push({
              'Row Type': 'expense',
              'Phase Index': idx,
              'Phase Key': '',
              'Phase Name': '',
              'Start Age': '',
              'End Age': '',
              'Category ID': categoryId,
              'Category Amount': amount,
            });
          });
        }
      });
    }
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add all sheets - data sheets first
  if (assetData.length > 0) {
    const wsAssets = XLSX.utils.json_to_sheet(assetData);
    XLSX.utils.book_append_sheet(wb, wsAssets, 'Assets');
  }

  if (liabilitiesData.length > 0) {
    const wsLiabilities = XLSX.utils.json_to_sheet(liabilitiesData);
    XLSX.utils.book_append_sheet(wb, wsLiabilities, 'Liabilities');
  }

  if (incomeData.length > 0) {
    const wsIncome = XLSX.utils.json_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Income');
  }

  if (expensesData.length > 0) {
    const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');
  }

  if (expenseCategoriesData.length > 0) {
    const wsExpenseCategories = XLSX.utils.json_to_sheet(expenseCategoriesData);
    XLSX.utils.book_append_sheet(wb, wsExpenseCategories, 'Expense Categories');
  }

  if (scenariosData.length > 0) {
    const wsScenarios = XLSX.utils.json_to_sheet(scenariosData);
    XLSX.utils.book_append_sheet(wb, wsScenarios, 'Scenarios');
  }

  if (historyData.length > 0) {
    const wsHistory = XLSX.utils.json_to_sheet(historyData);
    XLSX.utils.book_append_sheet(wb, wsHistory, 'History');
  }

  // Settings sheets
  const wsProfile = XLSX.utils.json_to_sheet(profileData);
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Profile');

  const wsCurrency = XLSX.utils.json_to_sheet(currencyData);
  XLSX.utils.book_append_sheet(wb, wsCurrency, 'Currency');

  const wsRates = XLSX.utils.json_to_sheet(exchangeRatesData);
  XLSX.utils.book_append_sheet(wb, wsRates, 'Exchange Rates');

  if (enabledCurrenciesData.length > 0) {
    const wsEnabledCurrencies = XLSX.utils.json_to_sheet(enabledCurrenciesData);
    XLSX.utils.book_append_sheet(wb, wsEnabledCurrencies, 'Enabled Currencies');
  }

  const wsExpectedReturns = XLSX.utils.json_to_sheet(expectedReturnsData);
  XLSX.utils.book_append_sheet(wb, wsExpectedReturns, 'Expected Returns');

  const wsTargetAllocation = XLSX.utils.json_to_sheet(targetAllocationData);
  XLSX.utils.book_append_sheet(wb, wsTargetAllocation, 'Target Allocation');

  const wsThresholds = XLSX.utils.json_to_sheet(thresholdsData);
  XLSX.utils.book_append_sheet(wb, wsThresholds, 'Thresholds');

  if (lifePhasesData.length > 0) {
    const wsLifePhases = XLSX.utils.json_to_sheet(lifePhasesData);
    XLSX.utils.book_append_sheet(wb, wsLifePhases, 'Life Phases');
  }

  const wsWithdrawal = XLSX.utils.json_to_sheet(withdrawalRatesData);
  XLSX.utils.book_append_sheet(wb, wsWithdrawal, 'Withdrawal Rates');

  if (platformsData.length > 0) {
    const wsPlatforms = XLSX.utils.json_to_sheet(platformsData);
    XLSX.utils.book_append_sheet(wb, wsPlatforms, 'Platforms');
  }

  // Advisor Fee sheet
  if (advisorFeeData.length > 0) {
    const wsAdvisorFee = XLSX.utils.json_to_sheet(advisorFeeData);
    XLSX.utils.book_append_sheet(wb, wsAdvisorFee, 'Advisor Fee');
  }

  // Tax Config sheet
  if (taxConfigData.length > 0) {
    const wsTaxConfig = XLSX.utils.json_to_sheet(taxConfigData);
    XLSX.utils.book_append_sheet(wb, wsTaxConfig, 'Tax Config');
  }

  // UI Preferences sheet
  if (uiPreferencesData.length > 0) {
    const wsUiPreferences = XLSX.utils.json_to_sheet(uiPreferencesData);
    XLSX.utils.book_append_sheet(wb, wsUiPreferences, 'UI Preferences');
  }

  // Age-Based Expense Plan sheet
  if (ageBasedExpensePlanData.length > 0) {
    const wsAgeBasedExpenses = XLSX.utils.json_to_sheet(ageBasedExpensePlanData);
    XLSX.utils.book_append_sheet(wb, wsAgeBasedExpenses, 'Age Based Expenses');
  }

  const wsOther = XLSX.utils.json_to_sheet(otherSettingsData);
  XLSX.utils.book_append_sheet(wb, wsOther, 'Other');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const filename = `${name}_Complete_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Import assets from Excel file
 * @param {File} file - Excel file to import
 * @returns {Promise<Array>} Array of asset objects
 */
export async function importAssetsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read the Assets sheet
        const assetsSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('asset')) || workbook.SheetNames[0];
        const assetsSheet = workbook.Sheets[assetsSheetName];
        const rawData = XLSX.utils.sheet_to_json(assetsSheet);

        // Transform Excel data to asset format - include ALL fields
        const assets = rawData.map((row) => {
          // Parse expected forward return - empty string or null means use default
          const expectedForwardReturn = row['Expected Forward Return (% p.a.)'];
          const parsedExpectedReturn = expectedForwardReturn !== '' && expectedForwardReturn !== null && expectedForwardReturn !== undefined
            ? parseFloat(expectedForwardReturn)
            : null;

          return {
            id: row['ID'] || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: row['Name'] || '',
            assetClass: row['Asset Class'] || 'SA Equity',
            sector: row['Sector'] || '',
            currency: row['Currency'] || 'ZAR',
            region: row['Region'] || '',
            portfolio: row['Portfolio'] || 'Growth',
            assetType: row['Asset Type'] || 'Investible',
            platform: row['Platform'] || '',
            accountType: row['Account Type'] || 'Taxable',
            units: parseFloat(row['Units']) || 0,
            currentPrice: parseFloat(row['Current Price']) || 0,
            costPrice: parseFloat(row['Cost Price']) || 0,
            incomeYield: parseFloat(row['Income Yield (%)']) || 0,
            expectedReturn: parsedExpectedReturn,
            priceUrl: row['Price URL'] || '',
            factSheetUrl: row['Fact Sheet URL'] || '',
            lastUpdated: row['Last Updated'] || new Date().toISOString(),
            notes: row['Notes'] || '',
          };
        });

        resolve(assets);
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import asset prices only from Excel file
 * Matches assets by ID or Name, updates only currentPrice and lastUpdated
 *
 * @param {File} file - Excel file to import
 * @param {Array} existingAssets - Current assets to update
 * @returns {Promise<{updatedAssets: Array, updatedCount: number, notFoundNames: string[]}>}
 */
export async function importAssetPricesFromExcel(file, existingAssets) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read the Assets sheet
        const assetsSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('asset')) || workbook.SheetNames[0];
        const assetsSheet = workbook.Sheets[assetsSheetName];
        const rawData = XLSX.utils.sheet_to_json(assetsSheet);

        // Create lookup maps for existing assets
        const assetById = new Map();
        const assetByName = new Map();
        existingAssets.forEach(asset => {
          if (asset.id) assetById.set(asset.id, asset);
          if (asset.name) assetByName.set(asset.name.toLowerCase().trim(), asset);
        });

        let updatedCount = 0;
        const notFoundNames = [];
        const updatedAssetIds = new Set();

        // Process each row from Excel
        rawData.forEach((row) => {
          const importedId = row['ID'];
          const importedName = row['Name'];
          const newPrice = parseFloat(row['Current Price']);

          // Skip rows without a valid price
          if (isNaN(newPrice) || newPrice === 0) {
            return;
          }

          // Try to find matching asset by ID first, then by name
          let matchedAsset = null;
          if (importedId && assetById.has(importedId)) {
            matchedAsset = assetById.get(importedId);
          } else if (importedName && assetByName.has(importedName.toLowerCase().trim())) {
            matchedAsset = assetByName.get(importedName.toLowerCase().trim());
          }

          if (matchedAsset && !updatedAssetIds.has(matchedAsset.id)) {
            // Update the asset's price and lastUpdated
            matchedAsset.currentPrice = newPrice;
            matchedAsset.lastUpdated = new Date().toISOString();
            updatedAssetIds.add(matchedAsset.id);
            updatedCount++;
          } else if (!matchedAsset && importedName) {
            notFoundNames.push(importedName);
          }
        });

        resolve({
          updatedAssets: existingAssets,
          updatedCount,
          notFoundNames,
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import settings from Excel file
 */
export async function importSettingsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Use new format structure (not legacy)
        const settings = {
          profile: {},
          reportingCurrency: 'ZAR',
          exchangeRates: {},
          expectedReturns: {},
          targetAllocation: {},
          thresholds: {},
          lifePhases: {},
          withdrawalRates: {},
          retirementExpensePhases: {}, // Initialize to avoid "Cannot set properties of undefined" error
        };

        // Read Profile sheet (or Profile Settings for backward compatibility)
        const profileSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('profile'));
        if (profileSheetName) {
          const settingsSheet = workbook.Sheets[profileSheetName];
          const settingsData = XLSX.utils.sheet_to_json(settingsSheet);

          settingsData.forEach(row => {
            const setting = row['Setting'];
            const value = row['Value'];

            if (setting === 'Name') settings.profile.name = value || '';
            // FIX A: Force numeric casting to trigger Zustand persistence
            if (setting === 'Age') {
              settings.profile.age = value !== "" && value !== null && value !== undefined
                ? Number(value)
                : 0;
            }
            if (setting === 'Marginal Tax Rate (%)') settings.profile.marginalTaxRate = parseFloat(value) || 0;
            if (setting === 'Retirement Age') settings.profile.retirementAge = parseInt(value) || 65;
            if (setting === 'Life Expectancy') settings.profile.lifeExpectancy = parseInt(value) || 90;
            if (setting === 'Monthly Savings') settings.profile.monthlySavings = parseFloat(value) || 0;
            if (setting === 'Annual Expenses') settings.profile.annualExpenses = parseFloat(value) || 0;
            // Connection Patch B: Sanitize and cast to Number to ensure Zustand state persistence
            // Excel often provides values as strings or with currency symbols that prevent React from re-rendering/saving
            if (setting === 'Annual Taxable Income') {
              const numericValue = value !== "" && value !== null && value !== undefined
                ? Number(String(value).replace(/[^0-9.]/g, ''))
                : 0;
              if (!settings.profile) settings.profile = {};
              settings.profile.annualTaxableIncome = numericValue;
            }
            if (setting === 'Expected Inflation (%)') settings.profile.expectedInflation = parseFloat(value) || 4.5;
            if (setting === 'Income Growth (%)') settings.profile.incomeGrowth = parseFloat(value) || 5.0;
            if (setting === 'Default CGT Rate (%)') settings.profile.defaultCGT = parseFloat(value) || 18;
          });
        }

        // Read Currency sheet
        if (workbook.SheetNames.includes('Currency')) {
          const currencySheet = workbook.Sheets['Currency'];
          const currencyData = XLSX.utils.sheet_to_json(currencySheet);

          currencyData.forEach(row => {
            if (row['Setting'] === 'Reporting Currency') {
              settings.reportingCurrency = row['Value'] || 'ZAR';
            }
          });
        }

        // Read Exchange Rates sheet - convert to new format { USD: 18.5 }
        if (workbook.SheetNames.includes('Exchange Rates')) {
          const ratesSheet = workbook.Sheets['Exchange Rates'];
          const ratesData = XLSX.utils.sheet_to_json(ratesSheet);

          ratesData.forEach(row => {
            const rate = parseFloat(row['Rate']) || 1;
            // Prefer 'Currency Code' column if present, otherwise extract from 'Currency Pair'
            let currencyCode = row['Currency Code'];
            if (!currencyCode && row['Currency Pair']) {
              // Extract currency code from pair like 'USD/ZAR' -> 'USD'
              currencyCode = row['Currency Pair'].split('/')[0];
            }
            if (currencyCode && currencyCode !== settings.reportingCurrency) {
              settings.exchangeRates[currencyCode] = rate;
            }
          });
        }

        // Read Expected Returns sheet
        if (workbook.SheetNames.includes('Expected Returns')) {
          const returnsSheet = workbook.Sheets['Expected Returns'];
          const returnsData = XLSX.utils.sheet_to_json(returnsSheet);

          returnsData.forEach(row => {
            const assetClass = row['Asset Class'];
            const returnRate = parseFloat(row['Expected Return (%)']) || 0;
            settings.expectedReturns[assetClass] = returnRate;
          });
        }

        // Read Target Allocation sheet
        if (workbook.SheetNames.includes('Target Allocation')) {
          const allocationSheet = workbook.Sheets['Target Allocation'];
          const allocationData = XLSX.utils.sheet_to_json(allocationSheet);

          allocationData.forEach(row => {
            const assetClass = row['Asset Class'];
            const target = parseFloat(row['Target (%)']) || 0;
            settings.targetAllocation[assetClass] = target;
          });
        }

        // Read Thresholds sheet
        if (workbook.SheetNames.includes('Thresholds')) {
          const thresholdsSheet = workbook.Sheets['Thresholds'];
          const thresholdsData = XLSX.utils.sheet_to_json(thresholdsSheet);

          thresholdsData.forEach(row => {
            const threshold = row['Threshold'];
            const value = parseFloat(row['Value']) || 0;

            if (threshold === 'Single Asset (%)') settings.thresholds.singleAsset = value;
            if (threshold === 'Asset Class (%)') settings.thresholds.assetClass = value;
            if (threshold === 'Currency (%)') settings.thresholds.currency = value;
            if (threshold === 'Sector (%)') settings.thresholds.sector = value;
            if (threshold === 'Region (%)') settings.thresholds.region = value;
            if (threshold === 'Platform (%)') settings.thresholds.platform = value;
            if (threshold === 'Staleness (days)') settings.thresholds.staleness = value;
            if (threshold === 'Rebalancing Drift (%)') settings.thresholds.rebalancingDrift = value;
          });
        }

        // Read Expense Phases sheet
        if (workbook.SheetNames.includes('Expense Phases')) {
          const phasesSheet = workbook.Sheets['Expense Phases'];
          const phasesData = XLSX.utils.sheet_to_json(phasesSheet);

          phasesData.forEach(row => {
            const phase = row['Phase'];
            settings.retirementExpensePhases[phase] = {
              ageStart: parseInt(row['Age Start']) || 0,
              ageEnd: parseInt(row['Age End']) || 0,
              percentage: parseFloat(row['Percentage (%)']) || 100,
            };
          });
        }

        // Read Withdrawal Rates sheet
        if (workbook.SheetNames.includes('Withdrawal Rates')) {
          const withdrawalSheet = workbook.Sheets['Withdrawal Rates'];
          const withdrawalData = XLSX.utils.sheet_to_json(withdrawalSheet);

          withdrawalData.forEach(row => {
            const strategy = row['Strategy'];
            const rate = parseFloat(row['Rate']) || 4.0;

            if (strategy.includes('Conservative')) settings.withdrawalRates.conservative = rate;
            if (strategy.includes('Safe')) settings.withdrawalRates.safe = rate;
            if (strategy.includes('Aggressive')) settings.withdrawalRates.aggressive = rate;
          });
        }

        // Read Other sheet
        if (workbook.SheetNames.includes('Other')) {
          const otherSheet = workbook.Sheets['Other'];
          const otherData = XLSX.utils.sheet_to_json(otherSheet);

          otherData.forEach(row => {
            if (row['Setting'] === 'Inflation Rate (%)') {
              settings.inflation = parseFloat(row['Value']) || 4.5;
            }
          });
        }

        // Connection Patch C: Ensure calculation denominator is exactly 1 for reporting currency
        // This fixes dashboard % discrepancies caused by floating point errors
        const reportingCurrency = settings.reportingCurrency || 'ZAR';
        settings.exchangeRates[reportingCurrency] = 1.0;
        settings.updatedAt = new Date().toISOString();

        resolve(settings);
      } catch (error) {
        reject(new Error('Failed to parse settings file: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import complete profile (ALL data) from Excel file
 * This reads an Excel file exported by exportCompleteProfile() and returns
 * the complete profile data that can be used to restore a profile.
 *
 * @param {File} file - Excel file to import
 * @returns {Promise<Object>} Complete profile object with assets, liabilities, income, expenses, scenarios, settings
 */
export async function importCompleteProfileFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Initialize result objects
        let assets = [];
        let liabilities = [];
        let income = [];
        let expenses = [];
        let expenseCategories = [];
        let scenarios = [];
        const settings = {
          profile: {},
          reportingCurrency: 'ZAR',
          exchangeRates: {},
          enabledCurrencies: [],
          expectedReturns: {},
          targetAllocation: {},
          thresholds: {},
          lifePhases: {},
          withdrawalRates: {},
          retirementExpensePhases: {},
          platforms: [],
        };

        // Read Assets sheet
        const assetsSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'assets');
        if (assetsSheetName) {
          const assetsSheet = workbook.Sheets[assetsSheetName];
          const rawData = XLSX.utils.sheet_to_json(assetsSheet);

          assets = rawData.map((row) => {
            const expectedForwardReturn = row['Expected Forward Return (% p.a.)'];
            const parsedExpectedReturn = expectedForwardReturn !== '' && expectedForwardReturn !== null && expectedForwardReturn !== undefined
              ? parseFloat(expectedForwardReturn)
              : null;

            // Helper to parse numeric values - returns NaN if invalid (not silent 0)
            const parseNum = (val) => {
              if (val === '' || val === null || val === undefined) return 0;
              const parsed = parseFloat(val);
              if (isNaN(parsed)) {
                console.warn(`Import warning: Could not parse number from "${val}"`);
                return 0;
              }
              return parsed;
            };

            return {
              id: row['ID'] || crypto.randomUUID(),
              name: row['Name'] || '',
              assetClass: row['Asset Class'] || 'SA Equity',
              sector: row['Sector'] || '',
              currency: row['Currency'] || 'ZAR',
              region: row['Region'] || '',
              portfolio: row['Portfolio'] || 'Growth',
              assetType: row['Asset Type'] || 'Investible',
              platform: row['Platform'] || '',
              accountType: row['Account Type'] || 'Taxable',
              units: parseNum(row['Units']),
              currentPrice: parseNum(row['Current Price']),
              costPrice: parseNum(row['Cost Price']),
              dividendYield: parseNum(row['Dividend Yield (%)']),
              interestYield: parseNum(row['Interest Yield (%)']),
              ter: parseNum(row['TER (%)']),
              expectedReturn: parsedExpectedReturn,
              priceUrl: row['Price URL'] || '',
              factSheetUrl: row['Fact Sheet URL'] || '',
              // PRESERVE original lastUpdated - don't default to now (affects staleness scoring)
              lastUpdated: row['Last Updated'] || '',
              notes: row['Notes'] || '',
              excludeFromAdvisorFee: row['Exclude From Advisor Fee'] === 'Yes',
              // Patch 8: Import isLiquid field (default to true if not specified)
              isLiquid: row['Is Liquid'] === 'No' ? false : true,
            };
          });
        }

        // Read Liabilities sheet
        if (workbook.SheetNames.includes('Liabilities')) {
          const liabilitiesSheet = workbook.Sheets['Liabilities'];
          const rawData = XLSX.utils.sheet_to_json(liabilitiesSheet);

          liabilities = rawData.map((row) => ({
            id: row['ID'] || crypto.randomUUID(),
            name: row['Name'] || '',
            principal: parseFloat(row['Principal']) || 0,
            currency: row['Currency'] || 'ZAR',
            interestRate: parseFloat(row['Interest Rate (%)']) || 0,
            monthlyPayment: parseFloat(row['Monthly Payment']) || 0,
            maturityDate: row['Maturity Date'] || '',
            platform: row['Platform'] || '',
            notes: row['Notes'] || '',
          }));
        }

        // Read Income sheet
        if (workbook.SheetNames.includes('Income')) {
          const incomeSheet = workbook.Sheets['Income'];
          const rawData = XLSX.utils.sheet_to_json(incomeSheet);

          income = rawData.map((row) => ({
            id: row['ID'] || crypto.randomUUID(),
            name: row['Name'] || '',
            type: row['Type'] || 'Other',
            monthlyAmount: parseFloat(row['Monthly Amount']) || 0,
            currency: row['Currency'] || 'ZAR',
            startAge: row['Start Age'] !== '' && row['Start Age'] !== undefined ? parseInt(row['Start Age']) : null,
            endAge: row['End Age'] !== '' && row['End Age'] !== undefined ? parseInt(row['End Age']) : null,
            isTaxable: row['Is Taxable'] === 'Yes',
            isInflationAdjusted: row['Is Inflation Adjusted'] === 'Yes',
            annuityType: row['Annuity Type'] || null,
            capitalValue: row['Capital Value'] !== '' && row['Capital Value'] !== undefined ? parseFloat(row['Capital Value']) : null,
            escalationRate: row['Escalation Rate (%)'] !== '' && row['Escalation Rate (%)'] !== undefined ? parseFloat(row['Escalation Rate (%)']) : null,
            guaranteedPeriod: row['Guaranteed Period'] !== '' && row['Guaranteed Period'] !== undefined ? parseInt(row['Guaranteed Period']) : null,
            provider: row['Provider'] || '',
            notes: row['Notes'] || '',
          }));
        }

        // Read Expenses sheet (legacy format)
        if (workbook.SheetNames.includes('Expenses')) {
          const expensesSheet = workbook.Sheets['Expenses'];
          const rawData = XLSX.utils.sheet_to_json(expensesSheet);

          expenses = rawData.map((row) => ({
            id: row['ID'] || crypto.randomUUID(),
            name: row['Name'] || '',
            amount: parseFloat(row['Amount']) || 0,
            frequency: row['Frequency'] || 'Monthly',
            category: row['Category'] || '',
            level: row['Level'] || 'Essential',
            budget: parseFloat(row['Budget']) || 0,
            notes: row['Notes'] || '',
          }));
        }

        // Read Expense Categories sheet (hierarchical format)
        if (workbook.SheetNames.includes('Expense Categories')) {
          const expenseCategoriesSheet = workbook.Sheets['Expense Categories'];
          const rawData = XLSX.utils.sheet_to_json(expenseCategoriesSheet);

          // Group by category
          const categoryMap = new Map();
          rawData.forEach((row) => {
            const catId = row['Category ID'];
            const catName = row['Category Name'];

            if (!categoryMap.has(catId)) {
              categoryMap.set(catId, {
                id: catId,
                name: catName,
                subcategories: [],
              });
            }

            categoryMap.get(catId).subcategories.push({
              id: row['Subcategory ID'] || crypto.randomUUID(),
              name: row['Subcategory Name'] || '',
              amount: parseFloat(row['Amount']) || 0,
              currency: row['Currency'] || 'ZAR',
              frequency: row['Frequency'] || 'Monthly',
              expenseType: row['Expense Type'] || 'Variable Discretionary',
              notes: row['Notes'] || '',
            });
          });

          expenseCategories = Array.from(categoryMap.values());
        }

        // Read Scenarios sheet
        if (workbook.SheetNames.includes('Scenarios')) {
          const scenariosSheet = workbook.Sheets['Scenarios'];
          const rawData = XLSX.utils.sheet_to_json(scenariosSheet);

          scenarios = rawData.map((row) => {
            // Use browser-agnostic safeJsonParse (Patch 2) instead of fragile parseJSON
            return {
              id: row['ID'] || crypto.randomUUID(),
              name: row['Name'] || 'Imported Scenario',
              description: row['Description'] || '',
              marketReturn: parseFloat(row['Market Return (%)']) || 9,
              inflationRate: parseFloat(row['Inflation Rate (%)']) || 4.5,
              retirementAge: parseInt(row['Retirement Age']) || 65,
              lifeExpectancy: parseInt(row['Life Expectancy']) || 90,
              monthlySavings: parseFloat(row['Monthly Savings']) || 0,
              useExpensesModule: row['Use Expenses Module'] === 'Yes',
              annualExpenses: parseFloat(row['Annual Expenses']) || 0,
              useCustomReturns: row['Use Custom Returns'] === 'Yes',
              useCurrencyMovement: row['Use Currency Movement'] === 'Yes',
              useCustomExpensePhases: row['Use Custom Expense Phases'] === 'Yes',
              marketCrashes: safeJsonParse(row['Market Crashes'], []),
              unexpectedExpenses: safeJsonParse(row['Unexpected Expenses'], []),
              expectedReturns: safeJsonParse(row['Custom Returns'], {}),
              currencyMovement: safeJsonParse(row['Currency Movement'], {}),
              expensePhases: safeJsonParse(row['Expense Phases'], {}),
              results: null, // Results need to be recalculated
              lastRun: null,
            };
          });
        }

        // Read History sheet
        let history = [];
        if (workbook.SheetNames.includes('History')) {
          const historySheet = workbook.Sheets['History'];
          const rawData = XLSX.utils.sheet_to_json(historySheet);

          history = rawData.map((row) => ({
            id: row['ID'] || `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: row['Date'] || new Date().toISOString(),
            netWorth: row['Net Worth'] !== '' && row['Net Worth'] !== undefined ? parseFloat(row['Net Worth']) : null,
            grossAssets: row['Gross Assets'] !== '' && row['Gross Assets'] !== undefined ? parseFloat(row['Gross Assets']) : null,
            investibleAssets: row['Investible Assets'] !== '' && row['Investible Assets'] !== undefined ? parseFloat(row['Investible Assets']) : null,
            nonInvestibleAssets: row['Non-Investible Assets'] !== '' && row['Non-Investible Assets'] !== undefined ? parseFloat(row['Non-Investible Assets']) : null,
            liabilities: row['Liabilities'] !== '' && row['Liabilities'] !== undefined ? parseFloat(row['Liabilities']) : null,
            cgtLiability: row['CGT Liability'] !== '' && row['CGT Liability'] !== undefined ? parseFloat(row['CGT Liability']) : null,
            realisableNetWorth: row['Realisable Net Worth'] !== '' && row['Realisable Net Worth'] !== undefined ? parseFloat(row['Realisable Net Worth']) : null,
            notes: row['Notes'] || '',
            // Use safeJsonParse for browser-agnostic parsing (Patch 2)
            allocation: safeJsonParse(row['Allocation'], null),
          }));
        }

        // Read Profile sheet
        const profileSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'profile');
        if (profileSheetName) {
          const settingsSheet = workbook.Sheets[profileSheetName];
          const settingsData = XLSX.utils.sheet_to_json(settingsSheet);

          settingsData.forEach(row => {
            const setting = row['Setting'];
            const value = row['Value'];

            if (setting === 'Name') settings.profile.name = value || '';
            // FIX A: Force numeric casting to trigger Zustand persistence
            if (setting === 'Age') {
              settings.profile.age = value !== "" && value !== null && value !== undefined
                ? Number(value)
                : 0;
            }
            if (setting === 'Marginal Tax Rate (%)') settings.profile.marginalTaxRate = parseFloat(value) || 0;
            if (setting === 'Retirement Age') settings.profile.retirementAge = parseInt(value) || 65;
            if (setting === 'Life Expectancy') settings.profile.lifeExpectancy = parseInt(value) || 90;
            if (setting === 'Monthly Savings') settings.profile.monthlySavings = parseFloat(value) || 0;
            if (setting === 'Annual Expenses') settings.profile.annualExpenses = parseFloat(value) || 0;
            // Connection Patch B: Sanitize and cast to Number to ensure Zustand state persistence
            // Excel often provides values as strings or with currency symbols that prevent React from re-rendering/saving
            if (setting === 'Annual Taxable Income') {
              const numericValue = value !== "" && value !== null && value !== undefined
                ? Number(String(value).replace(/[^0-9.]/g, ''))
                : 0;
              if (!settings.profile) settings.profile = {};
              settings.profile.annualTaxableIncome = numericValue;
            }
            if (setting === 'Expected Inflation (%)') settings.profile.expectedInflation = parseFloat(value) || 4.5;
            if (setting === 'Income Growth (%)') settings.profile.incomeGrowth = parseFloat(value) || 5.0;
            if (setting === 'Default CGT Rate (%)') settings.profile.defaultCGT = parseFloat(value) || 18;
          });
        }

        // Read Currency sheet
        if (workbook.SheetNames.includes('Currency')) {
          const currencySheet = workbook.Sheets['Currency'];
          const currencyData = XLSX.utils.sheet_to_json(currencySheet);

          currencyData.forEach(row => {
            if (row['Setting'] === 'Reporting Currency') {
              settings.reportingCurrency = row['Value'] || 'ZAR';
            }
          });
        }

        // Read Exchange Rates sheet - with validation (no silent defaults to 1)
        if (workbook.SheetNames.includes('Exchange Rates')) {
          const ratesSheet = workbook.Sheets['Exchange Rates'];
          const ratesData = XLSX.utils.sheet_to_json(ratesSheet);

          ratesData.forEach(row => {
            // Parse rate - MUST be valid number, no silent defaults
            const rateValue = row['Rate'];
            const rate = parseFloat(rateValue);
            if (isNaN(rate) || rate <= 0) {
              console.warn(`Import warning: Invalid exchange rate "${rateValue}" - skipping`);
              return; // Skip this row instead of defaulting to 1
            }

            // Extract currency code from either 'Currency Code' column or 'Currency Pair'
            let currencyCode = row['Currency Code'];
            if (!currencyCode && row['Currency Pair']) {
              // Handle legacy format: 'USD/ZAR' -> 'USD'
              const pair = row['Currency Pair'];
              currencyCode = pair.includes('/') ? pair.split('/')[0] : pair;
            }

            // Convert to new format { USD: 18.5 } not { 'USD/ZAR': 18.5 }
            if (currencyCode && currencyCode !== settings.reportingCurrency) {
              settings.exchangeRates[currencyCode] = rate;
            }
          });

          // Validate we have minimum required exchange rates
          const requiredCurrencies = ['USD', 'EUR', 'GBP'];
          const missingRates = requiredCurrencies.filter(c => !settings.exchangeRates[c]);
          if (missingRates.length > 0) {
            console.warn(`Import warning: Missing exchange rates for: ${missingRates.join(', ')}`);
          }
        }

        // Read Enabled Currencies sheet
        if (workbook.SheetNames.includes('Enabled Currencies')) {
          const enabledCurrenciesSheet = workbook.Sheets['Enabled Currencies'];
          const currenciesData = XLSX.utils.sheet_to_json(enabledCurrenciesSheet);
          settings.enabledCurrencies = currenciesData.map(row => row['Currency']).filter(Boolean);
        }

        // Read Expected Returns sheet
        if (workbook.SheetNames.includes('Expected Returns')) {
          const returnsSheet = workbook.Sheets['Expected Returns'];
          const returnsData = XLSX.utils.sheet_to_json(returnsSheet);

          returnsData.forEach(row => {
            const assetClass = row['Asset Class'];
            const returnRate = parseFloat(row['Expected Return (%)']) || 0;
            settings.expectedReturns[assetClass] = returnRate;
          });
        }

        // Read Target Allocation sheet
        if (workbook.SheetNames.includes('Target Allocation')) {
          const allocationSheet = workbook.Sheets['Target Allocation'];
          const allocationData = XLSX.utils.sheet_to_json(allocationSheet);

          allocationData.forEach(row => {
            const assetClass = row['Asset Class'];
            const target = parseFloat(row['Target (%)']) || 0;
            settings.targetAllocation[assetClass] = target;
          });
        }

        // Read Thresholds sheet
        if (workbook.SheetNames.includes('Thresholds')) {
          const thresholdsSheet = workbook.Sheets['Thresholds'];
          const thresholdsData = XLSX.utils.sheet_to_json(thresholdsSheet);

          thresholdsData.forEach(row => {
            const threshold = row['Threshold'];
            const value = parseFloat(row['Value']) || 0;

            if (threshold === 'Single Asset (%)') settings.thresholds.singleAsset = value;
            if (threshold === 'Asset Class (%)') settings.thresholds.assetClass = value;
            if (threshold === 'Currency (%)') settings.thresholds.currency = value;
            if (threshold === 'Sector (%)') settings.thresholds.sector = value;
            if (threshold === 'Region (%)') settings.thresholds.region = value;
            if (threshold === 'Platform (%)') settings.thresholds.platform = value;
            if (threshold === 'Staleness (days)') settings.thresholds.staleness = value;
            if (threshold === 'Rebalancing Drift (%)') settings.thresholds.rebalancingDrift = value;
          });
        }

        // Read Life Phases sheet
        if (workbook.SheetNames.includes('Life Phases')) {
          const lifePhasesSheet = workbook.Sheets['Life Phases'];
          const lifePhasesData = XLSX.utils.sheet_to_json(lifePhasesSheet);

          lifePhasesData.forEach(row => {
            const key = row['Phase Key'];
            settings.lifePhases[key] = {
              name: row['Name'] || key,
              ageStart: parseInt(row['Age Start']) || 0,
              ageEnd: parseInt(row['Age End']) || 0,
              percentage: parseFloat(row['Percentage (%)']) || 100,
            };
          });
        }

        // Read Withdrawal Rates sheet
        if (workbook.SheetNames.includes('Withdrawal Rates')) {
          const withdrawalSheet = workbook.Sheets['Withdrawal Rates'];
          const withdrawalData = XLSX.utils.sheet_to_json(withdrawalSheet);

          withdrawalData.forEach(row => {
            const strategy = row['Strategy'];
            const rate = parseFloat(row['Rate']) || 4.0;

            if (strategy.includes('Conservative')) settings.withdrawalRates.conservative = rate;
            if (strategy.includes('Safe')) settings.withdrawalRates.safe = rate;
            if (strategy.includes('Aggressive')) settings.withdrawalRates.aggressive = rate;
          });
        }

        // Read Platforms sheet
        if (workbook.SheetNames.includes('Platforms')) {
          const platformsSheet = workbook.Sheets['Platforms'];
          const platformsData = XLSX.utils.sheet_to_json(platformsSheet);

          settings.platforms = platformsData.map(row => {
            const platform = {
              id: row['ID'] || row['Name']?.toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID(),
              name: row['Name'] || '',
            };

            // Add fee structure if present
            if (row['Fee Type']) {
              platform.feeStructure = {
                type: row['Fee Type'],
              };
              if (row['Fee Rate'] !== '' && row['Fee Rate'] !== undefined) {
                platform.feeStructure.rate = parseFloat(row['Fee Rate']);
              }
              // Import additional fee fields for fixed/combined types
              if (row['Fee Amount'] !== '' && row['Fee Amount'] !== undefined) {
                platform.feeStructure.amount = parseFloat(row['Fee Amount']);
              }
              if (row['Fee Frequency']) {
                platform.feeStructure.frequency = row['Fee Frequency'];
              }
              if (row['Fee Currency']) {
                platform.feeStructure.currency = row['Fee Currency'];
              }
              if (row['Fee Tiers']) {
                try {
                  platform.feeStructure.tiers = JSON.parse(row['Fee Tiers']);
                } catch {
                  // Ignore parse errors
                }
              }
            }

            return platform;
          });
        }

        // Read Advisor Fee sheet
        if (workbook.SheetNames.includes('Advisor Fee')) {
          const advisorFeeSheet = workbook.Sheets['Advisor Fee'];
          const advisorFeeData = XLSX.utils.sheet_to_json(advisorFeeSheet);

          settings.advisorFee = {};
          advisorFeeData.forEach(row => {
            if (row['Setting'] === 'Enabled') settings.advisorFee.enabled = row['Value'] === 'Yes';
            if (row['Setting'] === 'Type') settings.advisorFee.type = row['Value'] || 'percentage';
            if (row['Setting'] === 'Amount') settings.advisorFee.amount = parseFloat(row['Value']) || 1.0;
            if (row['Setting'] === 'Currency') settings.advisorFee.currency = row['Value'] || 'ZAR';
          });
        }

        // Read Tax Config sheet
        if (workbook.SheetNames.includes('Tax Config')) {
          const taxConfigSheet = workbook.Sheets['Tax Config'];
          const taxConfigData = XLSX.utils.sheet_to_json(taxConfigSheet);

          // Helper to parse JSON safely
          const parseJSON = (str, defaultValue) => {
            if (!str || str === '') return defaultValue;
            try {
              return JSON.parse(str);
            } catch {
              return defaultValue;
            }
          };

          settings.taxConfig = {
            taxRebates: {},
            taxThresholds: {},
            cgt: {},
            interestExemption: {},
          };

          taxConfigData.forEach(row => {
            const setting = row['Setting'];
            const value = row['Value'];

            if (setting === 'Tax Year') settings.taxConfig.taxYear = value || '';
            if (setting === 'Effective Date') settings.taxConfig.effectiveDate = value || '';
            if (setting === 'Income Tax Brackets') settings.taxConfig.incomeTaxBrackets = parseJSON(value, []);
            if (setting === 'Primary Rebate') settings.taxConfig.taxRebates.primary = parseFloat(value) || 0;
            if (setting === 'Secondary Rebate') settings.taxConfig.taxRebates.secondary = parseFloat(value) || 0;
            if (setting === 'Tertiary Rebate') settings.taxConfig.taxRebates.tertiary = parseFloat(value) || 0;
            if (setting === 'Threshold Under 65') settings.taxConfig.taxThresholds.under65 = parseFloat(value) || 0;
            if (setting === 'Threshold Age 65-74') settings.taxConfig.taxThresholds.age65to74 = parseFloat(value) || 0;
            if (setting === 'Threshold Age 75+') settings.taxConfig.taxThresholds.age75plus = parseFloat(value) || 0;
            if (setting === 'CGT Inclusion Rate') settings.taxConfig.cgt.inclusionRate = parseFloat(value) || 40;
            if (setting === 'CGT Annual Exclusion') settings.taxConfig.cgt.annualExclusion = parseFloat(value) || 40000;
            if (setting === 'Dividend Withholding Tax') settings.taxConfig.dividendWithholdingTax = parseFloat(value) || 20;
            if (setting === 'Interest Exemption Under 65') settings.taxConfig.interestExemption.under65 = parseFloat(value) || 0;
            if (setting === 'Interest Exemption Age 65+') settings.taxConfig.interestExemption.age65plus = parseFloat(value) || 0;
          });
        }

        // Read UI Preferences sheet
        if (workbook.SheetNames.includes('UI Preferences')) {
          const uiPreferencesSheet = workbook.Sheets['UI Preferences'];
          const uiPreferencesData = XLSX.utils.sheet_to_json(uiPreferencesSheet);

          // Helper to parse JSON safely
          const parseJSON = (str, defaultValue) => {
            if (!str || str === '') return defaultValue;
            try {
              return JSON.parse(str);
            } catch {
              return defaultValue;
            }
          };

          settings.uiPreferences = {
            fees: {},
            scenarios: {},
          };

          uiPreferencesData.forEach(row => {
            const setting = row['Setting'];
            const value = row['Value'];

            if (setting === 'Fees Projection Years') settings.uiPreferences.fees.projectionYears = parseInt(value) || 30;
            if (setting === 'Fees Inflation Rate') settings.uiPreferences.fees.inflationRate = parseFloat(value) || 5.0;
            if (setting === 'Fees Portfolio Growth Rate') settings.uiPreferences.fees.portfolioGrowthRate = parseFloat(value) || 9.0;
            if (setting === 'Scenario Default Currency Movement') {
              settings.uiPreferences.scenarios.defaultCurrencyMovement = parseJSON(value, {});
            }
            if (setting === 'Scenario Default Crash Asset Classes') {
              settings.uiPreferences.scenarios.defaultCrashAssetClasses = parseJSON(value, []);
            }
          });
        }

        // Read Age Based Expenses sheet (ageBasedExpensePlan) - FLATTENED FORMAT
        // Format: Row Type | Phase Index | Phase Key | Phase Name | Start Age | End Age | Category ID | Category Amount
        let ageBasedExpensePlan = null;
        if (workbook.SheetNames.includes('Age Based Expenses')) {
          const ageBasedExpensesSheet = workbook.Sheets['Age Based Expenses'];
          const ageBasedExpensesData = XLSX.utils.sheet_to_json(ageBasedExpensesSheet);

          // Check if this is the NEW flattened format (has 'Row Type' column) or LEGACY format
          const hasRowType = ageBasedExpensesData.length > 0 && 'Row Type' in ageBasedExpensesData[0];

          if (hasRowType) {
            // NEW FLATTENED FORMAT
            const metadataRow = ageBasedExpensesData.find(row => row['Row Type'] === 'metadata');
            const enabled = metadataRow?.['Category Amount'] === 'Yes';

            // Build phases from phase rows
            const phasesMap = new Map();
            ageBasedExpensesData
              .filter(row => row['Row Type'] === 'phase')
              .forEach(row => {
                const phaseIdx = parseInt(row['Phase Index']);
                if (!isNaN(phaseIdx)) {
                  phasesMap.set(phaseIdx, {
                    key: row['Phase Key'] || '',
                    name: row['Phase Name'] || '',
                    startAge: row['Start Age'] !== '' && row['Start Age'] !== undefined ? parseInt(row['Start Age']) : 0,
                    endAge: row['End Age'] !== '' && row['End Age'] !== undefined ? parseInt(row['End Age']) : 0,
                    categoryExpenses: {},
                  });
                }
              });

            // Add category expenses to their respective phases
            ageBasedExpensesData
              .filter(row => row['Row Type'] === 'expense')
              .forEach(row => {
                const phaseIdx = parseInt(row['Phase Index']);
                const categoryId = row['Category ID'];
                const amount = row['Category Amount'];
                if (!isNaN(phaseIdx) && categoryId && phasesMap.has(phaseIdx)) {
                  // Parse amount - could be number or string
                  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
                  if (!isNaN(parsedAmount)) {
                    phasesMap.get(phaseIdx).categoryExpenses[categoryId] = parsedAmount;
                  }
                }
              });

            // Convert map to sorted array
            const phases = Array.from(phasesMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([, phase]) => phase);

            if (phases.length > 0 || enabled) {
              ageBasedExpensePlan = { enabled, phases };
            }
          } else {
            // LEGACY FORMAT (JSON-in-a-cell) - for backwards compatibility
            const parseJSON = (str, defaultValue) => {
              if (!str || str === '') return defaultValue;
              if (typeof str === 'object') return str;
              try {
                return JSON.parse(str);
              } catch {
                try {
                  const cleaned = String(str).replace(/\\"/g, '"');
                  return JSON.parse(cleaned);
                } catch {
                  console.warn('Failed to parse category expenses JSON:', str);
                  return defaultValue;
                }
              }
            };

            const metadataRow = ageBasedExpensesData.find(row =>
              row['Phase Index'] === 'metadata' || String(row['Phase Index']) === 'metadata'
            );
            const enabled = metadataRow?.['Category Expenses'] === 'Yes';

            const phases = ageBasedExpensesData
              .filter(row => row['Phase Index'] !== 'metadata' && String(row['Phase Index']) !== 'metadata')
              .sort((a, b) => (parseInt(a['Phase Index']) || 0) - (parseInt(b['Phase Index']) || 0))
              .map(row => ({
                key: row['Phase Key'] || '',
                name: row['Phase Name'] || '',
                startAge: parseInt(row['Start Age']) || 0,
                endAge: parseInt(row['End Age']) || 0,
                categoryExpenses: parseJSON(row['Category Expenses'], {}),
              }));

            if (phases.length > 0 || enabled) {
              ageBasedExpensePlan = { enabled, phases };
            }
          }
        }

        // Read Other sheet
        if (workbook.SheetNames.includes('Other')) {
          const otherSheet = workbook.Sheets['Other'];
          const otherData = XLSX.utils.sheet_to_json(otherSheet);

          otherData.forEach(row => {
            if (row['Setting'] === 'Inflation Rate (%)') {
              settings.inflation = parseFloat(row['Value']) || 4.5;
            }
          });
        }

        // Patch 3: Force currency sync - migrate legacy format and ensure consistency
        // This prevents different retirement values caused by one browser falling back to defaults
        if (Object.keys(settings.exchangeRates).length === 0 && settings.currency?.exchangeRates) {
          settings.exchangeRates = migrateLegacyExchangeRates(
            settings.currency.exchangeRates,
            settings.reportingCurrency || 'ZAR'
          );
        }

        // Connection Patch C: Ensure calculation denominator is exactly 1 for reporting currency
        // This fixes dashboard % discrepancies caused by floating point errors when reporting currency
        // accidentally gets a rate like 1.000000001 instead of exactly 1.0
        const reportingCurrency = settings.reportingCurrency || 'ZAR';
        settings.exchangeRates[reportingCurrency] = 1.0;

        // Force a state update trigger so Zustand recognizes the change
        settings.updatedAt = new Date().toISOString();

        // FIX B: Sanitize platform names to prevent concentration drift from whitespace
        // e.g. "Allan Gray " vs "Allan Gray" should be treated as same platform
        assets.forEach(asset => {
          if (asset.platform) asset.platform = asset.platform.trim();
        });

        resolve({
          assets,
          liabilities,
          income,
          expenses,
          expenseCategories,
          ageBasedExpensePlan,
          scenarios,
          history,
          settings,
        });
      } catch (error) {
        reject(new Error('Failed to parse profile file: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
