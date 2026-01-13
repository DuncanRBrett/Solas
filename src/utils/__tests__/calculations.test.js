import { describe, it, expect } from 'vitest';
import {
  toReportingCurrency,
  fromReportingCurrency,
  convertCurrency,
  calculateAssetValue,
  calculateCostBasis,
  calculateGainPercentage,
  calculateCGT,
  getExchangeRates,
} from '../calculations';

describe('Currency Conversion', () => {
  const exchangeRates = {
    ZAR: 1.0,
    USD: 18.50,
    EUR: 19.80,
    GBP: 23.20,
  };

  describe('toReportingCurrency', () => {
    it('converts USD to ZAR correctly', () => {
      const result = toReportingCurrency(100, 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(1850);
    });

    it('converts EUR to ZAR correctly', () => {
      const result = toReportingCurrency(100, 'EUR', 'ZAR', exchangeRates);
      expect(result).toBe(1980);
    });

    it('converts GBP to ZAR correctly', () => {
      const result = toReportingCurrency(100, 'GBP', 'ZAR', exchangeRates);
      expect(result).toBe(2320);
    });

    it('handles same currency (no conversion needed)', () => {
      const result = toReportingCurrency(100, 'ZAR', 'ZAR', exchangeRates);
      expect(result).toBe(100);
    });

    it('handles zero amount', () => {
      const result = toReportingCurrency(0, 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(0);
    });

    it('handles fractional amounts', () => {
      const result = toReportingCurrency(10.5, 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(194.25);
    });

    it('handles missing exchange rate (fallback to 1:1)', () => {
      const result = toReportingCurrency(100, 'JPY', 'ZAR', exchangeRates);
      expect(result).toBe(100); // Falls back to 1:1
    });

    it('handles invalid amount (NaN)', () => {
      const result = toReportingCurrency(NaN, 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(0);
    });

    it('handles null amount', () => {
      const result = toReportingCurrency(null, 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(0);
    });
  });

  describe('fromReportingCurrency', () => {
    it('converts ZAR to USD correctly', () => {
      const result = fromReportingCurrency(1850, 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(100);
    });

    it('converts ZAR to EUR correctly', () => {
      const result = fromReportingCurrency(1980, 'EUR', 'ZAR', exchangeRates);
      expect(result).toBe(100);
    });

    it('converts ZAR to GBP correctly', () => {
      const result = fromReportingCurrency(2320, 'GBP', 'ZAR', exchangeRates);
      expect(result).toBe(100);
    });

    it('handles same currency', () => {
      const result = fromReportingCurrency(100, 'ZAR', 'ZAR', exchangeRates);
      expect(result).toBe(100);
    });

    it('handles fractional amounts', () => {
      const result = fromReportingCurrency(194.25, 'USD', 'ZAR', exchangeRates);
      expect(result).toBeCloseTo(10.5, 2);
    });
  });

  describe('convertCurrency', () => {
    it('converts USD to EUR correctly', () => {
      // 100 USD = 1850 ZAR = 93.43 EUR (1850 / 19.80)
      const result = convertCurrency(100, 'USD', 'EUR', 'ZAR', exchangeRates);
      expect(result).toBeCloseTo(93.43, 2);
    });

    it('converts EUR to USD correctly', () => {
      // 100 EUR = 1980 ZAR = 107.03 USD (1980 / 18.50)
      const result = convertCurrency(100, 'EUR', 'USD', 'ZAR', exchangeRates);
      expect(result).toBeCloseTo(107.03, 2);
    });

    it('converts GBP to USD correctly', () => {
      // 100 GBP = 2320 ZAR = 125.41 USD
      const result = convertCurrency(100, 'GBP', 'USD', 'ZAR', exchangeRates);
      expect(result).toBeCloseTo(125.41, 2);
    });

    it('handles same currency', () => {
      const result = convertCurrency(100, 'USD', 'USD', 'ZAR', exchangeRates);
      expect(result).toBe(100);
    });

    it('handles round-trip conversion (USD→EUR→USD)', () => {
      const usdToEur = convertCurrency(100, 'USD', 'EUR', 'ZAR', exchangeRates);
      const backToUsd = convertCurrency(usdToEur, 'EUR', 'USD', 'ZAR', exchangeRates);
      expect(backToUsd).toBeCloseTo(100, 2);
    });
  });
});

describe('Asset Valuation', () => {
  const settings = {
    reportingCurrency: 'ZAR',
    exchangeRates: {
      USD: 18.50,
      EUR: 19.80,
      GBP: 23.20,
    },
  };

  describe('calculateAssetValue', () => {
    it('calculates ZAR asset value correctly', () => {
      const asset = {
        units: 100,
        currentPrice: 500,
        currency: 'ZAR',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(50000);
    });

    it('calculates USD asset value in ZAR correctly', () => {
      const asset = {
        units: 100,
        currentPrice: 50, // $50 per unit
        currency: 'USD',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(92500); // 100 * 50 * 18.50
    });

    it('calculates EUR asset value in ZAR correctly', () => {
      const asset = {
        units: 50,
        currentPrice: 100, // €100 per unit
        currency: 'EUR',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(99000); // 50 * 100 * 19.80
    });

    it('handles fractional units', () => {
      const asset = {
        units: 10.5,
        currentPrice: 1000,
        currency: 'ZAR',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(10500);
    });

    it('handles fractional prices', () => {
      const asset = {
        units: 100,
        currentPrice: 123.45,
        currency: 'ZAR',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(12345);
    });

    it('handles very large values', () => {
      const asset = {
        units: 10000,
        currentPrice: 5000,
        currency: 'ZAR',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(50000000); // 50 million
    });

    it('handles very small values', () => {
      const asset = {
        units: 0.001,
        currentPrice: 50000,
        currency: 'ZAR',
      };
      const result = calculateAssetValue(asset, settings);
      expect(result).toBe(50);
    });
  });

  describe('calculateCostBasis', () => {
    it('calculates cost basis in reporting currency', () => {
      const asset = {
        units: 100,
        costPrice: 400,
        currency: 'ZAR',
      };
      const result = calculateCostBasis(asset, settings);
      expect(result).toBe(40000);
    });

    it('calculates cost basis for USD assets', () => {
      const asset = {
        units: 100,
        costPrice: 40, // Bought at $40
        currency: 'USD',
      };
      const result = calculateCostBasis(asset, settings);
      expect(result).toBe(74000); // 100 * 40 * 18.50
    });

    it('handles zero cost basis', () => {
      const asset = {
        units: 100,
        costPrice: 0, // Free/inherited/gifted
        currency: 'ZAR',
      };
      const result = calculateCostBasis(asset, settings);
      expect(result).toBe(0);
    });
  });
});

describe('Gain Calculations', () => {
  describe('calculateGainPercentage', () => {
    it('calculates positive gain correctly', () => {
      const asset = {
        costPrice: 100,
        currentPrice: 150,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBe(50);
    });

    it('calculates negative gain (loss) correctly', () => {
      const asset = {
        costPrice: 100,
        currentPrice: 75,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBe(-25);
    });

    it('handles no change (0% gain)', () => {
      const asset = {
        costPrice: 100,
        currentPrice: 100,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBe(0);
    });

    it('handles 100% gain (double)', () => {
      const asset = {
        costPrice: 100,
        currentPrice: 200,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBe(100);
    });

    it('handles 100% loss (worthless)', () => {
      const asset = {
        costPrice: 100,
        currentPrice: 0,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBe(-100);
    });

    it('handles zero cost price (free asset)', () => {
      const asset = {
        costPrice: 0,
        currentPrice: 100,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBe(0); // Can't calculate % gain on free asset
    });

    it('handles fractional percentages', () => {
      const asset = {
        costPrice: 100,
        currentPrice: 123.45,
      };
      const result = calculateGainPercentage(asset);
      expect(result).toBeCloseTo(23.45, 2);
    });
  });

  describe('calculateCGT', () => {
    const marginalTaxRate = 45; // Top tax bracket in SA

    it('calculates CGT correctly for positive gain', () => {
      const gain = 100000; // R100k gain
      const result = calculateCGT(gain, marginalTaxRate);
      // 100k * 40% * 45% = 18k
      expect(result).toBe(18000);
    });

    it('handles 39% marginal rate (common bracket)', () => {
      const gain = 100000;
      const result = calculateCGT(gain, 39);
      // 100k * 40% * 39% = 15.6k
      expect(result).toBe(15600);
    });

    it('handles 18% marginal rate (lowest bracket)', () => {
      const gain = 100000;
      const result = calculateCGT(gain, 18);
      // 100k * 40% * 18% = 7.2k
      expect(result).toBe(7200);
    });

    it('returns 0 for zero gain', () => {
      const result = calculateCGT(0, marginalTaxRate);
      expect(result).toBe(0);
    });

    it('returns 0 for negative gain (loss)', () => {
      const result = calculateCGT(-50000, marginalTaxRate);
      expect(result).toBe(0);
    });

    it('calculates CGT for large gains', () => {
      const gain = 10000000; // R10M gain
      const result = calculateCGT(gain, marginalTaxRate);
      // 10M * 40% * 45% = 1.8M
      expect(result).toBe(1800000);
    });

    it('calculates CGT for small gains', () => {
      const gain = 1000; // R1k gain
      const result = calculateCGT(gain, marginalTaxRate);
      // 1k * 40% * 45% = 180
      expect(result).toBe(180);
    });

    it('handles fractional gains', () => {
      const gain = 12345.67;
      const result = calculateCGT(gain, marginalTaxRate);
      // 12345.67 * 0.4 * 0.45 = 2222.22
      expect(result).toBeCloseTo(2222.22, 2);
    });
  });
});

describe('Exchange Rate Utilities', () => {
  describe('getExchangeRates', () => {
    it('returns new format rates when available', () => {
      const settings = {
        exchangeRates: {
          USD: 18.50,
          EUR: 19.80,
        },
      };
      const result = getExchangeRates(settings);
      expect(result).toEqual({
        USD: 18.50,
        EUR: 19.80,
      });
    });

    it('converts legacy format to new format', () => {
      const settings = {
        reportingCurrency: 'ZAR',
        currency: {
          exchangeRates: {
            'USD/ZAR': 18.50,
            'EUR/ZAR': 19.80,
          },
        },
      };
      const result = getExchangeRates(settings);
      expect(result).toEqual({
        USD: 18.50,
        EUR: 19.80,
      });
    });

    it('returns fallback rates when no rates provided', () => {
      const settings = {};
      const result = getExchangeRates(settings);
      expect(result).toHaveProperty('USD');
      expect(result).toHaveProperty('EUR');
      expect(result).toHaveProperty('GBP');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  const settings = {
    reportingCurrency: 'ZAR',
    exchangeRates: {
      USD: 18.50,
    },
  };

  it('handles undefined asset properties gracefully', () => {
    const asset = {
      units: undefined,
      currentPrice: 100,
      currency: 'ZAR',
    };
    const result = calculateAssetValue(asset, settings);
    // Function returns 0 for invalid input (safe default)
    expect(result).toBe(0);
  });

  it('handles negative values (short positions)', () => {
    const asset = {
      units: -100, // Short position
      currentPrice: 50,
      currency: 'ZAR',
    };
    const result = calculateAssetValue(asset, settings);
    expect(result).toBe(-5000);
  });

  it('handles extreme exchange rates', () => {
    const extremeRates = {
      ...settings,
      exchangeRates: {
        USD: 1000000, // Hypothetical hyperinflation
      },
    };
    const asset = {
      units: 1,
      currentPrice: 1,
      currency: 'USD',
    };
    const result = calculateAssetValue(asset, extremeRates);
    expect(result).toBe(1000000);
  });

  it('handles very small exchange rates', () => {
    const smallRates = {
      ...settings,
      exchangeRates: {
        USD: 0.001, // Strong currency
      },
    };
    const asset = {
      units: 1000,
      currentPrice: 1,
      currency: 'USD',
    };
    const result = calculateAssetValue(asset, smallRates);
    expect(result).toBe(1);
  });
});

describe('Real-world Scenarios', () => {
  const settings = {
    reportingCurrency: 'ZAR',
    exchangeRates: {
      USD: 18.50,
      EUR: 19.80,
      GBP: 23.20,
    },
  };

  it('calculates portfolio value with mixed currencies', () => {
    const assets = [
      { units: 100, currentPrice: 500, currency: 'ZAR' },
      { units: 50, currentPrice: 100, currency: 'USD' },
      { units: 25, currentPrice: 200, currency: 'EUR' },
    ];

    const totalValue = assets.reduce((sum, asset) => {
      return sum + calculateAssetValue(asset, settings);
    }, 0);

    // ZAR: 100 * 500 = 50,000
    // USD: 50 * 100 * 18.50 = 92,500
    // EUR: 25 * 200 * 19.80 = 99,000
    // Total: 241,500
    expect(totalValue).toBe(241500);
  });

  it('calculates gains with currency fluctuations', () => {
    // Bought USD asset when rate was 15.00
    const costBasis = 100 * 50 * 15.00; // 75,000 ZAR
    // Current rate is 18.50
    const currentValue = 100 * 50 * 18.50; // 92,500 ZAR
    const gain = currentValue - costBasis; // 17,500 ZAR

    expect(gain).toBe(17500);

    // CGT at 45% marginal rate
    const cgt = calculateCGT(gain, 45);
    expect(cgt).toBe(3150); // 17500 * 0.4 * 0.45
  });
});
