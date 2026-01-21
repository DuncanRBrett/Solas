// Portfolio Quality Assessment calculations for Solas v3
// Calculates a 0-100 quality score based on diversification, balance, resilience, and risk

import {
  calculateAssetValueZAR,
  calculateCostBasisZAR,
  groupAssets,
  calculateGrossAssets,
  detectConcentrationRisks,
  getExchangeRates,
} from '../utils/calculations';
import { ASSET_CLASSES } from '../models/defaults';

/**
 * Calculate Herfindahl-Hirschman Index (HHI) for concentration measurement
 * HHI = sum of squared market shares
 * Range: 1/N (perfect diversification) to 1.0 (complete concentration)
 *
 * @param {Array} assets - Array of asset objects
 * @param {string} dimension - Grouping dimension (assetClass, currency, region, sector)
 * @param {object} exchangeRates - Exchange rates for currency conversion
 * @returns {number} HHI value between 0 and 1
 */
export const calculateHHI = (assets, dimension, exchangeRates) => {
  const total = calculateGrossAssets(assets, exchangeRates);
  if (total === 0) return 1; // No assets = max concentration

  const groups = groupAssets(assets, exchangeRates, dimension);

  return groups.reduce((hhi, group) => {
    const share = group.value / total;
    return hhi + share * share;
  }, 0);
};

/**
 * Calculate individual asset HHI (not grouped by any dimension)
 * This measures concentration at the individual holding level
 */
export const calculateIndividualAssetHHI = (assets, exchangeRates) => {
  const total = calculateGrossAssets(assets, exchangeRates);
  if (total === 0) return 1;

  return assets.reduce((hhi, asset) => {
    const value = calculateAssetValueZAR(asset, exchangeRates);
    const share = value / total;
    return hhi + share * share;
  }, 0);
};

/**
 * Calculate Diversification Score (0-100)
 * Based on HHI across multiple dimensions PLUS individual asset concentration
 *
 * Key insight: Even if "Offshore Equity" is 40% of portfolio (good),
 * if one fund is 25% of total portfolio, that's still a concentration risk.
 *
 * @param {Array} assets - Investible assets only
 * @param {object} settings - Settings with exchangeRates
 * @returns {object} Diversification score and breakdown
 */
export const calculateDiversificationScore = (assets, settings) => {
  const exchangeRates = getExchangeRates(settings);
  const investibleAssets = assets.filter((a) => a.assetType === 'Investible');

  if (investibleAssets.length === 0) {
    return {
      score: 0,
      assetClassHHI: 1,
      currencyHHI: 1,
      regionHHI: 1,
      sectorHHI: 1,
      individualHHI: 1,
      weightedHHI: 1,
      details: 'No investible assets',
    };
  }

  // Calculate HHI for each dimension
  const assetClassHHI = calculateHHI(investibleAssets, 'assetClass', exchangeRates);
  const currencyHHI = calculateHHI(investibleAssets, 'currency', exchangeRates);
  const regionHHI = calculateHHI(investibleAssets, 'region', exchangeRates);

  // Sector HHI only for equities
  const equities = investibleAssets.filter(
    (a) => a.assetClass === 'Offshore Equity' || a.assetClass === 'SA Equity'
  );
  const sectorHHI = equities.length > 0 ? calculateHHI(equities, 'sector', exchangeRates) : 0.5;

  // NEW: Individual asset HHI - captures concentration in single holdings
  // This ensures that a 25% position in one fund is flagged even if
  // the overall asset class allocation looks balanced
  const individualHHI = calculateIndividualAssetHHI(investibleAssets, exchangeRates);

  // Find largest single position for reporting
  const total = calculateGrossAssets(investibleAssets, exchangeRates);
  let largestPosition = { name: '', percentage: 0 };
  investibleAssets.forEach((asset) => {
    const pct = (calculateAssetValueZAR(asset, exchangeRates) / total) * 100;
    if (pct > largestPosition.percentage) {
      largestPosition = { name: asset.name, percentage: pct };
    }
  });

  // Weight the dimensions
  // Asset class (30%), currency (20%), region (15%), sector (10%), individual (25%)
  // Individual weighting is significant to catch single-position concentration
  const weightedHHI =
    assetClassHHI * 0.30 +
    currencyHHI * 0.20 +
    regionHHI * 0.15 +
    sectorHHI * 0.10 +
    individualHHI * 0.25;

  // Convert HHI to score: lower HHI = higher score
  // HHI of 0.1 (very diversified) = 100, HHI of 1.0 (concentrated) = 0
  const score = Math.max(0, Math.min(100, Math.round(100 * (1 - weightedHHI))));

  return {
    score,
    assetClassHHI: Math.round(assetClassHHI * 100) / 100,
    currencyHHI: Math.round(currencyHHI * 100) / 100,
    regionHHI: Math.round(regionHHI * 100) / 100,
    sectorHHI: Math.round(sectorHHI * 100) / 100,
    individualHHI: Math.round(individualHHI * 100) / 100,
    weightedHHI: Math.round(weightedHHI * 100) / 100,
    largestPosition,
    holdingsCount: investibleAssets.length,
    details: getDiversificationDetails(assetClassHHI, currencyHHI, regionHHI, individualHHI, largestPosition),
  };
};

/**
 * Get human-readable diversification details
 */
const getDiversificationDetails = (assetClassHHI, currencyHHI, regionHHI, individualHHI, largestPosition) => {
  const issues = [];

  // Check single-position concentration first (most actionable)
  if (largestPosition && largestPosition.percentage > 20) {
    issues.push(`${largestPosition.name} is ${largestPosition.percentage.toFixed(0)}% of portfolio`);
  } else if (largestPosition && largestPosition.percentage > 15) {
    issues.push(`${largestPosition.name} is ${largestPosition.percentage.toFixed(0)}% - consider reducing`);
  }

  // Individual HHI indicates too few holdings
  if (individualHHI > 0.15 && !issues.length) {
    issues.push('portfolio concentrated in few holdings');
  }

  if (assetClassHHI > 0.5) issues.push('concentrated in few asset classes');
  if (currencyHHI > 0.7) issues.push('heavy single-currency exposure');
  if (regionHHI > 0.8) issues.push('limited geographic diversification');

  if (issues.length === 0) return 'Well diversified across dimensions';
  return 'Consider: ' + issues.join(', ');
};

/**
 * Calculate Balance Score (0-100)
 * Based on deviation from target allocation
 *
 * @param {Array} assets - Investible assets only
 * @param {object} settings - Settings with targetAllocation and thresholds
 * @returns {object} Balance score and drift details
 */
export const calculateBalanceScore = (assets, settings) => {
  const exchangeRates = getExchangeRates(settings);
  const { targetAllocation, thresholds } = settings;
  const driftThreshold = thresholds?.rebalancingDrift || 5;

  const investibleAssets = assets.filter((a) => a.assetType === 'Investible');
  const total = calculateGrossAssets(investibleAssets, exchangeRates);

  if (total === 0) {
    return {
      score: 0,
      totalDrift: 0,
      drifts: [],
      urgency: 'none',
      details: 'No investible assets',
    };
  }

  // Calculate current allocation
  const currentAllocation = {};
  investibleAssets.forEach((asset) => {
    const value = calculateAssetValueZAR(asset, exchangeRates);
    const cls = asset.assetClass;
    currentAllocation[cls] = (currentAllocation[cls] || 0) + value;
  });

  const drifts = [];
  let totalAbsoluteDrift = 0;
  let maxDrift = 0;

  // Compare against targets for all asset classes
  ASSET_CLASSES.forEach((assetClass) => {
    const targetPct = targetAllocation?.[assetClass] || 0;
    const currentValue = currentAllocation[assetClass] || 0;
    const currentPct = (currentValue / total) * 100;
    const drift = currentPct - targetPct;

    totalAbsoluteDrift += Math.abs(drift);
    maxDrift = Math.max(maxDrift, Math.abs(drift));

    drifts.push({
      assetClass,
      currentPct: Math.round(currentPct * 10) / 10,
      targetPct,
      drift: Math.round(drift * 10) / 10,
      currentValue,
      targetValue: (targetPct / 100) * total,
      needsRebalancing: Math.abs(drift) > driftThreshold,
    });
  });

  // Determine urgency
  let urgency = 'none';
  if (maxDrift > driftThreshold * 2) urgency = 'high';
  else if (maxDrift > driftThreshold) urgency = 'medium';
  else if (maxDrift > driftThreshold * 0.5) urgency = 'low';

  // Score: perfect balance (0 drift) = 100
  // Use quadratic to penalize larger drifts more
  const score = Math.max(0, Math.min(100, Math.round(100 - Math.pow(totalAbsoluteDrift / 50, 1.5) * 10)));

  return {
    score,
    totalDrift: Math.round(totalAbsoluteDrift * 10) / 10,
    maxDrift: Math.round(maxDrift * 10) / 10,
    drifts,
    urgency,
    driftThreshold,
    details: getBalanceDetails(urgency, maxDrift, driftThreshold),
  };
};

/**
 * Get human-readable balance details
 */
const getBalanceDetails = (urgency, maxDrift, threshold) => {
  if (urgency === 'none') return 'Portfolio is well balanced';
  if (urgency === 'low') return 'Minor drift from targets';
  if (urgency === 'medium') return `Rebalancing recommended (${maxDrift.toFixed(1)}% max drift)`;
  return `Rebalancing needed (${maxDrift.toFixed(1)}% max drift exceeds ${threshold * 2}% threshold)`;
};

/**
 * Calculate Resilience Score (0-100)
 * Based on liquidity, defensive allocation, and emergency fund
 *
 * @param {Array} assets - All assets
 * @param {object} settings - Settings with profile.annualExpenses
 * @returns {object} Resilience score and breakdown
 */
export const calculateResilienceScore = (assets, settings) => {
  const exchangeRates = getExchangeRates(settings);
  const investibleAssets = assets.filter((a) => a.assetType === 'Investible');
  const total = calculateGrossAssets(investibleAssets, exchangeRates);

  if (total === 0) {
    return {
      score: 0,
      liquidityRatio: 0,
      defensiveRatio: 0,
      emergencyFundMonths: 0,
      details: 'No investible assets',
    };
  }

  // 1. Liquidity Ratio - Patch 8: Use isLiquid property instead of hardcoded asset class filtering
  // If isLiquid is not explicitly set to false, default to liquid (backward compatible)
  // Legacy fallback: Property and Crypto default to illiquid if isLiquid is undefined
  const liquidAssets = investibleAssets.filter((a) => {
    // Explicit isLiquid value takes precedence
    if (a.isLiquid === false) return false;
    if (a.isLiquid === true) return true;
    // Backward compatibility: Property and Crypto are illiquid by default
    if (a.assetClass === 'Property' || a.assetClass === 'Crypto') return false;
    // All other assets are liquid by default
    return true;
  });
  const liquidValue = calculateGrossAssets(liquidAssets, exchangeRates);
  const liquidityRatio = liquidValue / total;

  // 2. Defensive Allocation (Bonds + Cash)
  const defensiveAssets = investibleAssets.filter(
    (a) =>
      a.assetClass === 'SA Bonds' ||
      a.assetClass === 'Offshore Bonds' ||
      a.assetClass === 'Cash'
  );
  const defensiveValue = calculateGrossAssets(defensiveAssets, exchangeRates);
  const defensiveRatio = defensiveValue / total;

  // 3. Emergency Fund (Cash vs monthly expenses)
  const cashAssets = investibleAssets.filter((a) => a.assetClass === 'Cash');
  const cashValue = calculateGrossAssets(cashAssets, exchangeRates);
  const monthlyExpenses = (settings.profile?.annualExpenses || 0) / 12;
  const emergencyFundMonths = monthlyExpenses > 0 ? cashValue / monthlyExpenses : 99;

  // Calculate component scores
  // Liquidity: 80% liquid = 100 points
  const liquidityScore = Math.min(100, (liquidityRatio / 0.8) * 100);
  // Defensive: 25% defensive = 100 points (age-dependent in future)
  const defensiveScore = Math.min(100, (defensiveRatio / 0.25) * 100);
  // Emergency: 6 months = 100 points
  const emergencyScore = Math.min(100, (emergencyFundMonths / 6) * 100);

  // Weighted average: liquidity 40%, defensive 30%, emergency 30%
  const score = Math.round(liquidityScore * 0.4 + defensiveScore * 0.3 + emergencyScore * 0.3);

  return {
    score,
    liquidityRatio: Math.round(liquidityRatio * 100),
    defensiveRatio: Math.round(defensiveRatio * 100),
    emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
    breakdown: {
      liquidityScore: Math.round(liquidityScore),
      defensiveScore: Math.round(defensiveScore),
      emergencyScore: Math.round(emergencyScore),
    },
    details: getResilienceDetails(liquidityRatio, defensiveRatio, emergencyFundMonths),
  };
};

/**
 * Get human-readable resilience details
 */
const getResilienceDetails = (liquidityRatio, defensiveRatio, emergencyMonths) => {
  const issues = [];

  if (liquidityRatio < 0.5) issues.push('low liquidity');
  if (defensiveRatio < 0.1) issues.push('minimal defensive allocation');
  if (emergencyMonths < 3) issues.push('insufficient emergency fund');

  if (issues.length === 0) return 'Good resilience profile';
  return 'Consider improving: ' + issues.join(', ');
};

/**
 * Calculate Risk Score (0-100)
 * Inverse of concentration risk - higher score = lower risk
 *
 * @param {Array} assets - All assets
 * @param {object} settings - Settings with thresholds
 * @returns {object} Risk score and concentration details
 */
export const calculateRiskScore = (assets, settings) => {
  const exchangeRates = getExchangeRates(settings);
  const { thresholds } = settings;

  const investibleAssets = assets.filter((a) => a.assetType === 'Investible');

  if (investibleAssets.length === 0) {
    return {
      score: 0,
      concentrationRisks: [],
      maxSingleAssetPct: 0,
      maxCurrencyPct: 0,
      riskCount: 0,
      details: 'No investible assets',
    };
  }

  // Reuse existing concentration detection
  const risks = detectConcentrationRisks(investibleAssets, exchangeRates, thresholds);

  // Calculate penalty based on number and severity of risks
  let penalty = 0;
  risks.forEach((risk) => {
    const overThreshold = parseFloat(risk.percentage) - risk.threshold;
    if (risk.severity === 'high') {
      penalty += 20 + overThreshold;
    } else {
      penalty += 10 + overThreshold * 0.5;
    }
  });

  // Find max single asset and currency concentrations
  const total = calculateGrossAssets(investibleAssets, exchangeRates);
  let maxSingleAssetPct = 0;
  let maxCurrencyPct = 0;

  if (total > 0) {
    investibleAssets.forEach((asset) => {
      const pct = (calculateAssetValueZAR(asset, exchangeRates) / total) * 100;
      if (pct > maxSingleAssetPct) maxSingleAssetPct = pct;
    });

    const currencyGroups = groupAssets(investibleAssets, exchangeRates, 'currency');
    if (currencyGroups.length > 0) {
      maxCurrencyPct = Math.max(...currencyGroups.map((c) => (c.value / total) * 100));
    }
  }

  // Score = 100 - penalty, clamped to 0-100
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    concentrationRisks: risks,
    maxSingleAssetPct: Math.round(maxSingleAssetPct * 10) / 10,
    maxCurrencyPct: Math.round(maxCurrencyPct * 10) / 10,
    riskCount: risks.length,
    details: getRiskDetails(risks),
  };
};

/**
 * Get human-readable risk details
 */
const getRiskDetails = (risks) => {
  if (risks.length === 0) return 'No concentration risks detected';
  const highRisks = risks.filter((r) => r.severity === 'high');
  if (highRisks.length > 0) {
    return `${highRisks.length} high concentration risk(s) detected`;
  }
  return `${risks.length} moderate concentration risk(s)`;
};

/**
 * Calculate overall Portfolio Quality Score
 *
 * @param {Array} assets - All assets
 * @param {object} settings - Full settings object
 * @returns {object} Complete quality assessment
 */
export const calculatePortfolioQuality = (assets, settings) => {
  const diversification = calculateDiversificationScore(assets, settings);
  const balance = calculateBalanceScore(assets, settings);
  const resilience = calculateResilienceScore(assets, settings);
  const risk = calculateRiskScore(assets, settings);

  // Equal weighting: 25% each
  const overall = Math.round(
    diversification.score * 0.25 +
      balance.score * 0.25 +
      resilience.score * 0.25 +
      risk.score * 0.25
  );

  // Letter grade
  const grade = getLetterGrade(overall);

  // Generate top recommendations
  const recommendations = generateRecommendations(diversification, balance, resilience, risk);

  return {
    overall,
    grade,
    diversification,
    balance,
    resilience,
    risk,
    recommendations,
  };
};

/**
 * Convert score to letter grade
 */
export const getLetterGrade = (score) => {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
};

/**
 * Get color for score display
 */
export const getScoreColor = (score) => {
  if (score >= 90) return '#10b981'; // green
  if (score >= 80) return '#22c55e'; // light green
  if (score >= 70) return '#f59e0b'; // amber
  if (score >= 60) return '#f97316'; // orange
  return '#ef4444'; // red
};

/**
 * Generate prioritized recommendations
 */
const generateRecommendations = (diversification, balance, resilience, risk) => {
  const recommendations = [];

  // Add recommendations based on lowest scores
  const scores = [
    { area: 'diversification', score: diversification.score, details: diversification.details },
    { area: 'balance', score: balance.score, details: balance.details },
    { area: 'resilience', score: resilience.score, details: resilience.details },
    { area: 'risk', score: risk.score, details: risk.details },
  ];

  // Sort by score ascending (worst first)
  scores.sort((a, b) => a.score - b.score);

  // Take top 3 areas that need improvement (score < 80)
  scores.forEach((item) => {
    if (item.score < 80 && recommendations.length < 3) {
      recommendations.push({
        area: item.area,
        priority: item.score < 50 ? 'high' : item.score < 70 ? 'medium' : 'low',
        suggestion: item.details,
      });
    }
  });

  return recommendations;
};
