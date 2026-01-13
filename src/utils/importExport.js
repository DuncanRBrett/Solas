import * as XLSX from 'xlsx';
import {
  calculateAssetValueZAR,
  calculateUnrealizedGain,
  calculateCGT,
  calculateNetProceeds,
} from './calculations';

/**
 * Export assets to Excel file
 */
export function exportAssetsToExcel(assets, profileName, settings = null) {
  // Get exchange rates and marginal tax rate from settings if provided
  const exchangeRates = settings?.currency?.exchangeRates || {
    'USD/ZAR': 18.50,
    'GBP/ZAR': 23.20,
    'EUR/ZAR': 19.80,
  };
  const marginalTaxRate = settings?.profile?.marginalTaxRate || 45;
  const expectedReturns = settings?.expectedReturns || {};

  // Calculate total portfolio value for percentage calculations
  const totalValue = assets.reduce((total, asset) => {
    return total + calculateAssetValueZAR(asset, exchangeRates);
  }, 0);

  // Prepare asset data for Excel - include ALL fields + calculated values
  const assetData = assets.map(asset => {
    const valueZAR = calculateAssetValueZAR(asset, exchangeRates);
    const unrealizedGain = calculateUnrealizedGain(asset, exchangeRates);
    const cgt = calculateCGT(unrealizedGain, marginalTaxRate);
    const netValueAfterCGT = calculateNetProceeds(asset, exchangeRates, marginalTaxRate);
    // Use asset-specific expected return if set, otherwise use asset class default
    const expectedReturn = asset.expectedReturn !== null && asset.expectedReturn !== undefined
      ? asset.expectedReturn
      : (expectedReturns[asset.assetClass] || 0);
    const percentOfTotal = totalValue > 0 ? (valueZAR / totalValue) * 100 : 0;

    return {
      'ID': asset.id,
      'Name': asset.name,
      'Asset Class': asset.assetClass,
      'Sector': asset.sector || '',
      'Currency': asset.currency,
      'Region': asset.region || '',
      'Portfolio': asset.portfolio || '',
      'Asset Type': asset.assetType,
      'Platform': asset.platform || '',
      'Account Type': asset.accountType || '',
      'Units': asset.units || 0,
      'Current Price': asset.currentPrice || 0,
      'Cost Price': asset.costPrice || 0,
      'Income Yield (%)': asset.incomeYield || 0,
      'Expected Forward Return (% p.a.)': asset.expectedReturn !== null && asset.expectedReturn !== undefined ? asset.expectedReturn : '',
      'Value (ZAR)': Math.round(valueZAR),
      '% of Total': percentOfTotal.toFixed(2),
      'Expected Return Used (% p.a.)': expectedReturn,
      'Unrealized Gain/Loss': Math.round(unrealizedGain),
      'CGT (if sold)': Math.round(cgt),
      'Net Value After CGT': Math.round(netValueAfterCGT),
      'Price URL': asset.priceUrl || '',
      'Fact Sheet URL': asset.factSheetUrl || '',
      'Last Updated': asset.lastUpdated || '',
      'Notes': asset.notes || '',
    };
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(assetData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Assets');

  // Generate filename with profile name and date
  const date = new Date().toISOString().split('T')[0];
  const filename = `${profileName}_Assets_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Export settings to Excel file
 */
export function exportSettingsToExcel(settings, profileName) {
  // Profile settings
  const profileData = [
    { Setting: 'Name', Value: settings.profile.name || '' },
    { Setting: 'Age', Value: settings.profile.age || 0 },
    { Setting: 'Marginal Tax Rate (%)', Value: settings.profile.marginalTaxRate || 0 },
    { Setting: 'Retirement Age', Value: settings.profile.retirementAge || 65 },
    { Setting: 'Life Expectancy', Value: settings.profile.lifeExpectancy || 90 },
    { Setting: 'Monthly Savings', Value: settings.profile.monthlySavings || 0 },
    { Setting: 'Annual Expenses', Value: settings.profile.annualExpenses || 0 },
  ];

  // Currency settings
  const currencyData = [
    { Setting: 'Reporting Currency', Value: settings.currency.reporting || 'ZAR' },
  ];

  // Exchange rates
  const exchangeRatesData = Object.entries(settings.currency.exchangeRates).map(([pair, rate]) => ({
    'Currency Pair': pair,
    'Rate': rate,
  }));

  // Expected returns
  const expectedReturnsData = Object.entries(settings.expectedReturns || {}).map(([assetClass, returnRate]) => ({
    'Asset Class': assetClass,
    'Expected Return (%)': returnRate,
  }));

  // Target allocation
  const targetAllocationData = Object.entries(settings.targetAllocation || {}).map(([assetClass, percentage]) => ({
    'Asset Class': assetClass,
    'Target (%)': percentage,
  }));

  // Thresholds
  const thresholdsData = [
    { Threshold: 'Single Asset (%)', Value: settings.thresholds?.singleAsset || 10 },
    { Threshold: 'Asset Class (%)', Value: settings.thresholds?.assetClass || 50 },
    { Threshold: 'Currency (%)', Value: settings.thresholds?.currency || 70 },
    { Threshold: 'Sector (%)', Value: settings.thresholds?.sector || 30 },
    { Threshold: 'Region (%)', Value: settings.thresholds?.region || 80 },
    { Threshold: 'Platform (%)', Value: settings.thresholds?.platform || 40 },
    { Threshold: 'Staleness (days)', Value: settings.thresholds?.staleness || 7 },
    { Threshold: 'Rebalancing Drift (%)', Value: settings.thresholds?.rebalancingDrift || 5 },
  ];

  // Retirement expense phases
  const expensePhasesData = Object.entries(settings.retirementExpensePhases || {}).map(([phase, data]) => ({
    'Phase': phase,
    'Age Start': data.ageStart,
    'Age End': data.ageEnd,
    'Percentage (%)': data.percentage,
  }));

  // Withdrawal rates
  const withdrawalRatesData = [
    { Strategy: 'Conservative (%)', Rate: settings.withdrawalRates?.conservative || 3.0 },
    { Strategy: 'Safe (%)', Rate: settings.withdrawalRates?.safe || 4.0 },
    { Strategy: 'Aggressive (%)', Rate: settings.withdrawalRates?.aggressive || 5.0 },
  ];

  // Other settings
  const otherSettingsData = [
    { Setting: 'Inflation Rate (%)', Value: settings.inflation || 4.5 },
  ];

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  const wsProfile = XLSX.utils.json_to_sheet(profileData);
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Profile');

  const wsCurrency = XLSX.utils.json_to_sheet(currencyData);
  XLSX.utils.book_append_sheet(wb, wsCurrency, 'Currency');

  const wsRates = XLSX.utils.json_to_sheet(exchangeRatesData);
  XLSX.utils.book_append_sheet(wb, wsRates, 'Exchange Rates');

  const wsExpectedReturns = XLSX.utils.json_to_sheet(expectedReturnsData);
  XLSX.utils.book_append_sheet(wb, wsExpectedReturns, 'Expected Returns');

  const wsTargetAllocation = XLSX.utils.json_to_sheet(targetAllocationData);
  XLSX.utils.book_append_sheet(wb, wsTargetAllocation, 'Target Allocation');

  const wsThresholds = XLSX.utils.json_to_sheet(thresholdsData);
  XLSX.utils.book_append_sheet(wb, wsThresholds, 'Thresholds');

  const wsExpensePhases = XLSX.utils.json_to_sheet(expensePhasesData);
  XLSX.utils.book_append_sheet(wb, wsExpensePhases, 'Expense Phases');

  const wsWithdrawal = XLSX.utils.json_to_sheet(withdrawalRatesData);
  XLSX.utils.book_append_sheet(wb, wsWithdrawal, 'Withdrawal Rates');

  const wsOther = XLSX.utils.json_to_sheet(otherSettingsData);
  XLSX.utils.book_append_sheet(wb, wsOther, 'Other');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const filename = `${profileName}_Settings_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Export complete profile (assets + settings) to Excel
 */
export function exportCompleteProfile(profile) {
  const { name, assets, settings } = profile;

  // Get calculation parameters from settings
  const exchangeRates = settings?.currency?.exchangeRates || {
    'USD/ZAR': 18.50,
    'GBP/ZAR': 23.20,
    'EUR/ZAR': 19.80,
  };
  const marginalTaxRate = settings?.profile?.marginalTaxRate || 45;
  const expectedReturns = settings?.expectedReturns || {};

  // Calculate total portfolio value for percentage calculations
  const totalValue = assets.reduce((total, asset) => {
    return total + calculateAssetValueZAR(asset, exchangeRates);
  }, 0);

  // Prepare asset data - ALL fields + calculated values
  const assetData = assets.map(asset => {
    const valueZAR = calculateAssetValueZAR(asset, exchangeRates);
    const unrealizedGain = calculateUnrealizedGain(asset, exchangeRates);
    const cgt = calculateCGT(unrealizedGain, marginalTaxRate);
    const netValueAfterCGT = calculateNetProceeds(asset, exchangeRates, marginalTaxRate);
    // Use asset-specific expected return if set, otherwise use asset class default
    const expectedReturn = asset.expectedReturn !== null && asset.expectedReturn !== undefined
      ? asset.expectedReturn
      : (expectedReturns[asset.assetClass] || 0);
    const percentOfTotal = totalValue > 0 ? (valueZAR / totalValue) * 100 : 0;

    return {
      'ID': asset.id,
      'Name': asset.name,
      'Asset Class': asset.assetClass,
      'Sector': asset.sector || '',
      'Currency': asset.currency,
      'Region': asset.region || '',
      'Portfolio': asset.portfolio || '',
      'Asset Type': asset.assetType,
      'Platform': asset.platform || '',
      'Account Type': asset.accountType || '',
      'Units': asset.units || 0,
      'Current Price': asset.currentPrice || 0,
      'Cost Price': asset.costPrice || 0,
      'Income Yield (%)': asset.incomeYield || 0,
      'Expected Forward Return (% p.a.)': asset.expectedReturn !== null && asset.expectedReturn !== undefined ? asset.expectedReturn : '',
      'Value (ZAR)': Math.round(valueZAR),
      '% of Total': percentOfTotal.toFixed(2),
      'Expected Return Used (% p.a.)': expectedReturn,
      'Unrealized Gain/Loss': Math.round(unrealizedGain),
      'CGT (if sold)': Math.round(cgt),
      'Net Value After CGT': Math.round(netValueAfterCGT),
      'Price URL': asset.priceUrl || '',
      'Fact Sheet URL': asset.factSheetUrl || '',
      'Last Updated': asset.lastUpdated || '',
      'Notes': asset.notes || '',
    };
  });

  // All settings sheets
  const profileData = [
    { Setting: 'Name', Value: settings.profile.name || '' },
    { Setting: 'Age', Value: settings.profile.age || 0 },
    { Setting: 'Marginal Tax Rate (%)', Value: settings.profile.marginalTaxRate || 0 },
    { Setting: 'Retirement Age', Value: settings.profile.retirementAge || 65 },
    { Setting: 'Life Expectancy', Value: settings.profile.lifeExpectancy || 90 },
    { Setting: 'Monthly Savings', Value: settings.profile.monthlySavings || 0 },
    { Setting: 'Annual Expenses', Value: settings.profile.annualExpenses || 0 },
  ];

  const currencyData = [
    { Setting: 'Reporting Currency', Value: settings.currency.reporting || 'ZAR' },
  ];

  const exchangeRatesData = Object.entries(settings.currency.exchangeRates).map(([pair, rate]) => ({
    'Currency Pair': pair,
    'Rate': rate,
  }));

  const expectedReturnsData = Object.entries(settings.expectedReturns || {}).map(([assetClass, returnRate]) => ({
    'Asset Class': assetClass,
    'Expected Return (%)': returnRate,
  }));

  const targetAllocationData = Object.entries(settings.targetAllocation || {}).map(([assetClass, percentage]) => ({
    'Asset Class': assetClass,
    'Target (%)': percentage,
  }));

  const thresholdsData = [
    { Threshold: 'Single Asset (%)', Value: settings.thresholds?.singleAsset || 10 },
    { Threshold: 'Asset Class (%)', Value: settings.thresholds?.assetClass || 50 },
    { Threshold: 'Currency (%)', Value: settings.thresholds?.currency || 70 },
    { Threshold: 'Sector (%)', Value: settings.thresholds?.sector || 30 },
    { Threshold: 'Region (%)', Value: settings.thresholds?.region || 80 },
    { Threshold: 'Platform (%)', Value: settings.thresholds?.platform || 40 },
    { Threshold: 'Staleness (days)', Value: settings.thresholds?.staleness || 7 },
    { Threshold: 'Rebalancing Drift (%)', Value: settings.thresholds?.rebalancingDrift || 5 },
  ];

  const expensePhasesData = Object.entries(settings.retirementExpensePhases || {}).map(([phase, data]) => ({
    'Phase': phase,
    'Age Start': data.ageStart,
    'Age End': data.ageEnd,
    'Percentage (%)': data.percentage,
  }));

  const withdrawalRatesData = [
    { Strategy: 'Conservative (%)', Rate: settings.withdrawalRates?.conservative || 3.0 },
    { Strategy: 'Safe (%)', Rate: settings.withdrawalRates?.safe || 4.0 },
    { Strategy: 'Aggressive (%)', Rate: settings.withdrawalRates?.aggressive || 5.0 },
  ];

  const otherSettingsData = [
    { Setting: 'Inflation Rate (%)', Value: settings.inflation || 4.5 },
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add all sheets
  const wsAssets = XLSX.utils.json_to_sheet(assetData);
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Assets');

  const wsProfile = XLSX.utils.json_to_sheet(profileData);
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Profile');

  const wsCurrency = XLSX.utils.json_to_sheet(currencyData);
  XLSX.utils.book_append_sheet(wb, wsCurrency, 'Currency');

  const wsRates = XLSX.utils.json_to_sheet(exchangeRatesData);
  XLSX.utils.book_append_sheet(wb, wsRates, 'Exchange Rates');

  const wsExpectedReturns = XLSX.utils.json_to_sheet(expectedReturnsData);
  XLSX.utils.book_append_sheet(wb, wsExpectedReturns, 'Expected Returns');

  const wsTargetAllocation = XLSX.utils.json_to_sheet(targetAllocationData);
  XLSX.utils.book_append_sheet(wb, wsTargetAllocation, 'Target Allocation');

  const wsThresholds = XLSX.utils.json_to_sheet(thresholdsData);
  XLSX.utils.book_append_sheet(wb, wsThresholds, 'Thresholds');

  const wsExpensePhases = XLSX.utils.json_to_sheet(expensePhasesData);
  XLSX.utils.book_append_sheet(wb, wsExpensePhases, 'Expense Phases');

  const wsWithdrawal = XLSX.utils.json_to_sheet(withdrawalRatesData);
  XLSX.utils.book_append_sheet(wb, wsWithdrawal, 'Withdrawal Rates');

  const wsOther = XLSX.utils.json_to_sheet(otherSettingsData);
  XLSX.utils.book_append_sheet(wb, wsOther, 'Other');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const filename = `${name}_Complete_${date}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Import assets from Excel file
 */
export async function importAssetsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read the Assets sheet
        const assetsSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('asset')) || workbook.SheetNames[0];
        const assetsSheet = workbook.Sheets[assetsSheetName];
        const rawData = XLSX.utils.sheet_to_json(assetsSheet);

        // Transform Excel data to asset format - include ALL fields
        const assets = rawData.map((row) => {
          // Parse expected forward return - empty string or null means use default
          const expectedForwardReturn = row['Expected Forward Return (% p.a.)'];
          const parsedExpectedReturn = expectedForwardReturn !== '' && expectedForwardReturn !== null && expectedForwardReturn !== undefined
            ? parseFloat(expectedForwardReturn)
            : null;

          return {
            id: row['ID'] || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: row['Name'] || '',
            assetClass: row['Asset Class'] || 'SA Equity',
            sector: row['Sector'] || '',
            currency: row['Currency'] || 'ZAR',
            region: row['Region'] || '',
            portfolio: row['Portfolio'] || 'Growth',
            assetType: row['Asset Type'] || 'Investible',
            platform: row['Platform'] || '',
            accountType: row['Account Type'] || 'Taxable',
            units: parseFloat(row['Units']) || 0,
            currentPrice: parseFloat(row['Current Price']) || 0,
            costPrice: parseFloat(row['Cost Price']) || 0,
            incomeYield: parseFloat(row['Income Yield (%)']) || 0,
            expectedReturn: parsedExpectedReturn,
            priceUrl: row['Price URL'] || '',
            factSheetUrl: row['Fact Sheet URL'] || '',
            lastUpdated: row['Last Updated'] || new Date().toISOString(),
            notes: row['Notes'] || '',
          };
        });

        resolve(assets);
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import settings from Excel file
 */
export async function importSettingsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const settings = {
          profile: {},
          currency: { exchangeRates: {} },
          expectedReturns: {},
          targetAllocation: {},
          thresholds: {},
          retirementExpensePhases: {},
          withdrawalRates: {},
        };

        // Read Profile sheet (or Profile Settings for backward compatibility)
        const profileSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('profile'));
        if (profileSheetName) {
          const settingsSheet = workbook.Sheets[profileSheetName];
          const settingsData = XLSX.utils.sheet_to_json(settingsSheet);

          settingsData.forEach(row => {
            const setting = row['Setting'];
            const value = row['Value'];

            if (setting === 'Name') settings.profile.name = value || '';
            if (setting === 'Age') settings.profile.age = parseInt(value) || 0;
            if (setting === 'Marginal Tax Rate (%)') settings.profile.marginalTaxRate = parseFloat(value) || 0;
            if (setting === 'Retirement Age') settings.profile.retirementAge = parseInt(value) || 65;
            if (setting === 'Life Expectancy') settings.profile.lifeExpectancy = parseInt(value) || 90;
            if (setting === 'Monthly Savings') settings.profile.monthlySavings = parseFloat(value) || 0;
            if (setting === 'Annual Expenses') settings.profile.annualExpenses = parseFloat(value) || 0;
          });
        }

        // Read Currency sheet
        if (workbook.SheetNames.includes('Currency')) {
          const currencySheet = workbook.Sheets['Currency'];
          const currencyData = XLSX.utils.sheet_to_json(currencySheet);

          currencyData.forEach(row => {
            if (row['Setting'] === 'Reporting Currency') {
              settings.currency.reporting = row['Value'] || 'ZAR';
            }
          });
        }

        // Read Exchange Rates sheet
        if (workbook.SheetNames.includes('Exchange Rates')) {
          const ratesSheet = workbook.Sheets['Exchange Rates'];
          const ratesData = XLSX.utils.sheet_to_json(ratesSheet);

          ratesData.forEach(row => {
            const pair = row['Currency Pair'];
            const rate = parseFloat(row['Rate']) || 1;
            settings.currency.exchangeRates[pair] = rate;
          });
        }

        // Read Expected Returns sheet
        if (workbook.SheetNames.includes('Expected Returns')) {
          const returnsSheet = workbook.Sheets['Expected Returns'];
          const returnsData = XLSX.utils.sheet_to_json(returnsSheet);

          returnsData.forEach(row => {
            const assetClass = row['Asset Class'];
            const returnRate = parseFloat(row['Expected Return (%)']) || 0;
            settings.expectedReturns[assetClass] = returnRate;
          });
        }

        // Read Target Allocation sheet
        if (workbook.SheetNames.includes('Target Allocation')) {
          const allocationSheet = workbook.Sheets['Target Allocation'];
          const allocationData = XLSX.utils.sheet_to_json(allocationSheet);

          allocationData.forEach(row => {
            const assetClass = row['Asset Class'];
            const target = parseFloat(row['Target (%)']) || 0;
            settings.targetAllocation[assetClass] = target;
          });
        }

        // Read Thresholds sheet
        if (workbook.SheetNames.includes('Thresholds')) {
          const thresholdsSheet = workbook.Sheets['Thresholds'];
          const thresholdsData = XLSX.utils.sheet_to_json(thresholdsSheet);

          thresholdsData.forEach(row => {
            const threshold = row['Threshold'];
            const value = parseFloat(row['Value']) || 0;

            if (threshold === 'Single Asset (%)') settings.thresholds.singleAsset = value;
            if (threshold === 'Asset Class (%)') settings.thresholds.assetClass = value;
            if (threshold === 'Currency (%)') settings.thresholds.currency = value;
            if (threshold === 'Sector (%)') settings.thresholds.sector = value;
            if (threshold === 'Region (%)') settings.thresholds.region = value;
            if (threshold === 'Platform (%)') settings.thresholds.platform = value;
            if (threshold === 'Staleness (days)') settings.thresholds.staleness = value;
            if (threshold === 'Rebalancing Drift (%)') settings.thresholds.rebalancingDrift = value;
          });
        }

        // Read Expense Phases sheet
        if (workbook.SheetNames.includes('Expense Phases')) {
          const phasesSheet = workbook.Sheets['Expense Phases'];
          const phasesData = XLSX.utils.sheet_to_json(phasesSheet);

          phasesData.forEach(row => {
            const phase = row['Phase'];
            settings.retirementExpensePhases[phase] = {
              ageStart: parseInt(row['Age Start']) || 0,
              ageEnd: parseInt(row['Age End']) || 0,
              percentage: parseFloat(row['Percentage (%)']) || 100,
            };
          });
        }

        // Read Withdrawal Rates sheet
        if (workbook.SheetNames.includes('Withdrawal Rates')) {
          const withdrawalSheet = workbook.Sheets['Withdrawal Rates'];
          const withdrawalData = XLSX.utils.sheet_to_json(withdrawalSheet);

          withdrawalData.forEach(row => {
            const strategy = row['Strategy'];
            const rate = parseFloat(row['Rate']) || 4.0;

            if (strategy.includes('Conservative')) settings.withdrawalRates.conservative = rate;
            if (strategy.includes('Safe')) settings.withdrawalRates.safe = rate;
            if (strategy.includes('Aggressive')) settings.withdrawalRates.aggressive = rate;
          });
        }

        // Read Other sheet
        if (workbook.SheetNames.includes('Other')) {
          const otherSheet = workbook.Sheets['Other'];
          const otherData = XLSX.utils.sheet_to_json(otherSheet);

          otherData.forEach(row => {
            if (row['Setting'] === 'Inflation Rate (%)') {
              settings.inflation = parseFloat(row['Value']) || 4.5;
            }
          });
        }

        resolve(settings);
      } catch (error) {
        reject(new Error('Failed to parse settings file: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
