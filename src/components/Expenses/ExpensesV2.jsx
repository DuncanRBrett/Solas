import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import {
  createDefaultExpenseCategory,
  createDefaultExpenseSubcategory,
  EXPENSE_TYPES,
  EXPENSE_FREQUENCIES,
  DEFAULT_ENABLED_CURRENCIES,
  getCurrencySymbol,
} from '../../models/defaults';
import {
  formatCurrency,
  toReportingCurrency,
  formatInReportingCurrency,
  getExchangeRates,
} from '../../utils/calculations';
import {
  exportExpensesToExcel,
  importExpensesFromExcel,
  exportExpenseTemplate,
} from '../../services/expenseImportExport';
import AgeBasedExpensePlanning from './AgeBasedExpensePlanning';
import './Expenses.css';

function ExpensesV2() {
  const {
    profile,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useStore();
  const { confirmDialog, showConfirm } = useConfirmDialog();

  const { expenseCategories = [], settings } = profile;
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings || {});
  const enabledCurrencies = settings?.enabledCurrencies || DEFAULT_ENABLED_CURRENCIES;

  // Helper to convert to reporting currency
  const toReporting = (amount, currency) =>
    toReportingCurrency(amount, currency, reportingCurrency, exchangeRates);

  // Helper to format amounts in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // UI State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showAgeBasedModal, setShowAgeBasedModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Form Data
  const [categoryFormData, setCategoryFormData] = useState(createDefaultExpenseCategory());
  const [subcategoryFormData, setSubcategoryFormData] = useState(
    createDefaultExpenseSubcategory()
  );

  // Calculate totals (convert all currencies to reporting currency)
  const calculations = useMemo(() => {
    let totalMonthly = 0;
    const byCategory = {};
    const byExpenseType = {
      'Fixed Non-Discretionary': { monthly: 0, count: 0 },
      'Variable Discretionary': { monthly: 0, count: 0 },
      'Luxury': { monthly: 0, count: 0 },
      'Wealth Building': { monthly: 0, count: 0 },
    };

    expenseCategories.forEach((category) => {
      let categoryTotal = 0;

      category.subcategories.forEach((sub) => {
        // Convert to monthly equivalent in original currency
        const monthlyAmountOriginal = sub.frequency === 'Annual'
          ? (sub.monthlyAmount || 0) / 12
          : (sub.monthlyAmount || 0);

        // Convert to reporting currency for totals
        const currency = sub.currency || reportingCurrency;
        const monthlyAmountConverted = toReporting(monthlyAmountOriginal, currency);

        categoryTotal += monthlyAmountConverted;
        totalMonthly += monthlyAmountConverted;

        // Track by expense type
        const expType = sub.expenseType || 'Variable Discretionary';
        if (byExpenseType[expType]) {
          byExpenseType[expType].monthly += monthlyAmountConverted;
          byExpenseType[expType].count += 1;
        }
      });

      byCategory[category.id] = {
        name: category.name,
        monthly: categoryTotal,
        annual: categoryTotal * 12,
        count: category.subcategories.length,
        percentage: 0, // Will calculate after we know total
      };
    });

    // Calculate percentages
    Object.keys(byCategory).forEach((catId) => {
      byCategory[catId].percentage =
        totalMonthly > 0 ? (byCategory[catId].monthly / totalMonthly) * 100 : 0;
    });

    // Calculate expense type percentages
    Object.keys(byExpenseType).forEach((type) => {
      byExpenseType[type].annual = byExpenseType[type].monthly * 12;
      byExpenseType[type].percentage =
        totalMonthly > 0 ? (byExpenseType[type].monthly / totalMonthly) * 100 : 0;
    });

    return {
      totalMonthly,
      totalAnnual: totalMonthly * 12,
      byCategory,
      byExpenseType,
    };
  }, [expenseCategories, exchangeRates, reportingCurrency]);

  // Category Management
  const handleAddCategory = () => {
    setCategoryFormData(createDefaultExpenseCategory());
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setCategoryFormData(category);
    setEditingCategory(category.id);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryFormData.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (editingCategory) {
      updateExpenseCategory(editingCategory, categoryFormData);
    } else {
      addExpenseCategory(categoryFormData);
    }

    setShowCategoryModal(false);
    setCategoryFormData(createDefaultExpenseCategory());
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId) => {
    const category = expenseCategories.find((c) => c.id === categoryId);
    const confirmed = await showConfirm({
      title: 'Delete Category',
      message: `Delete category "${category.name}" and all its ${category.subcategories.length} subcategories? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteExpenseCategory(categoryId);
      toast.success('Category deleted successfully');
    }
  };

  // Subcategory Management
  const handleAddSubcategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSubcategoryFormData(createDefaultExpenseSubcategory());
    setEditingSubcategory(null);
    setShowSubcategoryModal(true);
  };

  const handleEditSubcategory = (categoryId, subcategory) => {
    setSelectedCategoryId(categoryId);
    setSubcategoryFormData(subcategory);
    setEditingSubcategory(subcategory.id);
    setShowSubcategoryModal(true);
  };

  const handleSaveSubcategory = () => {
    if (!subcategoryFormData.name.trim()) {
      toast.error('Please enter a subcategory name');
      return;
    }

    if (editingSubcategory) {
      updateSubcategory(selectedCategoryId, editingSubcategory, subcategoryFormData);
    } else {
      addSubcategory(selectedCategoryId, subcategoryFormData);
    }

    setShowSubcategoryModal(false);
    setSubcategoryFormData(createDefaultExpenseSubcategory());
    setEditingSubcategory(null);
    setSelectedCategoryId(null);
  };

  const handleDeleteSubcategory = async (categoryId, subcategoryId) => {
    const confirmed = await showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteSubcategory(categoryId, subcategoryId);
      toast.success('Expense deleted successfully');
    }
  };

  // Import/Export
  const handleExport = () => {
    try {
      exportExpensesToExcel(expenseCategories, profile.name);
      toast.success('Expenses exported successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const importedCategories = await importExpensesFromExcel(file);

        const confirmed = await showConfirm({
          title: 'Import Expenses',
          message: `Import ${importedCategories.length} categories? This will replace your current expense categories.`,
          confirmText: 'Import',
          variant: 'warning',
        });

        if (!confirmed) {
          return;
        }

        // Replace all categories
        profile.expenseCategories = importedCategories;
        useStore.getState().saveProfile();

        toast.success(`Successfully imported ${importedCategories.length} expense categories!`);
        window.location.reload(); // Reload to reflect changes
      } catch (error) {
        toast.error(`Import failed: ${error.message}`);
      }
    };
    input.click();
  };

  const handleExportTemplate = () => {
    exportExpenseTemplate();
  };

  const getCategoryColor = (index) => {
    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#6366f1',
      '#06b6d4',
      '#84cc16',
      '#6b7280',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="expenses">
      {confirmDialog}

      <div className="expenses-header">
        <h2>Expense Management</h2>
        <div className="expense-actions">
          <button className="btn-primary" onClick={handleAddCategory}>
            + Add Category
          </button>
          <button className="btn-secondary" onClick={() => setShowAgeBasedModal(true)}>
            📅 Age-Based Planning
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            📥 Export
          </button>
          <button className="btn-secondary" onClick={handleImport}>
            📤 Import
          </button>
          <button className="btn-secondary" onClick={handleExportTemplate}>
            📄 Template
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="expenses-summary">
        <div className="summary-card">
          <h4>Total Monthly</h4>
          <p className="highlight">{fmt(calculations.totalMonthly)}</p>
          <small>Across all categories</small>
        </div>
        <div className="summary-card">
          <h4>Total Annual</h4>
          <p className="highlight">{fmt(calculations.totalAnnual)}</p>
          <small>Per year</small>
        </div>
        <div className="summary-card fixed">
          <h4>Fixed Non-Discretionary</h4>
          <p className="highlight">{fmt(calculations.byExpenseType['Fixed Non-Discretionary'].monthly)}</p>
          <small>{calculations.byExpenseType['Fixed Non-Discretionary'].percentage.toFixed(1)}% of total</small>
        </div>
        <div className="summary-card variable">
          <h4>Variable Discretionary</h4>
          <p className="highlight">{fmt(calculations.byExpenseType['Variable Discretionary'].monthly)}</p>
          <small>{calculations.byExpenseType['Variable Discretionary'].percentage.toFixed(1)}% of total</small>
        </div>
        <div className="summary-card luxury">
          <h4>Luxury</h4>
          <p className="highlight">{fmt(calculations.byExpenseType['Luxury'].monthly)}</p>
          <small>{calculations.byExpenseType['Luxury'].percentage.toFixed(1)}% of total</small>
        </div>
        <div className="summary-card wealth">
          <h4>Wealth Building</h4>
          <p className="highlight">{fmt(calculations.byExpenseType['Wealth Building'].monthly)}</p>
          <small>{calculations.byExpenseType['Wealth Building'].percentage.toFixed(1)}% of total</small>
        </div>
      </div>

      {/* Age-Based Expense Planning Indicator */}
      {profile.ageBasedExpensePlan?.enabled && (
        <div className="card">
          <div className="alert alert-info">
            ✓ <strong>Age-Based Expense Planning is enabled.</strong> Scenarios will use age-specific
            expense amounts with automatic inflation adjustment.
            <button
              className="btn-sm"
              style={{ marginLeft: '10px' }}
              onClick={() => setShowAgeBasedModal(true)}
            >
              Edit Plan
            </button>
          </div>
        </div>
      )}

      {/* Expense Categories */}
      {expenseCategories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>No expense categories yet.</p>
            <p>Click "+ Add Category" to create your first expense category.</p>
            <p>
              Or <button onClick={handleImport}>import from Excel</button> /{' '}
              <button onClick={handleExportTemplate}>download a template</button>.
            </p>
          </div>
        </div>
      ) : (
        expenseCategories.map((category, index) => {
          const categoryData = calculations.byCategory[category.id];
          const color = getCategoryColor(index);

          return (
            <div key={category.id} className="card expense-category">
              <div className="category-header" style={{ borderLeftColor: color }}>
                <div className="category-info">
                  <h3>{category.name}</h3>
                  <div className="category-stats">
                    <span>{fmt(categoryData.monthly)}/month</span>
                    <span>•</span>
                    <span>{fmt(categoryData.annual)}/year</span>
                    <span>•</span>
                    <span>{categoryData.percentage.toFixed(1)}% of total</span>
                    <span>•</span>
                    <span>{categoryData.count} expenses</span>
                  </div>
                </div>
                <div className="category-actions">
                  <button className="btn-sm" onClick={() => handleAddSubcategory(category.id)}>
                    + Add Expense
                  </button>
                  <button className="btn-sm" onClick={() => handleEditCategory(category)}>
                    Edit
                  </button>
                  <button className="btn-sm btn-danger" onClick={() => handleDeleteCategory(category.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {category.subcategories.length === 0 ? (
                <div className="empty-subcategories">
                  <p>No expenses in this category yet.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="subcategory-table">
                    <thead>
                      <tr>
                        <th>Expense</th>
                        <th>Type</th>
                        <th>Frequency</th>
                        <th>Currency</th>
                        <th>Amount</th>
                        <th>Monthly ({reportingCurrency})</th>
                        <th>Annual ({reportingCurrency})</th>
                        <th>% of Category</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.subcategories.map((subcategory) => {
                        const subCurrency = subcategory.currency || reportingCurrency;
                        const monthlyEquivOriginal = subcategory.frequency === 'Annual'
                          ? (subcategory.monthlyAmount || 0) / 12
                          : (subcategory.monthlyAmount || 0);

                        // Convert to reporting currency for totals
                        const monthlyEquivConverted = toReporting(monthlyEquivOriginal, subCurrency);

                        const subPct =
                          categoryData.monthly > 0
                            ? (monthlyEquivConverted / categoryData.monthly) * 100
                            : 0;

                        const expenseTypeClass = (subcategory.expenseType || 'Variable Discretionary')
                          .toLowerCase()
                          .replace(/ /g, '-');

                        return (
                          <tr key={subcategory.id}>
                            <td><strong>{subcategory.name}</strong></td>
                            <td>
                              <span className={`badge expense-type-${expenseTypeClass}`}>
                                {subcategory.expenseType || 'Variable Discretionary'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge frequency-${(subcategory.frequency || 'Monthly').toLowerCase()}`}>
                                {subcategory.frequency || 'Monthly'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge currency-${subCurrency.toLowerCase()}`}>
                                {subCurrency}
                              </span>
                            </td>
                            <td>{formatCurrency(subcategory.monthlyAmount || 0, 0, subCurrency)}</td>
                            <td>{fmt(monthlyEquivConverted)}</td>
                            <td>{fmt(monthlyEquivConverted * 12)}</td>
                            <td>{subPct.toFixed(1)}%</td>
                            <td><small>{subcategory.notes || '-'}</small></td>
                            <td>
                              <button
                                className="btn-small"
                                onClick={() => handleEditSubcategory(category.id, subcategory)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-small btn-danger"
                                onClick={() => handleDeleteSubcategory(category.id, subcategory.id)}
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
              )}
            </div>
          );
        })
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, name: e.target.value })
                  }
                  placeholder="e.g., Entertainment, Housing, Transport"
                  autoFocus
                />
                <small>After creating a category, you can add specific expenses to it.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCategoryModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveCategory}>
                {editingCategory ? 'Update' : 'Create'} Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {showSubcategoryModal && (
        <div className="modal-overlay" onClick={() => setShowSubcategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingSubcategory ? 'Edit Expense' : 'Add Expense'} in "
                {expenseCategories.find((c) => c.id === selectedCategoryId)?.name}"
              </h3>
              <button className="modal-close" onClick={() => setShowSubcategoryModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Expense Name *</label>
                <input
                  type="text"
                  value={subcategoryFormData.name}
                  onChange={(e) =>
                    setSubcategoryFormData({ ...subcategoryFormData, name: e.target.value })
                  }
                  placeholder="e.g., Eating out, Movies, Drinks"
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expense Type *</label>
                  <select
                    value={subcategoryFormData.expenseType || 'Variable Discretionary'}
                    onChange={(e) =>
                      setSubcategoryFormData({ ...subcategoryFormData, expenseType: e.target.value })
                    }
                  >
                    {EXPENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <small>Classification for budgeting and planning</small>
                </div>

                <div className="form-group">
                  <label>Currency *</label>
                  <select
                    value={subcategoryFormData.currency || 'ZAR'}
                    onChange={(e) =>
                      setSubcategoryFormData({ ...subcategoryFormData, currency: e.target.value })
                    }
                  >
                    {enabledCurrencies.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr} ({getCurrencySymbol(curr)})
                      </option>
                    ))}
                  </select>
                  <small>Currency of this expense</small>
                </div>

                <div className="form-group">
                  <label>Frequency *</label>
                  <select
                    value={subcategoryFormData.frequency || 'Monthly'}
                    onChange={(e) =>
                      setSubcategoryFormData({ ...subcategoryFormData, frequency: e.target.value })
                    }
                  >
                    {EXPENSE_FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                  <small>How often this expense occurs</small>
                </div>
              </div>

              <div className="form-group">
                <label>
                  {subcategoryFormData.frequency === 'Annual' ? 'Annual Amount *' : 'Monthly Amount *'}
                </label>
                <input
                  type="number"
                  step="100"
                  value={subcategoryFormData.monthlyAmount || ''}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      monthlyAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
                <small>
                  {subcategoryFormData.frequency === 'Annual'
                    ? 'Enter the total annual amount'
                    : 'Enter the monthly amount'}
                </small>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={subcategoryFormData.notes}
                  onChange={(e) =>
                    setSubcategoryFormData({ ...subcategoryFormData, notes: e.target.value })
                  }
                  placeholder="Optional notes about this expense..."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSubcategoryModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveSubcategory}>
                {editingSubcategory ? 'Update' : 'Add'} Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Age-Based Expense Planning Modal */}
      {showAgeBasedModal && (
        <AgeBasedExpensePlanning onClose={() => setShowAgeBasedModal(false)} />
      )}
    </div>
  );
}

export default ExpensesV2;
