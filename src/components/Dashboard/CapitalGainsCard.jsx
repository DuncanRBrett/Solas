import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { calculateAssetValue, toReportingCurrency, getExchangeRates, formatInReportingCurrency } from '../../utils/calculations';
import './CapitalGainsCard.css';

function CapitalGainsCard() {
  const { profile } = useStore();
  const { assets, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);
  const marginalTaxRate = settings.profile?.marginalTaxRate || 45; // Stored as percentage (39, 45, etc.)

  const gainsData = useMemo(() => {
    let totalUnrealizedGain = 0;
    let taxableGain = 0;
    let taxExemptGain = 0;
    let investibleAssetsValue = 0;
    let investibleAssetsCost = 0;
    let gainsByAccountType = {
      Taxable: 0,
      TFSA: 0,
      RA: 0,
    };

    // Calculate gains for each asset
    assets.forEach(asset => {
      // Only count investible assets
      if (asset.assetType !== 'Investible') {
        return;
      }

      const currentValue = calculateAssetValue(asset, settings);
      const costBasis = toReportingCurrency(
        asset.units * asset.costPrice,
        asset.currency,
        reportingCurrency,
        exchangeRates
      );

      const gain = currentValue - costBasis;

      investibleAssetsValue += currentValue;
      investibleAssetsCost += costBasis;
      totalUnrealizedGain += gain;

      // Track by account type
      const accountType = asset.accountType || 'Taxable';
      if (gainsByAccountType[accountType] !== undefined) {
        gainsByAccountType[accountType] += gain;
      } else {
        gainsByAccountType['Taxable'] += gain;
      }

      // TFSA is tax-exempt
      if (accountType === 'TFSA') {
        taxExemptGain += gain;
      } else {
        taxableGain += gain;
      }
    });

    // Calculate CGT
    // In ZAR: 40% inclusion rate × marginal tax rate
    // Typical: 40% × 45% = 18% effective CGT rate
    const cgtInclusionRate = 0.40; // 40% of gains are taxable
    const effectiveCGTRate = cgtInclusionRate * (marginalTaxRate / 100); // Convert percentage to decimal

    // Only positive gains are taxable
    const taxablePortion = Math.max(0, taxableGain);
    const estimatedCGT = taxablePortion * effectiveCGTRate;

    // Net proceeds if sold today
    const netProceedsAfterTax = investibleAssetsValue - estimatedCGT;

    // Return on investment
    const roi = investibleAssetsCost > 0
      ? ((investibleAssetsValue - investibleAssetsCost) / investibleAssetsCost) * 100
      : 0;

    return {
      totalUnrealizedGain,
      taxableGain,
      taxExemptGain,
      estimatedCGT,
      investibleAssetsValue,
      investibleAssetsCost,
      netProceedsAfterTax,
      roi,
      effectiveCGTRate: effectiveCGTRate * 100, // Convert to percentage
      gainsByAccountType,
    };
  }, [assets, settings, marginalTaxRate]);

  const fmt = (amount) => formatInReportingCurrency(amount, 0, reportingCurrency);

  const isPositive = gainsData.totalUnrealizedGain >= 0;

  if (assets.filter(a => a.assetType === 'Investible').length === 0) {
    return (
      <div className="capital-gains-card empty">
        <h3>Capital Gains Exposure</h3>
        <p className="empty-message">Add investible assets to see capital gains</p>
      </div>
    );
  }

  return (
    <div className="capital-gains-card">
      <h3>Capital Gains Exposure</h3>

      <div className="gains-disclaimer">
        <small>⚠️ Benchmark estimate only - excludes TFSA, ignores R40k annual exclusion</small>
      </div>

      {/* Total Unrealized Gain */}
      <div className={`gains-total ${isPositive ? 'positive' : 'negative'}`}>
        <div className="gains-label">
          Total Unrealized {isPositive ? 'Gain' : 'Loss'}
        </div>
        <div className="gains-value">
          {isPositive ? '+' : ''}{fmt(gainsData.totalUnrealizedGain)}
        </div>
        <div className="gains-roi">
          {gainsData.roi >= 0 ? '+' : ''}{gainsData.roi.toFixed(1)}% ROI
        </div>
      </div>

      {/* Breakdown */}
      <div className="gains-breakdown">
        <div className="breakdown-row">
          <span className="breakdown-label">Current Value</span>
          <span className="breakdown-value">{fmt(gainsData.investibleAssetsValue)}</span>
        </div>
        <div className="breakdown-row">
          <span className="breakdown-label">Cost Basis</span>
          <span className="breakdown-value">{fmt(gainsData.investibleAssetsCost)}</span>
        </div>
        <div className="breakdown-divider"></div>
        <div className="breakdown-row highlight">
          <span className="breakdown-label">Unrealized Gain/Loss</span>
          <span className={`breakdown-value ${isPositive ? 'positive' : 'negative'}`}>
            {fmt(gainsData.totalUnrealizedGain)}
          </span>
        </div>
      </div>

      {/* Tax Breakdown */}
      {isPositive && gainsData.totalUnrealizedGain > 0 && (
        <div className="tax-section">
          <h4>If Sold Today (Estimated)</h4>

          <div className="tax-breakdown">
            <div className="tax-row">
              <span className="tax-label">Taxable Gain (excl. TFSA)</span>
              <span className="tax-value">{fmt(gainsData.taxableGain)}</span>
            </div>

            {gainsData.taxExemptGain > 0 && (
              <div className="tax-row">
                <span className="tax-label">Tax-Exempt Gain (TFSA)</span>
                <span className="tax-value exempt">{fmt(gainsData.taxExemptGain)}</span>
              </div>
            )}

            <div className="tax-row cgt">
              <span className="tax-label">
                Estimated CGT ({gainsData.effectiveCGTRate.toFixed(1)}%)
              </span>
              <span className="tax-value negative">-{fmt(gainsData.estimatedCGT)}</span>
            </div>

            <div className="tax-divider"></div>

            <div className="tax-row total">
              <span className="tax-label">Net Proceeds After Tax</span>
              <span className="tax-value success">{fmt(gainsData.netProceedsAfterTax)}</span>
            </div>
          </div>

          <div className="tax-note">
            <small>
              CGT rate: 40% inclusion × {marginalTaxRate.toFixed(0)}% marginal rate = {gainsData.effectiveCGTRate.toFixed(1)}% effective
            </small>
          </div>
        </div>
      )}

      {/* Account Type Breakdown */}
      {Object.values(gainsData.gainsByAccountType).some(v => v !== 0) && (
        <div className="account-breakdown">
          <h4>Gains by Account Type</h4>
          <div className="account-list">
            {Object.entries(gainsData.gainsByAccountType).map(([accountType, gain]) => {
              if (gain === 0) return null;
              const isGain = gain >= 0;
              return (
                <div key={accountType} className="account-item">
                  <span className="account-type">{accountType}</span>
                  <span className={`account-gain ${isGain ? 'positive' : 'negative'}`}>
                    {isGain ? '+' : ''}{fmt(gain)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CapitalGainsCard;
