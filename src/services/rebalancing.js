// Tax-aware rebalancing recommendations for Solas v3
// Generates rebalancing advice while considering capital gains tax impact

import {
  calculateAssetValueZAR,
  calculateCostBasisZAR,
  calculateCGT,
  calculateGrossAssets,
  formatCurrency,
} from '../utils/calculations';
import { ASSET_CLASSES } from '../models/defaults';

/**
 * Generate tax-aware rebalancing recommendations
 *
 * @param {Array} assets - All assets
 * @param {object} settings - Settings with targetAllocation, thresholds, profile
 * @returns {Array} Sorted array of recommendations
 */
export const generateRebalancingAdvice = (assets, settings) => {
  const exchangeRates = settings.currency?.exchangeRates || {};
  const { targetAllocation, thresholds, profile } = settings;
  const marginalTaxRate = profile?.marginalTaxRate || 39;
  const driftThreshold = thresholds?.rebalancingDrift || 5;

  const investibleAssets = assets.filter((a) => a.assetType === 'Investible');
  const total = calculateGrossAssets(investibleAssets, exchangeRates);

  if (total === 0) return [];

  // Calculate current allocation by asset class
  const currentAllocation = {};
  const assetsByClass = {};

  investibleAssets.forEach((asset) => {
    const value = calculateAssetValueZAR(asset, exchangeRates);
    const cls = asset.assetClass;
    currentAllocation[cls] = (currentAllocation[cls] || 0) + value;
    assetsByClass[cls] = assetsByClass[cls] || [];
    assetsByClass[cls].push(asset);
  });

  const recommendations = [];

  // Check each asset class against target
  ASSET_CLASSES.forEach((assetClass) => {
    const targetPct = targetAllocation?.[assetClass] || 0;
    const currentValue = currentAllocation[assetClass] || 0;
    const currentPct = (currentValue / total) * 100;
    const drift = currentPct - targetPct;

    if (Math.abs(drift) > driftThreshold) {
      const targetValue = (targetPct / 100) * total;
      const amountToAdjust = Math.abs(targetValue - currentValue);
      const action = drift > 0 ? 'sell' : 'buy';

      const recommendation = {
        assetClass,
        action,
        currentPct: Math.round(currentPct * 10) / 10,
        targetPct,
        driftPct: Math.round(drift * 10) / 10,
        currentValue,
        targetValue,
        amountToAdjust,
        severity: Math.abs(drift) > driftThreshold * 2 ? 'high' : 'medium',
        sellDetails: [],
        totalCGT: 0,
      };

      // For sells, determine which specific assets to sell (tax + concentration optimized)
      if (action === 'sell') {
        const assetsInClass = assetsByClass[assetClass] || [];
        const sellDetails = rankAssetsByTaxEfficiency(
          assetsInClass,
          amountToAdjust,
          marginalTaxRate,
          exchangeRates,
          total // Pass total portfolio value for concentration calculation
        );
        recommendation.sellDetails = sellDetails;
        recommendation.totalCGT = sellDetails.reduce((sum, d) => sum + d.proportionalCGT, 0);
      }

      recommendations.push(recommendation);
    }
  });

  // Sort by severity (high first), then by absolute drift
  return recommendations.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'high' ? -1 : 1;
    }
    return Math.abs(b.driftPct) - Math.abs(a.driftPct);
  });
};

/**
 * Rank assets by tax efficiency AND concentration for selling
 * Priority considers both:
 * - Tax efficiency: Losses > TFSA > Low gains > High gains > RA
 * - Concentration: High-concentration assets get bonus to sell first
 *
 * @param {Array} assets - Assets in the class to potentially sell
 * @param {number} targetAmount - Amount to sell in reporting currency
 * @param {number} marginalTaxRate - User's marginal tax rate (%)
 * @param {object} exchangeRates - Exchange rates
 * @param {number} totalPortfolioValue - Total portfolio value for concentration calc
 * @returns {Array} Ordered list of sell recommendations with CGT impact
 */
export const rankAssetsByTaxEfficiency = (assets, targetAmount, marginalTaxRate, exchangeRates, totalPortfolioValue = 0) => {
  const assetDetails = assets.map((asset) => {
    const currentValue = calculateAssetValueZAR(asset, exchangeRates);
    const costBasis = calculateCostBasisZAR(asset, exchangeRates);
    const unrealizedGain = currentValue - costBasis;
    const gainPct = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

    // Calculate concentration percentage of total portfolio
    const concentrationPct = totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;

    // Calculate CGT if entire position sold
    let estimatedCGT = 0;
    if (asset.accountType === 'Taxable' && unrealizedGain > 0) {
      estimatedCGT = calculateCGT(unrealizedGain, marginalTaxRate);
    }
    // TFSA: no CGT
    // RA: complex withdrawal rules - flag to avoid

    // Tax efficiency score: higher = better to sell first
    let taxEfficiencyScore;
    let taxNote = '';

    if (unrealizedGain < 0) {
      // Losses: very high score (tax loss harvesting)
      taxEfficiencyScore = 100 + Math.min(Math.abs(gainPct), 50);
      taxNote = 'Tax loss harvesting opportunity';
    } else if (asset.accountType === 'RA') {
      // RA: lowest score (avoid early withdrawal - penalties apply)
      taxEfficiencyScore = 10;
      taxNote = 'Avoid (RA withdrawal penalties)';
    } else if (asset.accountType === 'TFSA') {
      // TFSA: very low score - PRESERVE tax-free growth!
      // Once sold, you lose the tax shelter and contribution room
      // Only sell TFSA as last resort before RA
      taxEfficiencyScore = 15;
      taxNote = 'Preserve TFSA (limited contributions)';
    } else {
      // Taxable: score inversely proportional to gain %
      // 0% gain = score 80, 100% gain = score 20
      // Even high-gain taxable is better to sell than TFSA
      taxEfficiencyScore = Math.max(20, 80 - gainPct * 0.6);
      if (gainPct > 50) {
        taxNote = 'High CGT impact';
      } else if (gainPct > 20) {
        taxNote = 'Moderate CGT';
      } else {
        taxNote = 'Low CGT impact';
      }
    }

    // Add concentration bonus: prioritize selling high-concentration assets
    // This helps reduce single-asset risk even if tax is less efficient
    // The bonus must be strong enough to override tax efficiency for dangerous concentrations
    let concentrationBonus = 0;
    let concentrationNote = '';
    if (concentrationPct > 25) {
      // Critical concentration - MUST reduce regardless of tax impact
      concentrationBonus = 100; // Ensures it's sold first
      concentrationNote = 'Critical concentration (>25%) - priority reduce';
    } else if (concentrationPct > 20) {
      concentrationBonus = 80; // Very high - strong priority
      concentrationNote = 'High concentration (>20%)';
    } else if (concentrationPct > 15) {
      concentrationBonus = 50;
      concentrationNote = 'Elevated concentration (>15%)';
    } else if (concentrationPct > 10) {
      concentrationBonus = 30;
      concentrationNote = 'Moderate concentration (>10%)';
    } else if (concentrationPct > 5) {
      concentrationBonus = 15;
      concentrationNote = '';
    }

    // Combined score: tax efficiency + concentration bonus
    const combinedScore = taxEfficiencyScore + concentrationBonus;

    // Update note to include concentration if significant
    if (concentrationNote && taxNote) {
      taxNote = `${concentrationNote}; ${taxNote}`;
    } else if (concentrationNote) {
      taxNote = concentrationNote;
    }

    return {
      assetId: asset.id,
      assetName: asset.name,
      ticker: asset.ticker || '',
      assetValue: currentValue,
      costBasis,
      unrealizedGain,
      gainPct: Math.round(gainPct * 10) / 10,
      concentrationPct: Math.round(concentrationPct * 10) / 10,
      estimatedCGT,
      accountType: asset.accountType,
      taxEfficiencyScore: Math.round(taxEfficiencyScore),
      concentrationBonus,
      combinedScore: Math.round(combinedScore),
      taxNote,
    };
  });

  // Sort by combined score (highest first) - considers both tax efficiency and concentration
  assetDetails.sort((a, b) => b.combinedScore - a.combinedScore);

  // Allocate sell amounts
  let remainingToSell = targetAmount;
  const sellRecommendations = [];

  for (const asset of assetDetails) {
    if (remainingToSell <= 0) break;

    const sellAmount = Math.min(asset.assetValue, remainingToSell);
    const proportionSold = asset.assetValue > 0 ? sellAmount / asset.assetValue : 0;

    sellRecommendations.push({
      ...asset,
      sellAmount,
      sellAll: sellAmount >= asset.assetValue * 0.99, // Allow for rounding
      proportionalCGT: Math.round(asset.estimatedCGT * proportionSold),
      proportionalGain: Math.round(asset.unrealizedGain * proportionSold),
    });

    remainingToSell -= sellAmount;
  }

  return sellRecommendations;
};

/**
 * Calculate total tax impact of following all recommendations
 *
 * @param {Array} recommendations - Array of rebalancing recommendations
 * @returns {object} Summary of tax impact
 */
export const calculateTotalTaxImpact = (recommendations) => {
  let totalCGT = 0;
  let totalGainsRealized = 0;
  let totalLossesRealized = 0;
  let taxLossHarvestingAmount = 0;

  recommendations.forEach((rec) => {
    if (rec.action === 'sell') {
      rec.sellDetails.forEach((detail) => {
        totalCGT += detail.proportionalCGT;

        if (detail.proportionalGain > 0) {
          totalGainsRealized += detail.proportionalGain;
        } else {
          totalLossesRealized += Math.abs(detail.proportionalGain);
          taxLossHarvestingAmount += Math.abs(detail.proportionalGain);
        }
      });
    }
  });

  return {
    totalCGT,
    totalGainsRealized,
    totalLossesRealized,
    taxLossHarvestingAmount,
    netTaxableGain: totalGainsRealized - totalLossesRealized,
  };
};

/**
 * Get a summary of rebalancing actions needed
 *
 * @param {Array} recommendations - Array of recommendations
 * @returns {object} Summary counts
 */
export const getRebalancingSummary = (recommendations) => {
  const sells = recommendations.filter((r) => r.action === 'sell');
  const buys = recommendations.filter((r) => r.action === 'buy');

  return {
    totalActions: recommendations.length,
    sellCount: sells.length,
    buyCount: buys.length,
    totalToSell: sells.reduce((sum, r) => sum + r.amountToAdjust, 0),
    totalToBuy: buys.reduce((sum, r) => sum + r.amountToAdjust, 0),
    highPriorityCount: recommendations.filter((r) => r.severity === 'high').length,
  };
};

/**
 * Format recommendation for display
 *
 * @param {object} recommendation - Single recommendation object
 * @param {string} currency - Display currency code
 * @returns {object} Formatted recommendation
 */
export const formatRecommendation = (recommendation, currency = 'ZAR') => {
  return {
    ...recommendation,
    amountDisplay: formatCurrency(recommendation.amountToAdjust, 0, currency),
    cgtDisplay: formatCurrency(recommendation.totalCGT, 0, currency),
    actionLabel: recommendation.action === 'sell' ? 'Reduce' : 'Increase',
    severityLabel: recommendation.severity === 'high' ? 'Urgent' : 'Recommended',
  };
};
