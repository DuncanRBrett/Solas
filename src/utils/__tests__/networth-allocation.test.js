import { describe, it, expect } from 'vitest';
import {
  calculateGrossAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateInvestibleAssets,
  calculateNonInvestibleAssets,
  groupAssets,
  calculateAllocation,
} from '../calculations';

describe('Net Worth Calculations', () => {
  const exchangeRates = {
    'ZAR/ZAR': 1.0,
    'USD/ZAR': 18.50,
    'EUR/ZAR': 19.80,
    'GBP/ZAR': 23.20,
  };

  describe('calculateGrossAssets', () => {
    it('calculates total value of all assets', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR' },
        { units: 50, currentPrice: 100, currency: 'ZAR' },
        { units: 25, currentPrice: 200, currency: 'ZAR' },
      ];

      const result = calculateGrossAssets(assets, exchangeRates);
      // 100*500 + 50*100 + 25*200 = 50,000 + 5,000 + 5,000 = 60,000
      expect(result).toBe(60000);
    });

    it('handles mixed currencies', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR' }, // 50,000 ZAR
        { units: 50, currentPrice: 100, currency: 'USD' },  // 5,000 USD = 92,500 ZAR
        { units: 25, currentPrice: 200, currency: 'EUR' },  // 5,000 EUR = 99,000 ZAR
      ];

      const result = calculateGrossAssets(assets, exchangeRates);
      expect(result).toBe(241500);
    });

    it('handles empty asset array', () => {
      const result = calculateGrossAssets([], exchangeRates);
      expect(result).toBe(0);
    });

    it('handles single asset', () => {
      const assets = [
        { units: 100, currentPrice: 1000, currency: 'ZAR' },
      ];

      const result = calculateGrossAssets(assets, exchangeRates);
      expect(result).toBe(100000);
    });

    it('handles zero value assets', () => {
      const assets = [
        { units: 100, currentPrice: 0, currency: 'ZAR' },
        { units: 0, currentPrice: 100, currency: 'ZAR' },
      ];

      const result = calculateGrossAssets(assets, exchangeRates);
      expect(result).toBe(0);
    });

    it('handles large portfolio', () => {
      const assets = Array(100).fill(null).map(() => ({
        units: 10,
        currentPrice: 100,
        currency: 'ZAR',
      }));

      const result = calculateGrossAssets(assets, exchangeRates);
      expect(result).toBe(100000); // 100 assets * 10 * 100
    });
  });

  describe('calculateInvestibleAssets', () => {
    it('includes only investible assets', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetType: 'Investible' },
        { units: 50, currentPrice: 100, currency: 'ZAR', assetType: 'Non-Investible' },
        { units: 25, currentPrice: 200, currency: 'ZAR', assetType: 'Investible' },
      ];

      const result = calculateInvestibleAssets(assets, exchangeRates);
      // 100*500 + 25*200 = 50,000 + 5,000 = 55,000
      expect(result).toBe(55000);
    });

    it('returns 0 when no investible assets', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetType: 'Non-Investible' },
      ];

      const result = calculateInvestibleAssets(assets, exchangeRates);
      expect(result).toBe(0);
    });
  });

  describe('calculateNonInvestibleAssets', () => {
    it('includes only non-investible assets', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetType: 'Investible' },
        { units: 50, currentPrice: 100, currency: 'ZAR', assetType: 'Non-Investible' },
        { units: 25, currentPrice: 200, currency: 'ZAR', assetType: 'Non-Investible' },
      ];

      const result = calculateNonInvestibleAssets(assets, exchangeRates);
      // 50*100 + 25*200 = 5,000 + 5,000 = 10,000
      expect(result).toBe(10000);
    });
  });

  describe('calculateTotalLiabilities', () => {
    it('calculates total liabilities in ZAR', () => {
      const liabilities = [
        { principal: 100000, currency: 'ZAR' },
        { principal: 50000, currency: 'ZAR' },
      ];

      const result = calculateTotalLiabilities(liabilities, exchangeRates);
      expect(result).toBe(150000);
    });

    it('handles mixed currency liabilities', () => {
      const liabilities = [
        { principal: 100000, currency: 'ZAR' }, // 100,000 ZAR
        { principal: 5000, currency: 'USD' },   // 5,000 USD = 92,500 ZAR
        { principal: 2000, currency: 'EUR' },   // 2,000 EUR = 39,600 ZAR
      ];

      const result = calculateTotalLiabilities(liabilities, exchangeRates);
      expect(result).toBe(232100);
    });

    it('handles empty liabilities', () => {
      const result = calculateTotalLiabilities([], exchangeRates);
      expect(result).toBe(0);
    });

    it('handles zero liabilities', () => {
      const liabilities = [
        { principal: 0, currency: 'ZAR' },
      ];

      const result = calculateTotalLiabilities(liabilities, exchangeRates);
      expect(result).toBe(0);
    });
  });

  describe('calculateNetWorth', () => {
    it('calculates net worth correctly', () => {
      const assets = [
        { units: 100, currentPrice: 1000, currency: 'ZAR' }, // 100,000
      ];
      const liabilities = [
        { principal: 30000, currency: 'ZAR' },
      ];

      const result = calculateNetWorth(assets, liabilities, exchangeRates);
      expect(result).toBe(70000);
    });

    it('handles positive net worth', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR' }, // 50,000
      ];
      const liabilities = [
        { principal: 10000, currency: 'ZAR' },
      ];

      const result = calculateNetWorth(assets, liabilities, exchangeRates);
      expect(result).toBe(40000);
    });

    it('handles negative net worth (insolvent)', () => {
      const assets = [
        { units: 100, currentPrice: 100, currency: 'ZAR' }, // 10,000
      ];
      const liabilities = [
        { principal: 50000, currency: 'ZAR' },
      ];

      const result = calculateNetWorth(assets, liabilities, exchangeRates);
      expect(result).toBe(-40000);
    });

    it('handles zero net worth', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR' }, // 50,000
      ];
      const liabilities = [
        { principal: 50000, currency: 'ZAR' },
      ];

      const result = calculateNetWorth(assets, liabilities, exchangeRates);
      expect(result).toBe(0);
    });

    it('handles no liabilities', () => {
      const assets = [
        { units: 100, currentPrice: 1000, currency: 'ZAR' }, // 100,000
      ];

      const result = calculateNetWorth(assets, [], exchangeRates);
      expect(result).toBe(100000);
    });

    it('handles no assets (only debt)', () => {
      const liabilities = [
        { principal: 50000, currency: 'ZAR' },
      ];

      const result = calculateNetWorth([], liabilities, exchangeRates);
      expect(result).toBe(-50000);
    });

    it('handles mixed currency assets and liabilities', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR' },  // 50,000 ZAR
        { units: 50, currentPrice: 100, currency: 'USD' },   // 92,500 ZAR
      ];
      const liabilities = [
        { principal: 20000, currency: 'ZAR' },               // 20,000 ZAR
        { principal: 1000, currency: 'USD' },                // 18,500 ZAR
      ];

      const result = calculateNetWorth(assets, liabilities, exchangeRates);
      // Assets: 142,500 ZAR
      // Liabilities: 38,500 ZAR
      // Net Worth: 104,000 ZAR
      expect(result).toBe(104000);
    });
  });
});

describe('Allocation Calculations', () => {
  const exchangeRates = {
    'ZAR/ZAR': 1.0,
    'USD/ZAR': 18.50,
  };

  describe('groupAssets', () => {
    it('groups assets by asset class', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },
        { units: 50, currentPrice: 100, currency: 'ZAR', assetClass: 'SA Equity' },
        { units: 25, currentPrice: 200, currency: 'ZAR', assetClass: 'Cash' },
      ];

      const result = groupAssets(assets, exchangeRates, 'assetClass');

      expect(result).toHaveLength(2);

      const equity = result.find(g => g.name === 'SA Equity');
      expect(equity.value).toBe(55000); // 50,000 + 5,000
      expect(equity.count).toBe(2);
      expect(equity.assets).toHaveLength(2);

      const cash = result.find(g => g.name === 'Cash');
      expect(cash.value).toBe(5000);
      expect(cash.count).toBe(1);
    });

    it('groups assets by currency', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR' },
        { units: 50, currentPrice: 100, currency: 'USD' },
        { units: 25, currentPrice: 200, currency: 'ZAR' },
      ];

      const result = groupAssets(assets, exchangeRates, 'currency');

      expect(result).toHaveLength(2);

      const zar = result.find(g => g.name === 'ZAR');
      expect(zar.value).toBe(55000); // 50,000 + 5,000
      expect(zar.count).toBe(2);

      const usd = result.find(g => g.name === 'USD');
      expect(usd.value).toBe(92500); // 50 * 100 * 18.50
      expect(usd.count).toBe(1);
    });

    it('groups assets by portfolio', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', portfolio: 'Core' },
        { units: 50, currentPrice: 100, currency: 'ZAR', portfolio: 'Satellite' },
        { units: 25, currentPrice: 200, currency: 'ZAR', portfolio: 'Core' },
      ];

      const result = groupAssets(assets, exchangeRates, 'portfolio');

      const core = result.find(g => g.name === 'Core');
      expect(core.value).toBe(55000);
      expect(core.count).toBe(2);

      const satellite = result.find(g => g.name === 'Satellite');
      expect(satellite.value).toBe(5000);
      expect(satellite.count).toBe(1);
    });

    it('sorts groups by value (descending)', () => {
      const assets = [
        { units: 100, currentPrice: 100, currency: 'ZAR', assetClass: 'Cash' },       // 10,000
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },  // 50,000
        { units: 100, currentPrice: 300, currency: 'ZAR', assetClass: 'Bonds' },      // 30,000
      ];

      const result = groupAssets(assets, exchangeRates, 'assetClass');

      expect(result[0].name).toBe('SA Equity');  // 50,000 (largest)
      expect(result[1].name).toBe('Bonds');       // 30,000
      expect(result[2].name).toBe('Cash');        // 10,000 (smallest)
    });

    it('handles uncategorized assets', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },
        { units: 50, currentPrice: 100, currency: 'ZAR' }, // No assetClass
      ];

      const result = groupAssets(assets, exchangeRates, 'assetClass');

      const uncategorized = result.find(g => g.name === 'Uncategorized');
      expect(uncategorized).toBeDefined();
      expect(uncategorized.value).toBe(5000);
    });

    it('handles empty asset array', () => {
      const result = groupAssets([], exchangeRates, 'assetClass');
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateAllocation', () => {
    it('calculates allocation percentages correctly', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },  // 50,000
        { units: 50, currentPrice: 100, currency: 'ZAR', assetClass: 'Cash' },        // 5,000
        { units: 25, currentPrice: 600, currency: 'ZAR', assetClass: 'Bonds' },       // 15,000
      ];
      // Total: 70,000

      const result = calculateAllocation(assets, exchangeRates, 'assetClass');

      const equity = result.find(g => g.name === 'SA Equity');
      expect(equity.percentage).toBeCloseTo(71.43, 2); // 50,000 / 70,000

      const cash = result.find(g => g.name === 'Cash');
      expect(cash.percentage).toBeCloseTo(7.14, 2); // 5,000 / 70,000

      const bonds = result.find(g => g.name === 'Bonds');
      expect(bonds.percentage).toBeCloseTo(21.43, 2); // 15,000 / 70,000
    });

    it('percentages sum to 100%', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },
        { units: 50, currentPrice: 100, currency: 'ZAR', assetClass: 'Cash' },
        { units: 25, currentPrice: 600, currency: 'ZAR', assetClass: 'Bonds' },
      ];

      const result = calculateAllocation(assets, exchangeRates, 'assetClass');
      const totalPercentage = result.reduce((sum, g) => sum + g.percentage, 0);

      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('handles 50/50 allocation', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'Equity' },
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'Bonds' },
      ];

      const result = calculateAllocation(assets, exchangeRates, 'assetClass');

      expect(result[0].percentage).toBe(50);
      expect(result[1].percentage).toBe(50);
    });

    it('handles 100% single asset class', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },
      ];

      const result = calculateAllocation(assets, exchangeRates, 'assetClass');

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(100);
    });

    it('handles empty portfolio', () => {
      const result = calculateAllocation([], exchangeRates, 'assetClass');
      expect(result).toHaveLength(0);
    });

    it('includes group metadata with percentages', () => {
      const assets = [
        { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Equity' },
      ];

      const result = calculateAllocation(assets, exchangeRates, 'assetClass');

      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('assets');
      expect(result[0]).toHaveProperty('percentage');
    });
  });
});

describe('Real-World Portfolio Scenarios', () => {
  const exchangeRates = {
    'ZAR/ZAR': 1.0,
    'USD/ZAR': 18.50,
    'EUR/ZAR': 19.80,
  };

  it('calculates net worth for diversified portfolio', () => {
    const assets = [
      // SA Equity
      { units: 1000, currentPrice: 200, currency: 'ZAR', assetClass: 'SA Equity' },    // 200,000
      // Offshore Equity
      { units: 500, currentPrice: 100, currency: 'USD', assetClass: 'Offshore Equity' }, // 925,000
      // Bonds
      { units: 200, currentPrice: 500, currency: 'ZAR', assetClass: 'SA Bonds' },       // 100,000
      // Cash
      { units: 1, currentPrice: 50000, currency: 'ZAR', assetClass: 'Cash' },           // 50,000
    ];

    const liabilities = [
      { principal: 500000, currency: 'ZAR' }, // Home loan
    ];

    const netWorth = calculateNetWorth(assets, liabilities, exchangeRates);
    // Assets: 1,275,000 ZAR
    // Liabilities: 500,000 ZAR
    // Net Worth: 775,000 ZAR
    expect(netWorth).toBe(775000);

    const allocation = calculateAllocation(assets, exchangeRates, 'assetClass');

    // Offshore Equity should be largest (72.5%)
    const offshore = allocation.find(g => g.name === 'Offshore Equity');
    expect(offshore.percentage).toBeCloseTo(72.55, 1);

    // SA Equity should be second (15.7%)
    const saEquity = allocation.find(g => g.name === 'SA Equity');
    expect(saEquity.percentage).toBeCloseTo(15.69, 1);
  });

  it('handles concentrated portfolio', () => {
    const assets = [
      { units: 10000, currentPrice: 100, currency: 'ZAR', assetClass: 'SA Equity', ticker: 'JSE:TOP40' }, // 1,000,000
      { units: 100, currentPrice: 500, currency: 'ZAR', assetClass: 'Cash' },                              // 50,000
    ];

    const allocation = calculateAllocation(assets, exchangeRates, 'assetClass');

    const equity = allocation.find(g => g.name === 'SA Equity');
    expect(equity.percentage).toBeCloseTo(95.24, 2); // Highly concentrated

    const cash = allocation.find(g => g.name === 'Cash');
    expect(cash.percentage).toBeCloseTo(4.76, 2);
  });
});
