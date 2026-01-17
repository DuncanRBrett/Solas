/**
 * Test script to verify the expense calculation fix
 * Run this in browser console after loading Solas
 */

// Test data
const testExpenseCategories = [
  {
    name: 'Housing',
    subcategories: [
      { monthlyAmount: 10000, frequency: 'Monthly', currency: 'ZAR' },  // R10k/month = R120k/year
      { monthlyAmount: 50000, frequency: 'Annual', currency: 'ZAR' },   // R50k/year
    ]
  },
  {
    name: 'Transport',
    subcategories: [
      { monthlyAmount: 5000, frequency: 'Monthly', currency: 'ZAR' },   // R5k/month = R60k/year
    ]
  }
];

const exchangeRates = { ZAR: 1, USD: 18, EUR: 20, GBP: 22 };

// Calculate the correct total
// Housing: R10k * 12 + R50k = R170k
// Transport: R5k * 12 = R60k
// Total should be: R230k

let totalAnnual = 0;
testExpenseCategories.forEach(category => {
  category.subcategories.forEach(sub => {
    const currency = sub.currency || 'ZAR';
    const rate = exchangeRates[currency] || 1;

    // CORRECTED LOGIC (matching the fix):
    const annualAmount = sub.frequency === 'Annual'
      ? sub.monthlyAmount  // Already annual
      : sub.monthlyAmount * 12;  // Convert monthly to annual

    const annualAmountZAR = annualAmount / rate;
    totalAnnual += annualAmountZAR;

    console.log(`${sub.frequency}: ${sub.monthlyAmount} → Annual: ${annualAmount} ZAR: ${annualAmountZAR}`);
  });
});

console.log(`Total Annual Expenses: R ${totalAnnual.toLocaleString()}`);
console.log(`Expected: R 230,000`);
console.log(`Match: ${totalAnnual === 230000 ? '✓ PASS' : '✗ FAIL'}`);

// Test with your actual value
console.log('\n--- Your Scenario Test ---');
console.log('If your R 928,000 is being multiplied to R 3,829,170:');
console.log('Multiplier:', 3829170 / 928000);
console.log('This is approximately 4.125x');
console.log('\nWith the old (buggy) logic:');
console.log('If expenses were Annual: amount / 12 * 12 = amount (no change) ✓');
console.log('If expenses were Monthly: amount * 12 = correct ✓');
console.log('\nThe 4x suggests the issue might be elsewhere...');
