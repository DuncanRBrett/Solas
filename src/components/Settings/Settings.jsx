import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import LoadingSpinner from '../shared/LoadingSpinner';
import FeesSettings from './FeesSettings';
import TaxSettings from './TaxSettings';
import {
  ALL_CURRENCIES,
  DEFAULT_PLATFORMS,
  DEFAULT_ENABLED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  ASSET_CLASSES,
  DEFAULT_SETTINGS,
  getCurrencySymbol,
  getCurrencyName,
} from '../../models/defaults';
import {
  exportAssetsToExcel,
  exportSettingsToExcel,
  exportCompleteProfile,
  importAssetsFromExcel,
  importSettingsFromExcel,
} from '../../utils/importExport';
import { getExchangeRates, migrateLegacyExchangeRates } from '../../utils/calculations';
import './Settings.css';

function Settings() {
  const { profile, updateSettings, setAssets, addAsset, deleteProfile, profiles } = useStore();
  const { confirmDialog, showConfirm } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'fees'

  // Safety check for missing profile data
  const profileSettings = profile?.settings || DEFAULT_SETTINGS;

  // Migrate legacy exchange rates if needed
  const migratedExchangeRates = profileSettings.exchangeRates && !profileSettings.exchangeRates['USD/ZAR']
    ? profileSettings.exchangeRates
    : profileSettings.currency?.exchangeRates
      ? migrateLegacyExchangeRates(profileSettings.currency.exchangeRates, profileSettings.reportingCurrency || 'ZAR')
      : DEFAULT_EXCHANGE_RATES;

  const [settings, setSettings] = useState({
    ...profileSettings,
    profile: {
      ...DEFAULT_SETTINGS.profile,
      ...profileSettings.profile,
    },
    withdrawalRates: profileSettings.withdrawalRates || {
      conservative: 3.0,
      safe: 4.0,
      aggressive: 5.0,
    },
    targetAllocation: profile.settings.targetAllocation || DEFAULT_SETTINGS.targetAllocation,
    expectedReturns: profile.settings.expectedReturns || DEFAULT_SETTINGS.expectedReturns,
    thresholds: profile.settings.thresholds || DEFAULT_SETTINGS.thresholds,
    platforms: profile.settings.platforms || DEFAULT_PLATFORMS,
    enabledCurrencies: profile.settings.enabledCurrencies || DEFAULT_ENABLED_CURRENCIES,
    exchangeRates: migratedExchangeRates,
    reportingCurrency: profile.settings.reportingCurrency || 'ZAR',
  });
  const [importMode, setImportMode] = useState('replace'); // 'replace' or 'merge'
  const [newPlatform, setNewPlatform] = useState('');
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false);
  const [pendingReportingCurrency, setPendingReportingCurrency] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const assetsFileInputRef = useRef(null);
  const settingsFileInputRef = useRef(null);

  const handleSave = () => {
    updateSettings(settings);
    toast.success('Settings saved successfully!');
  };

  const handleDeleteProfile = () => {
    deleteProfile(profile.name);
  };

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleExchangeRateChange = (currencyCode, value) => {
    setSettings(prev => ({
      ...prev,
      exchangeRates: {
        ...prev.exchangeRates,
        [currencyCode]: parseFloat(value) || 0,
      },
    }));
  };

  // Handle reporting currency change - warn user about exchange rates
  const handleReportingCurrencyChange = (newCurrency) => {
    if (newCurrency === settings.reportingCurrency) return;

    setPendingReportingCurrency(newCurrency);
    setShowCurrencyWarning(true);
  };

  // Confirm reporting currency change
  const confirmReportingCurrencyChange = () => {
    if (!pendingReportingCurrency) return;

    // Build new exchange rates - all rates need to be re-entered relative to new base
    const newExchangeRates = {};
    settings.enabledCurrencies.forEach(curr => {
      if (curr !== pendingReportingCurrency) {
        newExchangeRates[curr] = 1.0; // Default to 1:1, user must update
      }
    });

    setSettings(prev => ({
      ...prev,
      reportingCurrency: pendingReportingCurrency,
      exchangeRates: newExchangeRates,
    }));

    setShowCurrencyWarning(false);
    setPendingReportingCurrency(null);
  };

  // Cancel reporting currency change
  const cancelReportingCurrencyChange = () => {
    setShowCurrencyWarning(false);
    setPendingReportingCurrency(null);
  };

  // Toggle a currency on/off
  const handleToggleCurrency = (currencyCode) => {
    const isCurrentlyEnabled = settings.enabledCurrencies.includes(currencyCode);

    // Don't allow disabling the reporting currency
    if (currencyCode === settings.reportingCurrency) {
      toast.error('Cannot disable the reporting currency. Change reporting currency first.');
      return;
    }

    if (isCurrentlyEnabled) {
      // Disable - remove from enabled list and exchange rates
      setSettings(prev => {
        const newEnabled = prev.enabledCurrencies.filter(c => c !== currencyCode);
        const newRates = { ...prev.exchangeRates };
        delete newRates[currencyCode];
        return {
          ...prev,
          enabledCurrencies: newEnabled,
          exchangeRates: newRates,
        };
      });
    } else {
      // Enable - add to list with default rate
      setSettings(prev => ({
        ...prev,
        enabledCurrencies: [...prev.enabledCurrencies, currencyCode].sort(),
        exchangeRates: {
          ...prev.exchangeRates,
          [currencyCode]: 1.0, // User must set actual rate
        },
      }));
    }
  };

  // Platform management handlers
  const handleAddPlatform = () => {
    const trimmedName = newPlatform.trim();
    if (!trimmedName) return;

    // Check if platform already exists (handle both string and object formats)
    const platformExists = settings.platforms.some(p =>
      typeof p === 'string' ? p === trimmedName : p.name === trimmedName
    );

    if (!platformExists) {
      // Add as object format (new format)
      const newPlatformObj = {
        id: trimmedName.toLowerCase().replace(/\s+/g, '-'),
        name: trimmedName,
        feeStructure: {
          type: 'percentage',
          rate: 0.50,
        },
      };
      setSettings(prev => ({
        ...prev,
        platforms: [...prev.platforms, newPlatformObj].sort((a, b) => {
          const nameA = typeof a === 'string' ? a : a.name;
          const nameB = typeof b === 'string' ? b : b.name;
          return nameA.localeCompare(nameB);
        }),
      }));
      setNewPlatform('');
    }
  };

  const handleRemovePlatform = (platform) => {
    setSettings(prev => ({
      ...prev,
      platforms: prev.platforms.filter(p => {
        // Handle both string and object formats
        if (typeof platform === 'string') {
          return typeof p === 'string' ? p !== platform : p.name !== platform;
        } else {
          return typeof p === 'string' ? p !== platform.name : p.id !== platform.id;
        }
      }),
    }));
  };

  const handleResetPlatforms = async () => {
    const confirmed = await showConfirm({
      title: 'Reset Platforms',
      message: 'Reset platforms to default list? This will replace your custom platform list.',
      confirmText: 'Reset',
      variant: 'warning',
    });

    if (confirmed) {
      setSettings(prev => ({
        ...prev,
        platforms: [...DEFAULT_PLATFORMS],
      }));
    }
  };

  // Export handlers
  const handleExportAssets = () => {
    exportAssetsToExcel(profile.assets, profile.name, profile.settings);
  };

  const handleExportSettings = () => {
    exportSettingsToExcel(profile.settings, profile.name);
  };

  const handleExportComplete = () => {
    exportCompleteProfile(profile);
  };

  // Import handlers
  const handleImportAssets = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage('Importing assets from Excel...');

    try {
      const assets = await importAssetsFromExcel(file);

      if (importMode === 'replace') {
        setAssets(assets);
        toast.success(`Successfully imported ${assets.length} assets (replaced existing)`);
      } else {
        // Merge mode - add to existing
        assets.forEach(asset => addAsset(asset));
        toast.success(`Successfully imported ${assets.length} assets (added to existing)`);
      }

      // Reset file input
      e.target.value = '';
    } catch (error) {
      toast.error('Error importing assets: ' + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleImportSettings = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage('Importing settings from Excel...');

    try {
      const importedSettings = await importSettingsFromExcel(file);

      // Merge imported settings with current settings
      const mergedSettings = {
        ...settings,
        profile: {
          ...settings.profile,
          ...importedSettings.profile,
        },
        currency: {
          ...settings.currency,
          exchangeRates: {
            ...settings.currency.exchangeRates,
            ...importedSettings.currency?.exchangeRates,
          },
        },
        withdrawalRates: {
          ...settings.withdrawalRates,
          ...importedSettings.withdrawalRates,
        },
      };

      setSettings(mergedSettings);
      updateSettings(mergedSettings);
      toast.success('Settings imported successfully!');

      // Reset file input
      e.target.value = '';
    } catch (error) {
      toast.error('Error importing settings: ' + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="settings" style={{ position: 'relative' }}>
      {confirmDialog}
      {isLoading && <LoadingSpinner variant="overlay" message={loadingMessage} />}

      <h2>Settings</h2>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General Settings
        </button>
        <button
          className={`tab-button ${activeTab === 'fees' ? 'active' : ''}`}
          onClick={() => setActiveTab('fees')}
        >
          Fees & Platforms
        </button>
        <button
          className={`tab-button ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          Tax Tables
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' ? (
        <div className="settings-content">

      {/* Import/Export Section */}
      <div className="card settings-section">
        <h3>Import / Export</h3>
        <p className="info-text">Export your data to Excel for backup or import data from Excel files.</p>

        <div className="import-export-grid">
          {/* Export */}
          <div className="export-section">
            <h4>Export</h4>
            <div className="button-group">
              <button className="btn-secondary" onClick={handleExportAssets}>
                Export Assets to Excel
              </button>
              <button className="btn-secondary" onClick={handleExportSettings}>
                Export Settings to Excel
              </button>
              <button className="btn-primary" onClick={handleExportComplete}>
                Export Complete Profile
              </button>
            </div>
          </div>

          {/* Import */}
          <div className="import-section">
            <h4>Import</h4>

            {/* Import mode selector */}
            <div className="form-group">
              <label>Import Mode (for Assets)</label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value)}
              >
                <option value="replace">Replace all assets</option>
                <option value="merge">Add to existing assets</option>
              </select>
            </div>

            <div className="button-group">
              <button
                className="btn-secondary"
                onClick={() => assetsFileInputRef.current?.click()}
              >
                Import Assets from Excel
              </button>
              <input
                ref={assetsFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportAssets}
                style={{ display: 'none' }}
              />

              <button
                className="btn-secondary"
                onClick={() => settingsFileInputRef.current?.click()}
              >
                Import Settings from Excel
              </button>
              <input
                ref={settingsFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportSettings}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Profile */}
      <div className="card settings-section">
        <h3>Personal Profile</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={settings.profile.age}
              onChange={(e) => handleChange('profile', 'age', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Marginal Tax Rate (%)</label>
            <input
              type="number"
              value={settings.profile.marginalTaxRate}
              onChange={(e) => handleChange('profile', 'marginalTaxRate', parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Default CGT Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.profile.defaultCGT ?? 18}
              onChange={(e) => handleChange('profile', 'defaultCGT', parseFloat(e.target.value))}
            />
            <small>Capital gains tax rate (default: 18%)</small>
          </div>

          <div className="form-group">
            <label>Retirement Age</label>
            <input
              type="number"
              value={settings.profile.retirementAge}
              onChange={(e) => handleChange('profile', 'retirementAge', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Life Expectancy</label>
            <input
              type="number"
              value={settings.profile.lifeExpectancy}
              onChange={(e) => handleChange('profile', 'lifeExpectancy', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Expected Inflation (% p.a.)</label>
            <input
              type="number"
              step="0.1"
              value={settings.profile.expectedInflation ?? 4.5}
              onChange={(e) => handleChange('profile', 'expectedInflation', parseFloat(e.target.value))}
            />
            <small>Used for projections (default: 4.5%)</small>
          </div>

          <div className="form-group">
            <label>Income Growth (% p.a.)</label>
            <input
              type="number"
              step="0.1"
              value={settings.profile.incomeGrowth ?? 5.0}
              onChange={(e) => handleChange('profile', 'incomeGrowth', parseFloat(e.target.value))}
            />
            <small>Expected annual income growth (default: 5%)</small>
          </div>

          <div className="form-group">
            <label>Monthly Savings ({settings.reportingCurrency})</label>
            <input
              type="number"
              value={settings.profile.monthlySavings}
              onChange={(e) => handleChange('profile', 'monthlySavings', parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Annual Expenses ({settings.reportingCurrency})</label>
            <input
              type="number"
              value={settings.profile.annualExpenses}
              onChange={(e) => handleChange('profile', 'annualExpenses', parseFloat(e.target.value))}
            />
            <small>Optional - leave blank if using Expenses module</small>
          </div>
        </div>
      </div>

      {/* Profile Management */}
      <div className="card settings-section">
        <h3>Profile Management</h3>
        <p className="info-text">
          <strong>Current Profile:</strong> {profile.name}
        </p>
        <p className="info-text">
          Total Profiles: {profiles.length}
        </p>

        <div className="form-group">
          <button
            className="btn-danger"
            onClick={handleDeleteProfile}
            disabled={profiles.length === 1}
          >
            Delete Current Profile
          </button>
          {profiles.length === 1 && (
            <small style={{ color: 'var(--color-danger)', marginTop: '0.5rem', display: 'block' }}>
              Cannot delete the only profile. Create another profile first.
            </small>
          )}
          {profiles.length > 1 && (
            <small style={{ marginTop: '0.5rem', display: 'block' }}>
              This will permanently delete the profile "{profile.name}" and all its data.
            </small>
          )}
        </div>
      </div>

      {/* Currency Warning Modal */}
      {showCurrencyWarning && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Change Reporting Currency?</h3>
            <p>
              Changing your reporting currency from <strong>{settings.reportingCurrency}</strong> to{' '}
              <strong>{pendingReportingCurrency}</strong> will reset all exchange rates.
            </p>
            <p>
              You will need to enter new exchange rates relative to {pendingReportingCurrency}.
            </p>
            <p className="warning-text">
              For example: If 1 USD = X {pendingReportingCurrency}, enter X as the USD rate.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelReportingCurrencyChange}>
                Cancel
              </button>
              <button className="btn-primary" onClick={confirmReportingCurrencyChange}>
                Change Currency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency & Exchange Rates */}
      <div className="card settings-section">
        <h3>Currency & Exchange Rates</h3>

        {/* Reporting Currency */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Reporting Currency</label>
          <select
            value={settings.reportingCurrency}
            onChange={(e) => handleReportingCurrencyChange(e.target.value)}
          >
            {settings.enabledCurrencies.map(curr => (
              <option key={curr} value={curr}>
                {curr} - {getCurrencyName(curr)} ({getCurrencySymbol(curr)})
              </option>
            ))}
          </select>
          <small>All amounts will be displayed in this currency</small>
        </div>

        {/* Exchange Rates */}
        <h4>Exchange Rates</h4>
        <p className="info-text" style={{ marginBottom: '1rem' }}>
          Enter how many {settings.reportingCurrency} equal 1 unit of each foreign currency.
        </p>
        <div className="form-grid">
          {settings.enabledCurrencies
            .filter(curr => curr !== settings.reportingCurrency)
            .map(curr => (
              <div key={curr} className="form-group">
                <label>
                  1 {curr} = ? {settings.reportingCurrency}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={settings.exchangeRates[curr] || ''}
                  onChange={(e) => handleExchangeRateChange(curr, e.target.value)}
                  placeholder={`Enter ${curr} rate`}
                />
                <small>{getCurrencyName(curr)}</small>
              </div>
            ))}
        </div>
        {settings.enabledCurrencies.length <= 1 && (
          <p className="empty-state">Enable more currencies below to set exchange rates.</p>
        )}

        {/* Enabled Currencies */}
        <h4 style={{ marginTop: '2rem' }}>Enabled Currencies</h4>
        <p className="info-text" style={{ marginBottom: '1rem' }}>
          Select which currencies are available for assets, liabilities, income, and expenses.
        </p>
        <div className="currency-grid">
          {Object.entries(ALL_CURRENCIES).map(([code, info]) => {
            const isEnabled = settings.enabledCurrencies.includes(code);
            const isReporting = code === settings.reportingCurrency;
            return (
              <label key={code} className={`currency-checkbox ${isEnabled ? 'enabled' : ''} ${isReporting ? 'reporting' : ''}`}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleToggleCurrency(code)}
                  disabled={isReporting}
                />
                <span className="currency-code">{code}</span>
                <span className="currency-symbol">{info.symbol}</span>
                <span className="currency-name">{info.name}</span>
                {isReporting && <span className="reporting-badge">Reporting</span>}
              </label>
            );
          })}
        </div>
      </div>

      {/* Withdrawal Rates */}
      <div className="card settings-section">
        <h3>Withdrawal Rates (%)</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Conservative Rate</label>
            <input
              type="number"
              step="0.1"
              value={settings.withdrawalRates.conservative}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                withdrawalRates: {
                  ...prev.withdrawalRates,
                  conservative: parseFloat(e.target.value) || 0
                }
              }))}
            />
            <small>Very safe (default: 3.0%)</small>
          </div>

          <div className="form-group">
            <label>Safe Rate</label>
            <input
              type="number"
              step="0.1"
              value={settings.withdrawalRates.safe}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                withdrawalRates: {
                  ...prev.withdrawalRates,
                  safe: parseFloat(e.target.value) || 0
                }
              }))}
            />
            <small>Standard safe withdrawal (default: 4.0%)</small>
          </div>

          <div className="form-group">
            <label>Aggressive Rate</label>
            <input
              type="number"
              step="0.1"
              value={settings.withdrawalRates.aggressive}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                withdrawalRates: {
                  ...prev.withdrawalRates,
                  aggressive: parseFloat(e.target.value) || 0
                }
              }))}
            />
            <small>Higher risk (default: 5.0%)</small>
          </div>
        </div>
        <p className="info-text">Set your preferred withdrawal rates for retirement planning</p>
      </div>

      {/* Target Allocation */}
      <div className="card settings-section">
        <h3>Target Asset Allocation</h3>
        <p className="info-text">
          Set your desired portfolio allocation by asset class. These targets are used for rebalancing recommendations.
          Total should equal 100%.
        </p>

        <div className="form-grid">
          {ASSET_CLASSES.map(assetClass => (
            <div key={assetClass} className="form-group">
              <label>{assetClass} (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={settings.targetAllocation?.[assetClass] ?? 0}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  targetAllocation: {
                    ...prev.targetAllocation,
                    [assetClass]: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
          ))}
        </div>

        {/* Total indicator */}
        {(() => {
          const total = ASSET_CLASSES.reduce(
            (sum, cls) => sum + (settings.targetAllocation?.[cls] || 0),
            0
          );
          const isValid = Math.abs(total - 100) < 0.1;
          return (
            <div className={`allocation-total ${isValid ? 'valid' : 'invalid'}`}>
              <span>Total: {total.toFixed(1)}%</span>
              {!isValid && <span className="warning"> (should equal 100%)</span>}
            </div>
          );
        })()}

        <div style={{ marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={async () => {
              const confirmed = await showConfirm({
                title: 'Reset Target Allocation',
                message: 'Reset target allocation to default values? This will replace your custom allocation targets.',
                confirmText: 'Reset',
                variant: 'warning',
              });

              if (confirmed) {
                setSettings(prev => ({
                  ...prev,
                  targetAllocation: { ...DEFAULT_SETTINGS.targetAllocation }
                }));
              }
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Asset Class Expected Returns */}
      <div className="card settings-section">
        <h3>Asset Class Expected Returns</h3>
        <p className="info-text">
          Set the expected annual return (% p.a.) for each asset class. These are used for projections and
          growth calculations. Individual assets can override these defaults.
        </p>

        <div className="form-grid">
          {ASSET_CLASSES.map(assetClass => (
            <div key={assetClass} className="form-group">
              <label>{assetClass} (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={settings.expectedReturns?.[assetClass] ?? DEFAULT_SETTINGS.expectedReturns[assetClass] ?? 0}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  expectedReturns: {
                    ...prev.expectedReturns,
                    [assetClass]: parseFloat(e.target.value) || 0
                  }
                }))}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={async () => {
              const confirmed = await showConfirm({
                title: 'Reset Expected Returns',
                message: 'Reset expected returns to default values? This will replace your custom return assumptions.',
                confirmText: 'Reset',
                variant: 'warning',
              });

              if (confirmed) {
                setSettings(prev => ({
                  ...prev,
                  expectedReturns: { ...DEFAULT_SETTINGS.expectedReturns }
                }));
              }
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Rebalancing Thresholds */}
      <div className="card settings-section">
        <h3>Rebalancing & Concentration Thresholds</h3>
        <p className="info-text">
          Configure when to trigger rebalancing alerts and concentration risk warnings.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Rebalancing Drift Threshold (%)</label>
            <input
              type="number"
              step="1"
              min="1"
              max="20"
              value={settings.thresholds?.rebalancingDrift ?? 5}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                thresholds: {
                  ...prev.thresholds,
                  rebalancingDrift: parseFloat(e.target.value) || 5
                }
              }))}
            />
            <small>Suggest rebalancing when drift exceeds this %</small>
          </div>

          <div className="form-group">
            <label>Single Asset Concentration (%)</label>
            <input
              type="number"
              step="1"
              min="5"
              max="50"
              value={settings.thresholds?.singleAsset ?? 10}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                thresholds: {
                  ...prev.thresholds,
                  singleAsset: parseFloat(e.target.value) || 10
                }
              }))}
            />
            <small>Warn if single asset exceeds this %</small>
          </div>

          <div className="form-group">
            <label>Asset Class Concentration (%)</label>
            <input
              type="number"
              step="1"
              min="20"
              max="80"
              value={settings.thresholds?.assetClass ?? 50}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                thresholds: {
                  ...prev.thresholds,
                  assetClass: parseFloat(e.target.value) || 50
                }
              }))}
            />
            <small>Warn if asset class exceeds this %</small>
          </div>

          <div className="form-group">
            <label>Currency Concentration (%)</label>
            <input
              type="number"
              step="1"
              min="30"
              max="100"
              value={settings.thresholds?.currency ?? 70}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                thresholds: {
                  ...prev.thresholds,
                  currency: parseFloat(e.target.value) || 70
                }
              }))}
            />
            <small>Warn if currency exceeds this %</small>
          </div>

          <div className="form-group">
            <label>Platform Concentration (%)</label>
            <input
              type="number"
              step="1"
              min="20"
              max="80"
              value={settings.thresholds?.platform ?? 40}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                thresholds: {
                  ...prev.thresholds,
                  platform: parseFloat(e.target.value) || 40
                }
              }))}
            />
            <small>Warn if platform exceeds this %</small>
          </div>

          <div className="form-group">
            <label>Price Staleness (days)</label>
            <input
              type="number"
              step="1"
              min="1"
              max="90"
              value={settings.thresholds?.staleness ?? 7}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                thresholds: {
                  ...prev.thresholds,
                  staleness: parseInt(e.target.value) || 7
                }
              }))}
            />
            <small>Warn if price older than this many days</small>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={async () => {
              const confirmed = await showConfirm({
                title: 'Reset Thresholds',
                message: 'Reset concentration thresholds to default values? This will replace your custom threshold settings.',
                confirmText: 'Reset',
                variant: 'warning',
              });

              if (confirmed) {
                setSettings(prev => ({
                  ...prev,
                  thresholds: { ...DEFAULT_SETTINGS.thresholds }
                }));
              }
            }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Platform Management */}
      <div className="card settings-section">
        <h3>Platforms</h3>
        <p className="info-text">Manage the list of investment platforms/institutions available for asset selection.</p>

        <div className="platform-add-form">
          <input
            type="text"
            placeholder="Add new platform..."
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlatform()}
          />
          <button className="btn-primary" onClick={handleAddPlatform}>
            Add
          </button>
          <button className="btn-secondary" onClick={handleResetPlatforms}>
            Reset to Defaults
          </button>
        </div>

        <div className="platform-list">
          {(settings.platforms || []).map((platform, index) => {
            // Handle both old format (string) and new format (object with id, name)
            const platformName = typeof platform === 'string' ? platform : platform.name;
            const platformKey = typeof platform === 'string' ? platform : platform.id;
            return (
              <div key={platformKey || index} className="platform-item">
                <span>{platformName}</span>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleRemovePlatform(platform)}
                  title="Remove platform"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {(settings.platforms || []).length === 0 && (
          <p className="empty-state">No platforms configured. Click "Reset to Defaults" to restore default platforms.</p>
        )}
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button className="btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
      </div>
      ) : activeTab === 'fees' ? (
        /* Fees & Platforms Tab */
        <FeesSettings />
      ) : (
        /* Tax Tables Tab */
        <TaxSettings />
      )}
    </div>
  );
}

export default Settings;
