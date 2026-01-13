import { useMemo, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import useStore from '../../store/useStore';
import { calculateAllocation, getExchangeRates, formatCurrency } from '../../utils/calculations';
import { getCurrencySymbol } from '../../models/defaults';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Color palette for charts
const CHART_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

function AllocationCharts() {
  const { profile } = useStore();
  const [viewBy, setViewBy] = useState('assetClass'); // assetClass, currency, sector, region, platform, assetType, equitySector

  const { assets, settings } = profile;
  const reportingCurrency = settings.reportingCurrency || 'ZAR';
  const exchangeRates = getExchangeRates(settings);

  // Build legacy format for calculateAllocation (temporary until we update that function)
  const legacyExchangeRates = useMemo(() => {
    const legacy = {};
    Object.entries(exchangeRates).forEach(([currency, rate]) => {
      if (currency !== reportingCurrency) {
        legacy[`${currency}/${reportingCurrency}`] = rate;
      }
    });
    return legacy;
  }, [exchangeRates, reportingCurrency]);

  // For equity sector view, filter to only equity assets
  const equityAssets = assets.filter(a =>
    a.assetClass === 'Offshore Equity' || a.assetClass === 'SA Equity'
  );

  const chartData = useMemo(() => {
    // Use equity assets if viewing by equity sector
    const assetsToUse = viewBy === 'equitySector' ? equityAssets : assets;
    const dimensionToUse = viewBy === 'equitySector' ? 'sector' : viewBy;

    const allocation = calculateAllocation(assetsToUse, legacyExchangeRates, dimensionToUse);

    // Filter out zero or very small allocations
    const filtered = allocation.filter(item => item.percentage > 0.1);

    return {
      labels: filtered.map(item => item.name || 'Uncategorized'),
      datasets: [
        {
          data: filtered.map(item => item.value),
          backgroundColor: CHART_COLORS.slice(0, filtered.length),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [assets, equityAssets, legacyExchangeRates, viewBy]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const dataset = data.datasets[0];
              const total = dataset.data.reduce((a, b) => a + b, 0);

              return data.labels.map((label, i) => {
                const value = dataset.data[i];
                const percentage = ((value / total) * 100).toFixed(1);

                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: dataset.backgroundColor[i],
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const symbol = getCurrencySymbol(reportingCurrency);
            const formatted = `${symbol} ${value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
            return `${formatted} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Get title for chart based on viewBy
  const getChartTitle = () => {
    if (viewBy === 'equitySector') return 'Equity Sector Breakdown';
    if (viewBy === 'assetClass') return 'Asset Class';
    if (viewBy === 'assetType') return 'Asset Type (Investible/Non-Investible)';
    return viewBy.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <div className="allocation-charts">
      {/* View Selector */}
      <div className="chart-controls">
        <label>View By:</label>
        <select value={viewBy} onChange={(e) => setViewBy(e.target.value)}>
          <option value="assetClass">Asset Class</option>
          <option value="currency">Currency</option>
          <option value="region">Region</option>
          <option value="platform">Platform</option>
          <option value="assetType">Asset Type (Investible/Non-Investible)</option>
          <option value="equitySector">Equity Sector Breakdown</option>
        </select>
      </div>

      {/* Main Allocation Chart */}
      <div className="chart-container">
        <h4>Allocation by {getChartTitle()}</h4>
        <div className="chart-wrapper">
          <Pie data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default AllocationCharts;
