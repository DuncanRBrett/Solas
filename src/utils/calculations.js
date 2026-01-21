// Financial calculations for Solas v3

import { getCurrencySymbol, DEFAULT_EXCHANGE_RATES } from '../models/defaults';

/**
 * Track missing exchange rates encountered during calculations
 * This allows us to report issues without breaking calculations
 */
const missingRatesWarnings = new Set();

/**
 * Clear the missing rates warning tracker
 * Call this at the start of major calculation batches
 */
export const clearMissingRatesWarnings = () => {
  missingRatesWarnings.clear();
};

/**
 * Get all missing exchange rate warnings
 * @returns {string[]} Array of missing currency codes
 */
export const getMissingRatesWarnings = () => {
  return Array.from(missingRatesWarnings);
};

/**
 * Check if there were any missing exchange rate warnings
 * @returns {boolean} True if any rates were missing
 */
export const hasMissingRatesWarnings = () => {
  return missingRatesWarnings.size > 0;
};

/**
 * Validate that all required exchange rates are available
 * @param {string[]} currencies - Array of currency codes to validate
 * @param {string} reportingCurrency - The reporting currency (doesn't need a rate)
 * @param {object} exchangeRates - Exchange rates object
 * @returns {{ valid: boolean, missing: string[] }} Validation result
 */
export const validateExchangeRates = (currencies, reportingCurrency, exchangeRates) => {
  const missing = [];

  currencies.forEach(currency => {
    if (currency !== reportingCurrency) {
      const rate = exchangeRates[currency];
      if (!rate || rate === 0 || isNaN(rate)) {
        missing.push(currency);
      }
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * Get exchange rate with fallback to defaults
 * This ensures calculations never silently use 1:1, but instead use reasonable defaults
 *
 * @param {string} currency - Currency to get rate for
 * @param {object} exchangeRates - User's exchange rates
 * @returns {{ rate: number, isDefault: boolean }} Rate and whether it's a default
 */
export const getExchangeRateWithFallback = (currency, exchangeRates) => {
  const userRate = exchangeRates[currency];

  if (userRate && userRate > 0 && !isNaN(userRate)) {
    return { rate: userRate, isDefault: false };
  }

  // Try default rates
  const defaultRate = DEFAULT_EXCHANGE_RATES[currency];
  if (defaultRate && defaultRate > 0) {
    // Track that we used a fallback
    missingRatesWarnings.add(currency);
    console.warn(`Exchange rate for ${currency} not configured, using default: ${defaultRate}`);
    return { rate: defaultRate, isDefault: true };
  }

  // No rate available at all - this is a critical error
  // Track it and return 1 as last resort (better than crashing)
  missingRatesWarnings.add(currency);
  console.error(`CRITICAL: No exchange rate for ${currency}, no default available. Using 1:1 (INACCURATE!)`);
  return { rate: 1, isDefault: true };
};

/**
 * Convert any currency amount to the reporting currency
 *
 * Exchange rates are stored as: 1 foreign currency = X reporting currency
 * e.g., if reporting is ZAR and USD rate is 18.50, then 1 USD = 18.50 ZAR
 *
 * @param {number} amount - Amount in the source currency
 * @param {string} fromCurrency - Source currency code (e.g., 'USD')
 * @param {string} reportingCurrency - Target/reporting currency code (e.g., 'ZAR')
 * @param {object} exchangeRates - Rates object { USD: 18.50, EUR: 19.80, ... }
 * @returns {number} Amount converted to reporting currency
 */
export const toReportingCurrency = (amount, fromCurrency, reportingCurrency, exchangeRates) => {
  if (!amount || isNaN(amount)) return 0;
  if (fromCurrency === reportingCurrency) return amount;

  const { rate } = getExchangeRateWithFallback(fromCurrency, exchangeRates);
  return amount * rate;
};

/**
 * Convert reporting currency amount to any other currency
 *
 * @param {number} amount - Amount in reporting currency
 * @param {string} toCurrency - Target currency code
 * @param {string} reportingCurrency - Reporting currency code
 * @param {object} exchangeRates - Rates object
 * @returns {number} Amount in target currency
 */
export const fromReportingCurrency = (amount, toCurrency, reportingCurrency, exchangeRates) => {
  if (!amount || isNaN(amount)) return 0;
  if (toCurrency === reportingCurrency) return amount;

  const { rate } = getExchangeRateWithFallback(toCurrency, exchangeRates);
  return amount / rate;
};

/**
 * Convert between any two currencies via reporting currency
 *
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @param {string} reportingCurrency - Reporting currency (used as intermediary)
 * @param {object} exchangeRates - Rates relative to reporting currency
 * @returns {number} Converted amount
 */
export const convertCurrency = (amount, fromCurrency, toCurrency, reportingCurrency, exchangeRates) => {
  if (!amount || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;

  // Convert to reporting currency first, then to target
  const inReporting = toReportingCurrency(amount, fromCurrency, reportingCurrency, exchangeRates);
  return fromReportingCurrency(inReporting, toCurrency, reportingCurrency, exchangeRates);
};

// Legacy compatibility functions - wrap new functions with old signatures
// These use the old X/ZAR format and assume ZAR is base

/**
 * @deprecated Use toReportingCurrency instead
 * Legacy function for backward compatibility
 */
export const toZAR = (amount, currency, legacyExchangeRates) => {
  if (currency === 'ZAR') return amount;
  if (!amount || isNaN(amount)) return 0;

  // Handle legacy format: { 'USD/ZAR': 18.50 }
  const rate = legacyExchangeRates[`${currency}/ZAR`];
  if (rate && rate > 0 && !isNaN(rate)) {
    return amount * rate;
  }

  // Try default rates as fallback
  const defaultRate = DEFAULT_EXCHANGE_RATES[currency];
  if (defaultRate && defaultRate > 0) {
    missingRatesWarnings.add(currency);
    console.warn(`Exchange rate for ${currency}/ZAR not configured, using default: ${defaultRate}`);
    return amount * defaultRate;
  }

  // Critical: no rate available
  missingRatesWarnings.add(currency);
  console.error(`CRITICAL: No exchange rate for ${currency}/ZAR, no default available. Using 1:1 (INACCURATE!)`);
  return amount;
};

/**
 * @deprecated Use fromReportingCurrency instead
 * Legacy function for backward compatibility
 */
export const fromZAR = (amountZAR, targetCurrency, legacyExchangeRates) => {
  if (targetCurrency === 'ZAR') return amountZAR;
  if (!amountZAR || isNaN(amountZAR)) return 0;

  const rate = legacyExchangeRates[`${targetCurrency}/ZAR`];
  if (rate && rate > 0 && !isNaN(rate)) {
    return amountZAR / rate;
  }

  // Try default rates as fallback
  const defaultRate = DEFAULT_EXCHANGE_RATES[targetCurrency];
  if (defaultRate && defaultRate > 0) {
    missingRatesWarnings.add(targetCurrency);
    console.warn(`Exchange rate for ${targetCurrency}/ZAR not configured, using default: ${defaultRate}`);
    return amountZAR / defaultRate;
  }

  // Critical: no rate available
  missingRatesWarnings.add(targetCurrency);
  console.error(`CRITICAL: No exchange rate for ${targetCurrency}/ZAR, no default available. Using 1:1 (INACCURATE!)`);
  return amountZAR;
};

/**
 * Migrate legacy exchange rates format to new format
 * Old: { 'USD/ZAR': 18.50, 'EUR/ZAR': 19.80 }
 * New: { USD: 18.50, EUR: 19.80 }
 */
export const migrateLegacyExchangeRates = (legacyRates, reportingCurrency = 'ZAR') => {
  const newRates = {};

  Object.entries(legacyRates).forEach(([pair, rate]) => {
    // Parse 'USD/ZAR' format
    const [fromCurrency, toCurrency] = pair.split('/');
    if (toCurrency === reportingCurrency) {
      newRates[fromCurrency] = rate;
    }
  });

  return newRates;
};

/**
 * Get exchange rates from settings, handling both old and new formats
 */
export const getExchangeRates = (settings) => {
  // New format takes precedence
  if (settings.exchangeRates && !settings.exchangeRates['USD/ZAR']) {
    return settings.exchangeRates;
  }

  // Legacy format - convert
  if (settings.currency?.exchangeRates) {
    return migrateLegacyExchangeRates(settings.currency.exchangeRates, settings.reportingCurrency || 'ZAR');
  }

  // Fallback
  return { USD: 18.50, EUR: 19.80, GBP: 23.20 };
};

/**
 * Convert new format exchange rates to legacy format for backward compatibility
 * New: { USD: 18.50, EUR: 19.80 }
 * Legacy: { 'USD/ZAR': 18.50, 'EUR/ZAR': 19.80 }
 */
export const toLegacyExchangeRates = (settings) => {
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const newRates = getExchangeRates(settings);

  const legacy = {};
  Object.entries(newRates).forEach(([currency, rate]) => {
    legacy[`${currency}/${reportingCurrency}`] = rate;
  });

  return legacy;
};

/**
 * Calculate current value of an asset in reporting currency
 * @param {object} asset - Asset object with units, currentPrice, currency
 * @param {object} settings - Settings object with reportingCurrency and exchangeRates
 * @returns {number} Value in reporting currency
 */
export const calculateAssetValue = (asset, settings) => {
  const valueInCurrency = asset.units * asset.currentPrice;
  const exchangeRates = getExchangeRates(settings);
  return toReportingCurrency(valueInCurrency, asset.currency, settings.reportingCurrency, exchangeRates);
};

/**
 * @deprecated Use calculateAssetValue instead
 * Legacy function - assumes ZAR and old exchange rate format
 */
export const calculateAssetValueZAR = (asset, exchangeRates) => {
  const valueInCurrency = asset.units * asset.currentPrice;
  return toZAR(valueInCurrency, asset.currency, exchangeRates);
};

/**
 * Calculate cost basis in reporting currency
 */
export const calculateCostBasis = (asset, settings) => {
  const costInCurrency = asset.units * asset.costPrice;
  const exchangeRates = getExchangeRates(settings);
  return toReportingCurrency(costInCurrency, asset.currency, settings.reportingCurrency, exchangeRates);
};

/**
 * @deprecated Use calculateCostBasis instead
 * Legacy function - assumes ZAR and old exchange rate format
 */
export const calculateCostBasisZAR = (asset, exchangeRates) => {
  const costInCurrency = asset.units * asset.costPrice;
  return toZAR(costInCurrency, asset.currency, exchangeRates);
};

/**
 * Calculate unrealized gain/loss
 */
export const calculateUnrealizedGain = (asset, exchangeRates) => {
  const currentValue = calculateAssetValueZAR(asset, exchangeRates);
  const costBasis = calculateCostBasisZAR(asset, exchangeRates);
  return currentValue - costBasis;
};

/**
 * Calculate unrealized gain percentage
 */
export const calculateGainPercentage = (asset) => {
  if (asset.costPrice === 0) return 0;
  return ((asset.currentPrice - asset.costPrice) / asset.costPrice) * 100;
};

/**
 * Calculate capital gains tax (South Africa)
 * CGT = (Gain × inclusion rate × marginal tax rate)
 *
 * Patch 6: Now reads inclusionRate from taxConfig if available
 *
 * @param {number} gain - Capital gain amount
 * @param {number} marginalTaxRate - Marginal tax rate as percentage (e.g., 45)
 * @param {object} [taxConfig] - Optional tax configuration with cgt.inclusionRate
 * @returns {number} CGT amount
 */
export const calculateCGT = (gain, marginalTaxRate, taxConfig = null) => {
  if (gain <= 0) return 0;
  // Patch 6: Read inclusionRate from taxConfig, fallback to 40% (SA default for individuals)
  const inclusionRate = (taxConfig?.cgt?.inclusionRate ?? 40) / 100;
  return gain * inclusionRate * (marginalTaxRate / 100);
};

/**
 * Calculate net proceeds after CGT
 */
export const calculateNetProceeds = (asset, exchangeRates, marginalTaxRate) => {
  const currentValue = calculateAssetValueZAR(asset, exchangeRates);
  const gain = calculateUnrealizedGain(asset, exchangeRates);

  // TFSA: No CGT
  if (asset.accountType === 'TFSA') {
    return currentValue;
  }

  // RA: Full income tax on withdrawal (not modeled here, would need withdrawal amount)
  if (asset.accountType === 'RA') {
    return currentValue; // Simplified - actual tax depends on withdrawal
  }

  // Taxable: CGT on gains
  const cgt = calculateCGT(gain, marginalTaxRate);
  return currentValue - cgt;
};

/**
 * Calculate total gross assets in ZAR
 */
export const calculateGrossAssets = (assets, exchangeRates) => {
  return assets.reduce((total, asset) => {
    return total + calculateAssetValueZAR(asset, exchangeRates);
  }, 0);
};

/**
 * Calculate investible assets (excludes non-investible like primary home)
 */
export const calculateInvestibleAssets = (assets, exchangeRates) => {
  return assets
    .filter((a) => a.assetType === 'Investible')
    .reduce((total, asset) => {
      return total + calculateAssetValueZAR(asset, exchangeRates);
    }, 0);
};

/**
 * Calculate non-investible assets
 */
export const calculateNonInvestibleAssets = (assets, exchangeRates) => {
  return assets
    .filter((a) => a.assetType === 'Non-Investible')
    .reduce((total, asset) => {
      return total + calculateAssetValueZAR(asset, exchangeRates);
    }, 0);
};

/**
 * Calculate total liabilities in ZAR
 */
export const calculateTotalLiabilities = (liabilities, exchangeRates) => {
  return liabilities.reduce((total, liability) => {
    return total + toZAR(liability.principal, liability.currency, exchangeRates);
  }, 0);
};

/**
 * Calculate net worth
 */
export const calculateNetWorth = (assets, liabilities, exchangeRates) => {
  const grossAssets = calculateGrossAssets(assets, exchangeRates);
  const totalLiabilities = calculateTotalLiabilities(liabilities, exchangeRates);
  return grossAssets - totalLiabilities;
};

/**
 * Group assets by a specific dimension
 */
export const groupAssets = (assets, exchangeRates, dimension) => {
  const groups = {};

  assets.forEach((asset) => {
    const key = asset[dimension] || 'Uncategorized';
    if (!groups[key]) {
      groups[key] = {
        name: key,
        value: 0,
        count: 0,
        assets: [],
      };
    }

    const value = calculateAssetValueZAR(asset, exchangeRates);
    groups[key].value += value;
    groups[key].count += 1;
    groups[key].assets.push(asset);
  });

  return Object.values(groups).sort((a, b) => b.value - a.value);
};

/**
 * Calculate allocation percentages
 */
export const calculateAllocation = (assets, exchangeRates, dimension) => {
  const total = calculateGrossAssets(assets, exchangeRates);
  if (total === 0) return [];

  const groups = groupAssets(assets, exchangeRates, dimension);

  return groups.map((group) => ({
    ...group,
    percentage: (group.value / total) * 100,
  }));
};

/**
 * Detect concentration risks
 */
export const detectConcentrationRisks = (assets, exchangeRates, thresholds) => {
  const risks = [];
  const totalAssets = calculateGrossAssets(assets, exchangeRates);

  if (totalAssets === 0) return [];

  // Single asset concentration
  assets.forEach((asset) => {
    const value = calculateAssetValueZAR(asset, exchangeRates);
    const percentage = (value / totalAssets) * 100;

    if (percentage > thresholds.singleAsset) {
      risks.push({
        type: 'Single Asset',
        name: asset.name,
        percentage: percentage.toFixed(1),
        threshold: thresholds.singleAsset,
        severity: percentage > thresholds.singleAsset * 2 ? 'high' : 'medium',
      });
    }
  });

  // Asset class concentration
  const assetClassGroups = groupAssets(assets, exchangeRates, 'assetClass');
  assetClassGroups.forEach((group) => {
    const percentage = (group.value / totalAssets) * 100;
    if (percentage > thresholds.assetClass) {
      risks.push({
        type: 'Asset Class',
        name: group.name,
        percentage: percentage.toFixed(1),
        threshold: thresholds.assetClass,
        severity: percentage > thresholds.assetClass * 1.2 ? 'high' : 'medium',
      });
    }
  });

  // Currency concentration
  const currencyGroups = groupAssets(assets, exchangeRates, 'currency');
  currencyGroups.forEach((group) => {
    const percentage = (group.value / totalAssets) * 100;
    if (percentage > thresholds.currency) {
      risks.push({
        type: 'Currency',
        name: group.name,
        percentage: percentage.toFixed(1),
        threshold: thresholds.currency,
        severity: percentage > thresholds.currency * 1.1 ? 'high' : 'medium',
      });
    }
  });

  // Platform concentration
  const platformGroups = groupAssets(assets, exchangeRates, 'platform');
  platformGroups.forEach((group) => {
    const percentage = (group.value / totalAssets) * 100;
    if (percentage > thresholds.platform) {
      risks.push({
        type: 'Platform',
        name: group.name,
        percentage: percentage.toFixed(1),
        threshold: thresholds.platform,
        severity: percentage > thresholds.platform * 1.5 ? 'high' : 'medium',
      });
    }
  });

  return risks;
};

/**
 * Calculate portfolio-weighted expected return
 * (Only for investible assets)
 *
 * Patch 7: Respects asset-specific expectedReturn if set, otherwise uses asset class default
 *
 * @param {Array} assets - Array of asset objects
 * @param {object} exchangeRates - Exchange rates for value calculation
 * @param {object} expectedReturns - Default expected returns by asset class
 * @returns {number} Weighted average expected return percentage
 */
export const calculatePortfolioReturn = (assets, exchangeRates, expectedReturns) => {
  const investibleAssets = assets.filter((a) => a.assetType === 'Investible');
  const totalValue = calculateGrossAssets(investibleAssets, exchangeRates);

  if (totalValue === 0) return 0;

  const weightedReturn = investibleAssets.reduce((sum, asset) => {
    const value = calculateAssetValueZAR(asset, exchangeRates);
    const weight = value / totalValue;
    // Patch 7: Use asset-specific expected return if set, otherwise fall back to asset class default
    const returnRate = (asset.expectedReturn !== null && asset.expectedReturn !== undefined)
      ? asset.expectedReturn
      : (expectedReturns[asset.assetClass] || 0);
    return sum + weight * returnRate;
  }, 0);

  return weightedReturn;
};

/**
 * Calculate safe withdrawal amounts
 */
export const calculateSafeWithdrawal = (investibleAssets, rate) => {
  return investibleAssets * (rate / 100);
};

/**
 * Format currency with configurable currency symbol (no conversion, just display)
 * @param {number} amount - Amount to format
 * @param {number} decimals - Number of decimal places
 * @param {string} currency - Currency code (ZAR, USD, GBP, EUR, etc.)
 */
export const formatCurrency = (amount, decimals = 0, currency = 'ZAR') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }

  const symbol = getCurrencySymbol(currency);

  return `${symbol} ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Format an amount that's already in reporting currency
 * @param {number} amount - Amount already in reporting currency
 * @param {number} decimals - Number of decimal places
 * @param {string} reportingCurrency - Currency code for the symbol
 */
export const formatInReportingCurrency = (amount, decimals = 0, reportingCurrency = 'ZAR') => {
  return formatCurrency(amount, decimals, reportingCurrency);
};

/**
 * Convert and format: takes amount in any currency, converts to reporting, formats
 * @param {number} amount - Amount in source currency
 * @param {string} fromCurrency - Source currency code
 * @param {object} settings - Settings with reportingCurrency and exchangeRates
 * @param {number} decimals - Number of decimal places
 */
export const convertAndFormat = (amount, fromCurrency, settings, decimals = 0) => {
  const exchangeRates = getExchangeRates(settings);
  const converted = toReportingCurrency(amount, fromCurrency, settings.reportingCurrency, exchangeRates);
  return formatCurrency(converted, decimals, settings.reportingCurrency);
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === undefined || value === null || isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Check if price is stale
 */
export const isPriceStale = (lastUpdated, stalenessDays) => {
  const lastUpdateDate = new Date(lastUpdated);
  const now = new Date();
  const daysDiff = (now - lastUpdateDate) / (1000 * 60 * 60 * 24);
  return daysDiff > stalenessDays;
};
