import { useMemo } from 'react';
import useStore from '../../store/useStore';
import {
  calculateAssetValue,
  calculateSafeWithdrawal,
  formatInReportingCurrency,
  detectConcentrationRisks,
  getExchangeRates,
  toReportingCurrency,
} from '../../utils/calculations';
import AllocationCharts from './AllocationCharts';
import PortfolioQualityCard from './PortfolioQualityCard';
import './Dashboard.css';

function Dashboard() {
  const { profile } = useStore();

  const stats = useMemo(() => {
    const { assets, liabilities, settings } = profile;
    const reportingCurrency = settings.reportingCurrency || 'ZAR';
    const exchangeRates = getExchangeRates(settings);

    // Provide defaults if withdrawalRates doesn't exist
    const withdrawalRates = settings.withdrawalRates || {
      conservative: 3.0,
      safe: 4.0,
      aggressive: 5.0,
    };
    const { annualExpenses } = settings.profile;

    // Helper for formatting in reporting currency
    const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

    // Helper to convert to reporting currency
    const toReporting = (amount, currency) =>
      toReportingCurrency(amount, currency, reportingCurrency, exchangeRates);

    // Calculate asset values in reporting currency
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
    const totalLiabilities = liabilities.reduce(
      (total, l) => total + toReporting(l.principal, l.currency),
      0
    );
    const netWorth = grossAssets - totalLiabilities;

    // Calculate withdrawal amounts for each strategy
    const conservative = calculateSafeWithdrawal(investibleAssets, withdrawalRates.conservative);
    const safe = calculateSafeWithdrawal(investibleAssets, withdrawalRates.safe);
    const aggressive = calculateSafeWithdrawal(investibleAssets, withdrawalRates.aggressive);

    // Calculate required capital for each strategy
    const requiredConservative = annualExpenses > 0 ? (annualExpenses / withdrawalRates.conservative) * 100 : 0;
    const requiredSafe = annualExpenses > 0 ? (annualExpenses / withdrawalRates.safe) * 100 : 0;
    const requiredAggressive = annualExpenses > 0 ? (annualExpenses / withdrawalRates.aggressive) * 100 : 0;

    // For concentration risks, we need the legacy format temporarily
    // TODO: Update detectConcentrationRisks to use new format
    const legacyExchangeRates = settings.currency?.exchangeRates || {
      'USD/ZAR': exchangeRates.USD || 18.5,
      'EUR/ZAR': exchangeRates.EUR || 19.8,
      'GBP/ZAR': exchangeRates.GBP || 23.2,
    };
    const risks = detectConcentrationRisks(assets, legacyExchangeRates, settings.thresholds);

    return {
      grossAssets,
      investibleAssets,
      nonInvestibleAssets,
      totalLiabilities,
      netWorth,
      annualExpenses,
      withdrawalRates,
      reportingCurrency,
      exchangeRates,
      fmt,
      withdrawals: {
        conservative: { amount: conservative, rate: withdrawalRates.conservative, required: requiredConservative },
        safe: { amount: safe, rate: withdrawalRates.safe, required: requiredSafe },
        aggressive: { amount: aggressive, rate: withdrawalRates.aggressive, required: requiredAggressive },
      },
      risks,
      assetCount: assets.length,
      liabilityCount: liabilities.length,
    };
  }, [profile]);

  return (
    <div className="dashboard">
      <h2>Dashboard - {profile.name}</h2>

      {/* Top Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Investable Assets</div>
          <div className="stat-value">{stats.fmt(stats.investibleAssets)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Liabilities</div>
          <div className="stat-value">{stats.fmt(stats.totalLiabilities)}</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-label">Net Worth</div>
          <div className="stat-value success">{stats.fmt(stats.netWorth)}</div>
        </div>
      </div>

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
