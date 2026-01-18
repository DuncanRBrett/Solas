/**
 * History Component - View and manage portfolio history snapshots
 *
 * Displays historical net worth data in a table and chart format.
 * Allows exporting history to Excel.
 */

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
} from 'chart.js';
import useStore from '../../store/useStore';
import { formatInReportingCurrency } from '../../utils/calculations';
import { useConfirmDialog } from '../shared/ConfirmDialog';
import toast from 'react-hot-toast';
import './History.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function History() {
  const { profile, getHistoryChronological, deleteSnapshot, clearHistory } = useStore();
  const { confirmDialog, showConfirm } = useConfirmDialog();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const settings = profile?.settings || {};
  const reportingCurrency = settings?.reportingCurrency || 'ZAR';

  // Format currency
  const fmt = (amount, decimals = 0) =>
    formatInReportingCurrency(amount, decimals, reportingCurrency);

  // Get history sorted chronologically for chart
  const history = useMemo(() => {
    return getHistoryChronological();
  }, [getHistoryChronological, profile?.history]);

  // Reverse for table (newest first)
  const historyReversed = useMemo(() => [...history].reverse(), [history]);

  // Chart data
  const chartData = useMemo(() => {
    if (history.length === 0) return null;

    return {
      labels: history.map((s) =>
        new Date(s.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        })
      ),
      datasets: [
        {
          label: 'Net Worth',
          data: history.map((s) => s.netWorth),
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Investible Assets',
          data: history.map((s) => s.investibleAssets),
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          fill: false,
          tension: 0.3,
        },
      ],
    };
  }, [history]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `${context.dataset.label}: ${fmt(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => fmt(value),
        },
      },
    },
  };

  // Handle delete single snapshot
  const handleDelete = async (snapshotId, date) => {
    const confirmed = await showConfirm({
      title: 'Delete Snapshot',
      message: `Delete the snapshot from ${new Date(date).toLocaleDateString()}?`,
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (confirmed) {
      deleteSnapshot(snapshotId);
      toast.success('Snapshot deleted');
    }
  };

  // Handle clear all history
  const handleClearAll = async () => {
    const confirmed = await showConfirm({
      title: 'Clear All History',
      message: 'Are you sure you want to delete ALL history snapshots? This cannot be undone.',
      confirmText: 'Clear All',
      variant: 'danger',
    });

    if (confirmed) {
      clearHistory();
      toast.success('History cleared');
    }
  };

  // Export to Excel
  const handleExport = async () => {
    if (history.length === 0) {
      toast.error('No history to export');
      return;
    }

    try {
      // Dynamic import xlsx
      const XLSX = await import('xlsx');

      // Prepare data for Excel
      const exportData = history.map((s) => ({
        Date: new Date(s.date).toLocaleDateString(),
        Time: new Date(s.date).toLocaleTimeString(),
        'Net Worth': s.netWorth,
        'Gross Assets': s.grossAssets,
        'Investible Assets': s.investibleAssets,
        'Non-Investible Assets': s.nonInvestibleAssets || 0,
        Liabilities: s.liabilities,
        'CGT Liability': s.cgtLiability || 0,
        'Realisable Net Worth': s.realisableNetWorth || s.netWorth,
        // Allocation percentages
        ...Object.entries(s.allocation || {}).reduce((acc, [key, value]) => {
          acc[`Allocation: ${key}`] = `${value.toFixed(1)}%`;
          return acc;
        }, {}),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Portfolio History');

      // Generate filename with date
      const filename = `solas_history_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success('History exported to Excel');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export history');
    }
  };

  return (
    <div className="history">
      {confirmDialog}

      <div className="history-header">
        <h2>Portfolio History</h2>
        <div className="history-actions">
          <button className="btn btn-secondary" onClick={handleExport} disabled={history.length === 0}>
            Export to Excel
          </button>
          {history.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <p>No history snapshots yet.</p>
          <p>Go to the Dashboard and click "Save to History" to record your first snapshot.</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="history-chart-container">
            <h3>Net Worth Over Time</h3>
            <div className="history-chart">
              {chartData && <Line data={chartData} options={chartOptions} />}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="history-summary">
            <div className="summary-card">
              <div className="summary-label">First Snapshot</div>
              <div className="summary-value">{fmt(history[0]?.netWorth)}</div>
              <div className="summary-date">
                {new Date(history[0]?.date).toLocaleDateString()}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Latest Snapshot</div>
              <div className="summary-value">{fmt(history[history.length - 1]?.netWorth)}</div>
              <div className="summary-date">
                {new Date(history[history.length - 1]?.date).toLocaleDateString()}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Change</div>
              <div
                className={`summary-value ${
                  history[history.length - 1]?.netWorth - history[0]?.netWorth >= 0
                    ? 'positive'
                    : 'negative'
                }`}
              >
                {fmt(history[history.length - 1]?.netWorth - history[0]?.netWorth)}
              </div>
              <div className="summary-date">
                {history.length > 1
                  ? `${(
                      ((history[history.length - 1]?.netWorth - history[0]?.netWorth) /
                        history[0]?.netWorth) *
                      100
                    ).toFixed(1)}%`
                  : '-'}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Snapshots</div>
              <div className="summary-value">{history.length}</div>
            </div>
          </div>

          {/* Table */}
          <div className="history-table-container">
            <h3>Snapshot History</h3>
            <div className="table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th className="col-date">Date</th>
                    <th className="col-currency">Net Worth</th>
                    <th className="col-currency">Investible</th>
                    <th className="col-currency">Liabilities</th>
                    <th className="col-change">Change</th>
                    <th className="col-allocation">Allocation</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyReversed.map((snapshot, index) => {
                    // Calculate change from previous snapshot
                    const prevIndex = historyReversed.length - 1 - index;
                    const prevSnapshot = history[prevIndex - 1];
                    const change = prevSnapshot
                      ? snapshot.netWorth - prevSnapshot.netWorth
                      : 0;
                    const changePercent = prevSnapshot
                      ? ((change / prevSnapshot.netWorth) * 100).toFixed(1)
                      : 0;

                    // Get allocation data
                    const allocation = snapshot.allocation || {};
                    const allocationEntries = Object.entries(allocation).sort((a, b) => b[1] - a[1]);

                    return (
                      <tr key={snapshot.id}>
                        <td className="col-date">
                          <div className="date-cell">
                            <span className="date">
                              {new Date(snapshot.date).toLocaleDateString()}
                            </span>
                            <span className="time">
                              {new Date(snapshot.date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="col-currency">{fmt(snapshot.netWorth)}</td>
                        <td className="col-currency">{fmt(snapshot.investibleAssets)}</td>
                        <td className="col-currency">{fmt(snapshot.liabilities)}</td>
                        <td className="col-change">
                          {prevSnapshot ? (
                            <span className={change >= 0 ? 'positive' : 'negative'}>
                              {change >= 0 ? '+' : ''}
                              {fmt(change)} ({changePercent}%)
                            </span>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="col-allocation">
                          {allocationEntries.length > 0 ? (
                            <div className="allocation-pills">
                              {allocationEntries.map(([assetClass, pct]) => (
                                <span key={assetClass} className="allocation-pill" title={assetClass}>
                                  {assetClass.replace('Offshore ', 'O/').replace('SA ', 'SA ')}: {pct.toFixed(0)}%
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td className="col-actions">
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => handleDelete(snapshot.id, snapshot.date)}
                            title="Delete snapshot"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default History;
