import { useMemo } from 'react';
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
import './RetirementPrep.css';

function RetirementPrep() {
  const { profile, updateSettings } = useStore();
  const { settings, income, expenses, assets, expenseCategories = [] } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  // Use legacy format for backward compatibility with existing calculations
  const exchangeRates = toLegacyExchangeRates(settings);

  // Helper to format amounts in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Safely get settings with defaults
  const retirementExpensePhases = settings?.retirementExpensePhases || {
    phase1: { ageStart: 60, ageEnd: 69, percentage: 100 },
    phase2: { ageStart: 70, ageEnd: 79, percentage: 80 },
    phase3: { ageStart: 80, ageEnd: 90, percentage: 60 },
  };
  const withdrawalRates = settings?.withdrawalRates || { conservative: 3, safe: 4, aggressive: 5 };
  const inflationRate = settings?.inflation || 4.5;

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

  // Calculate retirement income (income sources active after retirement age + investment income)
  const retirementIncome = useMemo(() => {
    const retirementAge = settings?.profile?.retirementAge || 65;
    const incomeSourcesInRetirement = (income || [])
      .filter(i => {
        const startsBeforeOrAtRetirement = i.startAge === null || i.startAge <= retirementAge;
        const endsAfterRetirement = i.endAge === null || i.endAge >= retirementAge;
        return startsBeforeOrAtRetirement && endsAfterRetirement;
      })
      .reduce((sum, i) => sum + toZAR(i.monthlyAmount, i.currency, exchangeRates) * 12, 0);

    // Add dividend and interest income from assets
    const assetIncome = readiness.assetIncome || 0;

    return incomeSourcesInRetirement + assetIncome;
  }, [income, settings?.profile?.retirementAge, exchangeRates, readiness.assetIncome]);

  // Handle expense phase changes
  const handlePhaseChange = (phase, field, value) => {
    const newPhases = {
      ...retirementExpensePhases,
      [phase]: {
        ...retirementExpensePhases[phase],
        [field]: parseInt(value) || 0,
      },
    };
    updateSettings({ retirementExpensePhases: newPhases });
  };

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

      {/* Expense Phase Breakdown */}
      <div className="card">
        <h3>Retirement Expense Phases</h3>
        <p className="info-text">
          Expenses grow with inflation ({inflationRate}% p.a.) and typically decrease as you age.
          Values shown are inflation-adjusted to mid-point of each phase.
        </p>

        {readiness.phases && readiness.phases.length > 0 ? (
          <div className="phase-table">
            <table>
              <thead>
                <tr>
                  <th>Age Range</th>
                  <th>Expense %</th>
                  <th>Expenses (Today)</th>
                  <th>Expenses (Inflated)</th>
                  <th>Income (Inflated)</th>
                  <th>Withdrawal Needed</th>
                  <th>Portfolio Required</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {readiness.phases.map((phase, index) => (
                  <tr key={index} className={phase.hasSurplus ? 'surplus' : 'needs-withdrawal'}>
                    <td>{phase.label}</td>
                    <td>
                      <input
                        type="number"
                        className="phase-input"
                        value={phase.percentage}
                        onChange={(e) => handlePhaseChange(`phase${index + 1}`, 'percentage', e.target.value)}
                      />%
                    </td>
                    <td>{fmt(phase.expensesToday || 0)}</td>
                    <td>
                      {fmt(phase.expenses)}
                      <small className="inflation-note">×{(phase.inflationFactor || 1).toFixed(2)}</small>
                    </td>
                    <td>{fmt(phase.income)}</td>
                    <td className={phase.withdrawalNeeded > 0 ? 'negative' : 'positive'}>
                      {phase.withdrawalNeeded > 0
                        ? fmt(phase.withdrawalNeeded)
                        : 'Surplus!'}
                    </td>
                    <td>{fmt(phase.portfolioRequired)}</td>
                    <td>
                      {readiness.investibleAssets >= phase.portfolioRequired ? (
                        <span className="badge ready">Ready</span>
                      ) : (
                        <span className="badge not-ready">
                          Need {fmt(phase.portfolioRequired - readiness.investibleAssets)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Add expenses to see phase breakdown.</p>
        )}

        {/* Customize age ranges */}
        <details className="customize-section">
          <summary>Customize Age Ranges</summary>
          <div className="form-grid compact">
            <div className="form-group">
              <label>Phase 1 Start Age</label>
              <input
                type="number"
                value={retirementExpensePhases.phase1.ageStart}
                onChange={(e) => handlePhaseChange('phase1', 'ageStart', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phase 1 End Age</label>
              <input
                type="number"
                value={retirementExpensePhases.phase1.ageEnd}
                onChange={(e) => handlePhaseChange('phase1', 'ageEnd', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phase 2 Start Age</label>
              <input
                type="number"
                value={retirementExpensePhases.phase2.ageStart}
                onChange={(e) => handlePhaseChange('phase2', 'ageStart', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phase 2 End Age</label>
              <input
                type="number"
                value={retirementExpensePhases.phase2.ageEnd}
                onChange={(e) => handlePhaseChange('phase2', 'ageEnd', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phase 3 Start Age</label>
              <input
                type="number"
                value={retirementExpensePhases.phase3.ageStart}
                onChange={(e) => handlePhaseChange('phase3', 'ageStart', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phase 3 End Age</label>
              <input
                type="number"
                value={retirementExpensePhases.phase3.ageEnd}
                onChange={(e) => handlePhaseChange('phase3', 'ageEnd', e.target.value)}
              />
            </div>
          </div>
        </details>
      </div>

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
