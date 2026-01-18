import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import {
  createDefaultIncome,
  createDefaultAnnuity,
  DEFAULT_ENABLED_CURRENCIES,
  getCurrencySymbol,
} from '../../models/defaults';
import {
  formatCurrency,
  toReportingCurrency,
  calculateAssetValue,
  formatInReportingCurrency,
  getExchangeRates,
} from '../../utils/calculations';
import './Income.css';

// Income types
const INCOME_TYPES = ['Work', 'Investment', 'Pension', 'Rental', 'Annuity', 'Other'];

// Annuity types
const ANNUITY_TYPES = [
  { value: 'living', label: 'Living Annuity' },
  { value: 'life', label: 'Life Annuity' },
];

// Calculate drawdown rate for living annuity
const calculateDrawdownRate = (monthlyAmount, capitalValue) => {
  if (!capitalValue || capitalValue <= 0) return 0;
  const annualDrawdown = monthlyAmount * 12;
  return (annualDrawdown / capitalValue) * 100;
};

// Check if drawdown rate is valid (2.5% - 17.5%)
const isValidDrawdownRate = (rate) => rate >= 2.5 && rate <= 17.5;

function Income() {
  const { profile, addIncome, updateIncome, deleteIncome } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formData, setFormData] = useState(createDefaultIncome());
  const [showDividendIncome, setShowDividendIncome] = useState(false);
  const { confirmDialog, showConfirm } = useConfirmDialog();

  const { income, assets, settings } = profile || {};
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);
  const enabledCurrencies = settings?.enabledCurrencies || DEFAULT_ENABLED_CURRENCIES;
  const currentAge = settings?.profile?.age;
  const marginalTaxRate = settings?.profile?.marginalTaxRate || 39;

  // Helper to convert to reporting currency
  const toReporting = (amount, currency) =>
    toReportingCurrency(amount, currency, reportingCurrency, exchangeRates);

  // Helper function for formatting in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Calculate dividend income from assets (after 20% dividend withholding tax)
  const dividendIncomeFromAssets = useMemo(() => {
    return assets
      .filter(asset => (asset.dividendYield > 0 || asset.incomeYield > 0) && asset.assetType === 'Investible')
      .map(asset => {
        const assetValue = calculateAssetValue(asset, settings);
        const yieldPct = asset.dividendYield || asset.incomeYield || 0;
        const annualDividend = assetValue * (yieldPct / 100);
        const monthlyDividend = annualDividend / 12;
        return {
          id: `dividend-${asset.id}`,
          assetName: asset.name,
          assetClass: asset.assetClass,
          assetValue,
          yield: yieldPct,
          annualDividend,
          monthlyDividend,
        };
      });
  }, [assets, settings]);

  // Calculate interest income from assets (taxed at marginal rate)
  const interestIncomeFromAssets = useMemo(() => {
    return assets
      .filter(asset => asset.interestYield > 0 && asset.assetType === 'Investible')
      .map(asset => {
        const assetValue = calculateAssetValue(asset, settings);
        const grossAnnualInterest = assetValue * (asset.interestYield / 100);
        const tax = grossAnnualInterest * (marginalTaxRate / 100);
        const netAnnualInterest = grossAnnualInterest - tax;
        return {
          id: `interest-${asset.id}`,
          assetName: asset.name,
          assetClass: asset.assetClass,
          assetValue,
          yield: asset.interestYield,
          grossAnnualInterest,
          taxAmount: tax,
          netAnnualInterest,
          netMonthlyInterest: netAnnualInterest / 12,
        };
      });
  }, [assets, settings, marginalTaxRate]);

  const totalDividendIncomeMonthly = dividendIncomeFromAssets.reduce(
    (sum, d) => sum + d.monthlyDividend,
    0
  );

  const totalInterestIncomeMonthly = interestIncomeFromAssets.reduce(
    (sum, i) => sum + i.netMonthlyInterest,
    0
  );

  const totalAssetIncomeMonthly = totalDividendIncomeMonthly + totalInterestIncomeMonthly;

  // Calculate total current income (active sources)
  const totalCurrentMonthly = income
    .filter(i => {
      const isStarted = i.startAge === null || currentAge >= i.startAge;
      const isNotEnded = i.endAge === null || currentAge <= i.endAge;
      return isStarted && isNotEnded;
    })
    .reduce((sum, i) => sum + toReporting(i.monthlyAmount, i.currency), 0);

  // Total including all asset income
  const totalIncludingAssetIncome = totalCurrentMonthly + totalAssetIncomeMonthly;

  const handleAdd = () => {
    setFormData(createDefaultIncome());
    setIsAdding(true);
  };

  const handleEdit = (incomeItem) => {
    setFormData(incomeItem);
    setEditingIncome(incomeItem.id);
  };

  const handleSave = () => {
    let result;

    if (editingIncome) {
      result = updateIncome(editingIncome, formData);
    } else {
      result = addIncome(formData);
    }

    if (!result.success) {
      toast.error(result.message, { duration: 6000, style: { maxWidth: '500px' } });
      console.error('Income validation failed:', result.errors);
      return;
    }

    toast.success(editingIncome ? 'Income updated successfully' : 'Income added successfully');
    setEditingIncome(null);
    setIsAdding(false);
    setFormData(createDefaultIncome());
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingIncome(null);
    setFormData(createDefaultIncome());
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Income Source',
      message: 'Are you sure you want to delete this income source? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteIncome(id);
      toast.success('Income source deleted successfully');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // When switching to Annuity type, initialize annuity fields
      if (field === 'type' && value === 'Annuity' && !prev.annuityType) {
        updated.annuityType = 'living';
        updated.capitalValue = 0;
        updated.escalationRate = 5;
        updated.isInflationAdjusted = false; // Annuities use escalation rate
      }

      // When switching away from Annuity type, clear annuity fields
      if (field === 'type' && value !== 'Annuity') {
        updated.annuityType = null;
        updated.capitalValue = null;
        updated.escalationRate = null;
        updated.guaranteedPeriod = null;
        updated.provider = '';
      }

      return updated;
    });
  };

  // Determine income status based on age
  const getIncomeStatus = (incomeItem) => {
    const isStarted = incomeItem.startAge === null || currentAge >= incomeItem.startAge;
    const isNotEnded = incomeItem.endAge === null || currentAge <= incomeItem.endAge;

    if (isStarted && isNotEnded) return 'active';
    if (!isStarted) return 'future';
    return 'ended';
  };

  // Add asset income (dividend + interest) to income module
  const handleAddDividendIncome = () => {
    const assetIncome = {
      ...createDefaultIncome(),
      name: 'Asset Income (dividends + interest)',
      type: 'Investment',
      monthlyAmount: Math.round(totalAssetIncomeMonthly),
      currency: 'ZAR',
      startAge: currentAge,
      endAge: null,
      isTaxable: false, // Already after-tax (dividend WHT and interest tax applied)
      isInflationAdjusted: false,
      notes: `Auto-calculated from asset yields. Dividend: R${Math.round(totalDividendIncomeMonthly)}/month, Interest: R${Math.round(totalInterestIncomeMonthly)}/month. Update manually as portfolio changes.`,
    };
    addIncome(assetIncome);
  };

  return (
    <div className="income">
      {confirmDialog}

      <div className="income-header">
        <h2>Income Sources ({income.length})</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Income
        </button>
      </div>

      {/* Summary Cards */}
      <div className="income-summary">
        <div className="summary-card">
          <h4>Active Income Sources</h4>
          <p className="highlight">{fmt(totalCurrentMonthly)}</p>
          <small>From income sources below</small>
        </div>
        <div className="summary-card dividend">
          <h4>Dividend Income</h4>
          <p className="highlight">{fmt(totalDividendIncomeMonthly)}</p>
          <small>After 20% WHT, from assets</small>
        </div>
        <div className="summary-card interest">
          <h4>Interest Income</h4>
          <p className="highlight">{fmt(totalInterestIncomeMonthly)}</p>
          <small>After {marginalTaxRate}% tax, from assets</small>
        </div>
        <div className="summary-card total">
          <h4>Total Monthly Income</h4>
          <p className="highlight">{fmt(totalIncludingAssetIncome)}</p>
          <small>All sources combined</small>
        </div>
      </div>

      {/* Income Form */}
      {(isAdding || editingIncome) && (
        <div className="card income-form">
          <h3>{editingIncome ? 'Edit Income Source' : 'Add New Income Source'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Salary, Pension, Rental Income"
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {INCOME_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Monthly Amount *</label>
              <input
                type="number"
                step="100"
                value={formData.monthlyAmount}
                onChange={(e) => handleChange('monthlyAmount', parseFloat(e.target.value) || 0)}
              />
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

            {/* Annuity-specific fields */}
            {formData.type === 'Annuity' && (
              <>
                <div className="form-group">
                  <label>Annuity Type *</label>
                  <select
                    value={formData.annuityType || 'living'}
                    onChange={(e) => handleChange('annuityType', e.target.value)}
                  >
                    {ANNUITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <small>
                    {formData.annuityType === 'living'
                      ? 'You own the capital, choose drawdown rate'
                      : 'Insurer owns capital, guaranteed income for life'}
                  </small>
                </div>

                <div className="form-group">
                  <label>Capital Value *</label>
                  <input
                    type="number"
                    step="10000"
                    value={formData.capitalValue || ''}
                    onChange={(e) => handleChange('capitalValue', parseFloat(e.target.value) || 0)}
                    placeholder="Current capital value"
                  />
                  <small>
                    {formData.annuityType === 'living'
                      ? 'Current capital in the annuity'
                      : 'Purchase price paid for the annuity'}
                  </small>
                </div>

                {/* Drawdown rate display for living annuity */}
                {formData.annuityType === 'living' && formData.capitalValue > 0 && (
                  <div className="form-group">
                    <label>Drawdown Rate</label>
                    <div className={`drawdown-display ${!isValidDrawdownRate(calculateDrawdownRate(formData.monthlyAmount, formData.capitalValue)) ? 'invalid' : 'valid'}`}>
                      {calculateDrawdownRate(formData.monthlyAmount, formData.capitalValue).toFixed(2)}%
                    </div>
                    <small className={!isValidDrawdownRate(calculateDrawdownRate(formData.monthlyAmount, formData.capitalValue)) ? 'error-text' : ''}>
                      Must be between 2.5% and 17.5% (SARS requirement)
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label>Escalation Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    value={formData.escalationRate ?? 5}
                    onChange={(e) => handleChange('escalationRate', parseFloat(e.target.value) || 0)}
                  />
                  <small>Annual increase in income (e.g., 5% or CPI-linked)</small>
                </div>

                <div className="form-group">
                  <label>Provider</label>
                  <input
                    type="text"
                    value={formData.provider || ''}
                    onChange={(e) => handleChange('provider', e.target.value)}
                    placeholder="e.g., Allan Gray, Coronation"
                  />
                </div>

                {formData.annuityType === 'life' && (
                  <div className="form-group">
                    <label>Guaranteed Period (years)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.guaranteedPeriod || ''}
                      onChange={(e) => handleChange('guaranteedPeriod', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Optional"
                    />
                    <small>Years of guaranteed payment to beneficiaries (informational)</small>
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Start Age</label>
              <input
                type="number"
                value={formData.startAge || ''}
                onChange={(e) => handleChange('startAge', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Leave blank for now"
              />
              <small>When does this income start?</small>
            </div>

            <div className="form-group">
              <label>End Age</label>
              <input
                type="number"
                value={formData.endAge || ''}
                onChange={(e) => handleChange('endAge', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Leave blank for lifetime"
              />
              <small>When does this income end? (blank = lifetime)</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => handleChange('isTaxable', e.target.checked)}
                />
                Taxable
              </label>
              <small>Is this income subject to income tax?</small>
            </div>

            {/* Hide inflation adjusted for annuities - they use escalation rate */}
            {formData.type !== 'Annuity' && (
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isInflationAdjusted}
                    onChange={(e) => handleChange('isInflationAdjusted', e.target.checked)}
                  />
                  Inflation Adjusted
                </label>
                <small>Does this income grow with inflation?</small>
              </div>
            )}

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this income source..."
                rows="2"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>
              {editingIncome ? 'Update' : 'Add'} Income
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Income Table */}
      <div className="card">
        <div className="table-container">
          <table className="income-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Monthly ({reportingCurrency})</th>
                <th>Annual ({reportingCurrency})</th>
                <th>Start Age</th>
                <th>End Age</th>
                <th>Taxable</th>
                <th>Inflation Adj.</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {income.length === 0 && (
                <tr>
                  <td colSpan="10" className="no-data">
                    No income sources yet. Click "Add Income" to get started.
                  </td>
                </tr>
              )}
              {income.map((item) => {
                const status = getIncomeStatus(item);
                const monthly = toReporting(item.monthlyAmount, item.currency);
                const annual = monthly * 12;
                const isAnnuity = item.type === 'Annuity';
                const drawdownRate = isAnnuity && item.annuityType === 'living' && item.capitalValue > 0
                  ? calculateDrawdownRate(item.monthlyAmount, item.capitalValue)
                  : null;

                return (
                  <tr key={item.id} className={status === 'ended' ? 'ended-row' : ''}>
                    <td>
                      {item.name}
                      {isAnnuity && item.provider && (
                        <span className="provider-label"> ({item.provider})</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge type-${item.type.toLowerCase()}`}>
                        {item.type}
                      </span>
                      {isAnnuity && (
                        <span className={`badge annuity-type-${item.annuityType}`}>
                          {item.annuityType === 'living' ? 'Living' : 'Life'}
                        </span>
                      )}
                    </td>
                    <td>
                      {item.currency !== reportingCurrency && (
                        <span className="currency-badge">{item.currency}</span>
                      )}
                      {fmt(monthly)}
                      {drawdownRate !== null && (
                        <span className={`drawdown-badge ${isValidDrawdownRate(drawdownRate) ? 'valid' : 'invalid'}`}>
                          {drawdownRate.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td>{fmt(annual)}</td>
                    <td>{item.startAge || 'Now'}</td>
                    <td>{item.endAge || 'Lifetime'}</td>
                    <td>{item.isTaxable ? 'Yes' : 'No'}</td>
                    <td>
                      {isAnnuity
                        ? `${item.escalationRate ?? 0}% esc.`
                        : (item.isInflationAdjusted ? 'Yes' : 'No')}
                    </td>
                    <td>
                      <span className={`badge status-${status}`}>
                        {status === 'active' ? 'Active' : status === 'future' ? 'Future' : 'Ended'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-small" onClick={() => handleEdit(item)}>
                        Edit
                      </button>
                      <button className="btn-small btn-danger" onClick={() => handleDelete(item.id)}>
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

      {/* Asset Income Section */}
      <div className="card">
        <div className="dividend-header">
          <h3>Income from Assets</h3>
          <button
            className="btn-secondary"
            onClick={() => setShowDividendIncome(!showDividendIncome)}
          >
            {showDividendIncome ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        <p className="info-text">
          Asset income calculated from yields set on assets. Total: {fmt(totalAssetIncomeMonthly)}/month ({fmt(totalAssetIncomeMonthly * 12)}/year)
        </p>

        {showDividendIncome && (
          <>
            {/* Dividend Income Table */}
            {dividendIncomeFromAssets.length > 0 && (
              <>
                <h4 className="subsection-title">Dividend Income (after 20% WHT)</h4>
                <div className="table-container">
                  <table className="income-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Asset Class</th>
                        <th>Value ({reportingCurrency})</th>
                        <th>Dividend Yield %</th>
                        <th>Annual Income</th>
                        <th>Monthly Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dividendIncomeFromAssets.map((d) => (
                        <tr key={d.id}>
                          <td>{d.assetName}</td>
                          <td>{d.assetClass}</td>
                          <td>{fmt(d.assetValue)}</td>
                          <td>{d.yield.toFixed(2)}%</td>
                          <td>{fmt(d.annualDividend)}</td>
                          <td>{fmt(d.monthlyDividend)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan="4"><strong>Total Dividend Income</strong></td>
                        <td><strong>{fmt(totalDividendIncomeMonthly * 12)}</strong></td>
                        <td><strong>{fmt(totalDividendIncomeMonthly)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Interest Income Table */}
            {interestIncomeFromAssets.length > 0 && (
              <>
                <h4 className="subsection-title">Interest Income (taxed at {marginalTaxRate}%)</h4>
                <div className="table-container">
                  <table className="income-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Asset Class</th>
                        <th>Value ({reportingCurrency})</th>
                        <th>Interest Yield %</th>
                        <th>Gross Annual</th>
                        <th>Tax</th>
                        <th>Net Annual</th>
                        <th>Net Monthly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interestIncomeFromAssets.map((i) => (
                        <tr key={i.id}>
                          <td>{i.assetName}</td>
                          <td>{i.assetClass}</td>
                          <td>{fmt(i.assetValue)}</td>
                          <td>{i.yield.toFixed(2)}%</td>
                          <td>{fmt(i.grossAnnualInterest)}</td>
                          <td className="negative">-{fmt(i.taxAmount)}</td>
                          <td>{fmt(i.netAnnualInterest)}</td>
                          <td>{fmt(i.netMonthlyInterest)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan="6"><strong>Total Interest Income</strong></td>
                        <td><strong>{fmt(totalInterestIncomeMonthly * 12)}</strong></td>
                        <td><strong>{fmt(totalInterestIncomeMonthly)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {dividendIncomeFromAssets.length === 0 && interestIncomeFromAssets.length === 0 && (
              <p className="no-data">
                No assets with yield set. Add dividend or interest yields to assets to see income here.
              </p>
            )}

            {(dividendIncomeFromAssets.length > 0 || interestIncomeFromAssets.length > 0) && (
              <div className="dividend-actions">
                <button className="btn-secondary" onClick={handleAddDividendIncome}>
                  Add Asset Income as Income Source
                </button>
                <small>Creates an income entry with the current total asset income</small>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Income;
