import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { calculateRetirementReadiness } from '../../services/scenarioCalculations';
import {
  formatCurrency,
  toZAR,
  calculateInvestibleAssets,
  calculateNonInvestibleAssets,
  formatInReportingCurrency,
  toLegacyExchangeRates,
  getExchangeRates,
} from '../../utils/calculations';
import { DEFAULT_SETTINGS } from '../../models/defaults';
import './RetirementPrep.css';

function RetirementPrep() {
  const { profile, updateSettings } = useStore();
  const { settings, income, expenses, assets, expenseCategories = [], ageBasedExpensePlan } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  // Use legacy format for backward compatibility with existing calculations
  const exchangeRates = toLegacyExchangeRates(settings);

  // Collapsible section state
  const [showInflatedTable, setShowInflatedTable] = useState(false);
  const [showTodaysMoneyTable, setShowTodaysMoneyTable] = useState(false);

  // Helper to format amounts in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Safely get settings with defaults - now using 4 phases
  const currentAge = settings?.profile?.age || 55;
  const retirementAge = settings?.profile?.retirementAge || 65;
  const lifeExpectancy = settings?.profile?.lifeExpectancy || 90;
  const inflationRate = settings?.profile?.expectedInflation ?? 4.5;

  const withdrawalRates = settings?.withdrawalRates || { conservative: 3, safe: 4, aggressive: 5 };

  // Calculate readiness
  const readiness = useMemo(() => {
    return calculateRetirementReadiness(profile);
  }, [profile]);

  // Calculate actual investible and non-investible assets
  const actualInvestibleAssets = useMemo(() => {
    return calculateInvestibleAssets(assets || [], exchangeRates);
  }, [assets, exchangeRates]);

  const actualNonInvestibleAssets = useMemo(() => {
    return calculateNonInvestibleAssets(assets || [], exchangeRates);
  }, [assets, exchangeRates]);

  // Calculate current annual expenses from expense categories (with currency conversion)
  const currentAnnualExpenses = useMemo(() => {
    let total = 0;
    expenseCategories.forEach(category => {
      category.subcategories.forEach(sub => {
        // Get the amount in original currency
        const amountInCurrency = sub.frequency === 'Annual'
          ? (sub.monthlyAmount || 0) / 12
          : (sub.monthlyAmount || 0);
        // Convert to ZAR
        const currency = sub.currency || 'ZAR';
        const monthlyAmountZAR = toZAR(amountInCurrency, currency, exchangeRates);
        total += monthlyAmountZAR * 12;
      });
    });
    return total;
  }, [expenseCategories, exchangeRates]);

  // Calculate current income totals (all income sources currently active)
  const currentIncome = useMemo(() => {
    const currentAge = settings?.profile?.age || 55;
    return (income || [])
      .filter(i => {
        const isStarted = i.startAge === null || currentAge >= i.startAge;
        const isNotEnded = i.endAge === null || currentAge <= i.endAge;
        return isStarted && isNotEnded;
      })
      .reduce((sum, i) => sum + toZAR(i.monthlyAmount, i.currency, exchangeRates) * 12, 0);
  }, [income, settings?.profile?.age, exchangeRates]);

  // Calculate retirement income (income sources that continue AFTER retirement age + investment income)
  // Excludes work income that ends at retirement
  const retirementIncome = useMemo(() => {
    const retirementAge = settings?.profile?.retirementAge || 65;
    const incomeSourcesInRetirement = (income || [])
      .filter(i => {
        // Only include income sources that:
        // 1. Start before or at retirement AND
        // 2. Continue beyond retirement (endAge is null OR endAge > retirementAge)
        const startsBeforeOrAtRetirement = i.startAge === null || i.startAge <= retirementAge;
        const continuesBeyondRetirement = i.endAge === null || i.endAge > retirementAge;
        return startsBeforeOrAtRetirement && continuesBeyondRetirement;
      })
      .reduce((sum, i) => sum + toZAR(i.monthlyAmount, i.currency, exchangeRates) * 12, 0);

    // Add dividend and interest income from assets
    const assetIncome = readiness.assetIncome || 0;

    return incomeSourcesInRetirement + assetIncome;
  }, [income, settings?.profile?.retirementAge, exchangeRates, readiness.assetIncome]);

  // Handle withdrawal rate changes
  const handleRateChange = (rateType, value) => {
    const newRates = {
      ...withdrawalRates,
      [rateType]: parseFloat(value) || 0,
    };
    updateSettings({ withdrawalRates: newRates });
  };

  return (
    <div className="retirement-prep">
      <h2>Retirement Preparedness</h2>

      {/* Main Status Card */}
      <div className={`status-card ${readiness.isReady ? 'ready' : 'not-ready'}`}>
        <div className="status-icon">
          {readiness.isReady ? '✓' : '⚠'}
        </div>
        <div className="status-content">
          <h3>
            {readiness.isReady
              ? 'Ready to Retire'
              : readiness.yearsToRetirement > 0
                ? `${readiness.yearsToRetirement} Years to Retirement`
                : 'Shortfall Detected'}
          </h3>
          <p>
            {readiness.isReady
              ? `Your investible assets exceed the required portfolio by ${fmt(readiness.surplus)}`
              : readiness.gap > 0
                ? `You need an additional ${fmt(readiness.gap)} to retire comfortably`
                : 'Add expenses to calculate your retirement needs'}
          </p>
        </div>
      </div>

      {/* Key Numbers */}
      <div className="key-numbers">
        <div className="number-card">
          <h4>Investible Assets</h4>
          <p className="number">{fmt(actualInvestibleAssets)}</p>
          <small>Generates returns</small>
        </div>
        <div className="number-card">
          <h4>Non-Investible Assets</h4>
          <p className="number">{fmt(actualNonInvestibleAssets)}</p>
          <small>Primary home, etc.</small>
        </div>
        <div className="number-card">
          <h4>Current Annual Expenses</h4>
          <p className="number">{fmt(currentAnnualExpenses)}</p>
          <small>{fmt(currentAnnualExpenses / 12)}/month</small>
        </div>
        <div className="number-card">
          <h4>Current Annual Income</h4>
          <p className="number">{fmt(currentIncome)}</p>
          <small>{fmt(currentIncome / 12)}/month</small>
        </div>
        <div className="number-card">
          <h4>Retirement Income</h4>
          <p className="number">{fmt(retirementIncome)}</p>
          <small>Pensions + Asset Income</small>
        </div>
      </div>

      {/* Assumptions Card */}
      <div className="card">
        <h3>Key Assumptions (from Settings)</h3>
        <div className="assumptions-grid">
          <div className="assumption">
            <span>Portfolio Return</span>
            <strong>{readiness.nominalReturn?.toFixed(1) || '10.0'}% p.a.</strong>
            <small>Weighted avg (net of TER)</small>
          </div>
          <div className="assumption">
            <span>Inflation</span>
            <strong>{readiness.inflationRate?.toFixed(1) || '4.5'}% p.a.</strong>
          </div>
          <div className="assumption">
            <span>Real Return</span>
            <strong>{readiness.realReturn?.toFixed(1) || '5.5'}% p.a.</strong>
            <small>After inflation</small>
          </div>
          <div className="assumption">
            <span>Effective Tax Rate</span>
            <strong>{readiness.effectiveTaxRate?.toFixed(1) || '0'}%</strong>
            <small>On withdrawals (est.)</small>
          </div>
          <div className="assumption">
            <span>Gain Ratio</span>
            <strong>{readiness.gainRatio?.toFixed(0) || '0'}%</strong>
            <small>Taxable portfolio</small>
          </div>
          <div className="assumption">
            <span>Income Growth</span>
            <strong>{readiness.incomeGrowthRate?.toFixed(1) || '5.0'}% p.a.</strong>
          </div>
          <div className="assumption">
            <span>Safe Withdrawal</span>
            <strong>{withdrawalRates.safe}% p.a.</strong>
          </div>
        </div>
        <p className="info-text" style={{ marginTop: '0.75rem' }}>
          These values come from your Settings. Portfolio return is calculated as a weighted average across your investible assets.
        </p>
      </div>

      {/* Asset Income Breakdown */}
      {(readiness.dividendIncome > 0 || readiness.interestIncome > 0) && (
        <div className="card">
          <h3>Asset Income (Annual)</h3>
          <div className="income-breakdown">
            <div className="income-item">
              <span>Dividend Income (after 20% WHT)</span>
              <span>{fmt(readiness.dividendIncome || 0)}</span>
            </div>
            <div className="income-item">
              <span>Interest Income (after tax)</span>
              <span>{fmt(readiness.interestIncome || 0)}</span>
            </div>
            <div className="income-item total">
              <span>Total Asset Income</span>
              <span>{fmt(readiness.assetIncome || 0)}</span>
            </div>
          </div>
          <p className="info-text">
            Set dividend and interest yields on assets in the Assets module to see income here.
          </p>
        </div>
      )}

      {/* Withdrawal Capacity */}
      <div className="card">
        <h3>Portfolio Withdrawal Capacity</h3>
        <p className="info-text">How much you can withdraw annually from your portfolio using different withdrawal rates.</p>

        <div className="withdrawal-grid">
          <div className="withdrawal-item">
            <span className="rate">{withdrawalRates.conservative}% Conservative</span>
            <span className="amount">{fmt(readiness.conservativeWithdrawal)}/year</span>
            <span className="monthly">{fmt(readiness.conservativeWithdrawal / 12)}/month</span>
          </div>
          <div className="withdrawal-item highlight">
            <span className="rate">{withdrawalRates.safe}% Safe (Trinity Study)</span>
            <span className="amount">{fmt(readiness.safeWithdrawal)}/year</span>
            <span className="monthly">{fmt(readiness.safeWithdrawal / 12)}/month</span>
          </div>
          <div className="withdrawal-item">
            <span className="rate">{withdrawalRates.aggressive}% Aggressive</span>
            <span className="amount">{fmt(readiness.investibleAssets * (withdrawalRates.aggressive / 100))}/year</span>
            <span className="monthly">{fmt(readiness.investibleAssets * (withdrawalRates.aggressive / 100) / 12)}/month</span>
          </div>
        </div>

        {/* Customize rates */}
        <details className="customize-section">
          <summary>Customize Withdrawal Rates</summary>
          <div className="form-grid compact">
            <div className="form-group">
              <label>Conservative Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={withdrawalRates.conservative}
                onChange={(e) => handleRateChange('conservative', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Safe Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={withdrawalRates.safe}
                onChange={(e) => handleRateChange('safe', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Aggressive Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={withdrawalRates.aggressive}
                onChange={(e) => handleRateChange('aggressive', e.target.value)}
              />
            </div>
          </div>
        </details>
      </div>

      {/* Year-by-Year Projection Tables */}
      {readiness.yearByYear && readiness.yearByYear.length > 0 && (
        <div className="card">
          <h3>Year-by-Year Projection</h3>

          {/* Inflated (Nominal) Table */}
          <div className="collapsible-section">
            <button
              className="collapsible-header"
              onClick={() => setShowInflatedTable(!showInflatedTable)}
            >
              <span>{showInflatedTable ? '▼' : '▶'} Inflated Values (Future Money)</span>
              <small>What amounts will actually be in future {reportingCurrency}</small>
            </button>

            {showInflatedTable && (
              <div className="table-scroll">
                <table className="year-table sticky-header">
                  <thead>
                    <tr>
                      <th>Age</th>
                      <th>Year</th>
                      <th>Phase</th>
                      <th>% Exp</th>
                      <th>Expenses</th>
                      <th>Gross Income</th>
                      <th>Income Tax</th>
                      <th>Net Income</th>
                      <th>Drawdown</th>
                      <th>CGT</th>
                      <th>Total Tax</th>
                      <th>Rate</th>
                      <th>Portfolio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readiness.yearByYear.map((row) => (
                      <tr
                        key={row.age}
                        className={
                          row.portfolioExhausted ? 'exhausted' :
                          row.drawdownPercentage > 5 ? 'high-drawdown' :
                          row.drawdownPercentage > 4 ? 'elevated-drawdown' :
                          ''
                        }
                      >
                        <td><strong>{row.age}</strong></td>
                        <td>{row.year}</td>
                        <td>{row.phase}</td>
                        <td>{row.expensePercentage.toFixed(0)}%</td>
                        <td>{fmt(row.expensesInflated)}</td>
                        <td className="positive">{fmt(row.grossIncomeInflated)}</td>
                        <td className={row.incomeTax > 0 ? 'negative' : ''}>
                          {row.incomeTax > 0 ? fmt(row.incomeTax) : '—'}
                        </td>
                        <td className="positive">{fmt(row.netIncomeInflated)}</td>
                        <td className={row.drawdown > 0 ? 'negative' : ''}>
                          {row.drawdown > 0 ? fmt(row.drawdown) : '—'}
                        </td>
                        <td className={row.cgtOnWithdrawal > 0 ? 'negative' : ''}>
                          {row.cgtOnWithdrawal > 0 ? fmt(row.cgtOnWithdrawal) : '—'}
                        </td>
                        <td className={row.totalTax > 0 ? 'negative' : ''}>
                          {row.totalTax > 0 ? fmt(row.totalTax) : '—'}
                        </td>
                        <td className={
                          row.drawdownPercentage > 5 ? 'danger' :
                          row.drawdownPercentage > 4 ? 'warning' :
                          row.drawdownPercentage > 0 ? 'safe' : ''
                        }>
                          {row.drawdownPercentage > 0 ? `${row.drawdownPercentage.toFixed(1)}%` : '—'}
                        </td>
                        <td className={row.portfolioNominal > 0 ? 'positive' : 'negative'}>
                          {fmt(row.portfolioNominal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Today's Money (Real) Table */}
          <div className="collapsible-section" style={{ marginTop: '1rem' }}>
            <button
              className="collapsible-header"
              onClick={() => setShowTodaysMoneyTable(!showTodaysMoneyTable)}
            >
              <span>{showTodaysMoneyTable ? '▼' : '▶'} Today's Money (Purchasing Power)</span>
              <small>All values adjusted to today's purchasing power (0% inflation, 0% income growth)</small>
            </button>

            {showTodaysMoneyTable && (
              <div className="table-scroll">
                <table className="year-table sticky-header">
                  <thead>
                    <tr>
                      <th>Age</th>
                      <th>Year</th>
                      <th>Phase</th>
                      <th>% Exp</th>
                      <th>Expenses</th>
                      <th>Gross Income</th>
                      <th>Income Tax</th>
                      <th>Net Income</th>
                      <th>Drawdown</th>
                      <th>CGT</th>
                      <th>Total Tax</th>
                      <th>Rate</th>
                      <th>Portfolio (Real)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readiness.yearByYear.map((row) => (
                      <tr
                        key={row.age}
                        className={
                          row.portfolioReal <= 0 ? 'exhausted' :
                          row.drawdownPercentageReal > 5 ? 'high-drawdown' :
                          row.drawdownPercentageReal > 4 ? 'elevated-drawdown' :
                          ''
                        }
                      >
                        <td><strong>{row.age}</strong></td>
                        <td>{row.year}</td>
                        <td>{row.phase}</td>
                        <td>{row.expensePercentage.toFixed(0)}%</td>
                        <td>{fmt(row.expensesToday)}</td>
                        <td className="positive">{fmt(row.grossIncomeToday)}</td>
                        <td className={row.incomeTaxToday > 0 ? 'negative' : ''}>
                          {row.incomeTaxToday > 0 ? fmt(row.incomeTaxToday) : '—'}
                        </td>
                        <td className="positive">{fmt(row.netIncomeToday)}</td>
                        <td className={row.drawdownToday > 0 ? 'negative' : ''}>
                          {row.drawdownToday > 0 ? fmt(row.drawdownToday) : '—'}
                        </td>
                        <td className={row.cgtToday > 0 ? 'negative' : ''}>
                          {row.cgtToday > 0 ? fmt(row.cgtToday) : '—'}
                        </td>
                        <td className={row.totalTaxToday > 0 ? 'negative' : ''}>
                          {row.totalTaxToday > 0 ? fmt(row.totalTaxToday) : '—'}
                        </td>
                        <td className={
                          row.drawdownPercentageReal > 5 ? 'danger' :
                          row.drawdownPercentageReal > 4 ? 'warning' :
                          row.drawdownPercentageReal > 0 ? 'safe' : ''
                        }>
                          {row.drawdownPercentageReal > 0 ? `${row.drawdownPercentageReal.toFixed(1)}%` : '—'}
                        </td>
                        <td className={row.portfolioReal > 0 ? 'positive' : 'negative'}>
                          {fmt(row.portfolioReal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="info-text" style={{ marginTop: '0.5rem' }}>
                  <strong>Today's Money Table:</strong> Shows real purchasing power. Portfolio grows at real return ({readiness.realReturn?.toFixed(1)}% = {readiness.nominalReturn?.toFixed(1)}% - {readiness.inflationRate}% inflation).
                  Income and expenses are constant in today's money. This table shows whether your money will actually last.
                </p>
              </div>
            )}
          </div>

          <p className="cgt-note" style={{ marginTop: '1rem' }}>
            <small>
              <strong>Income Tax:</strong> Applied at {readiness.marginalTaxRate || settings?.profile?.marginalTaxRate || 39}% marginal rate on taxable income sources (salary, pension, etc.).<br/>
              <strong>CGT:</strong> Estimated at {readiness.effectiveTaxRate?.toFixed(1) || '0'}% effective rate on withdrawals. Based on your account mix (TFSA: 0%, Taxable: CGT on {readiness.gainRatio?.toFixed(0) || '0'}% gain portion, RA: income tax).<br/>
              <strong>Drawdown:</strong> From investible assets only. Non-investible assets ({fmt(actualNonInvestibleAssets)}) grow at inflation rate only and can be drawn on when investible portfolio is exhausted.
            </small>
          </p>
        </div>
      )}

      {/* Gap Analysis - Always show with appropriate content */}
      <div className={`card gap-analysis ${readiness.isReady ? 'surplus' : ''}`}>
        <h3>{readiness.isReady ? 'Retirement Surplus' : 'Closing the Gap'}</h3>

        {readiness.isReady ? (
          <>
            <p className="info-text success-text">
              You have a surplus of {fmt(readiness.surplus)} above your required portfolio.
            </p>
            <div className="surplus-options">
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">🎉</span>
                  <h4>You're On Track!</h4>
                </div>
                <p>
                  Your investible assets of {fmt(actualInvestibleAssets)} exceed
                  the required portfolio. You can:
                </p>
                <ul className="surplus-list">
                  <li>Retire earlier if desired</li>
                  <li>Increase planned expenses in retirement</li>
                  <li>Leave a larger legacy</li>
                  <li>Take on less investment risk</li>
                </ul>
              </div>
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">📊</span>
                  <h4>Your Buffer</h4>
                </div>
                <p>
                  Your surplus could support an additional <strong>{fmt(
                    readiness.surplus * (withdrawalRates.safe / 100)
                  )}/year</strong> in retirement spending.
                </p>
                <small>Or {fmt(readiness.surplus * (withdrawalRates.safe / 100) / 12)}/month extra.</small>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="info-text">
              You need {fmt(readiness.gap)} more to retire comfortably.
            </p>

            <div className="gap-options">
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">💰</span>
                  <h4>Option 1: Save More</h4>
                </div>
                <p>
                  Additional monthly savings needed: <strong>{fmt(
                    readiness.yearsToRetirement > 0
                      ? readiness.gap / (readiness.yearsToRetirement * 12)
                      : readiness.gap / 12
                  )}/month</strong>
                </p>
                <small>(Simplified - doesn't account for compound growth)</small>
              </div>
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">📅</span>
                  <h4>Option 2: Work Longer</h4>
                </div>
                <p>
                  Delay retirement to allow your portfolio more time to grow. Each additional year adds
                  compounding returns and more savings time.
                </p>
                {readiness.yearsToRetirement > 0 && (
                  <small>Consider: 2-3 extra years could close much of the gap.</small>
                )}
              </div>
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">📉</span>
                  <h4>Option 3: Reduce Expenses</h4>
                </div>
                <p>
                  Lower annual expenses by <strong>{fmt(
                    readiness.gap * (withdrawalRates.safe / 100)
                  )}/year</strong> ({fmt(
                    readiness.gap * (withdrawalRates.safe / 100) / 12
                  )}/month) to match your current portfolio.
                </p>
                <small>Focus on luxury and discretionary expenses first.</small>
              </div>
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">📈</span>
                  <h4>Option 4: Increase Income</h4>
                </div>
                <p>
                  Add income sources in retirement (part-time work, rental income, dividends).
                  Each <strong>{fmt(
                    (readiness.gap * (withdrawalRates.safe / 100)) / 12
                  )}/month</strong> of retirement income reduces your required portfolio.
                </p>
                <small>Consider: Dividend-paying assets, rental property, consulting.</small>
              </div>
              <div className="gap-option">
                <div className="option-header">
                  <span className="option-icon">⚖️</span>
                  <h4>Option 5: Accept Higher Drawdown</h4>
                </div>
                <p>
                  Using a {withdrawalRates.aggressive}% withdrawal rate instead of {withdrawalRates.safe}%
                  reduces your required portfolio to <strong>{fmt(
                    currentAnnualExpenses / (withdrawalRates.aggressive / 100)
                  )}</strong>.
                </p>
                <small>Warning: Higher drawdown = higher risk of running out of money.</small>
              </div>
            </div>

            {/* Combined Approach Calculator */}
            <div className="combined-approach">
              <h4>Combined Approach Example</h4>
              <p>
                To close the gap of {fmt(readiness.gap)}, you could combine:
              </p>
              <ul>
                <li>
                  <strong>Save:</strong> {fmt(
                    readiness.yearsToRetirement > 0
                      ? (readiness.gap * 0.3) / (readiness.yearsToRetirement * 12)
                      : (readiness.gap * 0.3) / 12
                  )}/month more (covers 30%)
                </li>
                <li>
                  <strong>Reduce expenses:</strong> {fmt(
                    (readiness.gap * 0.3) * (withdrawalRates.safe / 100) / 12
                  )}/month less (covers 30%)
                </li>
                <li>
                  <strong>Increase retirement income:</strong> {fmt(
                    (readiness.gap * 0.4) * (withdrawalRates.safe / 100) / 12
                  )}/month more (covers 40%)
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Next Steps */}
      <div className="card next-steps">
        <h3>Next Steps</h3>
        <ul>
          <li>
            <strong>Run Scenarios:</strong> Test your plan against market crashes, inflation spikes, and unexpected expenses.
          </li>
          <li>
            <strong>Review Income Sources:</strong> Ensure all retirement income is tracked (pensions, rental, dividends).
          </li>
          <li>
            <strong>Set Asset Yields:</strong> Add dividend and interest yields to assets to include asset income in calculations.
          </li>
          <li>
            <strong>Check Asset Allocation:</strong> Make sure your portfolio is appropriately diversified for your retirement timeline.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default RetirementPrep;
