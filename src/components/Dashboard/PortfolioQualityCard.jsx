import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { calculatePortfolioQuality, getScoreColor } from '../../services/portfolioQuality';
import './PortfolioQualityCard.css';

function PortfolioQualityCard({ onViewDetails }) {
  const { profile } = useStore();

  const quality = useMemo(() => {
    const { assets, settings } = profile;
    return calculatePortfolioQuality(assets, settings);
  }, [profile]);

  const scoreColor = getScoreColor(quality.overall);

  return (
    <div className="quality-card">
      <div className="quality-card-header">
        <h3>Portfolio Quality</h3>
        {onViewDetails && (
          <button className="view-details-btn" onClick={onViewDetails}>
            View Details
          </button>
        )}
      </div>

      <div className="quality-card-content">
        {/* Main Score Gauge */}
        <div className="score-gauge">
          <svg viewBox="0 0 100 100" className="gauge-svg">
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
              strokeDasharray="188.5"
              strokeDashoffset="62.8"
              transform="rotate(135 50 50)"
            />
            {/* Score arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeDasharray="188.5"
              strokeDashoffset={188.5 - (quality.overall / 100) * 188.5 + 62.8}
              strokeLinecap="round"
              transform="rotate(135 50 50)"
              className="gauge-score-arc"
            />
          </svg>
          <div className="gauge-center">
            <span className="gauge-value" style={{ color: scoreColor }}>
              {quality.overall}
            </span>
            <span className="gauge-grade" style={{ color: scoreColor }}>
              {quality.grade}
            </span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="sub-scores">
          <SubScoreBar
            label="Diversification"
            score={quality.diversification.score}
            icon="D"
          />
          <SubScoreBar
            label="Balance"
            score={quality.balance.score}
            icon="B"
          />
          <SubScoreBar
            label="Resilience"
            score={quality.resilience.score}
            icon="R"
          />
          <SubScoreBar
            label="Risk"
            score={quality.risk.score}
            icon="!"
          />
        </div>

        {/* Top Recommendations */}
        {quality.recommendations.length > 0 && (
          <div className="quality-recommendations">
            <div className="recommendation-title">Top Priority:</div>
            <div className="recommendation-text">
              {quality.recommendations[0].suggestion}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubScoreBar({ label, score, icon }) {
  const color = getScoreColor(score);

  return (
    <div className="sub-score-bar">
      <div className="sub-score-label">
        <span className="sub-score-icon" style={{ backgroundColor: color }}>
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="sub-score-track">
        <div
          className="sub-score-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="sub-score-value">{score}</span>
    </div>
  );
}

export default PortfolioQualityCard;
