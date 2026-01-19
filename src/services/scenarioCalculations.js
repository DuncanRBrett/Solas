/**
 * Scenario Calculations for Solas v3
 *
 * Handles retirement projections with:
 * - Age-based expense modeling with inflation
 * - Income sources (work + investment)
 * - Dividend and interest income from assets
 * - Market crashes
 * - Unexpected expenses
 * - Tax-aware withdrawals
 */

import {
  calculateInvestibleAssets,
  calculateNonInvestibleAssets,
  calculateAssetValue,
  calculateAssetValueZAR,
  toZAR,
  toLegacyExchangeRates,
} from '../utils/calculations';
import { calculateScenarioYearFees } from './feeCalculations';
import {
  calculateIncomeTax as calculateIncomeTaxFromTables,
  calculateCGT,
  getMarginalTaxRate,
  getTaxRebate,
} from './taxCalculations';
import { DEFAULT_SETTINGS } from '../models/defaults';

/**
 * Calculation version for audit trail
 * Increment this when making changes to calculation logic
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes to calculation methodology
 * - MINOR: New features or significant calculation improvements
 * - PATCH: Bug fixes or minor adjustments
 */
export const CALCULATION_VERSION = '3.0.0';

/**
 * Validate a number is finite and not NaN
 * Returns the value if valid, or fallback otherwise
 * @param {number} value - Value to check
 * @param {number} fallback - Fallback value if invalid
 * @param {string} context - Context for logging
 * @returns {number} Valid number
 */
const validateNumber = (value, fallback = 0, context = '') => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    if (context) {
      console.warn(`Invalid number in ${context}: ${value}, using ${fallback}`);
    }
    return fallback;
  }
  return value;
};

/**
 * Validate year data object has no NaN/Infinity values
 * Replaces invalid values with safe defaults
 * @param {object} yearData - Year data object to validate
 * @param {number} age - Age for logging context
 * @returns {object} Validated year data
 */
const validateYearData = (yearData, age) => {
  const validated = { ...yearData };
  const numericFields = [
    'netWorth', 'expenses', 'income', 'incomeTax', 'withdrawalTax',
    'totalTax', 'coveredByIncome', 'coveredByReturns', 'capitalDrawdown',
    'drawdownRate', 'withdrawal', 'savings', 'fees'
  ];

  numericFields.forEach(field => {
    if (field in validated) {
      validated[field] = validateNumber(validated[field], 0, `yearData.${field} at age ${age}`);
    }
  });

  return validated;
};

/**
 * Calculate expense multiplier based on age phase
 * Supports both legacy 3-phase and new 4-phase life phases configurations
 */
export const getExpenseMultiplier = (age, expensePhases) => {
  if (!expensePhases) return 1.0;

  // New 4-phase life phases structure (working, activeRetirement, slowerPace, laterYears)
  const { working, activeRetirement, slowerPace, laterYears, phase1, phase2, phase3, phase4 } = expensePhases;

  // Try new 4-phase structure first
  if (working && age >= working.ageStart && age <= working.ageEnd) {
    return working.percentage / 100;
  } else if (activeRetirement && age >= activeRetirement.ageStart && age <= activeRetirement.ageEnd) {
    return activeRetirement.percentage / 100;
  } else if (slowerPace && age >= slowerPace.ageStart && age <= slowerPace.ageEnd) {
    return slowerPace.percentage / 100;
  } else if (laterYears && age >= laterYears.ageStart) {
    return laterYears.percentage / 100;
  }

  // Fallback to legacy 3/4-phase structure
  if (phase1 && age >= phase1.ageStart && age <= phase1.ageEnd) {
    return phase1.percentage / 100;
  } else if (phase2 && age >= phase2.ageStart && age <= phase2.ageEnd) {
    return phase2.percentage / 100;
  } else if (phase3 && age >= phase3.ageStart && age <= phase3.ageEnd) {
    return phase3.percentage / 100;
  } else if (phase4 && age >= phase4.ageStart) {
    return phase4.percentage / 100;
  } else if (phase3 && age >= phase3.ageStart) {
    // Fallback for old 3-phase format where phase3 is final
    return phase3.percentage / 100;
  }

  return 1.0;
};

/**
 * Calculate dividend income from assets
 *
 * IMPORTANT: dividendYield should be entered as the NET yield (after 20% dividend withholding tax).
 * This is how most fund fact sheets report it. For example:
 * - If a fund pays 5% gross dividend yield, the net yield is 5% × 0.80 = 4%
 * - Enter 4% in the dividendYield field
 *
 * The withholding tax is already deducted at source, so no further tax adjustment is needed.
 *
 * @param {Array} assets - Array of asset objects
 * @param {object} exchangeRates - Legacy format exchange rates
 * @returns {number} Annual dividend income in ZAR (already net of withholding tax)
 */
export const calculateDividendIncomeFromAssets = (assets, exchangeRates) => {
  return assets
    .filter(asset => asset.assetType === 'Investible' && (asset.dividendYield > 0 || asset.incomeYield > 0))
    .reduce((sum, asset) => {
      const valueZAR = calculateAssetValueZAR(asset, exchangeRates);
      // Use dividendYield if available, fall back to incomeYield for backwards compatibility
      const yield_ = asset.dividendYield || asset.incomeYield || 0;
      const annualDividend = valueZAR * (yield_ / 100);
      // No tax adjustment needed - dividendYield is already net of 20% withholding tax
      return sum + annualDividend;
    }, 0);
};

/**
 * Calculate interest income from assets (taxed as income at marginal rate)
 */
export const calculateInterestIncomeFromAssets = (assets, exchangeRates, marginalTaxRate) => {
  const grossInterest = assets
    .filter(asset => asset.assetType === 'Investible' && asset.interestYield > 0)
    .reduce((sum, asset) => {
      const valueZAR = calculateAssetValueZAR(asset, exchangeRates);
      const annualInterest = valueZAR * (asset.interestYield / 100);
      return sum + annualInterest;
    }, 0);

  // Interest is taxed at marginal rate
  const tax = grossInterest * (marginalTaxRate / 100);
  return { gross: grossInterest, net: grossInterest - tax, tax };
};

/**
 * Calculate income at a given age from all sources
 * Handles both regular income (inflation-adjusted) and annuities (escalation rate)
 */
export const calculateIncomeAtAge = (age, incomeSources, exchangeRates, inflationRate, yearsFromNow) => {
  let totalIncome = 0;
  let taxableIncome = 0;

  incomeSources.forEach(source => {
    const isActive = (source.startAge === null || age >= source.startAge) &&
                     (source.endAge === null || age <= source.endAge);

    if (isActive) {
      let monthlyAmount = toZAR(source.monthlyAmount, source.currency, exchangeRates);

      // For annuities, use the escalation rate instead of inflation
      if (source.type === 'Annuity' && source.escalationRate != null && yearsFromNow > 0) {
        monthlyAmount = monthlyAmount * Math.pow(1 + source.escalationRate / 100, yearsFromNow);
      }
      // For regular income, apply inflation adjustment if applicable
      else if (source.isInflationAdjusted && yearsFromNow > 0) {
        monthlyAmount = monthlyAmount * Math.pow(1 + inflationRate / 100, yearsFromNow);
      }

      const annualAmount = monthlyAmount * 12;
      totalIncome += annualAmount;

      if (source.isTaxable) {
        taxableIncome += annualAmount;
      }
    }
  });

  return { totalIncome, taxableIncome };
};

/**
 * Calculate tax on income using SA tax tables
 * Falls back to simplified marginal rate if tax config not available
 * @param {number} taxableIncome - Annual taxable income
 * @param {number} age - Person's age (for rebates)
 * @param {object} taxConfig - Tax configuration from settings
 * @param {number} marginalTaxRate - Fallback marginal rate if no tax config
 */
export const calculateIncomeTax = (taxableIncome, age, taxConfig, marginalTaxRate) => {
  // If we have tax config with brackets, use proper tax table calculation
  if (taxConfig && taxConfig.incomeTaxBrackets && taxConfig.incomeTaxBrackets.length > 0) {
    const result = calculateIncomeTaxFromTables(taxableIncome, age, taxConfig);
    return result.netTax;
  }

  // Fallback to simplified marginal rate calculation
  return taxableIncome * (marginalTaxRate / 100);
};

/**
 * Calculate withdrawal tax rate based on account mix
 */
export const calculateWithdrawalTaxRate = (assets, marginalTaxRate) => {
  const accountTypes = { TFSA: 0, Taxable: 0, RA: 0 };
  let totalValue = 0;

  assets.forEach(asset => {
    if (asset.assetType === 'Investible') {
      const value = asset.units * asset.currentPrice;
      accountTypes[asset.accountType] = (accountTypes[asset.accountType] || 0) + value;
      totalValue += value;
    }
  });

  if (totalValue === 0) return 0;

  // TFSA: 0% tax
  // Taxable: CGT (40% inclusion × marginal rate)
  // RA: Full income tax on withdrawal
  const tfsaWeight = accountTypes.TFSA / totalValue;
  const taxableWeight = accountTypes.Taxable / totalValue;
  const raWeight = accountTypes.RA / totalValue;

  const cgtRate = 0.4 * (marginalTaxRate / 100); // 40% inclusion

  return (tfsaWeight * 0) + (taxableWeight * cgtRate) + (raWeight * marginalTaxRate / 100);
};

/**
 * Calculate CGT impact on a capital withdrawal
 * Returns the CGT amount and gross withdrawal needed to net the required amount
 *
 * Logic:
 * - Assumes proportional withdrawal from all investible assets
 * - TFSA: No CGT
 * - Taxable: CGT on gain portion (40% inclusion × marginal rate)
 * - RA: Taxed as income (marginal rate) - different mechanism
 */
export const calculateWithdrawalCGT = (withdrawalAmount, assets, exchangeRates, marginalTaxRate) => {
  if (withdrawalAmount <= 0 || !assets || assets.length === 0) {
    return { cgt: 0, grossWithdrawal: withdrawalAmount, netWithdrawal: withdrawalAmount };
  }

  // Calculate portfolio totals by account type
  const investibleAssets = assets.filter(a => a.assetType === 'Investible');

  let totalValue = 0;
  let totalCost = 0;
  let tfsaValue = 0;
  let taxableValue = 0;
  let taxableCost = 0;
  let raValue = 0;

  investibleAssets.forEach(asset => {
    const value = calculateAssetValueZAR(asset, exchangeRates);
    const cost = (asset.units || 0) * (asset.costPrice || 0) * (exchangeRates[asset.currency] || 1);

    totalValue += value;
    totalCost += cost;

    if (asset.accountType === 'TFSA') {
      tfsaValue += value;
    } else if (asset.accountType === 'RA') {
      raValue += value;
    } else {
      // Taxable or unspecified
      taxableValue += value;
      taxableCost += cost;
    }
  });

  if (totalValue === 0) {
    return { cgt: 0, grossWithdrawal: withdrawalAmount, netWithdrawal: withdrawalAmount };
  }

  // Assume proportional withdrawal from each account type
  const tfsaWithdrawal = withdrawalAmount * (tfsaValue / totalValue);
  const taxableWithdrawal = withdrawalAmount * (taxableValue / totalValue);
  const raWithdrawal = withdrawalAmount * (raValue / totalValue);

  // Calculate CGT on taxable withdrawal
  // The gain ratio for taxable accounts
  const taxableGainRatio = taxableValue > 0 ? Math.max(0, (taxableValue - taxableCost) / taxableValue) : 0;
  const gainOnWithdrawal = taxableWithdrawal * taxableGainRatio;

  // CGT = gain × 40% inclusion × marginal rate
  const cgtRate = 0.4 * (marginalTaxRate / 100);
  const cgt = gainOnWithdrawal * cgtRate;

  // For RA, the full amount would be taxed as income at marginal rate
  // But this is typically only relevant when actually withdrawing (not for projection)
  // We'll include it for completeness but note it's a simplification
  const raTax = raWithdrawal * (marginalTaxRate / 100);

  // Total tax on the withdrawal
  const totalTax = cgt + raTax;

  // Calculate grossForNet: How much gross withdrawal is needed to get a net amount after tax?
  // Formula: grossForNet = netAmount / (1 - taxRatio)
  //
  // Edge case protection:
  // - If taxRatio >= 1 (100%+ effective tax rate, which shouldn't happen in reality),
  //   we cap the gross amount to avoid negative or infinite values.
  // - In practice, SA maximum effective tax rates are:
  //   * CGT: 40% inclusion × 45% = 18% max
  //   * RA withdrawal: 45% marginal rate max
  //   * Blended rate depends on account mix
  //
  // If this edge case is ever hit, it likely indicates bad input data (e.g., marginal rate > 100%)
  const taxRatio = withdrawalAmount > 0 ? totalTax / withdrawalAmount : 0;
  let grossForNet;

  // Validate and cap tax ratio to reasonable bounds
  // SA maximum realistic tax rates:
  // - CGT: 40% inclusion × 45% = 18% max
  // - RA withdrawal: 45% marginal rate max
  // - Blended max: ~45% if all RA
  // Anything above 50% is almost certainly an error
  const MAX_REASONABLE_TAX_RATIO = 0.50;

  if (taxRatio > MAX_REASONABLE_TAX_RATIO) {
    console.warn(
      `Tax ratio ${(taxRatio * 100).toFixed(1)}% exceeds maximum reasonable rate of ${MAX_REASONABLE_TAX_RATIO * 100}%. ` +
      `This likely indicates incorrect settings. Capping at ${MAX_REASONABLE_TAX_RATIO * 100}%.`
    );
    // Use capped ratio for calculation
    grossForNet = withdrawalAmount / (1 - MAX_REASONABLE_TAX_RATIO);
  } else if (taxRatio < 0) {
    // Negative tax ratio should never happen - treat as 0%
    console.warn(`Negative tax ratio detected (${(taxRatio * 100).toFixed(1)}%). Using 0% instead.`);
    grossForNet = withdrawalAmount;
  } else {
    grossForNet = withdrawalAmount / (1 - taxRatio);
  }

  // Final sanity check - gross should never be more than 2× net (implies >50% tax)
  if (grossForNet > withdrawalAmount * 2) {
    console.warn(`Gross-for-net calculation produced unreasonable value. Capping at 2× withdrawal amount.`);
    grossForNet = withdrawalAmount * 2;
  }

  return {
    cgt,                                    // CGT specifically (Taxable accounts)
    raTax,                                  // Income tax on RA withdrawal
    totalTax,                               // Combined tax (CGT + RA tax)
    grossWithdrawal: withdrawalAmount,      // What you withdraw
    netWithdrawal: withdrawalAmount - totalTax,  // What you keep after tax
    // For reverse calculation: how much gross to withdraw to get net amount
    grossForNet,
    taxableGainRatio,                       // Proportion of taxable that is gain
    accountMix: {
      tfsa: tfsaValue / totalValue,
      taxable: taxableValue / totalValue,
      ra: raValue / totalValue,
    },
  };
};

/**
 * Calculate currency allocation for investible assets
 * Returns the proportion of portfolio value in each currency
 *
 * @param {Array} assets - Array of asset objects
 * @param {object} exchangeRates - Exchange rates for currency conversion
 * @param {string} reportingCurrency - The reporting currency (e.g., 'ZAR')
 * @returns {object} { currency: weight } - weights summing to 1
 */
export const calculateCurrencyAllocation = (assets, exchangeRates, reportingCurrency = 'ZAR') => {
  const currencyValues = {};
  let totalValue = 0;

  (assets || []).forEach(asset => {
    if (asset.assetType === 'Investible') {
      const value = calculateAssetValueZAR(asset, exchangeRates);
      const currency = asset.currency || reportingCurrency;

      currencyValues[currency] = (currencyValues[currency] || 0) + value;
      totalValue += value;
    }
  });

  if (totalValue === 0) {
    return { [reportingCurrency]: 1 }; // Default to all in reporting currency
  }

  // Convert to weights
  const allocation = {};
  for (const currency in currencyValues) {
    allocation[currency] = currencyValues[currency] / totalValue;
  }

  return allocation;
};

/**
 * Calculate account type weights for withdrawal tax calculation
 * Returns the proportion of investible assets in each account type
 *
 * @param {Array} assets - Array of asset objects
 * @param {object} exchangeRates - Exchange rates for currency conversion
 * @returns {object} { tfsa, taxable, ra, isEmpty } - weights summing to 1, plus flag if no assets
 */
export const calculateAccountTypeWeights = (assets, exchangeRates) => {
  let tfsaValue = 0;
  let taxableValue = 0;
  let raValue = 0;

  (assets || []).forEach(asset => {
    if (asset.assetType === 'Investible') {
      const value = calculateAssetValueZAR(asset, exchangeRates);

      if (asset.accountType === 'TFSA') {
        tfsaValue += value;
      } else if (asset.accountType === 'RA') {
        raValue += value;
      } else {
        // Taxable or unspecified - default to taxable
        taxableValue += value;
      }
    }
  });

  const totalValue = tfsaValue + taxableValue + raValue;

  if (totalValue === 0) {
    // No investible assets - return balanced assumption rather than all taxable
    // This is more conservative for tax projections (assumes some tax-advantaged accounts)
    // The isEmpty flag allows callers to handle this case specially if needed
    return {
      tfsa: 0.15,    // Assume 15% TFSA (common SA allocation)
      taxable: 0.60, // Assume 60% taxable
      ra: 0.25,      // Assume 25% RA
      isEmpty: true, // Flag that this is an estimate, not actual data
    };
  }

  return {
    tfsa: tfsaValue / totalValue,
    taxable: taxableValue / totalValue,
    ra: raValue / totalValue,
    isEmpty: false,
  };
};

/**
 * Calculate portfolio-wide gain ratio for taxable accounts only
 * This is the percentage of the taxable portfolio that is unrealized gain
 * Used to estimate CGT more accurately (CGT only applies to gains, not entire withdrawal)
 *
 * @param {Array} assets - Array of asset objects
 * @param {object} exchangeRates - Exchange rates in legacy format (e.g., { 'USD/ZAR': 18.50 })
 * @param {string} reportingCurrency - The reporting currency (default 'ZAR')
 * @returns {object} { gainRatio, totalValue, totalCost, totalGain }
 */
export const calculateTaxablePortfolioGainRatio = (assets, exchangeRates, reportingCurrency = 'ZAR') => {
  let totalValue = 0;
  let totalCost = 0;

  (assets || []).forEach(asset => {
    // Only include investible assets in taxable accounts (not TFSA or RA)
    if (asset.assetType === 'Investible' && asset.accountType !== 'TFSA' && asset.accountType !== 'RA') {
      const value = calculateAssetValueZAR(asset, exchangeRates);
      // Use the same exchange rate lookup pattern as toZAR for consistency
      const rateKey = `${asset.currency}/${reportingCurrency}`;
      const rate = asset.currency === reportingCurrency ? 1 : (exchangeRates[rateKey] || 1);
      const cost = (asset.units || 0) * (asset.costPrice || 0) * rate;

      totalValue += value;
      totalCost += cost;
    }
  });

  // Calculate gain ratio (what % of the portfolio is gain)
  // If totalValue is 0, return 0 ratio
  // If cost >= value (no gain or loss), return 0 ratio
  const totalGain = Math.max(0, totalValue - totalCost);
  const gainRatio = totalValue > 0 ? totalGain / totalValue : 0;

  return {
    gainRatio,           // Proportion of taxable portfolio that is gain (0-1)
    totalValue,          // Total value of taxable assets
    totalCost,           // Total cost basis of taxable assets
    totalGain,           // Total unrealized gain
    gainPercentage: gainRatio * 100,  // As percentage for display
  };
};

/**
 * Estimate the gain ratio for a given portfolio state during projection
 *
 * As the portfolio grows, the gain ratio increases because:
 * - New returns add to gains (not cost basis)
 * - Withdrawals reduce both value and cost proportionally
 *
 * This provides a more accurate CGT estimate than using the static initial ratio.
 *
 * @param {number} initialValue - Starting portfolio value
 * @param {number} initialCost - Starting cost basis
 * @param {number} currentValue - Current portfolio value in projection
 * @param {number} totalWithdrawn - Total amount withdrawn so far
 * @param {number} initialGainRatio - Initial gain ratio from actual portfolio
 * @returns {number} Estimated gain ratio (0-1)
 */
export const estimateGainRatioForProjection = (
  initialValue,
  initialCost,
  currentValue,
  totalWithdrawn,
  initialGainRatio
) => {
  // Edge cases
  if (currentValue <= 0) return 0;
  if (initialValue <= 0) return initialGainRatio;

  // Calculate estimated cost basis
  // Withdrawals are assumed to come proportionally from cost and gain
  // So withdrawals reduce cost basis by: withdrawal × (1 - gainRatio at time of withdrawal)
  // For simplicity, we estimate using initial gain ratio for historical withdrawals

  // Estimated cost remaining after proportional withdrawals
  // costRemaining = initialCost × (1 - withdrawalRate)
  // where withdrawalRate = totalWithdrawn / (initialValue + totalGrowth)
  // Simplified: assume cost reduces proportionally to value reduction from withdrawals

  const valueBeforeWithdrawals = currentValue + totalWithdrawn;
  const withdrawalProportion = totalWithdrawn / Math.max(valueBeforeWithdrawals, 1);

  // Cost basis reduces proportionally with withdrawals
  const estimatedCostRemaining = initialCost * (1 - withdrawalProportion);

  // Current gain = current value - remaining cost
  const estimatedGain = Math.max(0, currentValue - estimatedCostRemaining);

  // Gain ratio = gain / value
  const estimatedGainRatio = currentValue > 0 ? estimatedGain / currentValue : 0;

  // Clamp to reasonable range (0 to 0.95 - some cost basis always remains)
  return Math.min(0.95, Math.max(0, estimatedGainRatio));
};

/**
 * Calculate equity percentage of portfolio
 */
export const calculateEquityPercentage = (assets) => {
  let totalValue = 0;
  let equityValue = 0;

  assets.forEach(asset => {
    if (asset.assetType === 'Investible') {
      const value = asset.units * asset.currentPrice;
      totalValue += value;

      if (asset.assetClass === 'Offshore Equity' || asset.assetClass === 'SA Equity') {
        equityValue += value;
      }
    }
  });

  return totalValue > 0 ? equityValue / totalValue : 0;
};

/**
 * Get monthly expense amount for a specific age from age-based plan
 * Supports both:
 * - New format: categoryExpenses = { categoryName: totalAmount }
 * - Old format: expenses = { categoryName: { subcategoryName: amount } }
 */
export const getMonthlyExpensesForAge = (age, ageBasedPlan, expenseCategories) => {
  if (!ageBasedPlan || !ageBasedPlan.enabled || !ageBasedPlan.phases) {
    return null; // Indicates age-based planning not in use
  }

  // Find the phase that applies to this age
  const applicablePhase = ageBasedPlan.phases.find(
    phase => age >= phase.startAge && age <= phase.endAge
  );

  if (!applicablePhase) {
    return null; // Age outside all defined phases
  }

  // Sum up all expenses for this phase
  let totalMonthly = 0;

  // Check if using new format (categoryExpenses) or old format (expenses)
  if (applicablePhase.categoryExpenses) {
    // New format: direct category totals
    Object.values(applicablePhase.categoryExpenses).forEach(amount => {
      totalMonthly += amount || 0;
    });
  } else if (applicablePhase.expenses) {
    // Old format: nested subcategory amounts
    expenseCategories.forEach(category => {
      const categoryExpenses = applicablePhase.expenses[category.name] || {};

      if (typeof categoryExpenses === 'object') {
        category.subcategories.forEach(subcategory => {
          const amount = categoryExpenses[subcategory.name] || 0;
          totalMonthly += amount;
        });
      }
    });
  }

  return totalMonthly;
};

/**
 * Calculate weighted portfolio return based on asset class allocation
 * Uses scenario returns if useCustomReturns is true, otherwise settings returns
 */
export const calculateWeightedPortfolioReturn = (assets, exchangeRates, scenarioReturns, settingsReturns) => {
  const expectedReturns = scenarioReturns || settingsReturns || {};

  // Group assets by asset class and calculate total value
  const assetClassValues = {};
  let totalValue = 0;

  assets.forEach(asset => {
    if (asset.assetType === 'Investible') {
      const value = calculateAssetValueZAR(asset, exchangeRates);
      const assetClass = asset.assetClass || 'Cash';
      assetClassValues[assetClass] = (assetClassValues[assetClass] || 0) + value;
      totalValue += value;
    }
  });

  if (totalValue === 0) {
    // Fallback to offshore equity return if no assets
    return expectedReturns['Offshore Equity'] || 10;
  }

  // Calculate weighted return
  let weightedReturn = 0;
  Object.entries(assetClassValues).forEach(([assetClass, value]) => {
    const weight = value / totalValue;
    const assetReturn = expectedReturns[assetClass] || 8; // Default to 8% if not specified
    weightedReturn += weight * assetReturn;
  });

  return weightedReturn;
};

/**
 * Calculate asset class percentages for crash impact
 */
export const calculateAssetClassPercentages = (assets, exchangeRates) => {
  const assetClassValues = {};
  let totalValue = 0;

  assets.forEach(asset => {
    if (asset.assetType === 'Investible') {
      const value = calculateAssetValueZAR(asset, exchangeRates);
      const assetClass = asset.assetClass || 'Cash';
      assetClassValues[assetClass] = (assetClassValues[assetClass] || 0) + value;
      totalValue += value;
    }
  });

  // Convert to percentages
  const percentages = {};
  Object.entries(assetClassValues).forEach(([assetClass, value]) => {
    percentages[assetClass] = totalValue > 0 ? value / totalValue : 0;
  });

  return percentages;
};

/**
 * Run a retirement scenario projection
 */
export const runScenario = (scenario, profile) => {
  const { assets, income, expenses, settings, expenseCategories = [], ageBasedExpensePlan } = profile || {};

  // Safety check for missing data
  if (!settings || !settings.profile) {
    console.error('runScenario: Missing settings or profile data');
    return {
      trajectory: [],
      success: false,
      depletionAge: null,
      finalValue: 0,
      shortfall: 0,
      totalWithdrawn: 0,
      totalWithdrawalTax: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalFeesPaid: 0,
      expenseCoverageBreakdown: { byIncome: { amount: 0, percentage: 0 }, byReturns: { amount: 0, percentage: 0 }, byCapitalDrawdown: { amount: 0, percentage: 0 } },
      metrics: {},
      runAt: new Date().toISOString(),
      error: 'Missing required profile data',
    };
  }

  // Use legacy format for backward compatibility with existing calculations
  const exchangeRates = toLegacyExchangeRates(settings);
  const { age: currentAge, marginalTaxRate, defaultCGT } = settings.profile;

  // Get tax configuration - use settings or defaults
  const taxConfig = settings.taxConfig || DEFAULT_SETTINGS.taxConfig;

  // Get expected returns - scenario can override settings
  const scenarioReturns = scenario.useCustomReturns ? scenario.expectedReturns : null;
  const settingsReturns = settings.expectedReturns;

  // Calculate weighted portfolio return based on asset allocation
  const weightedReturn = calculateWeightedPortfolioReturn(assets, exchangeRates, scenarioReturns, settingsReturns);

  // Get asset class percentages for crash calculations
  const assetClassPercentages = calculateAssetClassPercentages(assets, exchangeRates);

  // Use scenario-level expense phases if enabled, otherwise fall back to settings
  // 4-phase model: Working, Active Retirement, Slower Pace, Later Years
  const defaultExpensePhases = {
    working: { ageStart: currentAge || 55, ageEnd: (scenario.retirementAge || 65) - 1, percentage: 100 },
    activeRetirement: { ageStart: scenario.retirementAge || 65, ageEnd: 72, percentage: 100 },
    slowerPace: { ageStart: 73, ageEnd: 80, percentage: 80 },
    laterYears: { ageStart: 81, ageEnd: scenario.lifeExpectancy || 90, percentage: 60 },
  };
  const retirementExpensePhases = scenario.useCustomExpensePhases && scenario.expensePhases
    ? scenario.expensePhases
    : (settings.lifePhases || defaultExpensePhases);

  // Check if age-based expense planning is enabled
  // BUT: if scenario has custom expense phases enabled, those take priority
  const useAgeBasedExpenses = ageBasedExpensePlan?.enabled && expenseCategories.length > 0
    && !(scenario.useCustomExpensePhases && scenario.expensePhases);

  const {
    inflationRate,
    retirementAge,
    lifeExpectancy,
    monthlySavings,
    useExpensesModule,
    annualExpenses: scenarioAnnualExpenses,
    marketCrashes = [],
    unexpectedExpenses = [],
    useCurrencyMovement,
    currencyMovement = {},
  } = scenario;

  // Calculate base annual expenses (today's money)
  let baseAnnualExpenses;
  if (useExpensesModule) {
    // First try to use new hierarchical expense categories
    if (expenseCategories && expenseCategories.length > 0) {
      baseAnnualExpenses = 0;
      expenseCategories.forEach(category => {
        (category.subcategories || []).forEach(sub => {
          const currency = sub.currency || 'ZAR';
          // 'amount' field stores the value per frequency period:
          // - If frequency = 'Annual': amount contains the ANNUAL amount
          // - If frequency = 'Monthly': amount contains the monthly amount (multiply by 12)
          const annualAmount = sub.frequency === 'Annual'
            ? (sub.amount || 0)  // Already annual
            : (sub.amount || 0) * 12;  // Convert monthly to annual
          const annualAmountZAR = toZAR(annualAmount, currency, exchangeRates);
          baseAnnualExpenses += annualAmountZAR;
        });
      });
    } else if (expenses && expenses.length > 0) {
      // Fall back to legacy expenses array
      baseAnnualExpenses = expenses.reduce((sum, e) => {
        if (e.frequency === 'Monthly') return sum + e.amount * 12;
        return sum + e.amount;
      }, 0);
    } else {
      baseAnnualExpenses = scenarioAnnualExpenses || settings.profile.annualExpenses || 0;
    }
  } else {
    baseAnnualExpenses = scenarioAnnualExpenses || settings.profile.annualExpenses || 0;
  }

  // Get starting portfolio value (investible assets only)
  let portfolioValue = calculateInvestibleAssets(assets, exchangeRates);
  const startingPortfolio = portfolioValue;

  // Calculate portfolio gain ratio for more accurate CGT estimation
  // CGT only applies to the gain portion of taxable account withdrawals
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const gainRatioData = calculateTaxablePortfolioGainRatio(assets, exchangeRates, reportingCurrency);
  const initialGainRatio = gainRatioData.gainRatio; // Proportion of taxable portfolio that is gain
  const initialTaxableValue = gainRatioData.totalValue; // Initial taxable portfolio value
  const initialTaxableCost = gainRatioData.totalCost; // Initial cost basis

  // CGT rate (40% inclusion × marginal rate) - applied only to gain portion
  const cgtInclusionRate = 0.4;
  const cgtRate = cgtInclusionRate * (marginalTaxRate / 100);

  // Calculate account type weights for withdrawal tax calculation
  const accountTypeWeights = calculateAccountTypeWeights(assets, exchangeRates);

  // Calculate equity percentage for crash impact (fallback for legacy crashes)
  const equityPercentage = calculateEquityPercentage(assets);

  // Calculate currency allocation for currency movement modeling
  const currencyAllocation = calculateCurrencyAllocation(assets, exchangeRates, reportingCurrency);

  // Calculate blended currency effect if currency movement is enabled
  // This is added to portfolio returns each year
  let currencyEffect = 0;
  if (useCurrencyMovement && currencyMovement) {
    // Calculate weighted currency effect based on allocation to each currency
    for (const currency in currencyAllocation) {
      if (currency !== reportingCurrency && currencyMovement[currency]) {
        currencyEffect += currencyAllocation[currency] * (currencyMovement[currency] || 0);
      }
    }
  }

  // Calculate asset-based income (current - will grow with portfolio)
  const baseDividendIncome = calculateDividendIncomeFromAssets(assets, exchangeRates);
  const baseInterestIncome = calculateInterestIncomeFromAssets(assets, exchangeRates, marginalTaxRate);

  // Results tracking
  const trajectory = [];
  let success = true;
  let depletionAge = null;
  let totalWithdrawn = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalCoveredByIncome = 0;
  let totalCoveredByReturns = 0;
  let totalCapitalDrawdown = 0;
  let totalFeesPaid = 0;
  let totalWithdrawalTax = 0;

  // Real return calculation - using weighted portfolio return
  const realReturn = ((1 + weightedReturn / 100) / (1 + inflationRate / 100) - 1) * 100;

  // Track any calculation errors
  let calculationErrors = [];

  // Run simulation year by year with error handling
  try {
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    try {
    const yearsFromNow = age - currentAge;
    const yearsFromRetirement = age - retirementAge;

    // Portfolio growth factor from start (for dividend/interest scaling)
    const portfolioGrowthFactor = startingPortfolio > 0 ? portfolioValue / startingPortfolio : 1;

    // Record starting value for this year (will update with more details after calculations)
    const yearData = {
      age,
      netWorth: portfolioValue,
      isRetired: age >= retirementAge,
      expenses: 0,
      income: 0,
      incomeTax: 0,
      withdrawalTax: 0,
      totalTax: 0,
      coveredByIncome: 0,
      coveredByReturns: 0,
      capitalDrawdown: 0,
      drawdownRate: 0,
      withdrawal: 0,
    };

    // Calculate inflation-adjusted expenses for this age
    let inflationAdjustedExpenses;
    const inflationFactor = Math.pow(1 + inflationRate / 100, yearsFromNow);

    if (useAgeBasedExpenses) {
      // Use age-based expense planning with inflation adjustment
      const monthlyExpenses = getMonthlyExpensesForAge(age, ageBasedExpensePlan, expenseCategories);
      if (monthlyExpenses !== null) {
        // Age-based amounts are entered in today's money, apply inflation
        inflationAdjustedExpenses = monthlyExpenses * 12 * inflationFactor;
      } else {
        // Fallback to traditional calculation if age outside defined phases
        const expenseMultiplier = age >= retirementAge ? getExpenseMultiplier(age, retirementExpensePhases) : 1.0;
        inflationAdjustedExpenses = baseAnnualExpenses * inflationFactor * expenseMultiplier;
      }
    } else {
      // Traditional percentage-based calculation
      const expenseMultiplier = age >= retirementAge ? getExpenseMultiplier(age, retirementExpensePhases) : 1.0;
      inflationAdjustedExpenses = baseAnnualExpenses * inflationFactor * expenseMultiplier;
    }

    // Calculate income for this year from income sources
    const { totalIncome: yearSourceIncome, taxableIncome } = calculateIncomeAtAge(
      age,
      income || [],
      exchangeRates,
      inflationRate,
      yearsFromNow
    );

    // Calculate asset-based income (scales with portfolio value)
    // Dividend income (already after withholding tax)
    const yearDividendIncome = baseDividendIncome * portfolioGrowthFactor;
    // Interest income (net after marginal tax)
    const yearInterestIncome = baseInterestIncome.net * portfolioGrowthFactor;

    // Total income
    const yearTotalIncome = yearSourceIncome + yearDividendIncome + yearInterestIncome;

    // Calculate tax on income (only on taxable portion from sources + interest gross)
    const taxableFromSources = taxableIncome;
    const incomeTax = calculateIncomeTax(taxableFromSources, age, taxConfig, marginalTaxRate);
    const netIncome = yearSourceIncome - incomeTax + yearDividendIncome + yearInterestIncome;

    totalIncome += netIncome;

    if (age < retirementAge) {
      // Pre-retirement: calculate if there's an expense shortfall
      const annualSavings = monthlySavings * 12 * inflationFactor;
      const netNeeded = inflationAdjustedExpenses - netIncome;

      let yearWithdrawalTax = 0;
      let yearWithdrawal = 0;

      if (netNeeded > 0) {
        // Expenses exceed income - need to withdraw from portfolio
        // Calculate withdrawal tax based on account type mix and DYNAMIC gain ratio
        const tfsaWithdrawal = netNeeded * accountTypeWeights.tfsa;
        const taxableWithdrawal = netNeeded * accountTypeWeights.taxable;
        const raWithdrawal = netNeeded * accountTypeWeights.ra;

        // Calculate dynamic gain ratio based on portfolio evolution
        // This accounts for gains compounding and proportional withdrawals
        const currentGainRatio = estimateGainRatioForProjection(
          initialTaxableValue,
          initialTaxableCost,
          portfolioValue * accountTypeWeights.taxable, // Taxable portion of current portfolio
          totalWithdrawn * accountTypeWeights.taxable, // Taxable portion of withdrawals
          initialGainRatio
        );

        const tfsaTax = 0;
        const taxableTax = taxableWithdrawal * currentGainRatio * cgtRate;
        const raTax = raWithdrawal * (marginalTaxRate / 100);

        yearWithdrawalTax = tfsaTax + taxableTax + raTax;
        const grossWithdrawal = netNeeded + yearWithdrawalTax;

        portfolioValue -= grossWithdrawal;
        totalWithdrawalTax += yearWithdrawalTax;
        totalWithdrawn += grossWithdrawal;
        yearWithdrawal = grossWithdrawal;
      }

      // Add savings to portfolio
      portfolioValue += annualSavings;

      // Grow portfolio using weighted return + currency effect
      // Currency effect is a blended rate based on portfolio currency allocation
      const totalReturn = weightedReturn + currencyEffect;
      portfolioValue *= (1 + totalReturn / 100);

      // Deduct fees after growth
      const yearFees = calculateScenarioYearFees(portfolioValue, settings);
      portfolioValue -= yearFees.totalFees;
      totalFeesPaid += yearFees.totalFees;

      // Update year data for pre-retirement
      yearData.expenses = inflationAdjustedExpenses;
      yearData.income = netIncome;
      yearData.incomeTax = incomeTax;
      yearData.withdrawalTax = yearWithdrawalTax;
      yearData.totalTax = incomeTax + yearWithdrawalTax;
      yearData.savings = annualSavings;
      yearData.withdrawal = yearWithdrawal;
      // Calculate drawdown rate for pre-retirement too
      yearData.drawdownRate = yearData.netWorth > 0 ? (yearWithdrawal / yearData.netWorth) * 100 : 0;

      // Validate and push year data
      trajectory.push(validateYearData(yearData, age));
    } else {
      // Post-retirement
      const netNeeded = inflationAdjustedExpenses - netIncome;
      totalExpenses += inflationAdjustedExpenses;

      // Track how much is covered by income
      const incomeContribution = Math.min(netIncome, inflationAdjustedExpenses);
      totalCoveredByIncome += incomeContribution;

      // Year-specific tracking
      let yearCoveredByReturns = 0;
      let yearCapitalDrawdown = 0;
      let yearWithdrawal = 0;

      // Track withdrawal tax for this year
      let yearWithdrawalTax = 0;

      if (netNeeded > 0) {
        // Need to withdraw from portfolio
        // Calculate potential returns on current portfolio (including currency effect)
        const totalReturnRate = weightedReturn + currencyEffect;
        const potentialReturns = portfolioValue * (totalReturnRate / 100);

        // If returns can cover the shortfall, we're using returns not capital
        if (potentialReturns >= netNeeded) {
          // Covered by returns (no capital drawdown)
          totalCoveredByReturns += netNeeded;
          yearCoveredByReturns = netNeeded;
        } else {
          // Partially covered by returns, rest from capital
          totalCoveredByReturns += potentialReturns;
          yearCoveredByReturns = potentialReturns;
          const capitalNeeded = netNeeded - potentialReturns;
          totalCapitalDrawdown += capitalNeeded;
          yearCapitalDrawdown = capitalNeeded;
        }

        // Calculate withdrawal tax based on account type mix and DYNAMIC gain ratio
        // - TFSA portion: 0% tax
        // - Taxable portion: CGT only on gain portion (gainRatio × cgtRate)
        // - RA portion: Full income tax at marginal rate
        //
        // Note: Gain ratio is dynamically estimated based on portfolio evolution
        // to provide more accurate CGT projections over long time horizons.

        // Proportional withdrawal from each account type
        const tfsaWithdrawal = netNeeded * accountTypeWeights.tfsa;
        const taxableWithdrawal = netNeeded * accountTypeWeights.taxable;
        const raWithdrawal = netNeeded * accountTypeWeights.ra;

        // Calculate dynamic gain ratio based on portfolio evolution
        // This accounts for gains compounding and proportional withdrawals
        const currentGainRatio = estimateGainRatioForProjection(
          initialTaxableValue,
          initialTaxableCost,
          portfolioValue * accountTypeWeights.taxable, // Taxable portion of current portfolio
          totalWithdrawn * accountTypeWeights.taxable, // Taxable portion of withdrawals
          initialGainRatio
        );

        // Calculate tax on each portion
        // TFSA: No tax
        const tfsaTax = 0;

        // Taxable: CGT only on the GAIN portion of the withdrawal
        // CGT = withdrawal × gainRatio × 40% inclusion × marginal rate
        const taxableTax = taxableWithdrawal * currentGainRatio * cgtRate;

        // RA: Full income tax at marginal rate
        const raTax = raWithdrawal * (marginalTaxRate / 100);

        // Total tax on withdrawal
        yearWithdrawalTax = tfsaTax + taxableTax + raTax;

        // Calculate effective withdrawal tax rate for this withdrawal
        const effectiveWithdrawalTaxRate = netNeeded > 0 ? yearWithdrawalTax / netNeeded : 0;

        // Gross withdrawal = net needed + tax (simpler formula than grossing up)
        const grossWithdrawal = netNeeded + yearWithdrawalTax;

        totalWithdrawalTax += yearWithdrawalTax;
        portfolioValue -= grossWithdrawal;
        totalWithdrawn += grossWithdrawal;
        yearWithdrawal = grossWithdrawal;
      } else {
        // Surplus income, add to portfolio
        portfolioValue += Math.abs(netNeeded);
      }

      // Calculate drawdown rate for this year (withdrawal as % of starting portfolio for year)
      const yearDrawdownRate = yearData.netWorth > 0 ? (yearWithdrawal / yearData.netWorth) * 100 : 0;

      // Update year data for post-retirement
      yearData.expenses = inflationAdjustedExpenses;
      yearData.income = netIncome;
      yearData.incomeTax = incomeTax;
      yearData.withdrawalTax = yearWithdrawalTax;
      yearData.totalTax = incomeTax + yearWithdrawalTax;
      yearData.coveredByIncome = incomeContribution;
      yearData.coveredByReturns = yearCoveredByReturns;
      yearData.capitalDrawdown = yearCapitalDrawdown;
      yearData.drawdownRate = yearDrawdownRate;
      yearData.withdrawal = yearWithdrawal;

      // Validate and push year data
      trajectory.push(validateYearData(yearData, age));

      // Grow remaining portfolio using weighted return + currency effect
      if (portfolioValue > 0) {
        const totalReturn = weightedReturn + currencyEffect;
        portfolioValue *= (1 + totalReturn / 100);

        // Deduct fees after growth
        const yearFees = calculateScenarioYearFees(portfolioValue, settings);
        portfolioValue -= yearFees.totalFees;
        totalFeesPaid += yearFees.totalFees;
        yearData.fees = yearFees.totalFees;
        yearData.feesBreakdown = yearFees;
      }
    }

    // Apply market crash if applicable
    const crash = marketCrashes.find(c => c.age === age);
    if (crash) {
      let crashLoss = 0;

      // New format: assetClassDrops with per-asset-class drop percentages
      if (crash.assetClassDrops && Object.keys(crash.assetClassDrops).length > 0) {
        Object.entries(crash.assetClassDrops).forEach(([assetClass, dropPercentage]) => {
          const assetClassWeight = assetClassPercentages[assetClass] || 0;
          crashLoss += portfolioValue * assetClassWeight * (dropPercentage / 100);
        });
      }
      // Legacy format: affectedAssetClasses with single dropPercentage
      else if (crash.affectedAssetClasses && crash.affectedAssetClasses.length > 0) {
        let affectedPercentage = 0;
        crash.affectedAssetClasses.forEach(assetClass => {
          affectedPercentage += assetClassPercentages[assetClass] || 0;
        });
        crashLoss = portfolioValue * affectedPercentage * (crash.dropPercentage / 100);
      }
      // Fallback: equities only with single dropPercentage
      else if (crash.dropPercentage) {
        const equityPercentage = (assetClassPercentages['Offshore Equity'] || 0) + (assetClassPercentages['SA Equity'] || 0);
        crashLoss = portfolioValue * equityPercentage * (crash.dropPercentage / 100);
      }

      portfolioValue -= crashLoss;
    }

    // Apply unexpected expense if applicable
    const unexpectedExpense = unexpectedExpenses.find(e => e.age === age);
    if (unexpectedExpense) {
      portfolioValue -= unexpectedExpense.amount;
    }

    // Validate portfolio value
    portfolioValue = validateNumber(portfolioValue, 0, `portfolioValue at age ${age}`);

    // Check for depletion
    if (portfolioValue < 0 && success) {
      success = false;
      depletionAge = age;
      portfolioValue = 0; // Can't go negative
    }

    } catch (yearError) {
      // Handle error for this specific year
      console.error(`Error calculating year at age ${age}:`, yearError);
      calculationErrors.push({ age, error: yearError.message });

      // Add a placeholder year data to keep trajectory consistent
      trajectory.push({
        age,
        netWorth: portfolioValue,
        isRetired: age >= retirementAge,
        expenses: 0,
        income: 0,
        error: true,
        errorMessage: yearError.message,
      });
    }
  }
  } catch (loopError) {
    // Handle error in the overall simulation
    console.error('Critical error in scenario simulation:', loopError);
    return {
      trajectory,
      success: false,
      depletionAge: null,
      finalValue: portfolioValue,
      shortfall: 0,
      totalWithdrawn,
      totalWithdrawalTax,
      totalIncome,
      totalExpenses,
      totalFeesPaid,
      expenseCoverageBreakdown: {
        byIncome: { amount: 0, percentage: 0 },
        byReturns: { amount: 0, percentage: 0 },
        byCapitalDrawdown: { amount: 0, percentage: 0 },
      },
      metrics: {},
      runAt: new Date().toISOString(),
      error: `Simulation failed: ${loopError.message}`,
      calculationErrors,
    };
  }

  // Final trajectory point
  const finalValue = portfolioValue;

  // Calculate expense coverage breakdown percentages
  const expenseCoverageBreakdown = totalExpenses > 0 ? {
    byIncome: {
      amount: totalCoveredByIncome,
      percentage: (totalCoveredByIncome / totalExpenses) * 100,
    },
    byReturns: {
      amount: totalCoveredByReturns,
      percentage: (totalCoveredByReturns / totalExpenses) * 100,
    },
    byCapitalDrawdown: {
      amount: totalCapitalDrawdown,
      percentage: (totalCapitalDrawdown / totalExpenses) * 100,
    },
  } : {
    byIncome: { amount: 0, percentage: 0 },
    byReturns: { amount: 0, percentage: 0 },
    byCapitalDrawdown: { amount: 0, percentage: 0 },
  };

  // Calculate average annual fees
  const yearsSimulated = lifeExpectancy - currentAge;
  const averageAnnualFees = yearsSimulated > 0 ? totalFeesPaid / yearsSimulated : 0;

  return {
    trajectory,
    success,
    depletionAge,
    finalValue,
    shortfall: success ? 0 : Math.abs(finalValue),
    totalWithdrawn,
    totalWithdrawalTax, // CGT on withdrawals
    totalIncome,
    totalExpenses,
    totalFeesPaid,
    expenseCoverageBreakdown,
    metrics: {
      nominalReturn: weightedReturn, // Weighted portfolio return
      realReturn,
      inflationRate,
      // Gain ratio-based CGT estimation (estimate note: based on current portfolio gain ratio)
      gainRatio: initialGainRatio * 100, // % of taxable portfolio that is gain
      cgtRate: cgtRate * 100, // CGT rate (40% inclusion × marginal rate)
      accountTypeWeights, // TFSA/Taxable/RA proportions
      equityPercentage: equityPercentage * 100,
      baseAnnualExpenses,
      startingPortfolio,
      retirementAge,
      lifeExpectancy,
      yearsInRetirement: lifeExpectancy - retirementAge,
      totalFeesPaid,
      averageAnnualFees,
      totalWithdrawalTax,
      assetClassPercentages, // Include for UI display
    },
    runAt: new Date().toISOString(),
    calculationVersion: CALCULATION_VERSION,
  };
};

/**
 * Calculate income for a specific age from all income sources
 * Returns annual income in today's money, split by taxable/non-taxable
 */
const calculateIncomeForAge = (age, incomeSources, exchangeRates) => {
  let taxableIncome = 0;
  let nonTaxableIncome = 0;

  (incomeSources || [])
    .filter(source => {
      const hasStarted = source.startAge === null || age >= source.startAge;
      const hasNotEnded = source.endAge === null || age <= source.endAge;
      return hasStarted && hasNotEnded;
    })
    .forEach(source => {
      const annualAmount = toZAR(source.monthlyAmount, source.currency, exchangeRates) * 12;
      if (source.isTaxable !== false) {
        taxableIncome += annualAmount;
      } else {
        nonTaxableIncome += annualAmount;
      }
    });

  return {
    taxable: taxableIncome,
    nonTaxable: nonTaxableIncome,
    total: taxableIncome + nonTaxableIncome,
  };
};

/**
 * Calculate retirement readiness summary
 *
 * IMPORTANT: All calculations are done in TODAY'S MONEY for clarity.
 * This makes the table directly comparable to the Portfolio Withdrawal Capacity section.
 * The 4% rule and withdrawal rates are designed to work with real (inflation-adjusted) returns,
 * so using today's money is mathematically correct.
 *
 * Features:
 * - 4 phases: Working Career, Active Retirement, Slower Pace, Later Years
 * - Income calculated per phase based on income source age brackets
 * - Shows ending portfolio for each phase
 */
export const calculateRetirementReadiness = (profile) => {
  const { assets, income, expenses, expenseCategories, ageBasedExpensePlan, settings } = profile || {};

  // Safety checks for missing data
  if (!settings || !settings.reportingCurrency || !settings.profile) {
    return {
      investibleAssets: 0,
      annualExpenses: 0,
      retirementIncome: 0,
      phases: [],
      yearByYear: [],
      isReady: false,
      gap: 0,
      surplus: 0,
      yearsToRetirement: 0,
      safeWithdrawal: 0,
      conservativeWithdrawal: 0,
      currentAge: 0,
      retirementAge: 65,
      lifeExpectancy: 95,
      inflationRate: 4.5,
      error: 'Missing required profile data',
    };
  }

  const exchangeRates = toLegacyExchangeRates(settings);
  const {
    age: currentAge,
    marginalTaxRate,
    retirementAge,
    lifeExpectancy,
    defaultCGT,
    expectedInflation,
    incomeGrowth,
  } = settings.profile || {};

  // Use user-configured settings with sensible defaults
  const inflationRate = expectedInflation ?? settings.inflation ?? 4.5;
  const incomeGrowthRate = (incomeGrowth ?? 5) / 100;

  // CGT calculation using gain ratio approach
  // CGT = withdrawal × gainRatio × 40% inclusion × marginal rate
  const cgtInclusionRate = 0.4; // 40% for individuals
  const cgtRateOnGain = cgtInclusionRate * ((marginalTaxRate || 39) / 100);

  // Get tax configuration - use settings or defaults
  const taxConfig = settings.taxConfig || DEFAULT_SETTINGS.taxConfig;

  // Use the new 4-phase lifePhases structure (now with 'working' key instead of 'workingCareer')
  const defaultLifePhases = {
    working: { name: 'Working', ageStart: currentAge || 55, ageEnd: 64, percentage: 100 },
    activeRetirement: { name: 'Active Retirement', ageStart: 65, ageEnd: 72, percentage: 100 },
    slowerPace: { name: 'Slower Pace', ageStart: 73, ageEnd: 80, percentage: 80 },
    laterYears: { name: 'Later Years', ageStart: 81, ageEnd: lifeExpectancy || 90, percentage: 60 },
  };
  const lifePhases = settings.lifePhases || defaultLifePhases;

  const withdrawalRates = settings.withdrawalRates || { conservative: 3, safe: 4, aggressive: 5 };

  // Get investible and non-investible assets (TODAY)
  const investibleAssets = calculateInvestibleAssets(assets || [], exchangeRates);
  const nonInvestibleAssets = calculateNonInvestibleAssets(assets || [], exchangeRates);

  // Calculate current expenses (in TODAY's money)
  let annualExpenses = 0;
  if (expenseCategories && expenseCategories.length > 0) {
    expenseCategories.forEach(category => {
      (category.subcategories || []).forEach(sub => {
        const currency = sub.currency || 'ZAR';
        // 'amount' field stores the value per frequency period
        const annualAmount = sub.frequency === 'Annual'
          ? (sub.amount || 0)
          : (sub.amount || 0) * 12;
        const annualAmountZAR = toZAR(annualAmount, currency, exchangeRates);
        annualExpenses += annualAmountZAR;
      });
    });
  } else if (expenses && expenses.length > 0) {
    const monthlyExpenses = expenses.reduce((sum, e) => {
      if (e.frequency === 'Monthly') return sum + e.amount;
      return sum + e.amount / 12;
    }, 0);
    annualExpenses = monthlyExpenses * 12;
  }

  // Check if age-based expense planning is enabled
  const useAgeBasedExpenses = ageBasedExpensePlan?.enabled && ageBasedExpensePlan?.phases?.length > 0;

  // Calculate dividend and interest income from assets (in TODAY's money)
  const dividendIncome = calculateDividendIncomeFromAssets(assets || [], exchangeRates);
  const interestIncome = calculateInterestIncomeFromAssets(assets || [], exchangeRates, marginalTaxRate || 39);
  const assetIncome = dividendIncome + interestIncome.net;

  // Years to retirement
  const yearsToRetirement = Math.max(0, (retirementAge || 65) - (currentAge || 55));

  // Calculate weighted average return from portfolio (net of TER)
  let weightedNominalReturn = 0;
  const expectedReturns = settings.expectedReturns || {};
  if (investibleAssets > 0 && assets && assets.length > 0) {
    assets.forEach(asset => {
      if (asset.assetType === 'Investible') {
        const assetValue = calculateAssetValue(asset, settings);
        const assetReturn = asset.expectedReturn ?? expectedReturns[asset.assetClass] ?? 10;
        const ter = asset.ter || 0;
        const netReturn = assetReturn - ter;
        weightedNominalReturn += (assetValue / investibleAssets) * netReturn;
      }
    });
  } else {
    // Fallback to offshore equity return if no assets
    weightedNominalReturn = expectedReturns['Offshore Equity'] || 10;
  }

  // Real return rate (nominal - inflation) for forward simulation
  const realReturn = (weightedNominalReturn - inflationRate) / 100;

  // Calculate portfolio gain ratio and account type weights for CGT estimation
  // CGT only applies to the gain portion of taxable account withdrawals
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const gainRatioData = calculateTaxablePortfolioGainRatio(assets || [], exchangeRates, reportingCurrency);
  const gainRatio = gainRatioData.gainRatio; // Proportion of taxable portfolio that is gain
  const accountTypeWeights = calculateAccountTypeWeights(assets || [], exchangeRates);

  // Calculate effective tax rate on withdrawals based on account mix and gain ratio
  // - TFSA: 0% tax
  // - Taxable: CGT only on gain portion = gainRatio × cgtRateOnGain
  // - RA: Full income tax at marginal rate
  // Note: This is an ESTIMATE. Actual CGT depends on which assets are sold.
  const effectiveTaxRateTaxable = gainRatio * cgtRateOnGain; // Tax rate on taxable portion
  const effectiveTaxRateRA = (marginalTaxRate || 39) / 100;  // Tax rate on RA portion
  const effectiveTaxRate =
    (accountTypeWeights.tfsa * 0) +
    (accountTypeWeights.taxable * effectiveTaxRateTaxable) +
    (accountTypeWeights.ra * effectiveTaxRateRA);

  // Build 4 phases from lifePhases (using new 'working' key)
  // Use explicit defaults per phase to ensure proper age ranges
  const phaseDefaults = {
    working: { name: 'Working', ageStart: currentAge || 55, ageEnd: (retirementAge || 65) - 1, percentage: 100 },
    activeRetirement: { name: 'Active Retirement', ageStart: retirementAge || 65, ageEnd: 72, percentage: 100 },
    slowerPace: { name: 'Slower Pace', ageStart: 73, ageEnd: 80, percentage: 80 },
    laterYears: { name: 'Later Years', ageStart: 81, ageEnd: lifeExpectancy || 90, percentage: 60 },
  };

  const phaseKeys = ['working', 'activeRetirement', 'slowerPace', 'laterYears'];
  const phaseConfigs = phaseKeys.map(key => {
    const defaults = phaseDefaults[key];
    const userPhase = lifePhases[key] || {};
    return {
      key,
      name: userPhase.name || defaults.name,
      ageStart: userPhase.ageStart ?? defaults.ageStart,
      ageEnd: userPhase.ageEnd ?? defaults.ageEnd,
      percentage: userPhase.percentage ?? defaults.percentage,
    };
  });

  // Helper to get expense percentage for an age from age-based plan
  const getAgeBasedExpensePercentage = (age) => {
    if (!useAgeBasedExpenses) return 100;
    const phase = ageBasedExpensePlan.phases.find(
      p => age >= p.startAge && age <= p.endAge
    );
    if (!phase || !phase.categoryExpenses) return 100;
    // Sum category expenses and compare to base
    const phaseTotal = Object.values(phase.categoryExpenses).reduce((sum, amt) => sum + (amt || 0), 0) * 12;
    return annualExpenses > 0 ? (phaseTotal / annualExpenses) * 100 : 100;
  };

  // Calculate phase data - everything in TODAY's money
  const phases = phaseConfigs.map((phase, index) => {
    // Duration of this phase
    const phaseYears = phase.ageEnd - phase.ageStart + 1;

    // Mid-point age for income calculation
    const midAge = Math.floor((phase.ageStart + phase.ageEnd) / 2);

    // Expenses in TODAY's money (adjusted by phase percentage)
    const expensesToday = annualExpenses * (phase.percentage / 100);

    // Income at mid-point of this phase (based on age brackets)
    const incomeBreakdown = calculateIncomeForAge(midAge, income, exchangeRates);
    const incomeFromSources = incomeBreakdown.total;

    // Asset income (dividends + interest) - constant in real terms
    const totalIncomeToday = incomeFromSources + assetIncome;

    // Is this a pre-retirement phase (Working)?
    const isPreRetirement = phase.key === 'working';

    // Net shortfall in TODAY's money (only applies post-retirement)
    const netShortfallToday = isPreRetirement
      ? 0  // During working years, assume income covers expenses + savings
      : Math.max(0, expensesToday - totalIncomeToday);

    // Calculate withdrawal tax using same method as runScenario:
    // Tax is calculated based on account type mix and gain ratio
    const phaseTfsaWithdrawal = netShortfallToday * accountTypeWeights.tfsa;
    const phaseTaxableWithdrawal = netShortfallToday * accountTypeWeights.taxable;
    const phaseRaWithdrawal = netShortfallToday * accountTypeWeights.ra;

    const phaseTfsaTax = 0;
    const phaseTaxableTax = phaseTaxableWithdrawal * gainRatio * cgtRateOnGain;
    const phaseRaTax = phaseRaWithdrawal * ((marginalTaxRate || 39) / 100);

    // Tax on withdrawal
    const withdrawalTax = phaseTfsaTax + phaseTaxableTax + phaseRaTax;

    // Gross withdrawal needed (pre-tax) in TODAY's money
    const grossWithdrawalToday = netShortfallToday + withdrawalTax;

    // Portfolio required for this phase using 4% rule (TODAY's money)
    const portfolioRequiredForPhase = grossWithdrawalToday > 0
      ? grossWithdrawalToday / (withdrawalRates.safe / 100)
      : 0;

    return {
      ...phase,
      phaseYears,
      isPreRetirement,
      // All amounts in TODAY's money
      expensesToday,
      incomeFromSources,
      assetIncome,
      incomeToday: totalIncomeToday,
      netShortfallToday,
      grossWithdrawalToday,
      withdrawalTax,
      portfolioRequiredForPhase,
      hasSurplus: totalIncomeToday >= expensesToday,
      effectiveTaxRate: effectiveTaxRate * 100,
    };
  });

  // Calculate cumulative portfolio requirements working backwards
  // Skip pre-retirement phases for portfolio requirement calculation
  const retirementPhases = phases.filter(p => !p.isPreRetirement);

  for (let i = retirementPhases.length - 1; i >= 0; i--) {
    const phase = retirementPhases[i];
    const phaseIndex = phases.findIndex(p => p.key === phase.key);

    if (i === retirementPhases.length - 1) {
      // Last phase: just need 4% rule amount
      phase.portfolioRequiredCumulative = phase.portfolioRequiredForPhase;
    } else {
      // Earlier phases: need to end with enough for next phase
      const nextPhase = retirementPhases[i + 1];
      const portfolioNeededAtEnd = nextPhase.portfolioRequiredCumulative;

      // Work backwards through this phase
      let portfolioNeededAtStart = portfolioNeededAtEnd;
      for (let year = phase.phaseYears - 1; year >= 0; year--) {
        portfolioNeededAtStart = (portfolioNeededAtStart + phase.grossWithdrawalToday) / (1 + realReturn);
      }

      // Take the maximum of: what we need to fund future phases vs 4% rule for this phase
      phase.portfolioRequiredCumulative = Math.max(
        phase.portfolioRequiredForPhase,
        portfolioNeededAtStart
      );
    }

    // Update the original phases array
    phases[phaseIndex].portfolioRequiredCumulative = phase.portfolioRequiredCumulative;

    // Theoretical withdrawal rate if we had exactly the required portfolio
    phases[phaseIndex].theoreticalWithdrawalRate = phase.portfolioRequiredCumulative > 0
      ? (phase.grossWithdrawalToday / phase.portfolioRequiredCumulative) * 100
      : 0;
  }

  // For working career phase, set portfolio required to what's needed at retirement start
  const workingPhase = phases.find(p => p.key === 'working');
  const firstRetirementPhase = phases.find(p => !p.isPreRetirement);
  if (workingPhase && firstRetirementPhase) {
    workingPhase.portfolioRequiredCumulative = firstRetirementPhase.portfolioRequiredCumulative;
    workingPhase.theoreticalWithdrawalRate = 0; // No withdrawals during working years
  }

  // Forward simulation to see actual status
  let simulatedPortfolio = investibleAssets;
  let previousPhaseDepleted = false;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    if (previousPhaseDepleted) {
      phase.projectedPortfolioAtStart = 0;
      phase.actualWithdrawalRate = 0;
      phase.willHaveEnough = false;
      phase.shortfallAtStart = phase.portfolioRequiredCumulative || 0;
      phase.projectedPortfolioAtEnd = 0;
      phase.wontReach = true;
      phase.status = 'wontReach';
      continue;
    }

    phase.projectedPortfolioAtStart = simulatedPortfolio;

    if (phase.isPreRetirement) {
      // Working career: portfolio grows, no withdrawals (assume savings + returns)
      // For simplicity, just grow at real return rate
      for (let year = 0; year < phase.phaseYears; year++) {
        simulatedPortfolio = simulatedPortfolio * (1 + realReturn);
      }
      phase.projectedPortfolioAtEnd = simulatedPortfolio;
      phase.actualWithdrawalRate = 0;
      phase.status = 'accumulating';
      phase.willHaveEnough = true;
    } else {
      // Retirement phase: withdrawals happen
      phase.actualWithdrawalRate = simulatedPortfolio > 0
        ? (phase.grossWithdrawalToday / simulatedPortfolio) * 100
        : 0;

      phase.willHaveEnough = simulatedPortfolio >= (phase.portfolioRequiredCumulative || 0);
      phase.shortfallAtStart = Math.max(0, (phase.portfolioRequiredCumulative || 0) - simulatedPortfolio);

      // Simulate through this phase
      let depletedDuringPhase = false;
      let depletionYear = 0;

      for (let year = 0; year < phase.phaseYears; year++) {
        simulatedPortfolio = simulatedPortfolio * (1 + realReturn) - phase.grossWithdrawalToday;

        if (simulatedPortfolio <= 0 && !depletedDuringPhase) {
          depletedDuringPhase = true;
          depletionYear = year + 1;
          simulatedPortfolio = 0;
        }
      }

      phase.projectedPortfolioAtEnd = Math.max(0, simulatedPortfolio);

      if (depletedDuringPhase) {
        phase.depleted = true;
        phase.depletionYear = depletionYear;
        phase.willHaveEnough = false;
        phase.status = 'depletes';
        previousPhaseDepleted = true;
      } else if (!phase.willHaveEnough) {
        phase.status = 'shortfall';
      } else {
        phase.status = 'ready';
      }
    }
  }

  // Overall readiness - do we have enough to fund first retirement phase?
  const totalRequiredToday = firstRetirementPhase?.portfolioRequiredCumulative || 0;
  const isReady = simulatedPortfolio >= totalRequiredToday || (workingPhase && workingPhase.projectedPortfolioAtEnd >= totalRequiredToday);
  const gap = totalRequiredToday - investibleAssets;

  // Withdrawal capacity (TODAY's money)
  const safeWithdrawal = investibleAssets * (withdrawalRates.safe / 100);
  const conservativeWithdrawal = investibleAssets * (withdrawalRates.conservative / 100);

  // Calculate total retirement income (for display)
  const retirementAge_ = retirementAge || 65;
  const retirementIncomeBreakdown = calculateIncomeForAge(retirementAge_, income, exchangeRates);
  const retirementIncomeFromSources = retirementIncomeBreakdown.total;
  const totalRetirementIncome = retirementIncomeFromSources + assetIncome;

  // Generate year-by-year projection (inflated values)
  const yearByYear = [];
  const currentAgeVal = currentAge || 55;
  const lifeExpectancyVal = lifeExpectancy || 90;

  let portfolioNominal = investibleAssets;
  let portfolioReal = investibleAssets; // For today's money table
  const nominalReturn = weightedNominalReturn / 100;

  for (let age = currentAgeVal; age <= lifeExpectancyVal; age++) {
    const yearsFromNow = age - currentAgeVal;
    const inflationFactor = Math.pow(1 + inflationRate / 100, yearsFromNow);
    const incomeInflationFactor = Math.pow(1 + incomeGrowthRate, yearsFromNow);

    // Find which phase this age belongs to
    const currentPhase = phases.find(p => age >= p.ageStart && age <= p.ageEnd);
    const phasePercentage = currentPhase?.percentage ?? 100;
    const phaseName = currentPhase?.name || 'Unknown';
    const isWorking = currentPhase?.isPreRetirement || false;

    // Get expense percentage from age-based plan if enabled
    let expensePercentageFromPlan = phasePercentage;
    if (useAgeBasedExpenses) {
      expensePercentageFromPlan = getAgeBasedExpensePercentage(age);
    }

    // Expenses (inflated)
    const expensesInflated = annualExpenses * (expensePercentageFromPlan / 100) * inflationFactor;
    const expensesToday = annualExpenses * (expensePercentageFromPlan / 100);

    // Income breakdown - split by taxable/non-taxable
    const incomeBreakdown = calculateIncomeForAge(age, income, exchangeRates);

    // Gross income from sources (before tax) - grows with income growth rate
    const grossIncomeFromSources = incomeBreakdown.total * incomeInflationFactor;
    const taxableIncomeInflated = incomeBreakdown.taxable * incomeInflationFactor;
    const nonTaxableIncomeInflated = incomeBreakdown.nonTaxable * incomeInflationFactor;

    // Income tax on taxable income (using tax tables if available)
    const incomeTax = calculateIncomeTax(taxableIncomeInflated, age, taxConfig, marginalTaxRate);

    // Net income from sources (after income tax)
    const netIncomeFromSources = grossIncomeFromSources - incomeTax;

    // Asset income grows with inflation (already net of withholding tax from calculateDividendIncomeFromAssets)
    const assetIncomeInflated = assetIncome * inflationFactor;

    // Total gross income (before income tax)
    const grossIncomeInflated = grossIncomeFromSources + assetIncomeInflated;

    // Total net income available to spend (after income tax)
    const netIncomeInflated = netIncomeFromSources + assetIncomeInflated;

    // Today's money values
    const grossIncomeToday = incomeBreakdown.total + assetIncome;
    const incomeTaxToday = calculateIncomeTax(incomeBreakdown.taxable, age, taxConfig, marginalTaxRate);
    const netIncomeToday = grossIncomeToday - incomeTaxToday;

    // Net shortfall needed (inflated) - expenses minus NET income (after tax)
    // Allow drawdown even during working years if expenses exceed income
    const netShortfall = Math.max(0, expensesInflated - netIncomeInflated);

    // Calculate withdrawal tax using same method as runScenario:
    // Tax is calculated based on account type mix and gain ratio
    // - TFSA portion: 0% tax
    // - Taxable portion: CGT only on gain portion (gainRatio × cgtRateOnGain)
    // - RA portion: Full income tax at marginal rate
    const tfsaWithdrawal = netShortfall * accountTypeWeights.tfsa;
    const taxableWithdrawal = netShortfall * accountTypeWeights.taxable;
    const raWithdrawal = netShortfall * accountTypeWeights.ra;

    const tfsaTax = 0;
    const taxableTax = taxableWithdrawal * gainRatio * cgtRateOnGain;
    const raTax = raWithdrawal * ((marginalTaxRate || 39) / 100);

    // CGT on the withdrawal (sum of all account type taxes)
    const cgtOnWithdrawal = tfsaTax + taxableTax + raTax;

    // Gross withdrawal = net needed + tax
    const drawdown = netShortfall + cgtOnWithdrawal;

    // Net withdrawal received (after CGT) - equals netShortfall
    const withdrawalNeeded = netShortfall;

    // Total tax paid (income tax + CGT)
    const totalTax = incomeTax + cgtOnWithdrawal;

    // Portfolio at start of year (before growth and drawdown)
    const portfolioStartOfYear = portfolioNominal;

    // Drawdown as percentage of portfolio (at start of year)
    const drawdownPercentage = portfolioStartOfYear > 0 ? (drawdown / portfolioStartOfYear) * 100 : 0;

    // Portfolio growth and drawdown
    const growthAmount = portfolioNominal * nominalReturn;
    portfolioNominal = portfolioNominal * (1 + nominalReturn) - drawdown;

    // Real portfolio (today's money) - grows at real return minus real drawdown
    const realDrawdown = drawdown / inflationFactor;
    const portfolioRealStart = portfolioReal;
    portfolioReal = portfolioReal * (1 + realReturn) - realDrawdown;

    // Real drawdown percentage (in today's money terms)
    const drawdownPercentageReal = portfolioRealStart > 0 ? (realDrawdown / portfolioRealStart) * 100 : 0;

    yearByYear.push({
      age,
      year: new Date().getFullYear() + yearsFromNow,
      phase: phaseName,
      expensePercentage: expensePercentageFromPlan,
      inflationFactor,
      // Inflated (nominal) values
      expensesInflated,
      grossIncomeInflated,      // Gross income before tax
      incomeTax,                // Income tax on taxable income
      netIncomeInflated,        // Net income after tax
      withdrawalNeeded,         // Net withdrawal received after CGT
      cgtOnWithdrawal,          // CGT on capital withdrawal
      totalTax,                 // Total tax (income tax + CGT)
      drawdown,                 // Gross withdrawal from portfolio
      drawdownPercentage,
      portfolioNominal: Math.max(0, portfolioNominal),
      // Today's money (real) values
      expensesToday,
      grossIncomeToday,
      incomeTaxToday,
      netIncomeToday,
      withdrawalToday: withdrawalNeeded / inflationFactor,
      cgtToday: cgtOnWithdrawal / inflationFactor,
      totalTaxToday: (incomeTax + cgtOnWithdrawal) / inflationFactor,
      drawdownToday: realDrawdown,
      drawdownPercentageReal,
      portfolioReal: Math.max(0, portfolioReal),
      // Status
      isWorking,
      portfolioExhausted: portfolioNominal <= 0,
    });

    if (portfolioNominal <= 0) {
      portfolioNominal = 0;
      portfolioReal = 0;
    }
  }

  return {
    investibleAssets,
    nonInvestibleAssets,
    annualExpenses,
    retirementIncome: retirementIncomeFromSources,
    assetIncome,
    totalRetirementIncome,
    dividendIncome,
    interestIncome: interestIncome.net,
    phases,
    yearByYear,
    useAgeBasedExpenses,
    isReady,
    gap: isReady ? 0 : Math.max(0, gap),
    surplus: isReady ? Math.max(0, -gap) : 0,
    yearsToRetirement,
    safeWithdrawal,
    conservativeWithdrawal,
    currentAge: currentAgeVal,
    retirementAge: retirementAge || 65,
    lifeExpectancy: lifeExpectancyVal,
    inflationRate,
    incomeGrowthRate: incomeGrowthRate * 100,
    realReturn: realReturn * 100,
    nominalReturn: weightedNominalReturn,
    // Tax estimation based on gain ratio (estimate note: based on current portfolio)
    effectiveTaxRate: effectiveTaxRate * 100,
    gainRatio: gainRatio * 100, // % of taxable portfolio that is gain
    cgtRateOnGain: cgtRateOnGain * 100, // CGT rate on gains (40% inclusion × marginal)
    accountTypeWeights, // TFSA/Taxable/RA proportions
    marginalTaxRate: marginalTaxRate || 39,
  };
};
