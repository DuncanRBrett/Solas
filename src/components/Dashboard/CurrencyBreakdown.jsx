import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { calculateAssetValue, getExchangeRates, formatInReportingCurrency } from '../../utils/calculations';
import { getCurrencySymbol } from '../../models/defaults';
import './CurrencyBreakdown.css';

function CurrencyBreakdown() {
  const { profile } = useStore();
  const { assets, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);

  const currencyData = useMemo(() => {
    // Group assets by currency and calculate totals
    const byCurrency = {};
    let grandTotal = 0;

    assets.forEach(asset => {
      const currency = asset.currency;
      const valueInAssetCurrency = asset.units * asset.currentPrice;
      const valueInReportingCurrency = calculateAssetValue(asset, settings);

      if (!byCurrency[currency]) {
        byCurrency[currency] = {
          currency,
          nativeValue: 0,
          convertedValue: 0,
          assetCount: 0,
        };
      }

      byCurrency[currency].nativeValue += valueInAssetCurrency;
      byCurrency[currency].convertedValue += valueInReportingCurrency;
      byCurrency[currency].assetCount += 1;
      grandTotal += valueInReportingCurrency;
    });

    // Convert to array and calculate percentages
    const currencyArray = Object.values(byCurrency).map(item => ({
      ...item,
      percentage: grandTotal > 0 ? (item.convertedValue / grandTotal) * 100 : 0,
    }));

    // Sort by converted value (largest first)
    currencyArray.sort((a, b) => b.convertedValue - a.convertedValue);

    return {
      currencies: currencyArray,
      grandTotal,
    };
  }, [assets, settings]);

  const formatNative = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${amount.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
  };

  const formatConverted = (amount) => {
    return formatInReportingCurrency(amount, 0, reportingCurrency);
  };

  if (assets.length === 0) {
    return (
      <div className="currency-breakdown-card empty">
        <h3>Net Worth by Currency</h3>
        <p className="empty-message">Add assets to see currency breakdown</p>
      </div>
    );
  }

  return (
    <div className="currency-breakdown-card">
      <h3>Net Worth by Currency</h3>

      <div className="currency-total">
        <span className="total-label">Total Net Worth</span>
        <span className="total-value">{formatConverted(currencyData.grandTotal)}</span>
      </div>

      <div className="currency-list">
        {currencyData.currencies.map((item) => (
          <div key={item.currency} className="currency-item">
            <div className="currency-header">
              <span className="currency-code">{item.currency}</span>
              <span className="currency-percentage">{item.percentage.toFixed(1)}%</span>
            </div>
            <div className="currency-values">
              <div className="native-value">
                {formatNative(item.nativeValue, item.currency)}
              </div>
              <div className="converted-value">
                ≈ {formatConverted(item.convertedValue)}
              </div>
            </div>
            <div className="currency-meta">
              {item.assetCount} {item.assetCount === 1 ? 'asset' : 'assets'}
            </div>
            <div className="currency-bar">
              <div
                className="currency-bar-fill"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {currencyData.currencies.length > 1 && (
        <div className="currency-note">
          <small>
            Values converted to {reportingCurrency} at current exchange rates
          </small>
        </div>
      )}
    </div>
  );
}

export default CurrencyBreakdown;
