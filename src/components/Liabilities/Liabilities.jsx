import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import {
  createDefaultLiability,
  PLATFORMS,
  DEFAULT_ENABLED_CURRENCIES,
  getCurrencySymbol,
} from '../../models/defaults';
import {
  formatCurrency,
  toReportingCurrency,
  getExchangeRates,
} from '../../utils/calculations';
import './Liabilities.css';

function Liabilities() {
  const { profile, addLiability, updateLiability, deleteLiability } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingLiability, setEditingLiability] = useState(null);
  const [formData, setFormData] = useState(createDefaultLiability());
  const { confirmDialog, showConfirm } = useConfirmDialog();

  const { liabilities, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);
  const enabledCurrencies = settings.enabledCurrencies || DEFAULT_ENABLED_CURRENCIES;

  // Helper to convert to reporting currency
  const toReporting = (amount, currency) =>
    toReportingCurrency(amount, currency, reportingCurrency, exchangeRates);

  // Calculate totals
  const totals = useMemo(() => {
    const totalPrincipal = liabilities.reduce(
      (sum, l) => sum + toReporting(l.principal, l.currency),
      0
    );
    const totalMonthlyPayments = liabilities.reduce(
      (sum, l) => sum + toReporting(l.monthlyPayment, l.currency),
      0
    );
    const avgInterestRate =
      liabilities.length > 0
        ? liabilities.reduce((sum, l) => sum + l.interestRate, 0) / liabilities.length
        : 0;

    return {
      totalPrincipal,
      totalMonthlyPayments,
      totalAnnualPayments: totalMonthlyPayments * 12,
      avgInterestRate,
    };
  }, [liabilities, exchangeRates, reportingCurrency]);

  const handleAdd = () => {
    setFormData(createDefaultLiability());
    setIsAdding(true);
  };

  const handleEdit = (liability) => {
    setFormData(liability);
    setEditingLiability(liability.id);
  };

  const handleSave = () => {
    let result;

    if (editingLiability) {
      result = updateLiability(editingLiability, formData);
    } else {
      result = addLiability(formData);
    }

    if (!result.success) {
      toast.error(result.message, { duration: 6000, style: { maxWidth: '500px' } });
      console.error('Liability validation failed:', result.errors);
      return;
    }

    toast.success(editingLiability ? 'Liability updated successfully' : 'Liability added successfully');
    setEditingLiability(null);
    setIsAdding(false);
    setFormData(createDefaultLiability());
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingLiability(null);
    setFormData(createDefaultLiability());
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Liability',
      message: 'Are you sure you want to delete this liability? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteLiability(id);
      toast.success('Liability deleted successfully');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate remaining time for a liability
  const getRemainingMonths = (liability) => {
    if (!liability.maturityDate) return null;
    const maturity = new Date(liability.maturityDate);
    const now = new Date();
    const months = Math.ceil((maturity - now) / (1000 * 60 * 60 * 24 * 30));
    return months > 0 ? months : 0;
  };

  return (
    <div className="liabilities">
      {confirmDialog}

      <div className="liabilities-header">
        <h2>Liabilities ({liabilities.length})</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Liability
        </button>
      </div>

      {/* Summary Cards */}
      <div className="liabilities-summary">
        <div className="summary-card total-debt">
          <h4>Total Debt</h4>
          <p className="highlight negative">{formatCurrency(totals.totalPrincipal, 0, reportingCurrency)}</p>
          <small>Outstanding principal</small>
        </div>
        <div className="summary-card">
          <h4>Monthly Payments</h4>
          <p className="highlight">{formatCurrency(totals.totalMonthlyPayments, 0, reportingCurrency)}</p>
          <small>Total monthly commitments</small>
        </div>
        <div className="summary-card">
          <h4>Annual Payments</h4>
          <p className="highlight">{formatCurrency(totals.totalAnnualPayments, 0, reportingCurrency)}</p>
          <small>Total yearly commitments</small>
        </div>
        <div className="summary-card">
          <h4>Avg Interest Rate</h4>
          <p className="highlight">{totals.avgInterestRate.toFixed(2)}%</p>
          <small>Across all liabilities</small>
        </div>
      </div>

      {/* Info Box */}
      {liabilities.length === 0 && (
        <div className="card info-box">
          <h3>No Liabilities</h3>
          <p>
            You currently have no liabilities recorded. This module is useful for tracking:
          </p>
          <ul>
            <li>Mortgages and home loans</li>
            <li>Car loans</li>
            <li>Credit card debt</li>
            <li>Personal loans</li>
            <li>Student loans</li>
          </ul>
          <p>
            Liabilities are subtracted from your gross assets to calculate your net worth.
          </p>
        </div>
      )}

      {/* Liability Form */}
      {(isAdding || editingLiability) && (
        <div className="card liability-form">
          <h3>{editingLiability ? 'Edit Liability' : 'Add New Liability'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Home Mortgage, Car Loan"
              />
            </div>

            <div className="form-group">
              <label>Principal Amount *</label>
              <input
                type="number"
                step="1000"
                value={formData.principal}
                onChange={(e) => handleChange('principal', parseFloat(e.target.value) || 0)}
              />
              <small>Current outstanding balance</small>
            </div>

            <div className="form-group">
              <label>Currency *</label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
              >
                {enabledCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c} ({getCurrencySymbol(c)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Interest Rate (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                value={formData.interestRate}
                onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Monthly Payment</label>
              <input
                type="number"
                step="100"
                value={formData.monthlyPayment}
                onChange={(e) => handleChange('monthlyPayment', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Maturity Date</label>
              <input
                type="date"
                value={formData.maturityDate}
                onChange={(e) => handleChange('maturityDate', e.target.value)}
              />
              <small>When will this debt be paid off?</small>
            </div>

            <div className="form-group">
              <label>Platform/Institution</label>
              <select
                value={formData.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
              >
                <option value="">Select...</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <small>Where is this debt held?</small>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this liability..."
                rows="2"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>
              {editingLiability ? 'Update' : 'Add'} Liability
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Liabilities Table */}
      {liabilities.length > 0 && (
        <div className="card">
          <div className="table-container">
            <table className="liabilities-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Principal ({reportingCurrency})</th>
                  <th>Interest Rate</th>
                  <th>Monthly Payment</th>
                  <th>Maturity</th>
                  <th>Remaining</th>
                  <th>Platform</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {liabilities.map((liability) => {
                  const principal = toReporting(liability.principal, liability.currency);
                  const monthly = toReporting(liability.monthlyPayment, liability.currency);
                  const remainingMonths = getRemainingMonths(liability);

                  return (
                    <tr key={liability.id}>
                      <td>{liability.name}</td>
                      <td className="negative">
                        {liability.currency !== reportingCurrency && (
                          <span className="currency-badge">{liability.currency}</span>
                        )}
                        {formatCurrency(principal, 0, reportingCurrency)}
                      </td>
                      <td>{liability.interestRate.toFixed(2)}%</td>
                      <td>{formatCurrency(monthly, 0, reportingCurrency)}</td>
                      <td>
                        {liability.maturityDate
                          ? new Date(liability.maturityDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td>
                        {remainingMonths !== null ? (
                          <span className={remainingMonths === 0 ? 'badge paid-off' : ''}>
                            {remainingMonths === 0
                              ? 'Paid off'
                              : `${remainingMonths} months`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{liability.platform || '-'}</td>
                      <td>
                        <button className="btn-small" onClick={() => handleEdit(liability)}>
                          Edit
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => handleDelete(liability.id)}
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
      )}
    </div>
  );
}

export default Liabilities;
