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
  calculateAssetValueZAR,
  toZAR,
  toLegacyExchangeRates,
} from '../utils/calculations';

/**
 * Calculate expense multiplier based on age phase
 */
export const getExpenseMultiplier = (age, expensePhases) => {
  if (!expensePhases) return 1.0;

  const { phase1, phase2, phase3 } = expensePhases;

  if (phase1 && age >= phase1.ageStart && age <= phase1.ageEnd) {
    return phase1.percentage / 100;
  }
  if (phase2 && age >= phase2.ageStart && age <= phase2.ageEnd) {
    return phase2.percentage / 100;
  }
  if (phase3 && age >= phase3.ageStart) {
    return phase3.percentage / 100;
  }

  // Before retirement phases (still working)
  return 1.0;
};

/**
 * Calculate dividend income from assets (after 20% withholding tax)
 */
export const calculateDividendIncomeFromAssets = (assets, exchangeRates) => {
  return assets
    .filter(asset => asset.assetType === 'Investible' && (asset.dividendYield > 0 || asset.incomeYield > 0))
    .reduce((sum, asset) => {
      const valueZAR = calculateAssetValueZAR(asset, exchangeRates);
      // Use dividendYield if available, fall back to incomeYield for backwards compatibility
      const yield_ = asset.dividendYield || asset.incomeYield || 0;
      const annualDividend = valueZAR * (yield_ / 100);
      // Dividend income is already after 20% withholding tax
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
 */
export const calculateIncomeAtAge = (age, incomeSources, exchangeRates, inflationRate, yearsFromNow) => {
  let totalIncome = 0;
  let taxableIncome = 0;

  incomeSources.forEach(source => {
    const isActive = (source.startAge === null || age >= source.startAge) &&
                     (source.endAge === null || age <= source.endAge);

    if (isActive) {
      let monthlyAmount = toZAR(source.monthlyAmount, source.currency, exchangeRates);

      // Apply inflation adjustment if applicable
      if (source.isInflationAdjusted && yearsFromNow > 0) {
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
 * Calculate tax on income (simplified South African tax)
 */
export const calculateIncomeTax = (taxableIncome, marginalTaxRate) => {
  // Simplified: just apply marginal rate
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

  expenseCategories.forEach(category => {
    const categoryExpenses = applicablePhase.expenses[category.name] || {};

    category.subcategories.forEach(subcategory => {
      const amount = categoryExpenses[subcategory.name] || 0;
      totalMonthly += amount;
    });
  });

  return totalMonthly;
};

/**
 * Run a retirement scenario projection
 */
export const runScenario = (scenario, profile) => {
  const { assets, income, expenses, settings, expenseCategories = [], ageBasedExpensePlan } = profile;
  // Use legacy format for backward compatibility with existing calculations
  const exchangeRates = toLegacyExchangeRates(settings);
  const { age: currentAge, marginalTaxRate } = settings.profile;
  const retirementExpensePhases = settings.retirementExpensePhases || {
    phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
    phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
    phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
  };

  // Check if age-based expense planning is enabled
  const useAgeBasedExpenses = ageBasedExpensePlan?.enabled && expenseCategories.length > 0;

  const {
    marketReturn,
    inflationRate,
    retirementAge,
    lifeExpectancy,
    monthlySavings,
    useExpensesModule,
    annualExpenses: scenarioAnnualExpenses,
    marketCrashes = [],
    unexpectedExpenses = [],
  } = scenario;

  // Calculate base annual expenses (today's money)
  let baseAnnualExpenses;
  if (useExpensesModule) {
    // First try to use new hierarchical expense categories
    if (expenseCategories && expenseCategories.length > 0) {
      baseAnnualExpenses = 0;
      expenseCategories.forEach(category => {
        (category.subcategories || []).forEach(sub => {
          const monthlyAmountOriginal = sub.frequency === 'Annual'
            ? (sub.monthlyAmount || 0) / 12
            : (sub.monthlyAmount || 0);
          const currency = sub.currency || 'ZAR';
          const monthlyAmountZAR = toZAR(monthlyAmountOriginal, currency, exchangeRates);
          baseAnnualExpenses += monthlyAmountZAR * 12;
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

  // Calculate withdrawal tax rate
  const withdrawalTaxRate = calculateWithdrawalTaxRate(assets, marginalTaxRate);

  // Calculate equity percentage for crash impact
  const equityPercentage = calculateEquityPercentage(assets);

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

  // Real return calculation
  const realReturn = ((1 + marketReturn / 100) / (1 + inflationRate / 100) - 1) * 100;

  // Run simulation year by year
  for (let age = currentAge; age <= lifeExpectancy; age++) {
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
    const incomeTax = calculateIncomeTax(taxableFromSources, marginalTaxRate);
    const netIncome = yearSourceIncome - incomeTax + yearDividendIncome + yearInterestIncome;

    totalIncome += netIncome;

    if (age < retirementAge) {
      // Pre-retirement: add savings to portfolio
      const annualSavings = monthlySavings * 12 * inflationFactor;
      portfolioValue += annualSavings;

      // Grow portfolio
      portfolioValue *= (1 + marketReturn / 100);

      // Update year data for pre-retirement
      yearData.income = netIncome;
      yearData.savings = annualSavings;

      trajectory.push(yearData);
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

      if (netNeeded > 0) {
        // Need to withdraw from portfolio
        // Calculate potential returns on current portfolio
        const potentialReturns = portfolioValue * (marketReturn / 100);

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

        // Gross up for withdrawal tax
        const grossWithdrawal = netNeeded / (1 - withdrawalTaxRate);
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
      yearData.coveredByIncome = incomeContribution;
      yearData.coveredByReturns = yearCoveredByReturns;
      yearData.capitalDrawdown = yearCapitalDrawdown;
      yearData.drawdownRate = yearDrawdownRate;
      yearData.withdrawal = yearWithdrawal;

      trajectory.push(yearData);

      // Grow remaining portfolio
      if (portfolioValue > 0) {
        portfolioValue *= (1 + marketReturn / 100);
      }
    }

    // Apply market crash if applicable
    const crash = marketCrashes.find(c => c.age === age);
    if (crash) {
      // Crash only affects equity portion
      const crashLoss = portfolioValue * equityPercentage * (crash.dropPercentage / 100);
      portfolioValue -= crashLoss;
    }

    // Apply unexpected expense if applicable
    const unexpectedExpense = unexpectedExpenses.find(e => e.age === age);
    if (unexpectedExpense) {
      portfolioValue -= unexpectedExpense.amount;
    }

    // Check for depletion
    if (portfolioValue < 0 && success) {
      success = false;
      depletionAge = age;
      portfolioValue = 0; // Can't go negative
    }
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

  return {
    trajectory,
    success,
    depletionAge,
    finalValue,
    shortfall: success ? 0 : Math.abs(finalValue),
    totalWithdrawn,
    totalIncome,
    totalExpenses,
    expenseCoverageBreakdown,
    metrics: {
      nominalReturn: marketReturn,
      realReturn,
      inflationRate,
      withdrawalTaxRate: withdrawalTaxRate * 100,
      equityPercentage: equityPercentage * 100,
      baseAnnualExpenses,
      startingPortfolio,
      retirementAge,
      lifeExpectancy,
      yearsInRetirement: lifeExpectancy - retirementAge,
    },
    runAt: new Date().toISOString(),
  };
};

/**
 * Calculate retirement readiness summary
 */
export const calculateRetirementReadiness = (profile) => {
  const { assets, income, expenses, expenseCategories, settings } = profile;

  // Safety checks for missing data
  if (!settings || !settings.currency) {
    return {
      investibleAssets: 0,
      annualExpenses: 0,
      retirementIncome: 0,
      phases: [],
      isReady: false,
      gap: 0,
      surplus: 0,
      yearsToRetirement: 0,
      safeWithdrawal: 0,
      conservativeWithdrawal: 0,
      currentAge: 0,
      retirementAge: 65,
      lifeExpectancy: 90,
      inflationRate: 4.5,
    };
  }

  const exchangeRates = toLegacyExchangeRates(settings);
  const { age: currentAge, marginalTaxRate, retirementAge, lifeExpectancy } = settings.profile || {};
  const retirementExpensePhases = settings.retirementExpensePhases || {
    phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
    phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
    phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
  };
  const withdrawalRates = settings.withdrawalRates || { conservative: 3, safe: 4, aggressive: 5 };
  const inflationRate = settings.inflation || 4.5;

  // Get investible assets
  const investibleAssets = calculateInvestibleAssets(assets || [], exchangeRates);

  // Calculate current expenses (in today's money) - use expenseCategories if available
  let annualExpenses = 0;
  if (expenseCategories && expenseCategories.length > 0) {
    // Use new hierarchical expense categories with currency conversion
    expenseCategories.forEach(category => {
      (category.subcategories || []).forEach(sub => {
        const amountInCurrency = sub.frequency === 'Annual'
          ? (sub.monthlyAmount || 0) / 12
          : (sub.monthlyAmount || 0);
        const currency = sub.currency || 'ZAR';
        const monthlyAmountZAR = toZAR(amountInCurrency, currency, exchangeRates);
        annualExpenses += monthlyAmountZAR * 12;
      });
    });
  } else if (expenses && expenses.length > 0) {
    // Fall back to legacy expenses array
    const monthlyExpenses = expenses.reduce((sum, e) => {
      if (e.frequency === 'Monthly') return sum + e.amount;
      return sum + e.amount / 12;
    }, 0);
    annualExpenses = monthlyExpenses * 12;
  }

  // Calculate retirement income (in today's money)
  const retirementIncome = (income || [])
    .filter(i => {
      const startsBeforeOrAtRetirement = i.startAge === null || i.startAge <= retirementAge;
      const endsAfterRetirement = i.endAge === null || i.endAge >= retirementAge;
      return startsBeforeOrAtRetirement && endsAfterRetirement;
    })
    .reduce((sum, i) => sum + toZAR(i.monthlyAmount, i.currency, exchangeRates) * 12, 0);

  // Calculate dividend and interest income from assets
  const dividendIncome = calculateDividendIncomeFromAssets(assets || [], exchangeRates);
  const interestIncome = calculateInterestIncomeFromAssets(assets || [], exchangeRates, marginalTaxRate || 39);
  const assetIncome = dividendIncome + interestIncome.net;

  // Total retirement income including asset income
  const totalRetirementIncome = retirementIncome + assetIncome;

  // Years to retirement for inflation calculation
  const yearsToRetirement = Math.max(0, (retirementAge || 65) - (currentAge || 55));

  // Calculate phase breakdown with inflation-adjusted expenses
  const phases = [
    { ...retirementExpensePhases.phase1, label: `Ages ${retirementExpensePhases.phase1.ageStart}-${retirementExpensePhases.phase1.ageEnd}` },
    { ...retirementExpensePhases.phase2, label: `Ages ${retirementExpensePhases.phase2.ageStart}-${retirementExpensePhases.phase2.ageEnd}` },
    { ...retirementExpensePhases.phase3, label: `Ages ${retirementExpensePhases.phase3.ageStart}+` },
  ].map((phase, index) => {
    // Calculate years from now to mid-point of this phase
    const phaseMidAge = (phase.ageStart + (phase.ageEnd || phase.ageStart + 10)) / 2;
    const yearsFromNow = Math.max(0, phaseMidAge - (currentAge || 55));

    // Inflation-adjusted expenses for this phase
    const inflationFactor = Math.pow(1 + inflationRate / 100, yearsFromNow);
    const phaseExpenses = annualExpenses * (phase.percentage / 100) * inflationFactor;

    // Income may also be inflation-adjusted (simplified - assume it is)
    const adjustedIncome = totalRetirementIncome * Math.pow(1 + inflationRate / 100, yearsFromNow);

    const withdrawalNeeded = Math.max(0, phaseExpenses - adjustedIncome);
    const portfolioRequired = withdrawalNeeded > 0 ? withdrawalNeeded / (withdrawalRates.safe / 100) : 0;

    return {
      ...phase,
      expenses: phaseExpenses,
      expensesToday: annualExpenses * (phase.percentage / 100),
      income: adjustedIncome,
      incomeToday: totalRetirementIncome,
      withdrawalNeeded,
      portfolioRequired,
      hasSurplus: adjustedIncome >= phaseExpenses,
      inflationFactor,
    };
  });

  // Overall readiness based on first phase (highest requirement typically)
  const maxRequired = Math.max(...phases.map(p => p.portfolioRequired), 0);
  const isReady = investibleAssets >= maxRequired;
  const gap = maxRequired - investibleAssets;

  // Calculate safe withdrawal capacity
  const safeWithdrawal = investibleAssets * (withdrawalRates.safe / 100);
  const conservativeWithdrawal = investibleAssets * (withdrawalRates.conservative / 100);

  return {
    investibleAssets,
    annualExpenses,
    retirementIncome,
    assetIncome,
    totalRetirementIncome,
    dividendIncome,
    interestIncome: interestIncome.net,
    phases,
    isReady,
    gap: isReady ? 0 : gap,
    surplus: isReady ? -gap : 0,
    yearsToRetirement,
    safeWithdrawal,
    conservativeWithdrawal,
    currentAge: currentAge || 55,
    retirementAge: retirementAge || 65,
    lifeExpectancy: lifeExpectancy || 90,
    inflationRate,
  };
};
