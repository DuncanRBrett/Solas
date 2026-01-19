import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { formatCurrency, toReportingCurrency, getExchangeRates } from '../../utils/calculations';
import { DEFAULT_SETTINGS } from '../../models/defaults';
import './Expenses.css';

function AgeBasedExpensePlanning({ onClose }) {
  const { profile, updateAgeBasedExpensePlan } = useStore();
  const { expenseCategories = [], ageBasedExpensePlan, settings } = profile;
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';
  const lifePhases = settings?.lifePhases || DEFAULT_SETTINGS.lifePhases;
  const profileAge = settings?.profile?.age || 55;
  const lifeExpectancy = settings?.profile?.lifeExpectancy || 90;

  // Calculate current category totals from expense data
  const currentCategoryTotals = useMemo(() => {
    const exchangeRates = getExchangeRates(settings || {});
    const totals = {};

    expenseCategories.forEach((category) => {
      let categoryTotal = 0;

      category.subcategories.forEach((subcategory) => {
        // 'amount' field stores the value per frequency (monthly or annual)
        const monthlyAmount = subcategory.frequency === 'Annual'
          ? (subcategory.amount || 0) / 12
          : (subcategory.amount || 0);

        // Convert to reporting currency
        const currency = subcategory.currency || reportingCurrency;
        const monthlyInReporting = toReportingCurrency(
          monthlyAmount,
          currency,
          reportingCurrency,
          exchangeRates
        );

        categoryTotal += monthlyInReporting;
      });

      totals[category.name] = categoryTotal;
    });

    return totals;
  }, [expenseCategories, settings, reportingCurrency]);

  // Total current monthly spend
  const totalCurrentMonthly = useMemo(() => {
    return Object.values(currentCategoryTotals).reduce((sum, val) => sum + val, 0);
  }, [currentCategoryTotals]);

  // Initialize state from existing plan or create default 4-phase structure
  const [enabled, setEnabled] = useState(ageBasedExpensePlan?.enabled || false);

  // Create default phases based on settings
  const createDefaultPhases = () => [
    {
      key: 'working',
      name: lifePhases.working?.name || 'Working',
      startAge: profileAge,
      endAge: lifePhases.working?.ageEnd || 64,
      categoryExpenses: {},
    },
    {
      key: 'activeRetirement',
      name: lifePhases.activeRetirement?.name || 'Active Retirement',
      startAge: lifePhases.activeRetirement?.ageStart || 65,
      endAge: lifePhases.activeRetirement?.ageEnd || 72,
      categoryExpenses: {},
    },
    {
      key: 'slowerPace',
      name: lifePhases.slowerPace?.name || 'Slower Pace',
      startAge: lifePhases.slowerPace?.ageStart || 73,
      endAge: lifePhases.slowerPace?.ageEnd || 80,
      categoryExpenses: {},
    },
    {
      key: 'laterYears',
      name: lifePhases.laterYears?.name || 'Later Years',
      startAge: lifePhases.laterYears?.ageStart || 81,
      endAge: lifeExpectancy,
      categoryExpenses: {},
    },
  ];

  // Migrate old 3-phase format to new 4-phase format if needed
  const migrateOldFormat = (oldPlan) => {
    if (!oldPlan?.phases) return null;

    // Check if it's the old format (has 'expenses' key with subcategory structure)
    const hasOldFormat = oldPlan.phases.some(p => p.expenses && !p.categoryExpenses);

    if (hasOldFormat) {
      // Convert old subcategory-based expenses to category totals
      const exchangeRates = getExchangeRates(settings || {});
      return oldPlan.phases.map((phase, idx) => {
        const categoryExpenses = {};

        if (phase.expenses) {
          Object.keys(phase.expenses).forEach(categoryName => {
            let categoryTotal = 0;
            const subcats = phase.expenses[categoryName];
            if (subcats && typeof subcats === 'object') {
              Object.values(subcats).forEach(amount => {
                categoryTotal += amount || 0;
              });
            }
            if (categoryTotal > 0) {
              categoryExpenses[categoryName] = categoryTotal;
            }
          });
        }

        const defaultPhases = createDefaultPhases();
        const defaultPhase = defaultPhases[idx] || defaultPhases[defaultPhases.length - 1];

        return {
          key: defaultPhase.key,
          name: defaultPhase.name,
          startAge: phase.startAge || defaultPhase.startAge,
          endAge: phase.endAge || defaultPhase.endAge,
          categoryExpenses,
        };
      });
    }

    return null;
  };

  // Initialize phases
  const [phases, setPhases] = useState(() => {
    // Try to migrate old format
    const migratedPhases = migrateOldFormat(ageBasedExpensePlan);
    if (migratedPhases) {
      // Ensure we have 4 phases
      const defaultPhases = createDefaultPhases();
      while (migratedPhases.length < 4) {
        migratedPhases.push(defaultPhases[migratedPhases.length]);
      }
      return migratedPhases.slice(0, 4);
    }

    // Use existing new format or create default
    if (ageBasedExpensePlan?.phases?.length === 4 && ageBasedExpensePlan.phases[0]?.categoryExpenses !== undefined) {
      return ageBasedExpensePlan.phases;
    }

    return createDefaultPhases();
  });

  // Initialize category expenses from current totals if empty
  useEffect(() => {
    const needsInit = phases.some(phase =>
      Object.keys(phase.categoryExpenses || {}).length === 0
    );

    if (needsInit && Object.keys(currentCategoryTotals).length > 0) {
      setPhases(prev => prev.map((phase, idx) => {
        if (Object.keys(phase.categoryExpenses || {}).length === 0) {
          // Initialize with current totals, applying default percentages
          const defaultPercentages = [100, 100, 80, 60]; // Working, Active, Slower, Later
          const percentage = defaultPercentages[idx] || 100;
          const categoryExpenses = {};

          Object.entries(currentCategoryTotals).forEach(([catName, amount]) => {
            categoryExpenses[catName] = Math.round(amount * (percentage / 100));
          });

          return { ...phase, categoryExpenses };
        }
        return phase;
      }));
    }
  }, [currentCategoryTotals]);

  const handlePhaseChange = (phaseIdx, field, value) => {
    setPhases(prev =>
      prev.map((phase, idx) =>
        idx === phaseIdx ? { ...phase, [field]: parseInt(value) || 0 } : phase
      )
    );
  };

  const handleCategoryExpenseChange = (phaseIdx, categoryName, value) => {
    setPhases(prev =>
      prev.map((phase, idx) => {
        if (idx !== phaseIdx) return phase;

        return {
          ...phase,
          categoryExpenses: {
            ...phase.categoryExpenses,
            [categoryName]: parseFloat(value) || 0,
          },
        };
      })
    );
  };

  const calculatePhaseTotal = (phaseIdx) => {
    const phase = phases[phaseIdx];
    return Object.values(phase.categoryExpenses || {}).reduce((sum, val) => sum + (val || 0), 0);
  };

  const calculatePhasePercentage = (phaseIdx) => {
    const phaseTotal = calculatePhaseTotal(phaseIdx);
    return totalCurrentMonthly > 0 ? (phaseTotal / totalCurrentMonthly) * 100 : 0;
  };

  const handleSave = () => {
    const plan = {
      enabled,
      phases,
    };

    updateAgeBasedExpensePlan(plan);
    toast.success('Age-based expense plan saved!');
    onClose();
  };

  const handleResetFromCurrentExpenses = () => {
    const defaultPercentages = [100, 100, 80, 60];

    const resetPhases = phases.map((phase, idx) => {
      const percentage = defaultPercentages[idx] || 100;
      const categoryExpenses = {};

      Object.entries(currentCategoryTotals).forEach(([catName, amount]) => {
        categoryExpenses[catName] = Math.round(amount * (percentage / 100));
      });

      return {
        ...phase,
        categoryExpenses,
      };
    });

    setPhases(resetPhases);
    toast.success('Reset to current expenses with default percentages (100%, 100%, 80%, 60%)');
  };

  const handleResetAgeRanges = () => {
    const defaultPhases = createDefaultPhases();
    setPhases(prev =>
      prev.map((phase, idx) => ({
        ...phase,
        startAge: defaultPhases[idx].startAge,
        endAge: defaultPhases[idx].endAge,
      }))
    );
    toast.success('Age ranges reset to defaults');
  };

  const fmt = (amount) => formatCurrency(amount, 0, reportingCurrency);

  if (expenseCategories.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Age-Based Expense Planning</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="alert alert-warning">
              <p>
                <strong>No expense categories found.</strong>
              </p>
              <p>Please create expense categories first before setting up age-based planning.</p>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Age-Based Expense Planning</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Enable/Disable Toggle */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <strong> Enable age-based expense planning</strong>
            </label>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
              Plan your expenses across 4 life phases. Amounts are in <strong>{reportingCurrency}</strong> (today's money)
              and will be automatically inflation-adjusted in scenario projections.
            </p>
          </div>

          {/* Current Spend Summary */}
          <div className="card" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Current Monthly Spend:</strong> {fmt(totalCurrentMonthly)}
                <span style={{ color: '#6c757d', marginLeft: '1rem' }}>
                  ({fmt(totalCurrentMonthly * 12)}/year)
                </span>
              </div>
              <div>
                <span style={{ color: '#6c757d' }}>
                  {Object.keys(currentCategoryTotals).length} categories
                </span>
              </div>
            </div>
          </div>

          {!enabled && (
            <div className="alert alert-info">
              <p>Age-based expense planning is currently disabled.</p>
              <p>Enable it above to plan your expenses across different life phases.</p>
            </div>
          )}

          {enabled && (
            <>
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={handleResetFromCurrentExpenses}
                  title="Reset all phases from current expenses with default percentages"
                >
                  Reset from Current
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={handleResetAgeRanges}
                  title="Reset age ranges to match settings"
                >
                  Reset Age Ranges
                </button>
              </div>

              {/* Phase Cards */}
              <div className="age-based-phases">
                {phases.map((phase, phaseIdx) => {
                  const phaseTotal = calculatePhaseTotal(phaseIdx);
                  const phasePercentage = calculatePhasePercentage(phaseIdx);

                  return (
                    <div key={phase.key} className="card phase-card" style={{ marginBottom: '1rem' }}>
                      <div className="phase-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #e9ecef',
                        paddingBottom: '0.75rem',
                        marginBottom: '1rem'
                      }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{phase.name}</h4>
                          <div className="phase-age-range" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: '#6c757d' }}>Ages:</label>
                            <input
                              type="number"
                              value={phase.startAge}
                              onChange={(e) => handlePhaseChange(phaseIdx, 'startAge', e.target.value)}
                              min="0"
                              max="120"
                              style={{ width: '60px', padding: '0.25rem' }}
                            />
                            <span>to</span>
                            <input
                              type="number"
                              value={phase.endAge}
                              onChange={(e) => handlePhaseChange(phaseIdx, 'endAge', e.target.value)}
                              min="0"
                              max="120"
                              style={{ width: '60px', padding: '0.25rem' }}
                            />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>
                            {fmt(phaseTotal)}/month
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                            {fmt(phaseTotal * 12)}/year
                          </div>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            color: phasePercentage >= 100 ? '#059669' : phasePercentage >= 80 ? '#d97706' : '#dc2626'
                          }}>
                            {phasePercentage.toFixed(0)}% of current
                          </div>
                        </div>
                      </div>

                      {/* Category Expenses Grid */}
                      <div className="category-expenses-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '0.75rem'
                      }}>
                        {expenseCategories.map((category) => {
                          const currentAmount = currentCategoryTotals[category.name] || 0;
                          const phaseAmount = phase.categoryExpenses?.[category.name] || 0;
                          const categoryPercentage = currentAmount > 0 ? (phaseAmount / currentAmount) * 100 : 0;

                          return (
                            <div key={category.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '4px'
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{category.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                  Current: {fmt(currentAmount)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="number"
                                  step="100"
                                  value={phaseAmount || ''}
                                  onChange={(e) => handleCategoryExpenseChange(phaseIdx, category.name, e.target.value)}
                                  placeholder="0"
                                  style={{ width: '100px', padding: '0.25rem', textAlign: 'right' }}
                                />
                                <span style={{
                                  fontSize: '0.8rem',
                                  color: categoryPercentage >= 100 ? '#059669' : categoryPercentage >= 80 ? '#d97706' : '#dc2626',
                                  minWidth: '45px',
                                  textAlign: 'right'
                                }}>
                                  {categoryPercentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Table */}
              <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Phase Summary</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Phase</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem' }}>Ages</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Monthly</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>Annual</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem' }}>% of Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phases.map((phase, idx) => {
                      const total = calculatePhaseTotal(idx);
                      const pct = calculatePhasePercentage(idx);
                      return (
                        <tr key={phase.key} style={{ borderBottom: '1px solid #e9ecef' }}>
                          <td style={{ padding: '0.5rem', fontWeight: '500' }}>{phase.name}</td>
                          <td style={{ padding: '0.5rem', color: '#6c757d' }}>{phase.startAge} - {phase.endAge}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{fmt(total)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{fmt(total * 12)}</td>
                          <td style={{
                            padding: '0.5rem',
                            textAlign: 'right',
                            fontWeight: '500',
                            color: pct >= 100 ? '#059669' : pct >= 80 ? '#d97706' : '#dc2626'
                          }}>
                            {pct.toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Expense Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgeBasedExpensePlanning;
