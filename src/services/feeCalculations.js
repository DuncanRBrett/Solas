/**
 * Fee Calculations Service
 *
 * Calculates platform fees, advisor fees, and lifetime fee projections
 * for portfolio management.
 */

import { calculateAssetValue, getExchangeRates, toReportingCurrency } from '../utils/calculations';

/**
 * Calculate platform fees for an asset based on platform fee structure
 * @param {Object} asset - The asset
 * @param {Object} platform - Platform configuration from settings
 * @param {Object} settings - Profile settings
 * @returns {number} Annual fee in reporting currency
 */
export function calculateAssetPlatformFee(asset, platform, settings) {
  if (!platform || !platform.feeStructure) {
    return 0;
  }

  const assetValue = calculateAssetValue(asset, settings);
  const feeStructure = platform.feeStructure;

  switch (feeStructure.type) {
    case 'percentage':
      // Simple percentage fee
      return assetValue * (feeStructure.rate / 100);

    case 'tiered-percentage': {
      // Tiered percentage (e.g., 0.5% on first R500k, 0.35% on next R1.5M, etc.)
      let fee = 0;
      let remaining = assetValue;

      for (const tier of feeStructure.tiers) {
        const tierAmount = Math.min(remaining, tier.upTo);
        fee += tierAmount * (tier.rate / 100);
        remaining -= tierAmount;

        if (remaining <= 0) break;
      }

      return fee;
    }

    case 'fixed':
      // Fixed fee (convert to annual based on frequency)
      const exchangeRates = getExchangeRates(settings);
      const reportingCurrency = settings.reportingCurrency || 'ZAR';
      const feeAmount = feeStructure.amount || 0;
      const currency = feeStructure.currency || reportingCurrency;
      const frequency = feeStructure.frequency || 'monthly';

      // Convert to annual based on frequency
      let annualFee;
      switch (frequency) {
        case 'quarterly':
          annualFee = feeAmount * 4;
          break;
        case 'annual':
          annualFee = feeAmount;
          break;
        case 'monthly':
        default:
          annualFee = feeAmount * 12;
          break;
      }

      return toReportingCurrency(
        annualFee,
        currency,
        reportingCurrency,
        exchangeRates
      );

    default:
      return 0;
  }
}

/**
 * Calculate total platform fees for all assets
 * @param {Array} assets - All assets
 * @param {Object} settings - Profile settings
 * @returns {Object} Platform fees breakdown
 */
export function calculatePlatformFees(assets, settings) {
  const platforms = settings.platforms || [];
  const platformFees = {};
  let totalFee = 0;

  assets.forEach(asset => {
    // Skip non-investible assets
    if (asset.assetType !== 'Investible') {
      return;
    }

    const platformId = asset.platform;
    if (!platformId) {
      return; // No platform assigned
    }

    const platform = platforms.find(p => p.id === platformId);
    if (!platform) {
      return; // Platform not found
    }

    const fee = calculateAssetPlatformFee(asset, platform, settings);

    if (!platformFees[platformId]) {
      platformFees[platformId] = {
        platformName: platform.name,
        platformId,
        fee: 0,
        assetCount: 0,
        assets: [],
      };
    }

    platformFees[platformId].fee += fee;
    platformFees[platformId].assetCount += 1;
    platformFees[platformId].assets.push({
      assetId: asset.id,
      assetName: asset.name,
      fee,
    });

    totalFee += fee;
  });

  return {
    byPlatform: Object.values(platformFees),
    total: totalFee,
  };
}

/**
 * Calculate advisor fees based on configuration
 * @param {Array} assets - All assets
 * @param {Object} settings - Profile settings
 * @returns {Object} Advisor fee breakdown
 */
export function calculateAdvisorFees(assets, settings) {
  const advisorFee = settings.advisorFee;

  if (!advisorFee || !advisorFee.enabled) {
    return {
      total: 0,
      rate: 0,
      appliedToValue: 0,
      assetCount: 0,
    };
  }

  let totalValue = 0;
  let assetCount = 0;

  assets.forEach(asset => {
    // Skip non-investible assets
    if (asset.assetType !== 'Investible') {
      return;
    }

    // Check if asset is excluded from advisor fee
    if (asset.excludeFromAdvisorFee) {
      return;
    }

    const assetValue = calculateAssetValue(asset, settings);
    totalValue += assetValue;
    assetCount += 1;
  });

  let fee = 0;

  if (advisorFee.type === 'percentage') {
    fee = totalValue * (advisorFee.amount / 100);
  } else if (advisorFee.type === 'fixed') {
    // Fixed annual fee
    const exchangeRates = getExchangeRates(settings);
    const reportingCurrency = settings.reportingCurrency || 'ZAR';
    const currency = advisorFee.currency || reportingCurrency;

    fee = toReportingCurrency(
      advisorFee.amount,
      currency,
      reportingCurrency,
      exchangeRates
    );
  }

  return {
    total: fee,
    rate: advisorFee.type === 'percentage' ? advisorFee.amount : null,
    appliedToValue: totalValue,
    assetCount,
  };
}

/**
 * Calculate TER (Total Expense Ratio) impact
 * Note: TER is already baked into unit prices, so this is informational only
 * @param {Array} assets - All assets
 * @param {Object} settings - Profile settings
 * @returns {Object} TER breakdown
 */
export function calculateTERImpact(assets, settings) {
  let totalValue = 0;
  let weightedTER = 0;

  assets.forEach(asset => {
    if (asset.assetType !== 'Investible') {
      return;
    }

    const assetValue = calculateAssetValue(asset, settings);
    const ter = asset.ter || 0;

    totalValue += assetValue;
    weightedTER += assetValue * (ter / 100);
  });

  const averageTER = totalValue > 0 ? (weightedTER / totalValue) * 100 : 0;
  const annualImpact = weightedTER;

  return {
    averageTER,
    annualImpact,
    totalValue,
    note: 'TER is already reflected in unit prices. This is an estimate of the annual drag on returns.',
  };
}

/**
 * Calculate total annual fees
 * @param {Array} assets - All assets
 * @param {Object} settings - Profile settings
 * @returns {Object} Complete fee breakdown
 */
export function calculateTotalAnnualFees(assets, settings) {
  const platformFees = calculatePlatformFees(assets, settings);
  const advisorFees = calculateAdvisorFees(assets, settings);
  const terImpact = calculateTERImpact(assets, settings);

  const totalExplicitFees = platformFees.total + advisorFees.total;
  const totalWithTER = totalExplicitFees + terImpact.annualImpact;

  return {
    platformFees,
    advisorFees,
    terImpact,
    totalExplicitFees,     // Platform + Advisor (what you actually pay)
    totalWithTER,          // Including TER (total drag on portfolio)
  };
}

/**
 * Calculate lifetime fee projection with inflation adjustment
 * @param {Array} assets - All assets
 * @param {Object} settings - Profile settings
 * @param {number} years - Number of years to project
 * @param {number} inflationRate - Annual inflation rate (e.g., 5.0 for 5%)
 * @param {number} portfolioGrowthRate - Expected portfolio growth rate (e.g., 9.0 for 9%)
 * @returns {Object} Lifetime fee projection
 */
export function calculateLifetimeFees(assets, settings, years = 30, inflationRate = 5.0, portfolioGrowthRate = 9.0) {
  const currentFees = calculateTotalAnnualFees(assets, settings);

  // Calculate current investible asset value
  let currentPortfolioValue = 0;
  assets.forEach(asset => {
    if (asset.assetType === 'Investible') {
      currentPortfolioValue += calculateAssetValue(asset, settings);
    }
  });

  // Project fees year by year
  const yearlyProjection = [];
  let cumulativeFeesNominal = 0;
  let cumulativeFeesRealValue = 0; // Present value of fees
  let portfolioValue = currentPortfolioValue;
  let portfolioWithoutFees = currentPortfolioValue; // Track portfolio if no fees were charged

  for (let year = 1; year <= years; year++) {
    // Grow both portfolios
    portfolioValue = portfolioValue * (1 + portfolioGrowthRate / 100);
    portfolioWithoutFees = portfolioWithoutFees * (1 + portfolioGrowthRate / 100);

    // Calculate fees as percentage of portfolio
    const platformFeeRate = currentFees.platformFees.total / currentPortfolioValue;
    const advisorFeeRate = currentFees.advisorFees.total / currentPortfolioValue;
    const terRate = currentFees.terImpact.annualImpact / currentPortfolioValue;

    const yearPlatformFee = portfolioValue * platformFeeRate;
    const yearAdvisorFee = portfolioValue * advisorFeeRate;
    const yearTERFee = portfolioValue * terRate;
    const yearTotalFee = yearPlatformFee + yearAdvisorFee + yearTERFee;

    // Deduct fees from portfolio (but not from portfolioWithoutFees)
    portfolioValue -= yearTotalFee;

    // Accumulate fees
    cumulativeFeesNominal += yearTotalFee;

    // Calculate present value of this year's fees
    const discountFactor = Math.pow(1 + inflationRate / 100, -year);
    const presentValue = yearTotalFee * discountFactor;
    cumulativeFeesRealValue += presentValue;

    yearlyProjection.push({
      year,
      portfolioValue,
      portfolioWithoutFees,
      annualFee: yearTotalFee,
      annualFeeRealValue: presentValue, // Fee in today's money
      cumulativeFees: cumulativeFeesNominal,
      cumulativeFeesRealValue, // Total fees in today's money
      presentValueOfFees: presentValue,
    });
  }

  // Calculate current effective fee rate (as % of portfolio)
  const currentExplicitFeeRate = currentPortfolioValue > 0
    ? ((currentFees.platformFees.total + currentFees.advisorFees.total) / currentPortfolioValue) * 100
    : 0;

  // Calculate "what if" scenarios - reducing the fee RATE by specific amounts
  // E.g., if current rate is 1.5%, "reduce by 0.25%" means new rate = 1.25%
  const reducedFeeScenarios = {};

  [0.25, 0.50, 0.75, 1.0].forEach(rateReduction => {
    // Only show scenarios that result in a non-negative fee rate
    const newFeeRate = currentExplicitFeeRate - rateReduction;
    if (newFeeRate < 0) return;

    let altPortfolioValue = currentPortfolioValue;
    let altCumulativeFees = 0;

    for (let year = 1; year <= years; year++) {
      altPortfolioValue = altPortfolioValue * (1 + portfolioGrowthRate / 100);

      // Use the reduced fee rate
      const yearTotalFee = altPortfolioValue * (newFeeRate / 100);
      altPortfolioValue -= yearTotalFee;
      altCumulativeFees += yearTotalFee;
    }

    reducedFeeScenarios[`reduce${rateReduction}pct`] = {
      rateReduction,                // The reduction in fee RATE (e.g., 0.25%)
      currentRate: currentExplicitFeeRate,
      newRate: newFeeRate,
      finalPortfolioValue: altPortfolioValue,
      cumulativeFees: altCumulativeFees,
      savingsVsBaseline: cumulativeFeesNominal - altCumulativeFees,
      extraPortfolioValue: altPortfolioValue - portfolioValue,
    };
  });

  // Calculate fee drag (difference between with and without fees)
  const feeDrag = portfolioWithoutFees - portfolioValue;

  return {
    currentAnnualFees: currentFees.totalWithTER,
    currentExplicitFees: currentFees.totalExplicitFees, // Platform + Advisor only (what you pay)
    currentExplicitFeeRate,  // Effective fee rate as % of portfolio
    currentPortfolioValue,
    projectionYears: years,
    inflationRate,
    portfolioGrowthRate,
    cumulativeFeesNominal,
    cumulativeFeesRealValue,
    finalPortfolioValue: portfolioValue,
    finalPortfolioWithoutFees: portfolioWithoutFees,
    feeDrag, // Money "lost" to fees over the period
    yearlyProjection,
    reducedFeeScenarios,
    summary: {
      averageAnnualFee: cumulativeFeesNominal / years,
      averageAnnualFeeRealValue: cumulativeFeesRealValue / years,
      feesAsPercentOfFinalPortfolio: portfolioValue > 0 ? (cumulativeFeesNominal / portfolioValue) * 100 : 0,
      portfolioWithoutFees: portfolioWithoutFees,
    },
  };
}

/**
 * Get fee optimization recommendations
 * @param {Object} feeData - Output from calculateTotalAnnualFees
 * @param {Object} lifetimeFees - Output from calculateLifetimeFees
 * @returns {Array} List of recommendations
 */
export function getFeeOptimizationRecommendations(feeData, lifetimeFees) {
  const recommendations = [];

  // High total fees
  if (feeData.totalWithTER > 100000) {
    recommendations.push({
      priority: 'high',
      title: 'High total fees detected',
      description: `Your annual fees are ${(feeData.totalWithTER).toFixed(0)}. Over ${lifetimeFees.projectionYears} years, this amounts to ${(lifetimeFees.cumulativeFeesNominal).toFixed(0)} in fees.`,
      action: 'Review platform and advisor fees for potential savings.',
    });
  }

  // High advisor fee
  if (feeData.advisorFees.rate && feeData.advisorFees.rate > 1.0) {
    recommendations.push({
      priority: 'medium',
      title: 'Advisor fee above 1%',
      description: `Your advisor charges ${feeData.advisorFees.rate}% annually. Industry average is 0.5-1.0%.`,
      action: 'Consider negotiating a lower rate or exploring robo-advisors.',
    });
  }

  // High TER
  if (feeData.terImpact.averageTER > 1.0) {
    recommendations.push({
      priority: 'medium',
      title: 'High average TER',
      description: `Your average TER is ${feeData.terImpact.averageTER.toFixed(2)}%. Passive index funds typically have TERs below 0.5%.`,
      action: 'Consider switching to lower-cost index funds or ETFs.',
    });
  }

  // Fee reduction impact
  const halfPercentReduction = lifetimeFees.reducedFeeScenarios.reduce50pct;
  if (halfPercentReduction && halfPercentReduction.savingsVsBaseline > 500000) {
    recommendations.push({
      priority: 'high',
      title: 'Significant savings opportunity',
      description: `Reducing fees by just 0.5% could save you ${(halfPercentReduction.savingsVsBaseline).toFixed(0)} over ${lifetimeFees.projectionYears} years.`,
      action: 'Explore lower-cost alternatives for high-fee holdings.',
    });
  }

  return recommendations;
}

/**
 * Calculate fees for a given portfolio value (for use in scenario projections)
 * Does NOT include TER as it's already baked into prices
 * @param {number} portfolioValue - Current portfolio value in reporting currency
 * @param {Object} settings - Profile settings
 * @returns {Object} Fee breakdown for this year
 */
export function calculateScenarioYearFees(portfolioValue, settings) {
  if (!portfolioValue || portfolioValue <= 0) {
    return {
      platformFees: 0,
      platformFeeRate: 0,
      fixedPlatformFees: 0,
      advisorFee: 0,
      totalFees: 0,
    };
  }

  const platforms = settings.platforms || [];
  const advisorFee = settings.advisorFee;
  const exchangeRates = getExchangeRates(settings);
  const reportingCurrency = settings.reportingCurrency || 'ZAR';

  // Calculate platform fees
  // For percentage-based fees, we calculate based on portfolio value
  // For fixed fees, we use the fixed amount
  let percentageBasedFees = 0;
  let fixedPlatformFees = 0;

  platforms.forEach(platform => {
    const fs = platform.feeStructure;
    if (!fs) return;

    switch (fs.type) {
      case 'percentage':
        // Simple percentage of portfolio (approximate - assumes even distribution)
        percentageBasedFees += portfolioValue * (fs.rate / 100);
        break;

      case 'tiered-percentage': {
        // For scenario projections, use a weighted average approximation
        // This assumes portfolio is distributed across tiers
        if (fs.tiers && fs.tiers.length > 0) {
          let fee = 0;
          let remaining = portfolioValue;

          for (const tier of fs.tiers) {
            const prevLimit = fs.tiers.indexOf(tier) > 0
              ? fs.tiers[fs.tiers.indexOf(tier) - 1].upTo
              : 0;
            const tierAmount = Math.min(remaining, tier.upTo - prevLimit);
            fee += tierAmount * (tier.rate / 100);
            remaining -= tierAmount;

            if (remaining <= 0) break;
          }

          percentageBasedFees += fee;
        }
        break;
      }

      case 'fixed': {
        const frequency = fs.frequency || 'monthly';
        let annual = fs.amount || 0;

        // Convert to annual based on frequency
        if (frequency === 'monthly') annual *= 12;
        else if (frequency === 'quarterly') annual *= 4;
        // 'annual' stays as is

        fixedPlatformFees += toReportingCurrency(
          annual,
          fs.currency || reportingCurrency,
          reportingCurrency,
          exchangeRates
        );
        break;
      }
    }
  });

  const totalPlatformFees = percentageBasedFees + fixedPlatformFees;

  // Calculate advisor fee
  let advisorFeeAmount = 0;
  if (advisorFee && advisorFee.enabled) {
    if (advisorFee.type === 'percentage') {
      advisorFeeAmount = portfolioValue * (advisorFee.amount / 100);
    } else if (advisorFee.type === 'fixed') {
      advisorFeeAmount = toReportingCurrency(
        advisorFee.amount,
        advisorFee.currency || reportingCurrency,
        reportingCurrency,
        exchangeRates
      );
    }
  }

  const totalFees = totalPlatformFees + advisorFeeAmount;

  // Cap fees at portfolio value to prevent negative portfolios from fees alone
  const cappedTotalFees = Math.min(totalFees, portfolioValue);

  return {
    platformFees: totalPlatformFees,
    platformFeeRate: portfolioValue > 0 ? (percentageBasedFees / portfolioValue) * 100 : 0,
    fixedPlatformFees,
    advisorFee: advisorFeeAmount,
    totalFees: cappedTotalFees,
    uncappedTotalFees: totalFees,
    wasCapped: cappedTotalFees < totalFees,
  };
}

export default {
  calculateAssetPlatformFee,
  calculatePlatformFees,
  calculateAdvisorFees,
  calculateTERImpact,
  calculateTotalAnnualFees,
  calculateLifetimeFees,
  getFeeOptimizationRecommendations,
  calculateScenarioYearFees,
};
