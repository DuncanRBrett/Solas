import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import { createDefaultScenario } from '../../models/defaults';
import { runScenario } from '../../services/scenarioCalculations';
import { formatCurrency, formatPercentage, toZAR, formatInReportingCurrency, toLegacyExchangeRates } from '../../utils/calculations';
import './Scenarios.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Scenarios() {
  const { profile, addScenario, updateScenario, deleteScenario } = useStore();
  const reportingCurrency = profile.settings.reportingCurrency || 'ZAR';
  const [isAdding, setIsAdding] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const [formData, setFormData] = useState(createDefaultScenario());
  const { confirmDialog, showConfirm } = useConfirmDialog();

  const { scenarios, settings, expenses, expenseCategories = [] } = profile;
  // Use legacy format for backward compatibility with existing calculations
  const exchangeRates = toLegacyExchangeRates(settings);

  // Helper to format amounts in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Calculate annual expenses from expenses module (using new hierarchical structure)
  const expensesModuleAnnual = useMemo(() => {
    // First try to use new hierarchical expense categories
    if (expenseCategories && expenseCategories.length > 0) {
      let total = 0;
      expenseCategories.forEach(category => {
        (category.subcategories || []).forEach(sub => {
          const monthlyAmountOriginal = sub.frequency === 'Annual'
            ? (sub.monthlyAmount || 0) / 12
            : (sub.monthlyAmount || 0);
          const currency = sub.currency || 'ZAR';
          const monthlyAmountZAR = toZAR(monthlyAmountOriginal, currency, exchangeRates);
          total += monthlyAmountZAR * 12;
        });
      });
      return total;
    }
    // Fall back to legacy expenses array
    return (expenses || []).reduce((sum, e) => {
      if (e.frequency === 'Monthly') return sum + e.amount * 12;
      return sum + e.amount;
    }, 0);
  }, [expenseCategories, expenses, exchangeRates]);

  const handleAdd = () => {
    const newScenario = {
      ...createDefaultScenario(),
      retirementAge: settings.profile.retirementAge,
      lifeExpectancy: settings.profile.lifeExpectancy,
      monthlySavings: settings.profile.monthlySavings,
      inflationRate: settings.inflation || 4.5,
    };
    setFormData(newScenario);
    setIsAdding(true);
  };

  const handleEdit = (scenario) => {
    setFormData({ ...scenario });
    setEditingScenario(scenario.id);
  };

  const handleSave = () => {
    let result;

    if (editingScenario) {
      result = updateScenario(editingScenario, formData);
    } else {
      result = addScenario(formData);
    }

    if (!result.success) {
      toast.error(result.message, { duration: 6000, style: { maxWidth: '500px' } });
      console.error('Scenario validation failed:', result.errors);
      return;
    }

    toast.success(editingScenario ? 'Scenario updated successfully' : 'Scenario added successfully');
    setEditingScenario(null);
    setIsAdding(false);
    setFormData(createDefaultScenario());
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingScenario(null);
    setFormData(createDefaultScenario());
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Scenario',
      message: 'Are you sure you want to delete this scenario? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteScenario(id);
      toast.success('Scenario deleted successfully');
      if (selectedScenario?.id === id) {
        setSelectedScenario(null);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRunScenario = (scenario) => {
    const results = runScenario(scenario, profile);
    updateScenario(scenario.id, { results, lastRun: new Date().toISOString() });
    setSelectedScenario({ ...scenario, results });
  };

  const handleRunAllScenarios = () => {
    scenarios.forEach((scenario) => {
      const results = runScenario(scenario, profile);
      updateScenario(scenario.id, { results, lastRun: new Date().toISOString() });
    });
  };

  // Add crash event
  const handleAddCrash = () => {
    setFormData((prev) => ({
      ...prev,
      marketCrashes: [
        ...prev.marketCrashes,
        { age: settings.profile.retirementAge, dropPercentage: 30, description: 'Market crash' },
      ],
    }));
  };

  const handleRemoveCrash = (index) => {
    setFormData((prev) => ({
      ...prev,
      marketCrashes: prev.marketCrashes.filter((_, i) => i !== index),
    }));
  };

  const handleCrashChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      marketCrashes: prev.marketCrashes.map((crash, i) =>
        i === index ? { ...crash, [field]: field === 'description' ? value : parseFloat(value) || 0 } : crash
      ),
    }));
  };

  // Add unexpected expense
  const handleAddExpense = () => {
    setFormData((prev) => ({
      ...prev,
      unexpectedExpenses: [
        ...prev.unexpectedExpenses,
        { age: 75, amount: 500000, description: 'Unexpected expense' },
      ],
    }));
  };

  const handleRemoveExpense = (index) => {
    setFormData((prev) => ({
      ...prev,
      unexpectedExpenses: prev.unexpectedExpenses.filter((_, i) => i !== index),
    }));
  };

  const handleExpenseChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      unexpectedExpenses: prev.unexpectedExpenses.map((expense, i) =>
        i === index ? { ...expense, [field]: field === 'description' ? value : parseFloat(value) || 0 } : expense
      ),
    }));
  };

  // Toggle comparison selection
  const handleToggleComparison = (scenarioId) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(scenarioId)) {
        return prev.filter((id) => id !== scenarioId);
      }
      if (prev.length >= 4) {
        return prev; // Max 4 scenarios
      }
      return [...prev, scenarioId];
    });
  };

  // Get scenarios for comparison
  const comparisonScenarios = scenarios.filter((s) =>
    selectedForComparison.includes(s.id) && s.results
  );

  return (
    <div className="scenarios">
      {confirmDialog}

      <div className="scenarios-header">
        <h2>Scenarios ({scenarios.length})</h2>
        <div className="header-actions">
          {scenarios.length > 1 && (
            <button
              className={`btn-secondary ${compareMode ? 'active' : ''}`}
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedForComparison([]);
              }}
            >
              {compareMode ? 'Exit Compare' : 'Compare'}
            </button>
          )}
          <button className="btn-secondary" onClick={handleRunAllScenarios}>
            Run All
          </button>
          <button className="btn-primary" onClick={handleAdd}>
            + New Scenario
          </button>
        </div>
      </div>

      {/* Scenario Form */}
      {(isAdding || editingScenario) && (
        <div className="card scenario-form">
          <h3>{editingScenario ? 'Edit Scenario' : 'Create New Scenario'}</h3>

          <div className="form-section">
            <h4>Basic Info</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Base Case, Conservative, Worst Case"
                />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of this scenario"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Assumptions</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Market Return (% p.a.)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.marketReturn}
                  onChange={(e) => handleChange('marketReturn', parseFloat(e.target.value) || 0)}
                />
                <small>Nominal return (before inflation)</small>
              </div>
              <div className="form-group">
                <label>Inflation Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.inflationRate}
                  onChange={(e) => handleChange('inflationRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Retirement Age</label>
                <input
                  type="number"
                  value={formData.retirementAge}
                  onChange={(e) => handleChange('retirementAge', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Life Expectancy</label>
                <input
                  type="number"
                  value={formData.lifeExpectancy}
                  onChange={(e) => handleChange('lifeExpectancy', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Monthly Savings (until retirement)</label>
                <input
                  type="number"
                  step="1000"
                  value={formData.monthlySavings}
                  onChange={(e) => handleChange('monthlySavings', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Use Expenses Module</label>
                <select
                  value={formData.useExpensesModule ? 'true' : 'false'}
                  onChange={(e) => handleChange('useExpensesModule', e.target.value === 'true')}
                >
                  <option value="true">Yes - Use expenses ({fmt(expensesModuleAnnual)}/year)</option>
                  <option value="false">No - Enter manually</option>
                </select>
              </div>
              {!formData.useExpensesModule && (
                <div className="form-group">
                  <label>Annual Expenses</label>
                  <input
                    type="number"
                    step="10000"
                    value={formData.annualExpenses}
                    onChange={(e) => handleChange('annualExpenses', parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h4>
              Market Crashes
              <button className="btn-small" onClick={handleAddCrash}>+ Add Crash</button>
            </h4>
            {formData.marketCrashes.length === 0 ? (
              <p className="info-text">No market crashes configured. Click "Add Crash" to stress test.</p>
            ) : (
              <div className="events-list">
                {formData.marketCrashes.map((crash, index) => (
                  <div key={index} className="event-row">
                    <div className="form-group">
                      <label>At Age</label>
                      <input
                        type="number"
                        value={crash.age}
                        onChange={(e) => handleCrashChange(index, 'age', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Drop %</label>
                      <input
                        type="number"
                        value={crash.dropPercentage}
                        onChange={(e) => handleCrashChange(index, 'dropPercentage', e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-grow">
                      <label>Description</label>
                      <input
                        type="text"
                        value={crash.description}
                        onChange={(e) => handleCrashChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <button className="btn-small btn-danger" onClick={() => handleRemoveCrash(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <h4>
              Unexpected Expenses
              <button className="btn-small" onClick={handleAddExpense}>+ Add Expense</button>
            </h4>
            {formData.unexpectedExpenses.length === 0 ? (
              <p className="info-text">No unexpected expenses configured. Click "Add Expense" to model one-time costs.</p>
            ) : (
              <div className="events-list">
                {formData.unexpectedExpenses.map((expense, index) => (
                  <div key={index} className="event-row">
                    <div className="form-group">
                      <label>At Age</label>
                      <input
                        type="number"
                        value={expense.age}
                        onChange={(e) => handleExpenseChange(index, 'age', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Amount ({reportingCurrency})</label>
                      <input
                        type="number"
                        step="100000"
                        value={expense.amount}
                        onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-grow">
                      <label>Description</label>
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => handleExpenseChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <button className="btn-small btn-danger" onClick={() => handleRemoveExpense(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>
              {editingScenario ? 'Update' : 'Create'} Scenario
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {compareMode && comparisonScenarios.length >= 2 && (
        <div className="card comparison-view">
          <h3>Scenario Comparison</h3>

          {/* Comparison Chart */}
          <div className="comparison-chart">
            <Line
              data={{
                labels: comparisonScenarios[0].results.trajectory.map(p => p.age),
                datasets: comparisonScenarios.map((scenario, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                  return {
                    label: scenario.name,
                    data: scenario.results.trajectory.map(p => p.netWorth),
                    borderColor: colors[index % colors.length],
                    backgroundColor: 'transparent',
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                  };
                }),
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.dataset.label}: ${fmt(context.parsed.y)}`,
                    },
                  },
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Age',
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Portfolio Value (ZAR)',
                    },
                    ticks: {
                      callback: (value) => {
                        if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `R${(value / 1000).toFixed(0)}K`;
                        return `R${value}`;
                      },
                    },
                  },
                },
                interaction: {
                  intersect: false,
                  mode: 'index',
                },
              }}
              height={350}
            />
          </div>

          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  {comparisonScenarios.map((s) => (
                    <th key={s.id}>{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Success</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id} className={s.results.success ? 'positive' : 'negative'}>
                      {s.results.success ? 'Yes' : 'No'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Final Value</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id}>{fmt(s.results.finalValue)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Market Return</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id}>{formatPercentage(s.marketReturn)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Inflation</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id}>{formatPercentage(s.inflationRate)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Real Return</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id}>{formatPercentage(s.results.metrics.realReturn)}</td>
                  ))}
                </tr>
                <tr>
                  <td>Market Crashes</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id}>{s.marketCrashes.length}</td>
                  ))}
                </tr>
                <tr>
                  <td>Unexpected Expenses</td>
                  {comparisonScenarios.map((s) => (
                    <td key={s.id}>{s.unexpectedExpenses.length}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scenario List */}
      <div className="scenarios-grid">
        {scenarios.map((scenario) => {
          const isSelected = selectedScenario?.id === scenario.id;
          const isSelectedForComparison = selectedForComparison.includes(scenario.id);

          return (
            <div
              key={scenario.id}
              className={`scenario-card ${isSelected ? 'selected' : ''} ${isSelectedForComparison ? 'comparing' : ''}`}
            >
              <div className="scenario-card-header">
                <h4>{scenario.name}</h4>
                {scenario.results && (
                  <span className={`status-badge ${scenario.results.success ? 'success' : 'fail'}`}>
                    {scenario.results.success ? 'Success' : 'Fail'}
                  </span>
                )}
              </div>
              <p className="scenario-description">{scenario.description}</p>

              <div className="scenario-params">
                <span>Return: {scenario.marketReturn}%</span>
                <span>Inflation: {scenario.inflationRate}%</span>
                <span>Retire: {scenario.retirementAge}</span>
              </div>

              {scenario.marketCrashes.length > 0 && (
                <div className="scenario-events">
                  {scenario.marketCrashes.map((crash, i) => (
                    <span key={i} className="event-badge crash">
                      Crash -{crash.dropPercentage}% @ {crash.age}
                    </span>
                  ))}
                </div>
              )}

              {scenario.results && (
                <div className="scenario-results-summary">
                  <div className="result-item">
                    <span className="label">Final Value:</span>
                    <span className={`value ${scenario.results.finalValue > 0 ? 'positive' : 'negative'}`}>
                      {fmt(scenario.results.finalValue)}
                    </span>
                  </div>
                </div>
              )}

              <div className="scenario-actions">
                {compareMode ? (
                  <button
                    className={`btn-small ${isSelectedForComparison ? 'btn-primary' : ''}`}
                    onClick={() => handleToggleComparison(scenario.id)}
                    disabled={!scenario.results}
                  >
                    {isSelectedForComparison ? 'Selected' : 'Select'}
                  </button>
                ) : (
                  <>
                    <button className="btn-small btn-primary" onClick={() => handleRunScenario(scenario)}>
                      Run
                    </button>
                    <button className="btn-small" onClick={() => setSelectedScenario(scenario)}>
                      View
                    </button>
                    <button className="btn-small" onClick={() => handleEdit(scenario)}>
                      Edit
                    </button>
                    <button className="btn-small btn-danger" onClick={() => handleDelete(scenario.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Scenario Results */}
      {selectedScenario && selectedScenario.results && !compareMode && (
        <div className="card scenario-results">
          <div className="results-header">
            <h3>Results: {selectedScenario.name}</h3>
            <button className="btn-secondary" onClick={() => setSelectedScenario(null)}>
              Close
            </button>
          </div>

          <div className={`results-status ${selectedScenario.results.success ? 'success' : 'fail'}`}>
            <span className="status-icon">{selectedScenario.results.success ? '✓' : '✗'}</span>
            <span className="status-text">
              {selectedScenario.results.success
                ? 'Scenario succeeds - money lasts to life expectancy'
                : `Scenario fails - depleted at age ${selectedScenario.results.depletionAge}`}
            </span>
          </div>

          <div className="results-grid">
            <div className="result-card">
              <h5>Final Portfolio Value</h5>
              <p className={selectedScenario.results.finalValue > 0 ? 'positive' : 'negative'}>
                {fmt(selectedScenario.results.finalValue)}
              </p>
            </div>
            <div className="result-card">
              <h5>Total Withdrawn</h5>
              <p>{fmt(selectedScenario.results.totalWithdrawn)}</p>
            </div>
            <div className="result-card">
              <h5>Total Income</h5>
              <p>{fmt(selectedScenario.results.totalIncome)}</p>
            </div>
            <div className="result-card">
              <h5>Total Expenses</h5>
              <p>{fmt(selectedScenario.results.totalExpenses)}</p>
            </div>
          </div>

          {/* Expense Coverage Breakdown */}
          {selectedScenario.results.expenseCoverageBreakdown && selectedScenario.results.totalExpenses > 0 && (
            <div className="expense-coverage-section">
              <h4>How Expenses Are Covered (During Retirement)</h4>
              <div className="coverage-breakdown">
                <div className="coverage-item">
                  <div className="coverage-header">
                    <span className="coverage-label">Covered by Income</span>
                    <span className="coverage-amount">
                      {fmt(selectedScenario.results.expenseCoverageBreakdown.byIncome.amount)}
                    </span>
                  </div>
                  <div className="coverage-bar-container">
                    <div
                      className="coverage-bar income-bar"
                      style={{ width: `${Math.min(100, selectedScenario.results.expenseCoverageBreakdown.byIncome.percentage)}%` }}
                    />
                  </div>
                  <span className="coverage-percentage">
                    {formatPercentage(selectedScenario.results.expenseCoverageBreakdown.byIncome.percentage)}
                  </span>
                </div>

                <div className="coverage-item">
                  <div className="coverage-header">
                    <span className="coverage-label">Covered by Investment Returns</span>
                    <span className="coverage-amount">
                      {fmt(selectedScenario.results.expenseCoverageBreakdown.byReturns.amount)}
                    </span>
                  </div>
                  <div className="coverage-bar-container">
                    <div
                      className="coverage-bar returns-bar"
                      style={{ width: `${Math.min(100, selectedScenario.results.expenseCoverageBreakdown.byReturns.percentage)}%` }}
                    />
                  </div>
                  <span className="coverage-percentage">
                    {formatPercentage(selectedScenario.results.expenseCoverageBreakdown.byReturns.percentage)}
                  </span>
                </div>

                <div className="coverage-item">
                  <div className="coverage-header">
                    <span className="coverage-label">Capital Drawdown</span>
                    <span className="coverage-amount negative">
                      {fmt(selectedScenario.results.expenseCoverageBreakdown.byCapitalDrawdown.amount)}
                    </span>
                  </div>
                  <div className="coverage-bar-container">
                    <div
                      className="coverage-bar drawdown-bar"
                      style={{ width: `${Math.min(100, selectedScenario.results.expenseCoverageBreakdown.byCapitalDrawdown.percentage)}%` }}
                    />
                  </div>
                  <span className="coverage-percentage">
                    {formatPercentage(selectedScenario.results.expenseCoverageBreakdown.byCapitalDrawdown.percentage)}
                  </span>
                </div>
              </div>
              <p className="coverage-note">
                <strong>Note:</strong> Income includes pensions, dividends, and interest. Returns are the growth on your portfolio.
                Capital drawdown means selling assets to cover expenses.
              </p>
            </div>
          )}

          <div className="metrics-section">
            <h4>Key Metrics</h4>
            <div className="metrics-grid">
              <div className="metric">
                <span className="metric-label">Nominal Return:</span>
                <span className="metric-value">{formatPercentage(selectedScenario.results.metrics.nominalReturn)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Real Return:</span>
                <span className="metric-value">{formatPercentage(selectedScenario.results.metrics.realReturn)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Inflation:</span>
                <span className="metric-value">{formatPercentage(selectedScenario.results.metrics.inflationRate)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Withdrawal Tax Rate:</span>
                <span className="metric-value">{formatPercentage(selectedScenario.results.metrics.withdrawalTaxRate)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Equity Allocation:</span>
                <span className="metric-value">{formatPercentage(selectedScenario.results.metrics.equityPercentage)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Years in Retirement:</span>
                <span className="metric-value">{selectedScenario.results.metrics.yearsInRetirement}</span>
              </div>
            </div>
          </div>

          {/* Trajectory Chart */}
          <div className="trajectory-section">
            <h4>Portfolio Trajectory</h4>
            <div className="trajectory-chart">
              <Line
                data={{
                  labels: selectedScenario.results.trajectory.map(p => p.age),
                  datasets: [
                    {
                      label: 'Portfolio Value',
                      data: selectedScenario.results.trajectory.map(p => p.netWorth),
                      borderColor: selectedScenario.results.success ? '#10b981' : '#ef4444',
                      backgroundColor: selectedScenario.results.success
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 2,
                      pointHoverRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => fmt(context.parsed.y),
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Age',
                      },
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Portfolio Value (ZAR)',
                      },
                      ticks: {
                        callback: (value) => {
                          if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `R${(value / 1000).toFixed(0)}K`;
                          return `R${value}`;
                        },
                      },
                    },
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                }}
                height={300}
              />
            </div>
          </div>

          {/* Trajectory Table */}
          <details className="trajectory-details">
            <summary>Show Detailed Trajectory Table</summary>

            <div className="trajectory-explanation">
              <h5>Understanding the Columns</h5>
              <ul>
                <li><strong>Expenses:</strong> Your inflation-adjusted annual expenses for that year</li>
                <li><strong>Income:</strong> Total income from pensions, dividends, and interest</li>
                <li><strong>By Income:</strong> Portion of expenses covered by your income sources</li>
                <li><strong>By Returns:</strong> Portion covered by investment growth (if returns exceed withdrawal needs)</li>
                <li><strong>Capital Drawdown:</strong> Amount you're actually depleting from your portfolio principal</li>
                <li><strong>Drawdown Rate:</strong> Your gross withdrawal as a percentage of your portfolio at the start of the year</li>
              </ul>
              <div className="formula-box">
                <strong>Drawdown Rate Formula:</strong>
                <code>Drawdown Rate = (Gross Withdrawal / Portfolio Value at Start of Year) × 100</code>
                <p>Where Gross Withdrawal = (Expenses - Income) / (1 - Withdrawal Tax Rate)</p>
              </div>
              <p className="rate-guide">
                <span className="rate-ok">≤4%</span> Sustainable (Trinity Study)
                <span className="rate-warning">4-5%</span> Elevated risk
                <span className="rate-danger">&gt;5%</span> High depletion risk
              </p>
            </div>

            <div className="trajectory-table">
              <table>
                <thead>
                  <tr>
                    <th>Age</th>
                    <th>Portfolio</th>
                    <th>Status</th>
                    <th>Expenses</th>
                    <th>Income</th>
                    <th>By Income</th>
                    <th>By Returns</th>
                    <th>Capital Drawdown</th>
                    <th>Drawdown Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedScenario.results.trajectory
                    .filter(point => point.isRetired) // Only show retirement years
                    .map((point) => (
                      <tr key={point.age} className={point.netWorth <= 0 ? 'depleted' : ''}>
                        <td>{point.age}</td>
                        <td className={point.netWorth > 0 ? 'positive' : 'negative'}>
                          {fmt(point.netWorth)}
                        </td>
                        <td>{point.isRetired ? 'Retired' : 'Working'}</td>
                        <td>{fmt(point.expenses || 0)}</td>
                        <td>{fmt(point.income || 0)}</td>
                        <td className="positive">
                          {fmt(point.coveredByIncome || 0)}
                          {point.expenses > 0 && (
                            <small className="pct"> ({formatPercentage((point.coveredByIncome || 0) / point.expenses * 100)})</small>
                          )}
                        </td>
                        <td className="info">
                          {fmt(point.coveredByReturns || 0)}
                          {point.expenses > 0 && (
                            <small className="pct"> ({formatPercentage((point.coveredByReturns || 0) / point.expenses * 100)})</small>
                          )}
                        </td>
                        <td className={point.capitalDrawdown > 0 ? 'negative' : ''}>
                          {fmt(point.capitalDrawdown || 0)}
                          {point.expenses > 0 && (
                            <small className="pct"> ({formatPercentage((point.capitalDrawdown || 0) / point.expenses * 100)})</small>
                          )}
                        </td>
                        <td className={point.drawdownRate > 4 ? 'warning' : point.drawdownRate > 5 ? 'negative' : ''}>
                          {formatPercentage(point.drawdownRate || 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default Scenarios;
