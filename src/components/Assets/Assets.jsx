import { useState } from 'react';
import useStore from '../../store/useStore';
import {
  createDefaultAsset,
  ASSET_CLASSES,
  REGIONS,
  SECTORS,
  ASSET_TYPES,
  ACCOUNT_TYPES,
  PORTFOLIOS,
  DEFAULT_PLATFORMS,
  DEFAULT_ENABLED_CURRENCIES,
  getCurrencySymbol,
} from '../../models/defaults';
import {
  calculateAssetValue,
  calculateGainPercentage,
  calculateUnrealizedGain,
  calculateNetProceeds,
  calculateInvestibleAssets,
  calculateNonInvestibleAssets,
  formatCurrency,
  formatPercentage,
  formatInReportingCurrency,
  getExchangeRates,
  toReportingCurrency,
} from '../../utils/calculations';
import './Assets.css';

function Assets() {
  const { profile, addAsset, updateAsset, deleteAsset } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState(createDefaultAsset());
  const [sortBy, setSortBy] = useState('name'); // name, assetClass, platform, value, gainPct
  const [sortDirection, setSortDirection] = useState('asc'); // asc, desc

  const { assets, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);
  const { marginalTaxRate } = settings.profile;
  const platforms = settings.platforms || DEFAULT_PLATFORMS;
  const enabledCurrencies = settings.enabledCurrencies || DEFAULT_ENABLED_CURRENCIES;

  // Helper to format amounts in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Helper to calculate asset value in reporting currency
  const getAssetValue = (asset) => calculateAssetValue(asset, settings);

  // Helper to calculate gain in reporting currency
  const getUnrealizedGain = (asset) => {
    const currentValue = calculateAssetValue(asset, settings);
    const costBasis = toReportingCurrency(
      asset.units * asset.costPrice,
      asset.currency,
      reportingCurrency,
      exchangeRates
    );
    return currentValue - costBasis;
  };

  // Calculate total portfolio value for % of total
  const totalPortfolioValue = assets.reduce((total, asset) => {
    return total + getAssetValue(asset);
  }, 0);

  // Calculate investible and non-investible assets
  const totalInvestibleAssets = assets
    .filter(a => a.assetType === 'Investible')
    .reduce((total, asset) => total + getAssetValue(asset), 0);
  const totalNonInvestibleAssets = assets
    .filter(a => a.assetType === 'Non-Investible')
    .reduce((total, asset) => total + getAssetValue(asset), 0);

  const handleAdd = () => {
    setFormData(createDefaultAsset());
    setIsAdding(true);
  };

  const handleEdit = (asset) => {
    setFormData(asset);
    setEditingAsset(asset.id);
  };

  const handleSave = () => {
    if (editingAsset) {
      updateAsset(editingAsset, formData);
      setEditingAsset(null);
    } else {
      addAsset(formData);
      setIsAdding(false);
    }
    setFormData(createDefaultAsset());
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingAsset(null);
    setFormData(createDefaultAsset());
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      deleteAsset(id);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sort assets
  const sortedAssets = [...assets].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'assetClass':
        aValue = a.assetClass.toLowerCase();
        bValue = b.assetClass.toLowerCase();
        break;
      case 'platform':
        aValue = (a.platform || '').toLowerCase();
        bValue = (b.platform || '').toLowerCase();
        break;
      case 'value':
        aValue = getAssetValue(a);
        bValue = getAssetValue(b);
        break;
      case 'gainPct':
        aValue = calculateGainPercentage(a);
        bValue = calculateGainPercentage(b);
        break;
      default:
        return 0;
    }

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="assets">
      <div className="assets-header">
        <h2>Assets ({assets.length})</h2>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Asset
        </button>
      </div>

      {/* Asset Summary Cards */}
      <div className="assets-summary">
        <div className="summary-card">
          <h4>Total Asset Value</h4>
          <p className="highlight">{fmt(totalPortfolioValue)}</p>
          <small>All assets combined</small>
        </div>
        <div className="summary-card investible">
          <h4>Investible Assets</h4>
          <p className="highlight">{fmt(totalInvestibleAssets)}</p>
          <small>Generates returns (used in scenarios)</small>
        </div>
        <div className="summary-card non-investible">
          <h4>Non-Investible Assets</h4>
          <p className="highlight">{fmt(totalNonInvestibleAssets)}</p>
          <small>Primary home, collectibles, etc.</small>
        </div>
      </div>

      {/* Asset Form */}
      {(isAdding || editingAsset) && (
        <div className="card asset-form">
          <h3>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Satrix MSCI World"
              />
            </div>

            <div className="form-group">
              <label>Asset Class *</label>
              <select
                value={formData.assetClass}
                onChange={(e) => handleChange('assetClass', e.target.value)}
              >
                {ASSET_CLASSES.map((ac) => (
                  <option key={ac} value={ac}>
                    {ac}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Asset Type *</label>
              <select
                value={formData.assetType}
                onChange={(e) => handleChange('assetType', e.target.value)}
              >
                {ASSET_TYPES.map((at) => (
                  <option key={at} value={at}>
                    {at}
                  </option>
                ))}
              </select>
              <small>{formData.assetType === 'Investible' ? 'Generates returns' : 'Appreciates but no yield'}</small>
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
              <label>Region</label>
              <select
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Platform</label>
              <select
                value={formData.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
              >
                <option value="">Select...</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Units *</label>
              <input
                type="number"
                step="0.0001"
                value={formData.units}
                onChange={(e) => handleChange('units', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Current Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => handleChange('currentPrice', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Cost Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label>Dividend Yield (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.dividendYield || formData.incomeYield || 0}
                onChange={(e) => handleChange('dividendYield', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 2.5"
              />
              <small>After 20% dividend withholding tax</small>
            </div>

            <div className="form-group">
              <label>Interest Yield (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.interestYield || 0}
                onChange={(e) => handleChange('interestYield', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 5.0"
              />
              <small>Taxed at marginal income tax rate</small>
            </div>

            <div className="form-group">
              <label>Expected Forward Return (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                value={formData.expectedReturn || ''}
                onChange={(e) => handleChange('expectedReturn', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Leave blank to use asset class default"
              />
              <small>Override default expected return for this asset</small>
            </div>

            <div className="form-group">
              <label>TER / Fees (% p.a.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.ter || 0}
                onChange={(e) => handleChange('ter', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 0.45"
              />
              <small>Total Expense Ratio - reduces net returns</small>
            </div>

            <div className="form-group">
              <label>Account Type</label>
              <select
                value={formData.accountType}
                onChange={(e) => handleChange('accountType', e.target.value)}
              >
                {ACCOUNT_TYPES.map((at) => (
                  <option key={at} value={at}>
                    {at}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sector (for Equities)</label>
              <select
                value={formData.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
              >
                <option value="">Select...</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <small>Used for equity allocation breakdown</small>
            </div>

            <div className="form-group">
              <label>Price URL</label>
              <input
                type="url"
                value={formData.priceUrl}
                onChange={(e) => handleChange('priceUrl', e.target.value)}
                placeholder="https://..."
              />
              <small>Link to check current price</small>
            </div>

            <div className="form-group">
              <label>Fact Sheet URL</label>
              <input
                type="url"
                value={formData.factSheetUrl}
                onChange={(e) => handleChange('factSheetUrl', e.target.value)}
                placeholder="https://..."
              />
              <small>Link to fund fact sheet</small>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this asset..."
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave}>
              {editingAsset ? 'Update' : 'Add'} Asset
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <div className="card">
        <div className="table-container">
          <table className="assets-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="sortable" onClick={() => handleSort('assetClass')}>
                  Class {sortBy === 'assetClass' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Type</th>
                <th className="sortable" onClick={() => handleSort('platform')}>
                  Platform {sortBy === 'platform' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Currency</th>
                <th>Units</th>
                <th>Price</th>
                <th className="sortable" onClick={() => handleSort('value')}>
                  Value ({reportingCurrency}) {sortBy === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>% of Total</th>
                <th className="sortable" onClick={() => handleSort('gainPct')}>
                  Gain % {sortBy === 'gainPct' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Gain ({reportingCurrency})</th>
                <th>TER</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 && (
                <tr>
                  <td colSpan="13" className="no-data">
                    No assets yet. Click "Add Asset" to get started.
                  </td>
                </tr>
              )}
              {sortedAssets.map((asset) => {
                const assetValue = getAssetValue(asset);
                const gainPct = calculateGainPercentage(asset);
                const gain = getUnrealizedGain(asset);
                const percentOfTotal = totalPortfolioValue > 0 ? (assetValue / totalPortfolioValue) * 100 : 0;

                return (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{asset.assetClass}</td>
                    <td>
                      <span className={`badge ${asset.assetType === 'Investible' ? 'investible' : 'non-investible'}`}>
                        {asset.assetType}
                      </span>
                    </td>
                    <td>{asset.platform || '-'}</td>
                    <td>{asset.currency}</td>
                    <td>{asset.units.toLocaleString()}</td>
                    <td>{formatCurrency(asset.currentPrice, 2, asset.currency)}</td>
                    <td>{fmt(assetValue)}</td>
                    <td>{percentOfTotal.toFixed(2)}%</td>
                    <td className={gainPct >= 0 ? 'positive' : 'negative'}>
                      {formatPercentage(gainPct)}
                    </td>
                    <td className={gain >= 0 ? 'positive' : 'negative'}>
                      {fmt(gain)}
                    </td>
                    <td className="ter-cell">
                      {asset.ter ? `${asset.ter.toFixed(2)}%` : '-'}
                    </td>
                    <td className="actions-cell">
                      {asset.priceUrl && (
                        <button
                          className="btn-small btn-icon"
                          onClick={() => window.open(asset.priceUrl, '_blank')}
                          title="Check current price"
                        >
                          $
                        </button>
                      )}
                      <button className="btn-small" onClick={() => handleEdit(asset)}>
                        Edit
                      </button>
                      <button className="btn-small btn-danger" onClick={() => handleDelete(asset.id)}>
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

export default Assets;
