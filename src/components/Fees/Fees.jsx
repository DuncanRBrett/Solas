import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import useStore from '../../store/useStore';
import EmptyState from '../shared/EmptyState';
import {
  calculateTotalAnnualFees,
  calculateLifetimeFees,
  getFeeOptimizationRecommendations,
} from '../../services/feeCalculations';
import { formatInReportingCurrency, calculateAssetValue } from '../../utils/calculations';
import './Fees.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Fees() {
  const { profile } = useStore();
  const { assets, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';

  const [projectionYears, setProjectionYears] = useState(30);
  const [inflationRate, setInflationRate] = useState(5.0);
  const [portfolioGrowthRate, setPortfolioGrowthRate] = useState(9.0);

  const fmt = (amount) => formatInReportingCurrency(amount, 0, reportingCurrency);

  // Check if fees are configured
  const hasFeesConfigured = useMemo(() => {
    const hasPlatforms = settings.platforms && settings.platforms.length > 0;
    const hasAdvisor = settings.advisorFee && settings.advisorFee.enabled;
    return hasPlatforms || hasAdvisor;
  }, [settings]);

  // Calculate annual fees
  const annualFees = useMemo(() => {
    if (assets.length === 0) return null;
    return calculateTotalAnnualFees(assets, settings);
  }, [assets, settings]);

  // Calculate lifetime fees
  const lifetimeFees = useMemo(() => {
    if (assets.length === 0) return null;
    return calculateLifetimeFees(assets, settings, projectionYears, inflationRate, portfolioGrowthRate);
  }, [assets, settings, projectionYears, inflationRate, portfolioGrowthRate]);

  // Get optimization recommendations
  const recommendations = useMemo(() => {
    if (!annualFees || !lifetimeFees) return [];
    return getFeeOptimizationRecommendations(annualFees, lifetimeFees);
  }, [annualFees, lifetimeFees]);

  // Prepare chart data - show portfolio with and without fees
  const chartData = useMemo(() => {
    if (!lifetimeFees) return null;

    const years = lifetimeFees.yearlyProjection.map(y => `Year ${y.year}`);
    const portfolioWithFees = lifetimeFees.yearlyProjection.map(y => y.portfolioValue);
    const portfolioWithoutFees = lifetimeFees.yearlyProjection.map(y => y.portfolioWithoutFees);

    return {
      labels: years,
      datasets: [
        {
          label: 'Portfolio Without Fees',
          data: portfolioWithoutFees,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
        {
          label: 'Portfolio With Fees',
          data: portfolioWithFees,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
        },
      ],
    };
  }, [lifetimeFees]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = fmt(context.parsed.y);
            return `${label}: ${value}`;
          },
          afterBody: (tooltipItems) => {
            if (tooltipItems.length >= 2) {
              const withoutFees = tooltipItems[0].parsed.y;
              const withFees = tooltipItems[1].parsed.y;
              const difference = withoutFees - withFees;
              return `\nFee Drag: ${fmt(difference)}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Portfolio Value',
        },
        ticks: {
          callback: (value) => fmt(value),
        },
        beginAtZero: true,
      },
    },
  };

  if (assets.filter(a => a.assetType === 'Investible').length === 0) {
    return (
      <div className="fees">
        <h2>Fee Analysis</h2>
        <EmptyState
          title="No investible assets"
          message="Add investible assets to see fee analysis"
          actionText="Go to Assets"
        />
      </div>
    );
  }

  if (!hasFeesConfigured) {
    return (
      <div className="fees">
        <h2>Fee Analysis</h2>
        <div className="fees-empty-state">
          <div className="empty-icon">💰</div>
          <h3>Configure Your Fees</h3>
          <p>Set up platform fees and advisor fees to see cost analysis and projections.</p>
          <a href="#" onClick={() => window.location.hash = '#settings'} className="btn-primary">
            Go to Settings → Fees & Platforms
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fees">
      <h2>Fee Analysis</h2>
      <p className="page-description">
        Understand how fees impact your portfolio over time. Small differences in fees can lead to significant savings.
      </p>

      {/* Current Year Fees - What You're Paying Now */}
      <div className="fees-card current-year-fees">
        <h3>What You're Paying This Year</h3>
        <p className="card-description">
          Annual fees based on your current portfolio value of {fmt(lifetimeFees?.currentPortfolioValue || 0)}
        </p>
        <div className="fees-overview">
          <div className="fee-card total">
            <div className="fee-card-header">
              <h3>Total Annual Fees</h3>
              <div className="fee-amount">{fmt(annualFees.totalExplicitFees)}</div>
            </div>
            <div className="fee-card-subtitle">
              Platform + Advisor fees you pay directly
            </div>
          </div>

          <div className="fee-card">
            <div className="fee-card-header">
              <h3>Platform Fees</h3>
              <div className="fee-amount">{fmt(annualFees.platformFees.total)}</div>
            </div>
            <div className="fee-card-subtitle">
              {annualFees.platformFees.byPlatform.length} platform(s)
            </div>
          </div>

          <div className="fee-card">
            <div className="fee-card-header">
              <h3>Advisor Fees</h3>
              <div className="fee-amount">{fmt(annualFees.advisorFees.total)}</div>
            </div>
            <div className="fee-card-subtitle">
              {annualFees.advisorFees.rate ? `${annualFees.advisorFees.rate}% of AUM` : 'Fixed fee'}
            </div>
          </div>

          <div className="fee-card">
            <div className="fee-card-header">
              <h3>TER Impact</h3>
              <div className="fee-amount">{fmt(annualFees.terImpact.annualImpact)}</div>
            </div>
            <div className="fee-card-subtitle">
              Avg: {annualFees.terImpact.averageTER.toFixed(2)}% (already in prices)
            </div>
          </div>
        </div>
      </div>

      {/* Performance Fee Notes (Informational) */}
      {assets.some(a => a.performanceFeeNotes) && (
        <div className="fees-card">
          <h3>Performance Fees (Informational Only)</h3>
          <p className="card-description">
            These complex fee structures cannot be calculated automatically. They are recorded for reference only
            and are NOT included in fee projections or scenario calculations.
          </p>
          <div className="performance-fee-notes">
            {assets
              .filter(a => a.performanceFeeNotes)
              .map(asset => (
                <div key={asset.id} className="performance-fee-item">
                  <strong>{asset.name}</strong>
                  <span>{asset.performanceFeeNotes}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Detailed Fee Breakdown Table */}
      <div className="fees-card">
        <h3>Where Your Fees Are Going</h3>
        <p className="card-description">
          Detailed breakdown of annual fees by asset, platform, and advisor
        </p>
        <div className="fees-table">
          <table>
            <thead>
              <tr>
                <th>Asset / Fee Type</th>
                <th>Platform</th>
                <th className="right">Value</th>
                <th className="right">Fee Rate</th>
                <th className="right">Annual Fee</th>
              </tr>
            </thead>
            <tbody>
              {/* Platform fees by asset */}
              {annualFees.platformFees.byPlatform.map((platform) => (
                platform.assets.map((asset, idx) => {
                  const assetObj = assets.find(a => a.id === asset.assetId);
                  const assetValue = assetObj ? calculateAssetValue(assetObj, settings) : 0;
                  const feeRate = assetValue > 0 ? (asset.fee / assetValue) * 100 : 0;
                  return (
                    <tr key={`${platform.platformId}-${asset.assetId}`} className={idx === 0 ? 'platform-first' : ''}>
                      <td>{asset.assetName}</td>
                      <td>{platform.platformName}</td>
                      <td className="right">{fmt(assetValue)}</td>
                      <td className="right">{feeRate.toFixed(2)}%</td>
                      <td className="right">{fmt(asset.fee)}</td>
                    </tr>
                  );
                })
              ))}

              {/* Platform fees subtotal */}
              {annualFees.platformFees.total > 0 && (
                <tr className="subtotal-row">
                  <td colSpan="4"><strong>Platform Fees Subtotal</strong></td>
                  <td className="right"><strong>{fmt(annualFees.platformFees.total)}</strong></td>
                </tr>
              )}

              {/* Advisor fee */}
              {annualFees.advisorFees.total > 0 && (
                <tr className="advisor-row">
                  <td><strong>Advisor Fee</strong></td>
                  <td>—</td>
                  <td className="right">{fmt(annualFees.advisorFees.appliedToValue)}</td>
                  <td className="right">{annualFees.advisorFees.rate ? `${annualFees.advisorFees.rate}%` : 'Fixed'}</td>
                  <td className="right">{fmt(annualFees.advisorFees.total)}</td>
                </tr>
              )}

              {/* TER (informational) */}
              {annualFees.terImpact.annualImpact > 0 && (
                <tr className="ter-row">
                  <td><em>TER (already in prices)</em></td>
                  <td>—</td>
                  <td className="right">{fmt(annualFees.terImpact.totalValue)}</td>
                  <td className="right">{annualFees.terImpact.averageTER.toFixed(2)}%</td>
                  <td className="right"><em>{fmt(annualFees.terImpact.annualImpact)}</em></td>
                </tr>
              )}

              {/* Grand total */}
              <tr className="total-row">
                <td colSpan="4"><strong>Total Explicit Fees (Platform + Advisor)</strong></td>
                <td className="right"><strong>{fmt(annualFees.totalExplicitFees)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="fee-table-note">
          <small>
            <strong>Note:</strong> TER is shown for reference only - it's already reflected in unit prices and not charged separately.
          </small>
        </div>
      </div>

      {/* Lifetime Projection Controls */}
      <div className="fees-card projection-controls">
        <h3>Lifetime Fee Projection</h3>
        <p className="card-description">
          See how fees compound over time and explore scenarios to optimize costs
        </p>

        <div className="projection-inputs">
          <div className="input-group">
            <label>Projection Period (Years)</label>
            <input
              type="number"
              min="5"
              max="50"
              value={projectionYears}
              onChange={(e) => setProjectionYears(parseInt(e.target.value) || 30)}
            />
          </div>

          <div className="input-group">
            <label>Inflation Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={inflationRate}
              onChange={(e) => setInflationRate(parseFloat(e.target.value) || 5.0)}
            />
          </div>

          <div className="input-group">
            <label>Portfolio Growth Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={portfolioGrowthRate}
              onChange={(e) => setPortfolioGrowthRate(parseFloat(e.target.value) || 9.0)}
            />
          </div>
        </div>
      </div>

      {/* Lifetime Projection Results */}
      {lifetimeFees && (
        <>
          <div className="fees-overview">
            <div className="fee-card highlight">
              <div className="fee-card-header">
                <h3>Total Fees ({projectionYears} years)</h3>
                <div className="fee-amount large">{fmt(lifetimeFees.cumulativeFeesNominal)}</div>
              </div>
              <div className="fee-card-subtitle">
                In today's money: {fmt(lifetimeFees.cumulativeFeesRealValue)}
              </div>
            </div>

            <div className="fee-card">
              <div className="fee-card-header">
                <h3>Average Annual Fee</h3>
                <div className="fee-amount">{fmt(lifetimeFees.summary.averageAnnualFee)}</div>
              </div>
              <div className="fee-card-subtitle">
                In today's money: {fmt(lifetimeFees.summary.averageAnnualFeeRealValue)}/yr
              </div>
            </div>

            <div className="fee-card">
              <div className="fee-card-header">
                <h3>Portfolio With Fees</h3>
                <div className="fee-amount">{fmt(lifetimeFees.finalPortfolioValue)}</div>
              </div>
              <div className="fee-card-subtitle">
                After {projectionYears} years
              </div>
            </div>

            <div className="fee-card negative">
              <div className="fee-card-header">
                <h3>Fee Drag (Lost Value)</h3>
                <div className="fee-amount">{fmt(lifetimeFees.feeDrag)}</div>
              </div>
              <div className="fee-card-subtitle">
                Money lost to fees vs no-fee scenario
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="fees-card">
            <h3>Portfolio Growth: With vs Without Fees</h3>
            <p className="card-description">
              The gap between the lines shows how much fees cost you over time.
              After {projectionYears} years, fees reduce your portfolio by {fmt(lifetimeFees.feeDrag)} ({((lifetimeFees.feeDrag / lifetimeFees.finalPortfolioWithoutFees) * 100).toFixed(1)}%).
            </p>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* What-If Scenarios */}
          <div className="fees-card">
            <h3>What If You Reduced Your Fee Rate?</h3>
            <p className="card-description">
              Your current effective fee rate is <strong>{lifetimeFees.currentExplicitFeeRate?.toFixed(2) || '0.00'}%</strong> per year.
              See how much you could save by reducing this rate through negotiation or switching to lower-cost alternatives.
            </p>

            <div className="what-if-grid">
              {Object.entries(lifetimeFees.reducedFeeScenarios).map(([key, scenario]) => (
                <div key={key} className="what-if-card">
                  <div className="what-if-header">
                    <div className="what-if-title">
                      {scenario.currentRate?.toFixed(2)}% → {scenario.newRate?.toFixed(2)}%
                    </div>
                    <div className="what-if-subtitle">
                      Reduce rate by {scenario.rateReduction}%
                    </div>
                    <div className="what-if-savings">
                      +{fmt(scenario.extraPortfolioValue)}
                    </div>
                    <div className="what-if-savings-label">extra portfolio value</div>
                  </div>
                  <div className="what-if-details">
                    <div className="what-if-row">
                      <span>Final Portfolio:</span>
                      <span>{fmt(scenario.finalPortfolioValue)}</span>
                    </div>
                    <div className="what-if-row">
                      <span>Total Fees Saved:</span>
                      <span className="positive">{fmt(scenario.savingsVsBaseline)}</span>
                    </div>
                    <div className="what-if-row">
                      <span>Fees over {projectionYears} years:</span>
                      <span>{fmt(scenario.cumulativeFees)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="what-if-note">
              <strong>💡 How to reduce fees:</strong>
              <ul>
                <li>Negotiate with your advisor (especially for larger portfolios)</li>
                <li>Switch to lower-cost platforms (e.g., EasyEquities vs traditional brokers)</li>
                <li>Replace actively managed funds with index ETFs (lower TER)</li>
                <li>Consolidate accounts to qualify for volume discounts</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Optimization Recommendations */}
      {recommendations.length > 0 && (
        <div className="fees-card recommendations">
          <h3>Fee Optimization Recommendations</h3>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-item ${rec.priority}`}>
                <div className="recommendation-icon">
                  {rec.priority === 'high' ? '🔴' : '🟡'}
                </div>
                <div className="recommendation-content">
                  <h4>{rec.title}</h4>
                  <p>{rec.description}</p>
                  <div className="recommendation-action">{rec.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="fees-disclaimer">
        <small>
          <strong>Note:</strong> Fee calculations are estimates based on your current portfolio and configured fee structures.
          Actual fees may vary. TER (Total Expense Ratio) is already reflected in unit prices and shown here for informational purposes.
          Projections assume constant fee rates and do not account for portfolio rebalancing or changes in fee structures over time.
        </small>
      </div>
    </div>
  );
}

export default Fees;
