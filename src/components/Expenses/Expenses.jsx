import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import {
  createDefaultExpense,
  DEFAULT_EXPENSE_CATEGORIES,
  EXPENSE_LEVELS,
} from '../../models/defaults';
import { formatCurrency } from '../../utils/calculations';
import './Expenses.css';

function Expenses() {
  const { profile, addExpense, updateExpense, deleteExpense } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState(createDefaultExpense());
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  const { expenses, settings } = profile;

  // Use configurable categories from settings, fallback to defaults
  const EXPENSE_CATEGORIES = settings?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES;

  // Calculate totals
  const calculations = useMemo(() => {
    const monthlyTotal = expenses.reduce((sum, e) => {
      if (e.frequency === 'Monthly') return sum + e.amount;
      return sum + e.amount / 12; // Annual converted to monthly
    }, 0);

    const annualTotal = monthlyTotal * 12;

    // By level (Essential, Discretionary, Luxury)
    const byLevel = EXPENSE_LEVELS.reduce((acc, level) => {
      const levelExpenses = expenses.filter((e) => {
        // Handle legacy isEssential field
        if (e.level) return e.level === level;
        if (level === 'Essential') return e.isEssential === true;
        if (level === 'Discretionary') return e.isEssential === false;
        return false;
      });
      const monthly = levelExpenses.reduce((sum, e) => {
        if (e.frequency === 'Monthly') return sum + e.amount;
        return sum + e.amount / 12;
      }, 0);
      acc[level] = {
        monthly,
        annual: monthly * 12,
        count: levelExpenses.length,
        percentage: monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0,
      };
      return acc;
    }, {});

    // By category
    const byCategory = EXPENSE_CATEGORIES.reduce((acc, cat) => {
      const catExpenses = expenses.filter((e) => e.category === cat);
      const monthly = catExpenses.reduce((sum, e) => {
        if (e.frequency === 'Monthly') return sum + e.amount;
        return sum + e.amount / 12;
      }, 0);
      acc[cat] = {
        monthly,
        annual: monthly * 12,
        count: catExpenses.length,
        percentage: monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0,
      };
      return acc;
    }, {});

    return {
      monthlyTotal,
      annualTotal,
      byLevel,
      byCategory,
    };
  }, [expenses, EXPENSE_CATEGORIES]);

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    const categoryMatch = filterCategory === 'all' || e.category === filterCategory;
    const levelMatch = filterLevel === 'all' || e.level === filterLevel ||
      // Handle legacy isEssential
      (filterLevel === 'Essential' && e.isEssential && !e.level) ||
      (filterLevel === 'Discretionary' && !e.isEssential && !e.level);
    return categoryMatch && levelMatch;
  });

  const handleAdd = () => {
    setFormData(createDefaultExpense());
    setIsAdding(true);
  };

  const handleEdit = (expense) => {
    setFormData(expense);
    setEditingExpense(expense.id);
  };

  const handleSave = () => {
    if (editingExpense) {
      updateExpense(editingExpense, formData);
      setEditingExpense(null);
    } else {
      addExpense(formData);
      setIsAdding(false);
    }
    setFormData(createDefaultExpense());
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingExpense(null);
    setFormData(createDefaultExpense());
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(id);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      Housing: '#3b82f6',
      Food: '#10b981',
      Transport: '#f59e0b',
      Healthcare: '#ef4444',
      Insurance: '#8b5cf6',
      Entertainment: '#ec4899',
      Discretionary: '#6366f1',
      Education: '#06b6d4',
      Utilities: '#84cc16',
      Other: '#6b7280',
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="expenses">
      <div className="expenses-header">
        <h2>Expenses ({expenses.length})</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="expenses-summary">
        <div className="summary-card">
          <h4>Monthly Total</h4>
          <p className="highlight">{formatCurrency(calculations.monthlyTotal, 0)}</p>
          <small>All expenses</small>
        </div>
        <div className="summary-card">
          <h4>Annual Total</h4>
          <p className="highlight">{formatCurrency(calculations.annualTotal, 0)}</p>
          <small>Per year</small>
        </div>
        <div className="summary-card essential">
          <h4>Essential</h4>
          <p className="highlight">{formatCurrency(calculations.byLevel.Essential?.monthly || 0, 0)}</p>
          <small>{formatCurrency(calculations.byLevel.Essential?.annual || 0, 0)}/year</small>
        </div>
        <div className="summary-card discretionary">
          <h4>Discretionary</h4>
          <p className="highlight">{formatCurrency(calculations.byLevel.Discretionary?.monthly || 0, 0)}</p>
          <small>{formatCurrency(calculations.byLevel.Discretionary?.annual || 0, 0)}/year</small>
        </div>
        <div className="summary-card luxury">
          <h4>Luxury</h4>
          <p className="highlight">{formatCurrency(calculations.byLevel.Luxury?.monthly || 0, 0)}</p>
          <small>{formatCurrency(calculations.byLevel.Luxury?.annual || 0, 0)}/year</small>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <h3>Expenses by Category</h3>
        <div className="category-breakdown">
          {EXPENSE_CATEGORIES.filter((cat) => calculations.byCategory[cat].count > 0).map(
            (category) => {
              const data = calculations.byCategory[category];
              return (
                <div key={category} className="category-row">
                  <div
                    className="category-color"
                    style={{ backgroundColor: getCategoryColor(category) }}
                  />
                  <span className="category-name">{category}</span>
                  <span className="category-count">({data.count})</span>
                  <div className="category-bar-container">
                    <div
                      className="category-bar"
                      style={{
                        width: `${data.percentage}%`,
                        backgroundColor: getCategoryColor(category),
                      }}
                    />
                  </div>
                  <span className="category-amount">{formatCurrency(data.monthly, 0)}</span>
                  <span className="category-percentage">{data.percentage.toFixed(1)}%</span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Expense Form */}
      {(isAdding || editingExpense) && (
        <div className="card expense-form">
          <h3>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Rent, Groceries, Car Insurance"
              />
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="100"
                value={formData.amount}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Expense Level *</label>
              <select
                value={formData.level || 'Essential'}
                onChange={(e) => handleChange('level', e.target.value)}
              >
                {EXPENSE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <small>
                {formData.level === 'Essential' && 'Cannot be easily reduced in retirement'}
                {formData.level === 'Discretionary' && 'Can be reduced if needed'}
                {formData.level === 'Luxury' && 'First to cut in tight times'}
              </small>
            </div>

            <div className="form-group">
              <label>Budget (Optional)</label>
              <input
                type="number"
                step="100"
                value={formData.budget || ''}
                onChange={(e) => handleChange('budget', e.target.value ? parseFloat(e.target.value) : 0)}
                placeholder="Set a budget limit"
              />
              <small>Track spending against a target</small>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this expense..."
                rows="2"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>
              {editingExpense ? 'Update' : 'Add'} Expense
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="expenses-filter">
        <div className="filter-group">
          <label>Category: </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Level: </label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="all">All Levels</option>
            {EXPENSE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="table-container">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Frequency</th>
                <th>Monthly Equivalent</th>
                <th>Level</th>
                <th>Budget</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="8" className="no-data">
                    {filterCategory === 'all'
                      ? 'No expenses yet. Click "Add Expense" to get started.'
                      : `No expenses in ${filterCategory} category.`}
                  </td>
                </tr>
              )}
              {filteredExpenses.map((expense) => {
                const monthlyEquivalent =
                  expense.frequency === 'Monthly' ? expense.amount : expense.amount / 12;
                const isOverBudget = expense.budget > 0 && expense.amount > expense.budget;

                return (
                  <tr key={expense.id}>
                    <td>{expense.name}</td>
                    <td>
                      <span
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(expense.category) }}
                      >
                        {expense.category}
                      </span>
                    </td>
                    <td>{formatCurrency(expense.amount, 0)}</td>
                    <td>{expense.frequency}</td>
                    <td>{formatCurrency(monthlyEquivalent, 0)}</td>
                    <td>
                      <span className={`badge ${(expense.level || 'Essential').toLowerCase()}`}>
                        {expense.level || (expense.isEssential ? 'Essential' : 'Discretionary')}
                      </span>
                    </td>
                    <td>
                      {expense.budget > 0 ? (
                        <span className={isOverBudget ? 'over-budget' : ''}>
                          {formatCurrency(expense.budget, 0)}
                          {isOverBudget && ' (Over!)'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button className="btn-small" onClick={() => handleEdit(expense)}>
                        Edit
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDelete(expense.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Expenses;
