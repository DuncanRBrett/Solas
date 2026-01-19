import { useMemo } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import {
  calculateAssetValue,
  calculateSafeWithdrawal,
  formatInReportingCurrency,
  detectConcentrationRisks,
  getExchangeRates,
  toReportingCurrency,
  calculateAllocation,
} from '../../utils/calculations';
import { DEFAULT_SETTINGS, DEFAULT_EXCHANGE_RATES } from '../../models/defaults';
import AllocationCharts from './AllocationCharts';
import PortfolioQualityCard from './PortfolioQualityCard';
import CapitalGainsCard from './CapitalGainsCard';
import './Dashboard.css';

function Dashboard() {
  const { profile, addSnapshot } = useStore();

  // Extract commonly used values (stable references)
  const { assets = [], liabilities = [], settings = DEFAULT_SETTINGS } = profile ?? {};
  const reportingCurrency = settings?.reportingCurrency ?? DEFAULT_SETTINGS.reportingCurrency;
  const exchangeRates = getExchangeRates(settings);
  const withdrawalRates = settings?.withdrawalRates ?? DEFAULT_SETTINGS.withdrawalRates;
  const annualExpenses = settings?.profile?.annualExpenses ?? DEFAULT_SETTINGS.profile.annualExpenses;
  const marginalTaxRate = settings?.profile?.marginalTaxRate ?? DEFAULT_SETTINGS.profile.marginalTaxRate;

  // Helper for formatting in reporting currency (memoized for stable reference)
  const fmt = useMemo(
    () => (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency),
    [reportingCurrency]
  );

  // Helper to convert to reporting currency
  const toReporting = useMemo(
    () => (amount, currency) => toReportingCurrency(amount, currency, reportingCurrency, exchangeRates),
    [reportingCurrency, exchangeRates]
  );

  // 1. Calculate asset values (depends on assets and settings)
  const assetValues = useMemo(() => {
    const grossAssets = assets.reduce(
      (total, asset) => total + calculateAssetValue(asset, settings),
      0
    );
    const investibleAssets = assets
      .filter(a => a.assetType === 'Investible')
      .reduce((total, asset) => total + calculateAssetValue(asset, settings), 0);
    const nonInvestibleAssets = assets
      .filter(a => a.assetType === 'Non-Investible')
      .reduce((total, asset) => total + calculateAssetValue(asset, settings), 0);

    return { grossAssets, investibleAssets, nonInvestibleAssets, assetCount: assets.length };
  }, [assets, settings]);

  // 2. Calculate liability totals (depends on liabilities and currency conversion)
  const liabilityValues = useMemo(() => {
    const totalLiabilities = liabilities.reduce(
      (total, l) => total + toReporting(l.principal, l.currency),
      0
    );
    return { totalLiabilities, liabilityCount: liabilities.length };
  }, [liabilities, toReporting]);

  // 3. Calculate net worth (derived from asset and liability values)
  const netWorthValues = useMemo(() => {
    const netWorth = assetValues.grossAssets - liabilityValues.totalLiabilities;

    // Calculate net worth in other currencies
    const netWorthInOtherCurrencies = {};
    Object.keys(exchangeRates).forEach(currency => {
      if (currency !== reportingCurrency) {
        netWorthInOtherCurrencies[currency] = netWorth / exchangeRates[currency];
      }
    });

    return { netWorth, netWorthInOtherCurrencies };
  }, [assetValues.grossAssets, liabilityValues.totalLiabilities, exchangeRates, reportingCurrency]);

  // 4. Calculate CGT liability (depends on assets and marginal tax rate)
  const cgtValues = useMemo(() => {
    let taxableGain = 0;

    assets.forEach(asset => {
      // Only investible assets, exclude TFSA
      if (asset.assetType !== 'Investible' || asset.accountType === 'TFSA') {
        return;
      }

      const currentValue = calculateAssetValue(asset, settings);
      const costBasis = toReporting(asset.units * asset.costPrice, asset.currency);
      const gain = currentValue - costBasis;

      if (gain > 0) {
        taxableGain += gain;
      }
    });

    // CGT: 40% inclusion rate × marginal tax rate
    const totalCGT = taxableGain * 0.40 * (marginalTaxRate / 100);
    const realisableNetWorth = netWorthValues.netWorth - totalCGT;

    return { totalCGT, realisableNetWorth };
  }, [assets, settings, marginalTaxRate, netWorthValues.netWorth, toReporting]);

  // 5. Calculate withdrawal strategies (depends on investible assets and withdrawal rates)
  const withdrawals = useMemo(() => {
    const conservative = calculateSafeWithdrawal(assetValues.investibleAssets, withdrawalRates.conservative);
    const safe = calculateSafeWithdrawal(assetValues.investibleAssets, withdrawalRates.safe);
    const aggressive = calculateSafeWithdrawal(assetValues.investibleAssets, withdrawalRates.aggressive);

    const requiredConservative = annualExpenses > 0 ? (annualExpenses / withdrawalRates.conservative) * 100 : 0;
    const requiredSafe = annualExpenses > 0 ? (annualExpenses / withdrawalRates.safe) * 100 : 0;
    const requiredAggressive = annualExpenses > 0 ? (annualExpenses / withdrawalRates.aggressive) * 100 : 0;

    return {
      conservative: { amount: conservative, rate: withdrawalRates.conservative, required: requiredConservative },
      safe: { amount: safe, rate: withdrawalRates.safe, required: requiredSafe },
      aggressive: { amount: aggressive, rate: withdrawalRates.aggressive, required: requiredAggressive },
    };
  }, [assetValues.investibleAssets, withdrawalRates, annualExpenses]);

  // 6. Calculate concentration risks (depends on assets and thresholds)
  const risks = useMemo(() => {
    // For concentration risks, we need the legacy format temporarily
    // TODO: Update detectConcentrationRisks to use new format
    const legacyExchangeRates = settings?.currency?.exchangeRates ?? {
      'USD/ZAR': exchangeRates.USD ?? DEFAULT_EXCHANGE_RATES.USD,
      'EUR/ZAR': exchangeRates.EUR ?? DEFAULT_EXCHANGE_RATES.EUR,
      'GBP/ZAR': exchangeRates.GBP ?? DEFAULT_EXCHANGE_RATES.GBP,
    };
    return detectConcentrationRisks(assets, legacyExchangeRates, settings?.thresholds ?? DEFAULT_SETTINGS.thresholds);
  }, [assets, settings, exchangeRates]);

  // Combine all stats for easy access in JSX
  const stats = useMemo(() => ({
    ...assetValues,
    ...liabilityValues,
    ...netWorthValues,
    ...cgtValues,
    annualExpenses,
    withdrawalRates,
    reportingCurrency,
    exchangeRates,
    fmt,
    withdrawals,
    risks,
  }), [assetValues, liabilityValues, netWorthValues, cgtValues, annualExpenses, withdrawalRates, reportingCurrency, exchangeRates, fmt, withdrawals, risks]);

  // Save current stats to history
  const handleSaveToHistory = () => {
    const { assets = [], settings = DEFAULT_SETTINGS } = profile ?? {};
    const reportingCurrency = settings?.reportingCurrency ?? DEFAULT_SETTINGS.reportingCurrency;
    const exchangeRates = getExchangeRates(settings);

    // Build legacy exchange rates format for calculateAllocation
    const legacyExchangeRates = {};
    Object.entries(exchangeRates).forEach(([currency, rate]) => {
      if (currency !== reportingCurrency) {
        legacyExchangeRates[`${currency}/${reportingCurrency}`] = rate;
      }
    });

    // Calculate allocation using same method as Dashboard chart (ALL assets, not just investible)
    const allocationData = calculateAllocation(assets, legacyExchangeRates, 'assetClass');
    const allocation = {};
    allocationData.forEach(item => {
      if (item.name && item.percentage > 0) {
        allocation[item.name] = item.percentage;
      }
    });

    const snapshotData = {
      netWorth: stats.netWorth,
      grossAssets: stats.grossAssets,
      investibleAssets: stats.investibleAssets,
      nonInvestibleAssets: stats.nonInvestibleAssets,
      liabilities: stats.totalLiabilities,
      cgtLiability: stats.totalCGT,
      realisableNetWorth: stats.realisableNetWorth,
      allocation,
    };

    const result = addSnapshot(snapshotData);
    if (result.success) {
      toast.success('Snapshot saved to history');
    } else {
      toast.error('Failed to save snapshot');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard - {profile.name}</h2>
        <button className="btn btn-save-history" onClick={handleSaveToHistory}>
          Save to History
        </button>
      </div>

      {/* Top Stats Row - Comprehensive Net Worth Overview */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Investable Assets</div>
          <div className="stat-value">{stats.fmt(stats.investibleAssets)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Non-Investable Assets</div>
          <div className="stat-value">{stats.fmt(stats.nonInvestibleAssets)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value">{stats.fmt(stats.grossAssets)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Liabilities</div>
          <div className="stat-value">{stats.fmt(stats.totalLiabilities)}</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Total Net Worth</div>
          <div className="stat-value success">{stats.fmt(stats.netWorth)}</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-label">Potential CGT Liability</div>
          <div className="stat-value">{stats.fmt(stats.totalCGT)}</div>
          <div className="stat-subtitle">If sold today</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Realisable Net Worth</div>
          <div className="stat-value success">{stats.fmt(stats.realisableNetWorth)}</div>
          <div className="stat-subtitle">After CGT</div>
        </div>
      </div>

      {/* Net Worth in Other Currencies */}
      {Object.keys(stats.netWorthInOtherCurrencies).length > 0 && (
        <div className="currency-conversion-row">
          <h3>Total Net Worth in Other Currencies</h3>
          <div className="currency-conversion-grid">
            {Object.entries(stats.netWorthInOtherCurrencies).map(([currency, value]) => (
              <div key={currency} className="currency-conversion-card">
                <div className="currency-label">{currency}</div>
                <div className="currency-value">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="dashboard-grid">
        {/* Left Column - Allocation */}
        <div className="dashboard-card">
          <h3>Asset Allocation</h3>
          {stats.assetCount > 0 ? (
            <AllocationCharts />
          ) : (
            <p className="empty-state">No assets yet. Add assets to see allocation.</p>
          )}
        </div>

        {/* Right Column - Quality Score and Alerts */}
        <div className="dashboard-right-column">
          {/* Portfolio Quality Card */}
          {stats.assetCount > 0 && (
            <PortfolioQualityCard />
          )}

          {/* Concentration Alerts */}
          <div className="dashboard-card">
          <h3>Concentration Alerts</h3>
          {stats.risks.length > 0 ? (
            <div className="alerts-list">
              {/* Single Asset Warnings */}
              {stats.risks.filter(r => r.type === 'Single Asset').length > 0 && (
                <div className="alert-section">
                  <div className="alert-section-title warning">⚠ Single Asset Concentration</div>
                  {stats.risks.filter(r => r.type === 'Single Asset').map((risk, i) => (
                    <div key={i} className="alert-item">• {risk.name}: {risk.percentage}%</div>
                  ))}
                </div>
              )}

              {/* Asset Class Concentration */}
              {stats.risks.filter(r => r.type === 'Asset Class').length > 0 && (
                <div className="alert-section">
                  <div className="alert-section-title success">✓ Asset Class Concentration</div>
                  {stats.risks.filter(r => r.type === 'Asset Class').map((risk, i) => (
                    <div key={i} className="alert-item">• All asset classes within healthy range</div>
                  )).slice(0, 1)}
                </div>
              )}

              {/* Currency Concentration */}
              {stats.risks.filter(r => r.type === 'Currency').length > 0 ? (
                <div className="alert-section">
                  <div className="alert-section-title success">✓ Currency Concentration</div>
                  <div className="alert-item">• Currency exposure well diversified</div>
                </div>
              ) : (
                <div className="alert-section">
                  <div className="alert-section-title success">✓ Currency Concentration</div>
                  <div className="alert-item">• Currency exposure well diversified</div>
                </div>
              )}
            </div>
          ) : (
            <div className="alerts-list">
              <div className="alert-section">
                <div className="alert-section-title success">✓ Asset Class Concentration</div>
                <div className="alert-item">• All asset classes within healthy range</div>
              </div>
              <div className="alert-section">
                <div className="alert-section-title success">✓ Currency Concentration</div>
                <div className="alert-item">• Currency exposure well diversified</div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Financial Insights Row */}
      <div className="financial-insights-row">
        {/* Capital Gains */}
        <div className="insight-card">
          <CapitalGainsCard />
        </div>
      </div>

      {/* Retirement Readiness */}
      <div className="retirement-readiness-card">
        <h3>
          Retirement Readiness
          <span className={stats.withdrawals.safe.amount >= stats.annualExpenses ? 'status-ready' : 'status-not-ready'}>
            {stats.withdrawals.safe.amount >= stats.annualExpenses ? '✓' : ''}
          </span>
        </h3>

        {stats.annualExpenses > 0 && (
          <div className="expense-summary">
            <strong>Annual Expenses:</strong> {stats.fmt(stats.annualExpenses)}/year
            <span className="monthly">({stats.fmt(stats.annualExpenses / 12)}/month)</span>
          </div>
        )}

        <div className="withdrawal-strategies">
          {/* Conservative */}
          <div className="withdrawal-card">
            <div className="withdrawal-header">
              <h4>{stats.withdrawalRates.conservative}% Safe Withdrawal Rule:</h4>
              <div className="withdrawal-amount">{stats.fmt(stats.withdrawals.conservative.amount)}/year</div>
            </div>
            <div className="withdrawal-monthly">Monthly: {stats.fmt(stats.withdrawals.conservative.amount / 12)}</div>
            {stats.annualExpenses > 0 && (
              <div className="withdrawal-status">
                {stats.withdrawals.conservative.amount >= stats.annualExpenses ? (
                  <div className="status-ready">✓ Ready to retire (conservative)</div>
                ) : (
                  <div className="status-gap">
                    <div>Shortfall: {stats.fmt(stats.annualExpenses - stats.withdrawals.conservative.amount)}/year</div>
                    <div>Need: {stats.fmt(stats.withdrawals.conservative.required)} total</div>
                    <div>Gap: {stats.fmt(stats.withdrawals.conservative.required - stats.investibleAssets)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Safe (4%) */}
          <div className="withdrawal-card">
            <div className="withdrawal-header">
              <h4>{stats.withdrawalRates.safe}% Conservative Rule:</h4>
              <div className="withdrawal-amount">{stats.fmt(stats.withdrawals.safe.amount)}/year</div>
            </div>
            <div className="withdrawal-monthly">Monthly: {stats.fmt(stats.withdrawals.safe.amount / 12)}</div>
            {stats.annualExpenses > 0 && (
              <div className="withdrawal-status">
                {stats.withdrawals.safe.amount >= stats.annualExpenses ? (
                  <div className="status-ready">✓ Ready to retire</div>
                ) : (
                  <div className="status-gap">
                    <div>Shortfall: {stats.fmt(stats.annualExpenses - stats.withdrawals.safe.amount)}/year</div>
                    <div>Need: {stats.fmt(stats.withdrawals.safe.required)} total</div>
                    <div>Gap: {stats.fmt(stats.withdrawals.safe.required - stats.investibleAssets)}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aggressive */}
          <div className="withdrawal-card">
            <div className="withdrawal-header">
              <h4>{stats.withdrawalRates.aggressive}% Aggressive Rule:</h4>
              <div className="withdrawal-amount">{stats.fmt(stats.withdrawals.aggressive.amount)}/year</div>
            </div>
            <div className="withdrawal-monthly">Monthly: {stats.fmt(stats.withdrawals.aggressive.amount / 12)}</div>
            {stats.annualExpenses > 0 && (
              <div className="withdrawal-status">
                {stats.withdrawals.aggressive.amount >= stats.annualExpenses ? (
                  <div className="status-ready">✓ Ready to retire (aggressive)</div>
                ) : (
                  <div className="status-gap">
                    <div>Shortfall: {stats.fmt(stats.annualExpenses - stats.withdrawals.aggressive.amount)}/year</div>
                    <div>Need: {stats.fmt(stats.withdrawals.aggressive.required)} total</div>
                    <div>Gap: {stats.fmt(stats.withdrawals.aggressive.required - stats.investibleAssets)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Shortfall Quick Recommendations */}
        {stats.annualExpenses > 0 && stats.withdrawals.safe.amount < stats.annualExpenses && (
          <div className="shortfall-recommendations">
            <h4>How to Close the Gap</h4>
            <div className="recommendation-options">
              <div className="recommendation-item">
                <span className="rec-icon">📉</span>
                <div className="rec-content">
                  <strong>Reduce expenses</strong>
                  <span>{stats.fmt((stats.annualExpenses - stats.withdrawals.safe.amount) / 12)}/month</span>
                </div>
              </div>
              <div className="recommendation-item">
                <span className="rec-icon">📈</span>
                <div className="rec-content">
                  <strong>Add retirement income</strong>
                  <span>{stats.fmt((stats.annualExpenses - stats.withdrawals.safe.amount) / 12)}/month</span>
                </div>
              </div>
              <div className="recommendation-item">
                <span className="rec-icon">💰</span>
                <div className="rec-content">
                  <strong>Save more to accumulate</strong>
                  <span>{stats.fmt(stats.withdrawals.safe.required - stats.investibleAssets)}</span>
                </div>
              </div>
            </div>
            <p className="recommendation-note">
              See <strong>Retirement Prep</strong> tab for detailed options and calculations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
