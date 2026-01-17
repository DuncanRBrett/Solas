// Tax Calculation Service
// Handles South African tax calculations using configurable tax tables

import { DEFAULT_SETTINGS } from '../models/defaults';

/**
 * Get the applicable tax rebate based on age
 * @param {number} age - Person's age
 * @param {object} taxRebates - Tax rebates config { primary, secondary, tertiary }
 * @returns {number} Total applicable rebate
 */
export function getTaxRebate(age, taxRebates = DEFAULT_SETTINGS.taxConfig.taxRebates) {
  let rebate = taxRebates.primary; // Everyone gets primary rebate

  if (age >= 65) {
    rebate += taxRebates.secondary; // Additional rebate for 65+
  }

  if (age >= 75) {
    rebate += taxRebates.tertiary; // Additional rebate for 75+
  }

  return rebate;
}

/**
 * Get the tax threshold (income below which no tax is payable) based on age
 * @param {number} age - Person's age
 * @param {object} taxThresholds - Tax thresholds config
 * @returns {number} Tax threshold amount
 */
export function getTaxThreshold(age, taxThresholds = DEFAULT_SETTINGS.taxConfig.taxThresholds) {
  if (age >= 75) {
    return taxThresholds.age75plus;
  } else if (age >= 65) {
    return taxThresholds.age65to74;
  }
  return taxThresholds.under65;
}

/**
 * Calculate income tax using progressive tax brackets
 * @param {number} taxableIncome - Annual taxable income
 * @param {number} age - Person's age (for rebates)
 * @param {object} taxConfig - Tax configuration from settings
 * @returns {object} { grossTax, rebate, netTax, effectiveRate, marginalRate }
 */
export function calculateIncomeTax(taxableIncome, age, taxConfig = DEFAULT_SETTINGS.taxConfig) {
  const { incomeTaxBrackets, taxRebates, taxThresholds } = taxConfig;

  // If income is below threshold, no tax payable
  const threshold = getTaxThreshold(age, taxThresholds);
  if (taxableIncome <= threshold) {
    return {
      grossTax: 0,
      rebate: 0,
      netTax: 0,
      effectiveRate: 0,
      marginalRate: 18, // Still in lowest bracket
    };
  }

  // Find the applicable tax bracket
  let grossTax = 0;
  let marginalRate = 18; // Default to lowest

  for (const bracket of incomeTaxBrackets) {
    if (taxableIncome >= bracket.min) {
      // Check if income falls in this bracket
      const maxInBracket = bracket.max === null ? Infinity : bracket.max;

      if (taxableIncome <= maxInBracket) {
        // Income falls within this bracket
        grossTax = bracket.baseAmount + ((taxableIncome - bracket.min + 1) * bracket.rate / 100);
        marginalRate = bracket.rate;
        break;
      }
    }
  }

  // Apply rebates
  const rebate = getTaxRebate(age, taxRebates);
  const netTax = Math.max(0, grossTax - rebate);

  // Calculate effective rate
  const effectiveRate = taxableIncome > 0 ? (netTax / taxableIncome) * 100 : 0;

  return {
    grossTax: Math.round(grossTax),
    rebate,
    netTax: Math.round(netTax),
    effectiveRate: Math.round(effectiveRate * 100) / 100, // Round to 2 decimals
    marginalRate,
  };
}

/**
 * Calculate the marginal tax rate for a given income level
 * @param {number} taxableIncome - Annual taxable income
 * @param {object} taxConfig - Tax configuration
 * @returns {number} Marginal tax rate as percentage
 */
export function getMarginalTaxRate(taxableIncome, taxConfig = DEFAULT_SETTINGS.taxConfig) {
  const { incomeTaxBrackets } = taxConfig;

  for (const bracket of incomeTaxBrackets) {
    const maxInBracket = bracket.max === null ? Infinity : bracket.max;
    if (taxableIncome >= bracket.min && taxableIncome <= maxInBracket) {
      return bracket.rate;
    }
  }

  // If above all brackets, return highest rate
  return incomeTaxBrackets[incomeTaxBrackets.length - 1].rate;
}

/**
 * Calculate Capital Gains Tax
 * @param {number} capitalGain - The capital gain amount
 * @param {number} age - Person's age
 * @param {object} taxConfig - Tax configuration
 * @param {number} existingTaxableIncome - Existing taxable income (affects marginal rate)
 * @returns {object} { inclusionAmount, taxableGain, cgtPayable, effectiveCGTRate }
 */
export function calculateCGT(capitalGain, age, taxConfig = DEFAULT_SETTINGS.taxConfig, existingTaxableIncome = 0) {
  const { cgt } = taxConfig;

  if (capitalGain <= 0) {
    return {
      inclusionAmount: 0,
      taxableGain: 0,
      cgtPayable: 0,
      effectiveCGTRate: 0,
    };
  }

  // Apply annual exclusion
  const taxableGain = Math.max(0, capitalGain - cgt.annualExclusion);

  // Calculate inclusion amount (40% for individuals)
  const inclusionAmount = taxableGain * (cgt.inclusionRate / 100);

  // Get marginal rate at the total income level
  const totalTaxableIncome = existingTaxableIncome + inclusionAmount;
  const marginalRate = getMarginalTaxRate(totalTaxableIncome, taxConfig);

  // CGT payable = inclusion amount * marginal rate
  const cgtPayable = inclusionAmount * (marginalRate / 100);

  // Effective CGT rate on the original gain
  const effectiveCGTRate = capitalGain > 0 ? (cgtPayable / capitalGain) * 100 : 0;

  return {
    inclusionAmount: Math.round(inclusionAmount),
    taxableGain: Math.round(taxableGain),
    cgtPayable: Math.round(cgtPayable),
    effectiveCGTRate: Math.round(effectiveCGTRate * 100) / 100,
  };
}

/**
 * Calculate tax on dividend income (after withholding)
 * @param {number} grossDividends - Gross dividend amount before withholding
 * @param {object} taxConfig - Tax configuration
 * @returns {object} { withholdingTax, netDividends }
 */
export function calculateDividendTax(grossDividends, taxConfig = DEFAULT_SETTINGS.taxConfig) {
  const withholdingRate = taxConfig.dividendWithholdingTax;
  const withholdingTax = grossDividends * (withholdingRate / 100);

  return {
    withholdingTax: Math.round(withholdingTax),
    netDividends: Math.round(grossDividends - withholdingTax),
  };
}

/**
 * Calculate tax on interest income
 * @param {number} interestIncome - Annual interest income
 * @param {number} age - Person's age
 * @param {number} existingTaxableIncome - Other taxable income
 * @param {object} taxConfig - Tax configuration
 * @returns {object} { exemption, taxableInterest, taxOnInterest }
 */
export function calculateInterestTax(interestIncome, age, existingTaxableIncome = 0, taxConfig = DEFAULT_SETTINGS.taxConfig) {
  const exemption = age >= 65
    ? taxConfig.interestExemption.age65plus
    : taxConfig.interestExemption.under65;

  const taxableInterest = Math.max(0, interestIncome - exemption);

  if (taxableInterest <= 0) {
    return {
      exemption,
      taxableInterest: 0,
      taxOnInterest: 0,
    };
  }

  // Interest is taxed at marginal rate as part of income
  const marginalRate = getMarginalTaxRate(existingTaxableIncome + taxableInterest, taxConfig);
  const taxOnInterest = taxableInterest * (marginalRate / 100);

  return {
    exemption,
    taxableInterest: Math.round(taxableInterest),
    taxOnInterest: Math.round(taxOnInterest),
  };
}

/**
 * Calculate the effective withdrawal tax rate for retirement scenarios
 * This considers the mix of account types (TFSA, RA, Taxable) and their tax treatment
 *
 * @param {number} withdrawalAmount - Amount being withdrawn
 * @param {number} age - Person's age at withdrawal
 * @param {object} accountMix - { tfsa: %, ra: %, taxable: % } percentages
 * @param {number} otherIncome - Other taxable income in the year
 * @param {object} taxConfig - Tax configuration
 * @returns {object} { effectiveRate, breakdown }
 */
export function calculateWithdrawalTax(withdrawalAmount, age, accountMix, otherIncome = 0, taxConfig = DEFAULT_SETTINGS.taxConfig) {
  const breakdown = {
    tfsa: { amount: 0, tax: 0, rate: 0 },
    ra: { amount: 0, tax: 0, rate: 0 },
    taxable: { amount: 0, tax: 0, rate: 0 },
  };

  // TFSA withdrawals - tax free
  if (accountMix.tfsa > 0) {
    breakdown.tfsa.amount = withdrawalAmount * (accountMix.tfsa / 100);
    breakdown.tfsa.tax = 0;
    breakdown.tfsa.rate = 0;
  }

  // RA withdrawals - taxed as income (lump sum tables apply, but simplified here)
  if (accountMix.ra > 0) {
    breakdown.ra.amount = withdrawalAmount * (accountMix.ra / 100);
    // RA withdrawals after 55 get tax-free portion of R550k (simplified)
    // For ongoing withdrawals, treat as income at marginal rate
    const raIncomeTax = calculateIncomeTax(otherIncome + breakdown.ra.amount, age, taxConfig);
    const baseIncomeTax = calculateIncomeTax(otherIncome, age, taxConfig);
    breakdown.ra.tax = raIncomeTax.netTax - baseIncomeTax.netTax;
    breakdown.ra.rate = breakdown.ra.amount > 0 ? (breakdown.ra.tax / breakdown.ra.amount) * 100 : 0;
  }

  // Taxable account withdrawals - subject to CGT
  if (accountMix.taxable > 0) {
    breakdown.taxable.amount = withdrawalAmount * (accountMix.taxable / 100);
    // Assume average 50% of withdrawal is gain (rest is cost base)
    // This is a simplification - actual gain depends on cost base
    const assumedGainRatio = 0.5;
    const capitalGain = breakdown.taxable.amount * assumedGainRatio;
    const cgtResult = calculateCGT(capitalGain, age, taxConfig, otherIncome);
    breakdown.taxable.tax = cgtResult.cgtPayable;
    breakdown.taxable.rate = breakdown.taxable.amount > 0 ? (breakdown.taxable.tax / breakdown.taxable.amount) * 100 : 0;
  }

  // Calculate total effective rate
  const totalTax = breakdown.tfsa.tax + breakdown.ra.tax + breakdown.taxable.tax;
  const effectiveRate = withdrawalAmount > 0 ? (totalTax / withdrawalAmount) * 100 : 0;

  return {
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    totalTax: Math.round(totalTax),
    breakdown,
  };
}

/**
 * Get a summary of tax calculations for display
 * @param {number} annualIncome - Annual taxable income
 * @param {number} age - Person's age
 * @param {object} taxConfig - Tax configuration
 * @returns {object} Summary with all tax details
 */
export function getTaxSummary(annualIncome, age, taxConfig = DEFAULT_SETTINGS.taxConfig) {
  const incomeTax = calculateIncomeTax(annualIncome, age, taxConfig);
  const threshold = getTaxThreshold(age, taxConfig.taxThresholds);

  return {
    taxYear: taxConfig.taxYear,
    annualIncome,
    age,
    threshold,
    belowThreshold: annualIncome <= threshold,
    ...incomeTax,
    monthlyTax: Math.round(incomeTax.netTax / 12),
    takeHomePay: annualIncome - incomeTax.netTax,
    monthlyTakeHome: Math.round((annualIncome - incomeTax.netTax) / 12),
  };
}
