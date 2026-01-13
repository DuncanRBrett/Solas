import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { calculatePortfolioQuality } from '../../services/portfolioQuality';
import {
  generateRebalancingAdvice,
  calculateTotalTaxImpact,
  getRebalancingSummary,
} from '../../services/rebalancing';
import QualityScoreBreakdown from './QualityScoreBreakdown';
import AllocationTable from './AllocationTable';
import RebalancingAdvice from './RebalancingAdvice';
import './Rebalancing.css';

function Rebalancing() {
  const { profile } = useStore();

  const data = useMemo(() => {
    const { assets, settings } = profile;

    // Calculate quality score
    const quality = calculatePortfolioQuality(assets, settings);

    // Generate rebalancing recommendations
    const recommendations = generateRebalancingAdvice(assets, settings);

    // Calculate total tax impact
    const taxImpact = calculateTotalTaxImpact(recommendations);

    // Get summary
    const summary = getRebalancingSummary(recommendations);

    return {
      quality,
      recommendations,
      taxImpact,
      summary,
      settings,
    };
  }, [profile]);

  const { quality, recommendations, taxImpact, summary, settings } = data;

  return (
    <div className="rebalancing">
      <h2>Portfolio Rebalancing</h2>

      {/* Summary Banner */}
      {summary.totalActions > 0 && (
        <div className={`rebalancing-banner ${summary.highPriorityCount > 0 ? 'urgent' : 'recommended'}`}>
          <div className="banner-icon">
            {summary.highPriorityCount > 0 ? '!' : 'i'}
          </div>
          <div className="banner-content">
            <strong>
              {summary.highPriorityCount > 0
                ? `${summary.highPriorityCount} urgent rebalancing action${summary.highPriorityCount > 1 ? 's' : ''} needed`
                : `${summary.totalActions} rebalancing action${summary.totalActions > 1 ? 's' : ''} recommended`}
            </strong>
            <span>
              Estimated CGT if all followed: R {Math.round(taxImpact.totalCGT).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Quality Score Section */}
      <QualityScoreBreakdown quality={quality} />

      {/* Allocation Comparison */}
      <AllocationTable
        drifts={quality.balance.drifts}
        driftThreshold={quality.balance.driftThreshold}
        settings={settings}
      />

      {/* Tax-Aware Recommendations */}
      <RebalancingAdvice
        recommendations={recommendations}
        taxImpact={taxImpact}
        settings={settings}
      />
    </div>
  );
}

export default Rebalancing;
