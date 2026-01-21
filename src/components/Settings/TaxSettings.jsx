import { useState } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import { DEFAULT_SETTINGS } from '../../models/defaults';
import { calculateIncomeTax, getTaxSummary } from '../../services/taxCalculations';
import './TaxSettings.css';

function TaxSettings() {
  const { profile, updateSettings } = useStore();
  const { confirmDialog, showConfirm } = useConfirmDialog();

  // Initialize tax config with defaults if not present
  const initialTaxConfig = {
    ...DEFAULT_SETTINGS.taxConfig,
    ...profile.settings.taxConfig,
  };

  const [taxConfig, setTaxConfig] = useState(initialTaxConfig);
  const [testIncome, setTestIncome] = useState(500000);
  const [testAge, setTestAge] = useState(profile.settings?.profile?.age || 55);

  const handleSave = () => {
    updateSettings({
      ...profile.settings,
      taxConfig,
    });
    toast.success('Tax settings saved successfully!');
  };

  const handleBracketChange = (index, field, value) => {
    setTaxConfig(prev => {
      const newBrackets = [...prev.incomeTaxBrackets];
      newBrackets[index] = {
        ...newBrackets[index],
        [field]: field === 'max' && value === '' ? null : parseFloat(value) || 0,
      };
      return {
        ...prev,
        incomeTaxBrackets: newBrackets,
      };
    });
  };

  const handleAddBracket = () => {
    setTaxConfig(prev => {
      const lastBracket = prev.incomeTaxBrackets[prev.incomeTaxBrackets.length - 1];
      const newMin = (lastBracket.max || lastBracket.min) + 1;
      return {
        ...prev,
        incomeTaxBrackets: [
          ...prev.incomeTaxBrackets.slice(0, -1),
          { ...lastBracket, max: newMin - 1 },
          {
            min: newMin,
            max: null,
            rate: lastBracket.rate + 2,
            baseAmount: lastBracket.baseAmount + Math.round((newMin - lastBracket.min) * lastBracket.rate / 100),
          },
        ],
      };
    });
  };

  const handleRemoveBracket = (index) => {
    if (taxConfig.incomeTaxBrackets.length <= 2) {
      toast.error('Must have at least 2 tax brackets');
      return;
    }
    setTaxConfig(prev => {
      const newBrackets = prev.incomeTaxBrackets.filter((_, i) => i !== index);
      // Make sure last bracket has no max
      if (newBrackets.length > 0) {
        newBrackets[newBrackets.length - 1].max = null;
      }
      return {
        ...prev,
        incomeTaxBrackets: newBrackets,
      };
    });
  };

  const handleRebateChange = (field, value) => {
    setTaxConfig(prev => ({
      ...prev,
      taxRebates: {
        ...prev.taxRebates,
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const handleThresholdChange = (field, value) => {
    setTaxConfig(prev => ({
      ...prev,
      taxThresholds: {
        ...prev.taxThresholds,
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const handleCGTChange = (field, value) => {
    setTaxConfig(prev => ({
      ...prev,
      cgt: {
        ...prev.cgt,
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const handleInterestExemptionChange = (field, value) => {
    setTaxConfig(prev => ({
      ...prev,
      interestExemption: {
        ...prev.interestExemption,
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const handleResetToDefaults = async () => {
    const confirmed = await showConfirm({
      title: 'Reset Tax Tables',
      message: 'Reset all tax settings to default SA 2025/2026 values? This will replace your current tax configuration.',
      confirmText: 'Reset',
      variant: 'warning',
    });

    if (confirmed) {
      setTaxConfig({ ...DEFAULT_SETTINGS.taxConfig });
      toast.success('Tax settings reset to defaults');
    }
  };

  // Calculate test tax
  const taxResult = getTaxSummary(testIncome, testAge, taxConfig);

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="tax-settings">
      {confirmDialog}

      {/* Tax Year Info */}
      <div className="card settings-section">
        <h3>Tax Year Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Tax Year</label>
            <input
              type="text"
              value={taxConfig.taxYear}
              onChange={(e) => setTaxConfig(prev => ({ ...prev, taxYear: e.target.value }))}
              placeholder="e.g., 2025/2026"
            />
          </div>
          <div className="form-group">
            <label>Effective Date</label>
            <input
              type="date"
              value={taxConfig.effectiveDate}
              onChange={(e) => setTaxConfig(prev => ({ ...prev, effectiveDate: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Income Tax Brackets */}
      <div className="card settings-section">
        <h3>Income Tax Brackets</h3>
        <p className="info-text">
          Configure progressive income tax brackets. Tax is calculated as: Base Amount + Rate% × (Income - Min)
        </p>

        <div className="tax-brackets-table">
          <div className="tax-bracket-header">
            <span>From (R)</span>
            <span>To (R)</span>
            <span>Rate (%)</span>
            <span>Base Amount (R)</span>
            <span></span>
          </div>

          {taxConfig.incomeTaxBrackets.map((bracket, index) => (
            <div key={index} className="tax-bracket-row">
              <input
                type="number"
                value={bracket.min}
                onChange={(e) => handleBracketChange(index, 'min', e.target.value)}
                min="0"
              />
              <input
                type="number"
                value={bracket.max === null ? '' : bracket.max}
                onChange={(e) => handleBracketChange(index, 'max', e.target.value)}
                placeholder="No limit"
                min="0"
              />
              <input
                type="number"
                value={bracket.rate}
                onChange={(e) => handleBracketChange(index, 'rate', e.target.value)}
                min="0"
                max="100"
                step="1"
              />
              <input
                type="number"
                value={bracket.baseAmount}
                onChange={(e) => handleBracketChange(index, 'baseAmount', e.target.value)}
                min="0"
              />
              <button
                className="btn-small btn-danger"
                onClick={() => handleRemoveBracket(index)}
                title="Remove bracket"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button className="btn-secondary" onClick={handleAddBracket} style={{ marginTop: '1rem' }}>
          + Add Bracket
        </button>
      </div>

      {/* Tax Rebates */}
      <div className="card settings-section">
        <h3>Tax Rebates</h3>
        <p className="info-text">
          Rebates reduce tax payable after tax is calculated. All taxpayers get the primary rebate.
          Secondary applies to 65+, tertiary to 75+.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Primary Rebate (all taxpayers)</label>
            <input
              type="number"
              value={taxConfig.taxRebates.primary}
              onChange={(e) => handleRebateChange('primary', e.target.value)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Secondary Rebate (65+)</label>
            <input
              type="number"
              value={taxConfig.taxRebates.secondary}
              onChange={(e) => handleRebateChange('secondary', e.target.value)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Tertiary Rebate (75+)</label>
            <input
              type="number"
              value={taxConfig.taxRebates.tertiary}
              onChange={(e) => handleRebateChange('tertiary', e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Tax Thresholds */}
      <div className="card settings-section">
        <h3>Tax Thresholds</h3>
        <p className="info-text">
          Income below these thresholds is tax-free (due to rebates covering the tax).
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Under 65</label>
            <input
              type="number"
              value={taxConfig.taxThresholds.under65}
              onChange={(e) => handleThresholdChange('under65', e.target.value)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Age 65 to 74</label>
            <input
              type="number"
              value={taxConfig.taxThresholds.age65to74}
              onChange={(e) => handleThresholdChange('age65to74', e.target.value)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Age 75+</label>
            <input
              type="number"
              value={taxConfig.taxThresholds.age75plus}
              onChange={(e) => handleThresholdChange('age75plus', e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Capital Gains Tax */}
      <div className="card settings-section">
        <h3>Capital Gains Tax (CGT)</h3>
        <p className="info-text">
          CGT is calculated as: (Capital Gain - Annual Exclusion) × Inclusion Rate × Marginal Tax Rate
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Inclusion Rate (%)</label>
            <input
              type="number"
              value={taxConfig.cgt.inclusionRate}
              onChange={(e) => handleCGTChange('inclusionRate', e.target.value)}
              min="0"
              max="100"
              step="1"
            />
            <small>% of gain included in taxable income (default: 40%)</small>
          </div>
          <div className="form-group">
            <label>Annual Exclusion (R)</label>
            <input
              type="number"
              value={taxConfig.cgt.annualExclusion}
              onChange={(e) => handleCGTChange('annualExclusion', e.target.value)}
              min="0"
            />
            <small>Excluded from CGT each year (default: R40,000)</small>
          </div>
        </div>

        <div className="cgt-effective-rates">
          <h4>Effective CGT Rates by Tax Bracket</h4>
          <div className="effective-rates-grid">
            {taxConfig.incomeTaxBrackets.map((bracket, index) => {
              const effectiveRate = (taxConfig.cgt.inclusionRate / 100) * bracket.rate;
              return (
                <div key={index} className="effective-rate-item">
                  <span className="bracket-rate">{bracket.rate}% bracket</span>
                  <span className="effective-rate">{effectiveRate.toFixed(1)}% effective CGT</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dividend Withholding Tax */}
      <div className="card settings-section">
        <h3>Dividend Withholding Tax</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Dividend Tax Rate (%)</label>
            <input
              type="number"
              value={taxConfig.dividendWithholdingTax}
              onChange={(e) => setTaxConfig(prev => ({
                ...prev,
                dividendWithholdingTax: parseFloat(e.target.value) || 0,
              }))}
              min="0"
              max="100"
              step="1"
            />
            <small>Withheld on dividend payments (default: 20%)</small>
          </div>
        </div>
      </div>

      {/* Interest Exemption */}
      <div className="card settings-section">
        <h3>Interest Exemption</h3>
        <p className="info-text">
          Annual interest income below these amounts is exempt from tax.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Under 65 (R)</label>
            <input
              type="number"
              value={taxConfig.interestExemption.under65}
              onChange={(e) => handleInterestExemptionChange('under65', e.target.value)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Age 65+ (R)</label>
            <input
              type="number"
              value={taxConfig.interestExemption.age65plus}
              onChange={(e) => handleInterestExemptionChange('age65plus', e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Actions - moved above Tax Calculator */}
      <div className="settings-actions">
        <button className="btn-secondary" onClick={handleResetToDefaults}>
          Reset to SA 2025/2026 Defaults
        </button>
        <button className="btn-primary" onClick={handleSave}>
          Save Tax Settings
        </button>
      </div>

      {/* Tax Calculator Test */}
      <div className="card settings-section tax-calculator">
        <h3>Tax Calculator</h3>
        <p className="info-text">
          Test the tax calculation with different income levels.
        </p>
        <p className="warning-text" style={{ color: '#e67e22', fontWeight: 'bold', marginTop: '0.5rem' }}>
          ⚠️ This table is for illustration only and settings are not saved
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Annual Taxable Income (R)</label>
            <input
              type="number"
              value={testIncome}
              onChange={(e) => setTestIncome(parseFloat(e.target.value) || 0)}
              min="0"
              step="10000"
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={testAge}
              onChange={(e) => setTestAge(parseInt(e.target.value) || 55)}
              min="18"
              max="100"
            />
          </div>
        </div>

        <div className="tax-calculation-results">
          <div className="result-row">
            <span>Tax Threshold:</span>
            <span>{formatCurrency(taxResult.threshold)}</span>
          </div>
          <div className="result-row">
            <span>Gross Tax:</span>
            <span>{formatCurrency(taxResult.grossTax)}</span>
          </div>
          <div className="result-row">
            <span>Less: Rebates:</span>
            <span>-{formatCurrency(taxResult.rebate)}</span>
          </div>
          <div className="result-row total">
            <span>Net Tax Payable:</span>
            <span>{formatCurrency(taxResult.netTax)}</span>
          </div>
          <div className="result-row">
            <span>Monthly Tax:</span>
            <span>{formatCurrency(taxResult.monthlyTax)}</span>
          </div>
          <div className="result-row">
            <span>Effective Rate:</span>
            <span>{taxResult.effectiveRate}%</span>
          </div>
          <div className="result-row">
            <span>Marginal Rate:</span>
            <span>{taxResult.marginalRate}%</span>
          </div>
          <div className="result-row highlight">
            <span>Monthly Take-Home:</span>
            <span>{formatCurrency(taxResult.monthlyTakeHome)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaxSettings;
