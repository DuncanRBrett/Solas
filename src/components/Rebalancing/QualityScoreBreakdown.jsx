import { useState } from 'react';
import { getScoreColor } from '../../services/portfolioQuality';

function QualityScoreBreakdown({ quality }) {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const scoreColor = getScoreColor(quality.overall);

  return (
    <div className="quality-breakdown">
      <div className="quality-header">
        <h3>Portfolio Quality Score</h3>
      </div>

      <div className="quality-main">
        {/* Main Score Display */}
        <div className="main-score">
          <div className="score-circle" style={{ borderColor: scoreColor }}>
            <span className="score-number" style={{ color: scoreColor }}>
              {quality.overall}
            </span>
            <span className="score-grade" style={{ color: scoreColor }}>
              {quality.grade}
            </span>
          </div>
          <div className="score-label">Overall Quality</div>
        </div>

        {/* Sub-score Cards */}
        <div className="sub-score-cards">
          {/* Diversification */}
          <SubScoreCard
            title="Diversification"
            score={quality.diversification.score}
            isExpanded={expandedSection === 'diversification'}
            onToggle={() => toggleSection('diversification')}
          >
            <div className="score-details">
              {/* Largest position highlight if concentrated */}
              {quality.diversification.largestPosition?.percentage > 15 && (
                <div className="concentration-warning">
                  <strong>Largest Position:</strong> {quality.diversification.largestPosition.name} ({quality.diversification.largestPosition.percentage.toFixed(1)}%)
                </div>
              )}
              <DetailRow label="Holdings Count" value={quality.diversification.holdingsCount} />
              <DetailRow label="Individual HHI" value={quality.diversification.individualHHI} suffix=" (single-position risk)" />
              <DetailRow label="Asset Class HHI" value={quality.diversification.assetClassHHI} suffix=" (lower is better)" />
              <DetailRow label="Currency HHI" value={quality.diversification.currencyHHI} />
              <DetailRow label="Region HHI" value={quality.diversification.regionHHI} />
              <DetailRow label="Sector HHI" value={quality.diversification.sectorHHI} />
              <p className="detail-note">{quality.diversification.details}</p>
            </div>
          </SubScoreCard>

          {/* Balance */}
          <SubScoreCard
            title="Balance"
            score={quality.balance.score}
            isExpanded={expandedSection === 'balance'}
            onToggle={() => toggleSection('balance')}
          >
            <div className="score-details">
              <DetailRow label="Total Drift" value={`${quality.balance.totalDrift}%`} />
              <DetailRow label="Max Drift" value={`${quality.balance.maxDrift}%`} />
              <DetailRow label="Urgency" value={quality.balance.urgency} capitalize />
              <p className="detail-note">{quality.balance.details}</p>
            </div>
          </SubScoreCard>

          {/* Resilience */}
          <SubScoreCard
            title="Resilience"
            score={quality.resilience.score}
            isExpanded={expandedSection === 'resilience'}
            onToggle={() => toggleSection('resilience')}
          >
            <div className="score-details">
              <DetailRow label="Liquidity Ratio" value={`${quality.resilience.liquidityRatio}%`} />
              <DetailRow label="Defensive Allocation" value={`${quality.resilience.defensiveRatio}%`} />
              <DetailRow label="Emergency Fund" value={`${quality.resilience.emergencyFundMonths} months`} />
              <p className="detail-note">{quality.resilience.details}</p>
            </div>
          </SubScoreCard>

          {/* Risk */}
          <SubScoreCard
            title="Risk"
            score={quality.risk.score}
            isExpanded={expandedSection === 'risk'}
            onToggle={() => toggleSection('risk')}
          >
            <div className="score-details">
              <DetailRow label="Concentration Risks" value={quality.risk.riskCount} />
              <DetailRow label="Max Single Asset" value={`${quality.risk.maxSingleAssetPct}%`} />
              <DetailRow label="Max Currency" value={`${quality.risk.maxCurrencyPct}%`} />
              {quality.risk.concentrationRisks.length > 0 && (
                <div className="concentration-list">
                  {quality.risk.concentrationRisks.map((risk, i) => (
                    <div key={i} className={`risk-item ${risk.severity}`}>
                      {risk.type}: {risk.name} ({risk.percentage}%)
                    </div>
                  ))}
                </div>
              )}
              <p className="detail-note">{quality.risk.details}</p>
            </div>
          </SubScoreCard>
        </div>
      </div>

      {/* Recommendations */}
      {quality.recommendations.length > 0 && (
        <div className="quality-recommendations-section">
          <h4>Improvement Priorities</h4>
          <div className="recommendation-list">
            {quality.recommendations.map((rec, i) => (
              <div key={i} className={`recommendation-item priority-${rec.priority}`}>
                <span className="rec-number">{i + 1}</span>
                <span className="rec-area">{rec.area}</span>
                <span className="rec-suggestion">{rec.suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubScoreCard({ title, score, children, isExpanded, onToggle }) {
  const color = getScoreColor(score);

  return (
    <div className={`sub-score-card ${isExpanded ? 'expanded' : ''}`}>
      <button className="sub-score-header" onClick={onToggle}>
        <div className="sub-score-title">
          <span className="sub-score-dot" style={{ backgroundColor: color }} />
          {title}
        </div>
        <div className="sub-score-right">
          <span className="sub-score-value" style={{ color }}>{score}</span>
          <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
        </div>
      </button>
      {isExpanded && <div className="sub-score-content">{children}</div>}
    </div>
  );
}

function DetailRow({ label, value, suffix = '', capitalize = false }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value ${capitalize ? 'capitalize' : ''}`}>
        {value}{suffix}
      </span>
    </div>
  );
}

export default QualityScoreBreakdown;
