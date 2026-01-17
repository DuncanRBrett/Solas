import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import EmptyState from '../shared/EmptyState';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
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
  DEFAULT_SETTINGS,
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
  const { confirmDialog, showConfirm } = useConfirmDialog();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  const { assets, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);
  const { marginalTaxRate } = settings.profile;
  const platforms = settings.platforms || DEFAULT_PLATFORMS;
  const enabledCurrencies = settings.enabledCurrencies || DEFAULT_ENABLED_CURRENCIES;

  // Helper to format amounts in reporting currency
  const fmt = (amount, decimals = 0) => formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Helper to get platform name (supports both old and new format)
  const getPlatformName = (platformId) => {
    if (!platformId) return '-';

    // Check if platforms is new format (array of objects)
    if (Array.isArray(platforms) && platforms.length > 0 && typeof platforms[0] === 'object') {
      const platform = platforms.find(p => p.id === platformId);
      return platform ? platform.name : platformId;
    }

    // Legacy format: platformId is the name
    return platformId;
  };

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

  // Get expected return for an asset (uses asset-level override or falls back to asset class default)
  const getExpectedReturn = (asset) => {
    if (asset.expectedReturn !== null && asset.expectedReturn !== undefined) {
      return asset.expectedReturn;
    }
    const expectedReturns = settings.expectedReturns || DEFAULT_SETTINGS.expectedReturns;
    return expectedReturns[asset.assetClass] || 0;
  };

  // Calculate total portfolio value for % of total (MEMOIZED for performance)
  const { totalPortfolioValue, totalInvestibleAssets, totalNonInvestibleAssets, projectedGrowth } = useMemo(() => {
    let totalPortfolio = 0;
    let totalInvestible = 0;
    let totalNonInvestible = 0;
    let weightedReturnSum = 0;

    // Single loop for efficiency
    assets.forEach(asset => {
      const value = getAssetValue(asset);
      totalPortfolio += value;

      if (asset.assetType === 'Investible') {
        totalInvestible += value;
        // Calculate weighted return contribution (value * expected return)
        const expectedReturn = getExpectedReturn(asset);
        const ter = asset.ter || 0;
        const netReturn = expectedReturn - ter; // Net of fees
        weightedReturnSum += value * (netReturn / 100);
      } else if (asset.assetType === 'Non-Investible') {
        totalNonInvestible += value;
      }
    });

    return {
      totalPortfolioValue: totalPortfolio,
      totalInvestibleAssets: totalInvestible,
      totalNonInvestibleAssets: totalNonInvestible,
      projectedGrowth: weightedReturnSum, // Annual growth in reporting currency
    };
  }, [assets, settings]); // Recalculate only when assets or settings change

  // Calculate weighted average return for investible assets
  const weightedAverageReturn = useMemo(() => {
    if (totalInvestibleAssets === 0) return 0;
    return (projectedGrowth / totalInvestibleAssets) * 100;
  }, [projectedGrowth, totalInvestibleAssets]);

  // Calculate net worth projection by age
  const netWorthByAge = useMemo(() => {
    const currentAge = settings.profile?.age || 55;
    const lifeExpectancy = settings.profile?.lifeExpectancy || 90;
    const inflation = settings.profile?.expectedInflation ?? 4.5;
    const expectedReturns = settings.expectedReturns || DEFAULT_SETTINGS.expectedReturns;

    // Calculate weighted average return for investible assets (net of TER)
    let weightedReturn = 0;
    if (totalInvestibleAssets > 0) {
      assets.forEach(asset => {
        if (asset.assetType === 'Investible') {
          const value = getAssetValue(asset);
          const assetReturn = getExpectedReturn(asset);
          const ter = asset.ter || 0;
          const netReturn = assetReturn - ter;
          weightedReturn += (value / totalInvestibleAssets) * netReturn;
        }
      });
    }

    // Real return (after inflation)
    const realReturn = weightedReturn - inflation;

    const projections = [];
    let currentNominal = totalInvestibleAssets;
    let currentReal = totalInvestibleAssets;

    // Project for each year up to life expectancy (max 40 years for display)
    const maxYears = Math.min(lifeExpectancy - currentAge, 40);

    for (let i = 0; i <= maxYears; i += 5) { // Every 5 years
      const age = currentAge + i;
      const nominalFactor = Math.pow(1 + weightedReturn / 100, i);
      const realFactor = Math.pow(1 + realReturn / 100, i);

      projections.push({
        age,
        nominal: totalInvestibleAssets * nominalFactor,
        real: totalInvestibleAssets * realFactor,
      });
    }

    return { projections, weightedReturn, realReturn };
  }, [assets, settings, totalInvestibleAssets]);

  const handleAdd = () => {
    setFormData(createDefaultAsset());
    setIsAdding(true);
  };

  const handleEdit = (asset) => {
    setFormData(asset);
    setEditingAsset(asset.id);
  };

  const handleSave = () => {
    let result;

    if (editingAsset) {
      result = updateAsset(editingAsset, formData);
    } else {
      result = addAsset(formData);
    }

    // Check validation result
    if (!result.success) {
      // Show validation errors
      toast.error(result.message, {
        duration: 6000,
        style: {
          maxWidth: '500px',
        },
      });
      console.error('Asset validation failed:', result.errors);
      return; // Don't close form or clear data
    }

    // Success!
    toast.success(editingAsset ? 'Asset updated successfully' : 'Asset added successfully');

    // Clear form and close
    setEditingAsset(null);
    setIsAdding(false);
    setFormData(createDefaultAsset());
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingAsset(null);
    setFormData(createDefaultAsset());
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Asset',
      message: 'Are you sure you want to delete this asset? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteAsset(id);
      toast.success('Asset deleted successfully');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    // Ctrl+N to add new asset
    registerShortcut('ctrl+n', () => {
      if (!isAdding && !editingAsset) {
        setIsAdding(true);
      }
    });

    // Escape to cancel
    if (isAdding || editingAsset) {
      registerShortcut('escape', handleCancel);
    }

    return () => {
      unregisterShortcut('ctrl+n');
      unregisterShortcut('escape');
    };
  }, [isAdding, editingAsset, registerShortcut, unregisterShortcut]);

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
      {confirmDialog}

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
        <div className="summary-card projected">
          <h4>Projected Annual Growth</h4>
          <p className="highlight positive">{fmt(projectedGrowth)}</p>
          <small>
            {weightedAverageReturn.toFixed(1)}% weighted avg return (net of TER)
          </small>
        </div>
      </div>

      {/* Net Worth Projection Table */}
      {totalInvestibleAssets > 0 && (
        <div className="card">
          <h3>Net Worth Projection by Age</h3>
          <p className="info-text" style={{ marginBottom: '1rem' }}>
            Projected growth of investible assets ({fmt(totalInvestibleAssets)}) based on weighted average return of{' '}
            <strong>{netWorthByAge.weightedReturn.toFixed(1)}%</strong> p.a.
            (real return after {settings.profile?.expectedInflation ?? 4.5}% inflation:{' '}
            <strong>{netWorthByAge.realReturn.toFixed(1)}%</strong> p.a.)
          </p>

          <div className="table-container">
            <table className="projection-table">
              <thead>
                <tr>
                  <th>Age</th>
                  <th>Nominal Value</th>
                  <th>Real Value (Today's Money)</th>
                </tr>
              </thead>
              <tbody>
                {netWorthByAge.projections.map((row) => (
                  <tr key={row.age}>
                    <td><strong>{row.age}</strong></td>
                    <td>{fmt(row.nominal)}</td>
                    <td>{fmt(row.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            Note: This is a simple projection using current portfolio composition. It does not account for
            contributions, withdrawals, or rebalancing. Use Scenarios for detailed retirement planning.
          </p>
        </div>
      )}

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
                {Array.isArray(platforms) && platforms.length > 0 && typeof platforms[0] === 'object' ? (
                  // New format: array of objects with id/name
                  platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  // Legacy format: array of strings (backward compatibility)
                  platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))
                )}
              </select>
              <small>Platform where asset is held</small>
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

            <div className="form-group full-width">
              <label>Performance Fee Notes</label>
              <input
                type="text"
                value={formData.performanceFeeNotes || ''}
                onChange={(e) => handleChange('performanceFeeNotes', e.target.value)}
                placeholder="e.g., 1.5% + 20% of profits above benchmark"
              />
              <small>Complex fee structures that cannot be calculated automatically. For reference only.</small>
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

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.excludeFromAdvisorFee || false}
                  onChange={(e) => handleChange('excludeFromAdvisorFee', e.target.checked)}
                />
                Exclude from advisor fee
              </label>
              <small>Check to exclude this asset from advisor fee calculations</small>
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
        {assets.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No assets yet"
            message="Start building your portfolio by adding your first asset. Track stocks, ETFs, bonds, property, and more."
            actionLabel="Add Asset"
            onAction={() => setIsAdding(true)}
          />
        ) : (
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
                    <td>{getPlatformName(asset.platform)}</td>
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
        )}
      </div>
    </div>
  );
}

export default Assets;
