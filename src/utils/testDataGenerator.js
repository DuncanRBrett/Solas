/**
 * Test Data Generator for Performance Testing
 *
 * Generate large datasets to test performance with 100+ assets
 * Usage: Call from browser console or import in development
 */

import { v4 as uuidv4 } from '../utils/uuid';

/**
 * Generate random test assets for performance testing
 * @param {number} count - Number of assets to generate
 * @param {Object} settings - Profile settings (for default values)
 * @returns {Array} Array of test assets
 */
export function generateTestAssets(count = 100, settings = {}) {
  const assets = [];

  const assetClasses = [
    'Offshore Equity',
    'SA Equity',
    'SA Bonds',
    'Offshore Bonds',
    'Cash',
    'Property',
    'Crypto',
  ];

  const portfolios = ['Core', 'Satellite', 'Speculative'];
  const accountTypes = ['TFSA', 'Taxable', 'RA'];
  const currencies = ['ZAR', 'USD', 'EUR', 'GBP'];
  const sectors = [
    'Technology',
    'Finance',
    'Healthcare',
    'Consumer',
    'Industrial',
    'Energy',
    'Real Estate',
    'Telecommunications',
  ];
  const regions = [
    'Global',
    'USA',
    'Europe',
    'Asia',
    'South Africa',
    'Emerging Markets',
  ];

  const tickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM',
    'V', 'MA', 'DIS', 'NFLX', 'PFE', 'JNJ', 'WMT', 'HD',
    'SAP', 'SAN', 'ABG', 'NPN', 'BTI', 'AGL', 'SHP', 'MTN',
  ];

  for (let i = 0; i < count; i++) {
    const assetClass = assetClasses[i % assetClasses.length];
    const currency = currencies[i % currencies.length];
    const currentPrice = 50 + Math.random() * 1000; // R50-R1050
    const costPrice = currentPrice * (0.7 + Math.random() * 0.5); // 70%-120% of current
    const units = 10 + Math.random() * 1000; // 10-1010 units

    assets.push({
      id: `test-asset-${i}`,
      name: `Test Asset ${i + 1}`,
      ticker: tickers[i % tickers.length] + (i > tickers.length ? `-${Math.floor(i / tickers.length)}` : ''),
      assetClass,
      assetType: i < count * 0.9 ? 'Investible' : 'Non-Investible', // 90% investible
      accountType: accountTypes[i % accountTypes.length],
      units,
      currentPrice,
      costPrice,
      currency,
      lastUpdated: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 90 days
      portfolio: portfolios[i % portfolios.length],
      sector: sectors[i % sectors.length],
      region: regions[i % regions.length],
      liquidity: i < count * 0.8 ? 'Liquid' : 'Illiquid', // 80% liquid
      notes: i % 10 === 0 ? `Test note for asset ${i + 1}` : '',
    });
  }

  return assets;
}

/**
 * Generate test income sources
 * @param {number} count - Number of income sources to generate
 * @returns {Array} Array of test income sources
 */
export function generateTestIncome(count = 5) {
  const sources = [];
  const names = ['Salary', 'Rental Income', 'Dividends', 'Pension', 'Part-time Work'];
  const currencies = ['ZAR', 'USD', 'EUR'];

  for (let i = 0; i < count; i++) {
    sources.push({
      id: `test-income-${i}`,
      name: names[i % names.length] + (i >= names.length ? ` ${i + 1}` : ''),
      monthlyAmount: 5000 + Math.random() * 50000, // R5k-R55k
      currency: currencies[i % currencies.length],
      startAge: 25 + i * 5,
      endAge: i < 2 ? 65 : null, // Some end at retirement, some lifetime
      inflationAdjusted: i % 2 === 0,
      taxable: i % 3 !== 0, // Most are taxable
    });
  }

  return sources;
}

/**
 * Generate test expenses
 * @param {number} count - Number of expenses to generate
 * @returns {Array} Array of test expenses
 */
export function generateTestExpenses(count = 10) {
  const expenses = [];
  const names = [
    'Groceries',
    'Rent/Mortgage',
    'Utilities',
    'Transport',
    'Insurance',
    'Healthcare',
    'Entertainment',
    'Dining Out',
    'Travel',
    'Education',
  ];

  for (let i = 0; i < count; i++) {
    expenses.push({
      id: `test-expense-${i}`,
      name: names[i % names.length],
      monthlyAmount: 1000 + Math.random() * 10000, // R1k-R11k
      expenseType: 'monthly',
      currency: 'ZAR',
      category: i < 5 ? 'Essential' : 'Lifestyle',
    });
  }

  return expenses;
}

/**
 * Generate test liabilities
 * @param {number} count - Number of liabilities to generate
 * @returns {Array} Array of test liabilities
 */
export function generateTestLiabilities(count = 3) {
  const liabilities = [];
  const names = ['Home Loan', 'Car Loan', 'Personal Loan', 'Student Loan', 'Credit Card'];

  for (let i = 0; i < count; i++) {
    const principal = 50000 + Math.random() * 2000000; // R50k-R2.05M
    const interestRate = 5 + Math.random() * 10; // 5%-15%
    const monthlyPayment = (principal * (interestRate / 100 / 12)) / (1 - Math.pow(1 + (interestRate / 100 / 12), -240)); // 20 year amortization

    liabilities.push({
      id: `test-liability-${i}`,
      name: names[i % names.length],
      principal,
      currency: 'ZAR',
      interestRate,
      monthlyPayment,
      maturityDate: new Date(Date.now() + Math.random() * 20 * 365 * 24 * 60 * 60 * 1000).toISOString(), // Next 20 years
    });
  }

  return liabilities;
}

/**
 * Browser console helper - exposes to window object in dev mode
 * Usage in browser console:
 *   TestData.generate100Assets()
 *   TestData.generate500Assets()
 *   TestData.clearTestData()
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.TestData = {
    generate100Assets: () => generateTestAssets(100),
    generate500Assets: () => generateTestAssets(500),
    generate1000Assets: () => generateTestAssets(1000),

    generateFullProfile: (assetCount = 100) => ({
      assets: generateTestAssets(assetCount),
      income: generateTestIncome(5),
      expenses: generateTestExpenses(10),
      liabilities: generateTestLiabilities(3),
    }),

    // Add all generated assets to current profile
    addToProfile: function(assetCount = 100) {
      const store = window.__SOLAS_STORE__;
      if (!store) {
        console.error('Store not found. Make sure you expose it in App.jsx');
        return;
      }

      const assets = this.generate100Assets();
      console.log(`Adding ${assetCount} test assets...`);

      assets.forEach((asset, i) => {
        store.getState().addAsset(asset);
        if (i % 10 === 0) {
          console.log(`Added ${i}/${assetCount} assets...`);
        }
      });

      console.log(`✅ Added ${assetCount} test assets to profile`);
    },

    clearTestData: function() {
      const store = window.__SOLAS_STORE__;
      if (!store) {
        console.error('Store not found');
        return;
      }

      const assets = store.getState().profile.assets;
      const testAssets = assets.filter(a => a.id.startsWith('test-asset-'));

      console.log(`Removing ${testAssets.length} test assets...`);
      testAssets.forEach(asset => {
        store.getState().deleteAsset(asset.id);
      });

      console.log(`✅ Removed all test data`);
    },

    showStorageInfo: async function() {
      const { checkStorageQuota, getTotalSolasSize } = await import('./storageQuota.js');
      const quota = await checkStorageQuota();
      const solasSize = getTotalSolasSize();

      console.log('=== Storage Information ===');
      console.log(`Total Solas Data: ${solasSize.mb}MB`);
      console.log(`localStorage Used: ${quota.usageMB}MB / ${quota.quotaMB}MB (${quota.percentUsed}%)`);
      console.log(`Available: ${quota.availableMB}MB`);
    },
  };

  console.log('📊 Test Data Generator loaded!');
  console.log('Usage:');
  console.log('  TestData.addToProfile(100)  - Add 100 test assets');
  console.log('  TestData.clearTestData()    - Remove all test data');
  console.log('  TestData.showStorageInfo()  - Show storage usage');
}

export default {
  generateTestAssets,
  generateTestIncome,
  generateTestExpenses,
  generateTestLiabilities,
};
