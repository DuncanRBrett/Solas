import { describe, it, expect } from 'vitest';
import {
  detectConcentrationRisks,
  calculateWeightedReturn,
} from '../calculations.js';

/**
 * Test Suite: Portfolio Quality Metrics
 *
 * These tests verify the portfolio quality assessment functions that help
 * users identify concentration risks and evaluate portfolio health.
 *
 * Key metrics tested:
 * - Single asset concentration
 * - Asset class concentration
 * - Currency concentration
 * - Portfolio tier concentration (Core/Satellite/Speculative)
 * - Sector concentration
 * - Region concentration
 * - Weighted portfolio return
 */

const STANDARD_RATES = {
  'USD/ZAR': 18.5,
  'EUR/ZAR': 19.8,
  'GBP/ZAR': 23.2,
};

const DEFAULT_THRESHOLDS = {
  singleAsset: 15, // Warning if single asset > 15%
  assetClass: 60, // Warning if single class > 60%
  currency: 70, // Warning if single currency > 70%
  portfolio: 40, // Warning if single tier > 40%
  sector: 30, // Warning if single sector > 30%
  region: 60, // Warning if single region > 60%
};

describe('Concentration Risk Detection', () => {
  describe('Single Asset Concentration', () => {
    it('should flag no risk when all assets are well-diversified', () => {
      const assets = [
        { name: 'Asset A', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset B', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset C', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset D', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset E', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
      ];

      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const singleAssetRisks = risks.filter(r => r.type === 'Single Asset');
      expect(singleAssetRisks.length).toBe(0); // Each asset is only 20% - below 15% threshold
    });

    it('should flag risk when single asset exceeds 15% threshold', () => {
      const assets = [
        { name: 'Dominant Asset', units: 10000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset B', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset C', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
      ];

      // Total: R1.2M, Dominant: R1M (83%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const singleAssetRisks = risks.filter(r => r.type === 'Single Asset');
      expect(singleAssetRisks.length).toBeGreaterThan(0);
      expect(singleAssetRisks[0].name).toBe('Dominant Asset');
      expect(parseFloat(singleAssetRisks[0].percentage)).toBeGreaterThan(15);
    });

    it('should calculate correct percentage for concentrated asset', () => {
      const assets = [
        { name: 'Big Holding', units: 3000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Small Holding', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
      ];

      // Total: R400k, Big: R300k (75%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const bigHoldingRisk = risks.find(r => r.name === 'Big Holding');
      expect(bigHoldingRisk).toBeDefined();
      expect(parseFloat(bigHoldingRisk.percentage)).toBeCloseTo(75, 0);
    });

    it('should ignore lifestyle assets in concentration calculations', () => {
      const assets = [
        { name: 'Primary Home', units: 1, currentPrice: 5000000, currency: 'ZAR', assetType: 'Lifestyle' },
        { name: 'Asset A', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Asset B', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
      ];

      // Total investible: R200k, each 50% (should flag)
      // Home is ignored
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const homeRisk = risks.find(r => r.name === 'Primary Home');
      expect(homeRisk).toBeUndefined(); // Lifestyle assets not flagged
    });
  });

  describe('Asset Class Concentration', () => {
    it('should flag risk when single asset class exceeds 60%', () => {
      const assets = [
        {
          name: 'SA Equity 1',
          assetClass: 'SA Equity',
          units: 5000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'SA Equity 2',
          assetClass: 'SA Equity',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'SA Bonds',
          assetClass: 'SA Bonds',
          units: 1000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Total: R900k, SA Equity: R800k (89%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const assetClassRisks = risks.filter(r => r.type === 'Asset Class');
      expect(assetClassRisks.length).toBeGreaterThan(0);

      const saEquityRisk = assetClassRisks.find(r => r.name === 'SA Equity');
      expect(saEquityRisk).toBeDefined();
      expect(parseFloat(saEquityRisk.percentage)).toBeGreaterThan(60);
    });

    it('should not flag risk when asset classes are balanced', () => {
      const assets = [
        {
          name: 'SA Equity',
          assetClass: 'SA Equity',
          units: 2000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Offshore Equity',
          assetClass: 'Offshore Equity',
          units: 2000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'SA Bonds',
          assetClass: 'SA Bonds',
          units: 2000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Each class: R200k (33.3%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const assetClassRisks = risks.filter(r => r.type === 'Asset Class');
      expect(assetClassRisks.length).toBe(0);
    });
  });

  describe('Currency Concentration', () => {
    it('should flag risk when single currency exceeds 70%', () => {
      const assets = [
        { name: 'ZAR Asset 1', units: 8000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'USD Asset', units: 100, currentPrice: 10, currency: 'USD', assetType: 'Investible' },
      ];

      // Total: R800k ZAR + $1000 (R18.5k) = R818.5k
      // ZAR: R800k (97.7%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const currencyRisks = risks.filter(r => r.type === 'Currency');
      expect(currencyRisks.length).toBeGreaterThan(0);

      const zarRisk = currencyRisks.find(r => r.name === 'ZAR');
      expect(zarRisk).toBeDefined();
      expect(parseFloat(zarRisk.percentage)).toBeGreaterThan(70);
    });

    it('should handle multi-currency portfolios correctly', () => {
      const assets = [
        { name: 'ZAR Asset', units: 4000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'USD Asset', units: 1000, currentPrice: 20, currency: 'USD', assetType: 'Investible' },
        { name: 'EUR Asset', units: 500, currentPrice: 20, currency: 'EUR', assetType: 'Investible' },
      ];

      // ZAR: R400k (42.9%)
      // USD: $20k = R370k (39.7%)
      // EUR: €10k = R198k (21.2%)
      // All under 70% threshold
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const currencyRisks = risks.filter(r => r.type === 'Currency');
      expect(currencyRisks.length).toBe(0);
    });
  });

  describe('Portfolio Tier Concentration', () => {
    it('should flag risk when speculative holdings exceed 40%', () => {
      const assets = [
        {
          name: 'Bitcoin',
          portfolio: 'Speculative',
          units: 5,
          currentPrice: 1000000,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Core Holding',
          portfolio: 'Core',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Speculative: R5M (62.5%), Core: R300k (37.5%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const portfolioRisks = risks.filter(r => r.type === 'Portfolio');
      expect(portfolioRisks.length).toBeGreaterThan(0);

      const specRisk = portfolioRisks.find(r => r.name === 'Speculative');
      expect(specRisk).toBeDefined();
    });

    it('should accept balanced core/satellite split', () => {
      const assets = [
        {
          name: 'Core 1',
          portfolio: 'Core',
          units: 6000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Satellite 1',
          portfolio: 'Satellite',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Speculative 1',
          portfolio: 'Speculative',
          units: 1000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Core: 60%, Satellite: 30%, Speculative: 10%
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const portfolioRisks = risks.filter(r => r.type === 'Portfolio');
      expect(portfolioRisks.length).toBe(0);
    });
  });

  describe('Sector Concentration', () => {
    it('should flag risk when single sector exceeds 30%', () => {
      const assets = [
        {
          name: 'Tech Stock 1',
          sector: 'Technology',
          units: 4000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Tech Stock 2',
          sector: 'Technology',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Financial',
          sector: 'Financials',
          units: 2000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Technology: R700k (77.8%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const sectorRisks = risks.filter(r => r.type === 'Sector');
      expect(sectorRisks.length).toBeGreaterThan(0);

      const techRisk = sectorRisks.find(r => r.name === 'Technology');
      expect(techRisk).toBeDefined();
      expect(parseFloat(techRisk.percentage)).toBeGreaterThan(30);
    });

    it('should handle undefined sectors gracefully', () => {
      const assets = [
        {
          name: 'Asset A',
          // No sector defined
          units: 1000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'Asset B',
          sector: 'Technology',
          units: 1000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Should not crash
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);
      expect(risks).toBeDefined();
    });
  });

  describe('Region Concentration', () => {
    it('should flag risk when single region exceeds 60%', () => {
      const assets = [
        {
          name: 'SA Stock 1',
          region: 'South Africa',
          units: 8000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'US Stock',
          region: 'North America',
          units: 1000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // South Africa: R800k (88.9%)
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const regionRisks = risks.filter(r => r.type === 'Region');
      expect(regionRisks.length).toBeGreaterThan(0);

      const saRisk = regionRisks.find(r => r.name === 'South Africa');
      expect(saRisk).toBeDefined();
      expect(parseFloat(saRisk.percentage)).toBeGreaterThan(60);
    });

    it('should accept globally diversified portfolio', () => {
      const assets = [
        {
          name: 'SA Stock',
          region: 'South Africa',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'US Stock',
          region: 'North America',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
        {
          name: 'EU Stock',
          region: 'Europe',
          units: 3000,
          currentPrice: 100,
          currency: 'ZAR',
          assetType: 'Investible',
        },
      ];

      // Each region: 33.3% - well under 60%
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const regionRisks = risks.filter(r => r.type === 'Region');
      expect(regionRisks.length).toBe(0);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty portfolio without errors', () => {
      const assets = [];

      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      expect(risks).toBeDefined();
      expect(risks.length).toBe(0);
    });

    it('should handle single asset portfolio', () => {
      const assets = [
        { name: 'Only Asset', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
      ];

      // Single asset = 100% concentration, should flag
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      const singleAssetRisks = risks.filter(r => r.type === 'Single Asset');
      expect(singleAssetRisks.length).toBeGreaterThan(0);
      expect(parseFloat(singleAssetRisks[0].percentage)).toBe(100);
    });

    it('should handle zero-value assets', () => {
      const assets = [
        { name: 'Worth Something', units: 1000, currentPrice: 100, currency: 'ZAR', assetType: 'Investible' },
        { name: 'Worth Nothing', units: 1000, currentPrice: 0, currency: 'ZAR', assetType: 'Investible' },
      ];

      // Should ignore zero-value asset
      const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

      // Only asset with value should appear
      expect(risks.some(r => r.name === 'Worth Nothing')).toBe(false);
    });
  });
});

describe('Weighted Portfolio Return', () => {
  const expectedReturns = {
    'SA Equity': 12.0,
    'Offshore Equity': 10.0,
    'SA Bonds': 8.0,
    'Cash': 6.0,
  };

  it('should calculate weighted return for single asset class', () => {
    const assets = [
      {
        name: 'SA Stock',
        assetClass: 'SA Equity',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
    ];

    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBe(12.0); // 100% SA Equity = 12% return
  });

  it('should calculate weighted return for balanced portfolio', () => {
    const assets = [
      {
        name: 'SA Equity',
        assetClass: 'SA Equity',
        units: 5000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
      {
        name: 'SA Bonds',
        assetClass: 'SA Bonds',
        units: 5000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
    ];

    // 50% SA Equity (12%) + 50% SA Bonds (8%) = 10%
    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBeCloseTo(10.0, 1);
  });

  it('should handle multi-asset portfolio correctly', () => {
    const assets = [
      {
        name: 'SA Equity',
        assetClass: 'SA Equity',
        units: 4000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      }, // R400k (40%)
      {
        name: 'Offshore Equity',
        assetClass: 'Offshore Equity',
        units: 3000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      }, // R300k (30%)
      {
        name: 'SA Bonds',
        assetClass: 'SA Bonds',
        units: 2000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      }, // R200k (20%)
      {
        name: 'Cash',
        assetClass: 'Cash',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      }, // R100k (10%)
    ];

    // 40% × 12% + 30% × 10% + 20% × 8% + 10% × 6%
    // = 4.8% + 3.0% + 1.6% + 0.6% = 10.0%
    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBeCloseTo(10.0, 1);
  });

  it('should ignore lifestyle assets in return calculation', () => {
    const assets = [
      {
        name: 'Primary Home',
        assetClass: 'Property',
        units: 1,
        currentPrice: 5000000,
        currency: 'ZAR',
        assetType: 'Lifestyle',
      },
      {
        name: 'Investments',
        assetClass: 'SA Equity',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
    ];

    // Should only consider investible assets
    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBe(12.0); // 100% SA Equity
  });

  it('should handle assets with unknown expected returns', () => {
    const assets = [
      {
        name: 'Known Asset',
        assetClass: 'SA Equity',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
      {
        name: 'Unknown Asset',
        assetClass: 'Exotic Class',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
    ];

    // Unknown asset treated as 0% return
    // 50% SA Equity (12%) + 50% Unknown (0%) = 6%
    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBeCloseTo(6.0, 1);
  });

  it('should return 0 for empty portfolio', () => {
    const assets = [];

    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBe(0);
  });

  it('should handle multi-currency assets correctly', () => {
    const assets = [
      {
        name: 'SA Equity',
        assetClass: 'SA Equity',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      }, // R100k
      {
        name: 'US Equity',
        assetClass: 'Offshore Equity',
        units: 500,
        currentPrice: 10,
        currency: 'USD',
        assetType: 'Investible',
      }, // $5k = R92.5k
    ];

    // Total: R192.5k
    // SA: R100k (52%) × 12% = 6.24%
    // US: R92.5k (48%) × 10% = 4.80%
    // Total: 11.04%
    const weightedReturn = calculateWeightedReturn(assets, STANDARD_RATES, expectedReturns);

    expect(weightedReturn).toBeCloseTo(11.04, 1);
  });
});

describe('Portfolio Quality Integration', () => {
  it('should identify well-balanced portfolio with no risks', () => {
    const assets = [
      {
        name: 'SA Equity ETF',
        assetClass: 'SA Equity',
        sector: 'Diversified',
        region: 'South Africa',
        portfolio: 'Core',
        units: 2000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
      {
        name: 'Global Equity ETF',
        assetClass: 'Offshore Equity',
        sector: 'Diversified',
        region: 'Global',
        portfolio: 'Core',
        units: 2000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
      {
        name: 'Bond Fund',
        assetClass: 'SA Bonds',
        sector: 'Fixed Income',
        region: 'South Africa',
        portfolio: 'Core',
        units: 1000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
      {
        name: 'Cash',
        assetClass: 'Cash',
        sector: 'Cash',
        region: 'South Africa',
        portfolio: 'Core',
        units: 500,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
    ];

    const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

    // Should have no concentration risks
    expect(risks.length).toBe(0);
  });

  it('should identify problematic concentrated portfolio', () => {
    const assets = [
      {
        name: 'Single Large Stock',
        assetClass: 'SA Equity',
        sector: 'Technology',
        region: 'South Africa',
        portfolio: 'Speculative',
        units: 10000,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
      {
        name: 'Small Diversifier',
        assetClass: 'SA Bonds',
        sector: 'Fixed Income',
        region: 'South Africa',
        portfolio: 'Core',
        units: 500,
        currentPrice: 100,
        currency: 'ZAR',
        assetType: 'Investible',
      },
    ];

    const risks = detectConcentrationRisks(assets, STANDARD_RATES, DEFAULT_THRESHOLDS);

    // Should flag multiple risks:
    // - Single asset concentration (95%)
    // - Asset class concentration (95% equity)
    // - Sector concentration (95% tech)
    // - Region concentration (100% SA)
    // - Portfolio concentration (95% speculative)
    expect(risks.length).toBeGreaterThan(4);
  });
});
