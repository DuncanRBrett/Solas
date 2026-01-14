import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/calculations';
import './Expenses.css';

function AgeBasedExpensePlanning({ onClose }) {
  const { profile, updateAgeBasedExpensePlan } = useStore();
  const { expenseCategories = [], ageBasedExpensePlan, settings } = profile;
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';

  // Initialize state from existing plan or create default
  const [enabled, setEnabled] = useState(ageBasedExpensePlan?.enabled || false);
  const [phases, setPhases] = useState(
    ageBasedExpensePlan?.phases || [
      { startAge: settings?.profile?.age || 40, endAge: 60, expenses: {} },
      { startAge: 60, endAge: 75, expenses: {} },
      { startAge: 75, endAge: 90, expenses: {} },
    ]
  );

  // Initialize expense amounts from existing plan or current subcategory amounts
  useEffect(() => {
    const initializedPhases = phases.map((phase, phaseIdx) => {
      const phaseExpenses = {};

      expenseCategories.forEach((category) => {
        phaseExpenses[category.name] = {};

        category.subcategories.forEach((subcategory) => {
          // Try to get existing amount from plan, otherwise use current amount
          const existingAmount =
            ageBasedExpensePlan?.phases?.[phaseIdx]?.expenses?.[category.name]?.[
              subcategory.name
            ];

          phaseExpenses[category.name][subcategory.name] =
            existingAmount !== undefined ? existingAmount : subcategory.monthlyAmount || 0;
        });
      });

      return {
        ...phase,
        expenses: phaseExpenses,
      };
    });

    setPhases(initializedPhases);
  }, []);

  const handlePhaseChange = (phaseIdx, field, value) => {
    setPhases((prev) =>
      prev.map((phase, idx) =>
        idx === phaseIdx ? { ...phase, [field]: parseInt(value) } : phase
      )
    );
  };

  const handleExpenseChange = (phaseIdx, categoryName, subcategoryName, value) => {
    setPhases((prev) =>
      prev.map((phase, idx) => {
        if (idx !== phaseIdx) return phase;

        return {
          ...phase,
          expenses: {
            ...phase.expenses,
            [categoryName]: {
              ...phase.expenses[categoryName],
              [subcategoryName]: parseFloat(value) || 0,
            },
          },
        };
      })
    );
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

  const calculatePhaseTotal = (phaseIdx) => {
    const phase = phases[phaseIdx];
    let total = 0;

    Object.keys(phase.expenses).forEach((categoryName) => {
      Object.keys(phase.expenses[categoryName]).forEach((subcategoryName) => {
        total += phase.expenses[categoryName][subcategoryName] || 0;
      });
    });

    return total;
  };

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
              <p>Please create expense categories and subcategories first before setting up age-based planning.</p>
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

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <strong> Enable age-based expense planning</strong>
            </label>
            <p className="text-muted">
              When enabled, scenarios will use these age-specific expense amounts instead of the
              percentage multipliers. Enter amounts in <strong>current rands</strong> - they will be
              automatically inflation-adjusted in scenario projections.
            </p>
          </div>

          {!enabled && (
            <div className="alert alert-info">
              <p>Age-based expense planning is currently disabled.</p>
              <p>Enable it above to plan your expenses across different age phases.</p>
            </div>
          )}

          {enabled && (
            <div className="age-based-phases">
              {phases.map((phase, phaseIdx) => {
                const phaseTotal = calculatePhaseTotal(phaseIdx);

                return (
                  <div key={phaseIdx} className="card phase-card">
                    <div className="phase-header">
                      <h4>Phase {phaseIdx + 1}</h4>
                      <div className="phase-age-range">
                        <div className="form-group-inline">
                          <label>Start Age:</label>
                          <input
                            type="number"
                            value={phase.startAge}
                            onChange={(e) =>
                              handlePhaseChange(phaseIdx, 'startAge', e.target.value)
                            }
                            min="0"
                            max="120"
                            style={{ width: '80px' }}
                          />
                        </div>
                        <span> - </span>
                        <div className="form-group-inline">
                          <label>End Age:</label>
                          <input
                            type="number"
                            value={phase.endAge}
                            onChange={(e) =>
                              handlePhaseChange(phaseIdx, 'endAge', e.target.value)
                            }
                            min="0"
                            max="120"
                            style={{ width: '80px' }}
                          />
                        </div>
                      </div>
                      <div className="phase-total">
                        <strong>Phase Total:</strong> {formatCurrency(phaseTotal, 0, reportingCurrency)}/month (
                        {formatCurrency(phaseTotal * 12, 0, reportingCurrency)}/year)
                      </div>
                    </div>

                    <div className="phase-expenses">
                      {expenseCategories.map((category) => (
                        <div key={category.id} className="category-section">
                          <h5>{category.name}</h5>
                          <div className="subcategory-grid">
                            {category.subcategories.map((subcategory) => (
                              <div key={subcategory.id} className="form-group">
                                <label>{subcategory.name}</label>
                                <input
                                  type="number"
                                  step="100"
                                  value={
                                    phase.expenses[category.name]?.[subcategory.name] || ''
                                  }
                                  onChange={(e) =>
                                    handleExpenseChange(
                                      phaseIdx,
                                      category.name,
                                      subcategory.name,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Monthly amount"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
