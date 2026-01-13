import { useState } from 'react';
import { formatCurrency } from '../../utils/calculations';

function RebalancingAdvice({ recommendations, taxImpact, settings }) {
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';

  if (recommendations.length === 0) {
    return (
      <div className="rebalancing-advice-section">
        <h3>Rebalancing Recommendations</h3>
        <div className="no-recommendations">
          <span className="check-icon">&#10003;</span>
          <div>
            <strong>Portfolio is well balanced</strong>
            <p>No rebalancing actions needed at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rebalancing-advice-section">
      <h3>Tax-Aware Rebalancing Recommendations</h3>

      {/* Tax Impact Summary */}
      <div className="tax-impact-summary">
        <div className="tax-item">
          <span className="tax-label">Gains to Realize</span>
          <span className="tax-value">
            {formatCurrency(taxImpact.totalGainsRealized, 0, reportingCurrency)}
          </span>
        </div>
        <div className="tax-item">
          <span className="tax-label">Losses to Harvest</span>
          <span className="tax-value positive">
            {formatCurrency(taxImpact.totalLossesRealized, 0, reportingCurrency)}
          </span>
        </div>
        <div className="tax-item highlight">
          <span className="tax-label">Estimated CGT</span>
          <span className="tax-value">
            {formatCurrency(taxImpact.totalCGT, 0, reportingCurrency)}
          </span>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="recommendations-list">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={rec.assetClass}
            recommendation={rec}
            index={index + 1}
            reportingCurrency={reportingCurrency}
          />
        ))}
      </div>

      {/* Tax & Concentration Note */}
      <div className="tax-note">
        <strong>Sell Priority (considers tax efficiency + concentration):</strong>
        <ol>
          <li>Assets at a loss (tax loss harvesting opportunity)</li>
          <li>High-concentration taxable positions ({'>'}20% of portfolio)</li>
          <li>Low-gain taxable assets (minimal CGT impact)</li>
          <li>High-gain taxable assets (pay CGT but preserve tax shelters)</li>
          <li>TFSA holdings (preserve - limited contribution room)</li>
          <li>RA holdings (avoid - withdrawal penalties)</li>
        </ol>
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, index, reportingCurrency }) {
  const [expanded, setExpanded] = useState(false);
  const {
    assetClass,
    action,
    currentPct,
    targetPct,
    driftPct,
    amountToAdjust,
    severity,
    sellDetails,
    totalCGT,
  } = recommendation;

  const isSell = action === 'sell';

  return (
    <div className={`recommendation-card ${severity}`}>
      <div className="rec-header" onClick={() => isSell && sellDetails.length > 0 && setExpanded(!expanded)}>
        <div className="rec-index">{index}</div>

        <div className="rec-main">
          <div className="rec-title">
            <span className={`action-badge ${action}`}>{action.toUpperCase()}</span>
            <span className="asset-class-name">{assetClass}</span>
            {severity === 'high' && <span className="urgent-badge">Urgent</span>}
          </div>
          <div className="rec-details">
            {currentPct}% → {targetPct}%
            <span className={`drift ${parseFloat(driftPct) > 0 ? 'over' : 'under'}`}>
              ({driftPct > 0 ? '+' : ''}{driftPct}% drift)
            </span>
          </div>
        </div>

        <div className="rec-amount">
          <div className="amount-value">
            {formatCurrency(amountToAdjust, 0, reportingCurrency)}
          </div>
          {isSell && totalCGT > 0 && (
            <div className="cgt-estimate">
              CGT: {formatCurrency(totalCGT, 0, reportingCurrency)}
            </div>
          )}
        </div>

        {isSell && sellDetails.length > 0 && (
          <div className="expand-indicator">
            {expanded ? '▲' : '▼'}
          </div>
        )}
      </div>

      {/* Expanded Sell Details */}
      {expanded && isSell && sellDetails.length > 0 && (
        <div className="sell-details">
          <div className="sell-details-header">
            <span>Asset</span>
            <span>Sell Amount</span>
            <span>Gain/Loss</span>
            <span>CGT</span>
            <span>Tax Note</span>
          </div>
          {sellDetails.map((detail) => (
            <SellDetailRow
              key={detail.assetId}
              detail={detail}
              reportingCurrency={reportingCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SellDetailRow({ detail, reportingCurrency }) {
  const {
    assetName,
    ticker,
    sellAmount,
    sellAll,
    proportionalGain,
    proportionalCGT,
    accountType,
    taxEfficiencyScore,
    concentrationPct,
    combinedScore,
    taxNote,
  } = detail;

  // Determine efficiency badge color based on combined score (includes concentration)
  let efficiencyClass = 'low';
  if (combinedScore >= 80) efficiencyClass = 'high';
  else if (combinedScore >= 50) efficiencyClass = 'medium';

  return (
    <div className={`sell-detail-row ${proportionalGain < 0 ? 'loss' : ''}`}>
      <div className="sell-asset">
        <span className="asset-name">{assetName}</span>
        {ticker && <span className="ticker">{ticker}</span>}
        <span className="account-type">{accountType} {concentrationPct > 10 && <span className="concentration-pct">({concentrationPct}% of portfolio)</span>}</span>
      </div>
      <div className="sell-amount">
        {formatCurrency(sellAmount, 0, reportingCurrency)}
        {sellAll && <span className="sell-all-badge">Sell All</span>}
      </div>
      <div className={`sell-gain ${proportionalGain < 0 ? 'negative' : 'positive'}`}>
        {proportionalGain >= 0 ? '+' : ''}
        {formatCurrency(proportionalGain, 0, reportingCurrency)}
      </div>
      <div className="sell-cgt">
        {proportionalCGT > 0
          ? formatCurrency(proportionalCGT, 0, reportingCurrency)
          : '—'}
      </div>
      <div className="sell-note">
        <span className={`efficiency-badge ${efficiencyClass}`} title={`Priority: ${combinedScore} (Tax: ${taxEfficiencyScore}${concentrationPct > 10 ? `, +Conc: ${concentrationPct}%` : ''})`}>
          {efficiencyClass === 'high' ? '★' : efficiencyClass === 'medium' ? '◉' : '○'}
        </span>
        {taxNote}
      </div>
    </div>
  );
}

export default RebalancingAdvice;
