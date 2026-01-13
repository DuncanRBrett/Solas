import { formatCurrency } from '../../utils/calculations';

function AllocationTable({ drifts, driftThreshold, settings }) {
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';

  // Sort by absolute drift descending
  const sortedDrifts = [...drifts].sort(
    (a, b) => Math.abs(b.drift) - Math.abs(a.drift)
  );

  return (
    <div className="allocation-table-section">
      <h3>Current vs Target Allocation</h3>

      <table className="allocation-table">
        <thead>
          <tr>
            <th>Asset Class</th>
            <th>Current</th>
            <th>Target</th>
            <th>Drift</th>
            <th className="visual-col">Allocation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedDrifts.map((item) => (
            <AllocationRow
              key={item.assetClass}
              item={item}
              driftThreshold={driftThreshold}
              reportingCurrency={reportingCurrency}
            />
          ))}
        </tbody>
      </table>

      <div className="table-legend">
        <span className="legend-item">
          <span className="legend-bar current" />
          Current
        </span>
        <span className="legend-item">
          <span className="legend-marker" />
          Target
        </span>
      </div>
    </div>
  );
}

function AllocationRow({ item, driftThreshold, reportingCurrency }) {
  const { assetClass, currentPct, targetPct, drift, currentValue, needsRebalancing } = item;

  // Determine status
  let status = 'ok';
  let statusLabel = 'On Target';
  if (Math.abs(drift) > driftThreshold * 2) {
    status = 'urgent';
    statusLabel = drift > 0 ? 'Overweight' : 'Underweight';
  } else if (Math.abs(drift) > driftThreshold) {
    status = 'warning';
    statusLabel = drift > 0 ? 'Slightly Over' : 'Slightly Under';
  }

  // Calculate bar widths (max 60% for visual clarity)
  const maxBarWidth = 60;
  const maxPct = Math.max(currentPct, targetPct, 50);
  const scale = maxBarWidth / maxPct;

  const currentWidth = currentPct * scale;
  const targetPosition = targetPct * scale;

  return (
    <tr className={needsRebalancing ? 'needs-rebalancing' : ''}>
      <td className="asset-class-cell">{assetClass}</td>
      <td className="pct-cell">{currentPct.toFixed(1)}%</td>
      <td className="pct-cell">{targetPct}%</td>
      <td className={`drift-cell ${drift > 0 ? 'positive' : drift < 0 ? 'negative' : ''}`}>
        {drift > 0 ? '+' : ''}{drift.toFixed(1)}%
      </td>
      <td className="visual-cell">
        <div className="allocation-bar-container">
          {/* Current allocation bar */}
          <div
            className={`allocation-bar ${status}`}
            style={{ width: `${currentWidth}%` }}
          />
          {/* Target marker */}
          {targetPct > 0 && (
            <div
              className="target-marker"
              style={{ left: `${targetPosition}%` }}
              title={`Target: ${targetPct}%`}
            />
          )}
        </div>
      </td>
      <td className="status-cell">
        <span className={`status-badge ${status}`}>{statusLabel}</span>
      </td>
    </tr>
  );
}

export default AllocationTable;
