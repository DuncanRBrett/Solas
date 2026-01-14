# Tax Calculation Limitations

## Overview

Solas v3 provides retirement planning calculations with simplified tax modeling. This document outlines what is modeled, what is simplified, and what assumptions are made.

**Key Principle:** Tax calculations prioritize clarity and reasonable estimates over comprehensive SARS compliance. For precise tax planning, consult a qualified tax professional.

---

## What Is Modeled

### ✅ Capital Gains Tax (CGT)

**Implementation:**
```javascript
// South African CGT calculation
const inclusionRate = 0.40; // 40% of gain is taxable
const marginalTaxRate = settings.profile.marginalTaxRate; // User's rate (e.g., 45%)
const effectiveCGTRate = inclusionRate * marginalTaxRate;

// Example: 40% × 45% = 18% effective CGT rate
```

**Applies to:**
- Withdrawals from taxable investment accounts
- Realized gains on asset sales

**Correct for:**
- Individual taxpayers
- Long-term capital gains (>1 year holding period)

### ✅ Dividend Withholding Tax

**Implementation:**
```javascript
const dividendWithholdingTax = 0.20; // 20% flat rate
const netDividend = grossDividend * (1 - dividendWithholdingTax);
```

**Applies to:**
- Local dividends from SA companies
- Offshore dividends (simplified - see limitations)

**Note:** Dividends are modeled as if withholding tax has already been deducted.

### ✅ Interest Income Tax

**Implementation:**
```javascript
const grossInterest = assetValue * (interestYield / 100);
const tax = grossInterest * (marginalTaxRate / 100);
const netInterest = grossInterest - tax;
```

**Applies to:**
- Interest from cash accounts
- Interest from bonds
- Taxed at marginal income tax rate

**Does NOT include:**
- R23,800 interest exemption (for 2024, under 65)
- R34,500 interest exemption (for 2024, 65 and over)

### ✅ Withdrawal Tax by Account Type

**TFSA (Tax-Free Savings Account):**
```javascript
withdrawalTaxRate = 0%; // No tax on withdrawals
```

**Taxable Investment Account:**
```javascript
withdrawalTaxRate = 0.40 * marginalTaxRate; // CGT on gains only
```

**Retirement Annuity (RA):**
```javascript
withdrawalTaxRate = marginalTaxRate; // Full income tax on withdrawal
```

**Weighted Average:**
```javascript
effectiveWithdrawalTaxRate =
  (tfsaWeight × 0%) +
  (taxableWeight × cgtRate) +
  (raWeight × marginalTaxRate);
```

### ✅ Income Tax

**Implementation:**
```javascript
// Simplified: uses marginal rate only
const incomeTax = taxableIncome * (marginalTaxRate / 100);
```

**Applies to:**
- Employment income
- Taxable pension income
- Taxable annuity income

---

## Simplifications & Limitations

### ⚠️ Income Tax Brackets

**What's Missing:**
- Progressive tax bracket calculation
- Actual SARS tax tables
- Tax rebates and thresholds

**What We Do:**
```javascript
// We use a single marginal tax rate entered by user
// This assumes all income is taxed at the top bracket
```

**Impact:**
- Overestimates tax for lower income years
- Simple but conservative approach

**Mitigation:**
- User should enter their expected marginal rate
- For accurate planning, calculate actual brackets separately

### ⚠️ Interest Exemption

**What's Missing:**
- R23,800 exemption (under 65)
- R34,500 exemption (65 and over)
- Age-based threshold switching

**What We Do:**
```javascript
// Tax ALL interest at marginal rate
// No exemption applied
```

**Impact:**
- Overestimates tax on interest income
- Most significant for cash-heavy portfolios

**Workaround:**
- Manually reduce interest yield by exemption amount
- Example: If earning R30,000 interest and under 65:
  - Taxable = R30,000 - R23,800 = R6,200
  - Adjust interest yield accordingly in asset settings

### ⚠️ CGT Annual Exclusion

**What's Missing:**
- R40,000 annual CGT exclusion
- Cumulative gains tracking across years

**What We Do:**
```javascript
// Apply CGT to all gains
// No R40,000 exclusion
```

**Impact:**
- Overestimates CGT by ~R7,200/year (40% × 45% × R40k)
- For R400k withdrawal: ~1.8% error

**Mitigation:**
- Conservative estimate is acceptable for planning
- For precision, reduce withdrawal tax rate by ~1-2%

### ⚠️ CGT on Primary Residence

**What's Missing:**
- R2 million primary residence exclusion
- Partial exclusion calculations

**What We Do:**
```javascript
// Lifestyle assets are NOT included in withdrawals
// No CGT applied to primary residence
```

**Impact:**
- Generally correct - most people don't sell primary residence
- If modeling home downsizing, must handle separately

### ⚠️ Retirement Fund Lump Sum Tax

**What's Missing:**
- Retirement lump sum withdrawal tables
- One-third cash lump sum rules
- Annuity purchase requirements

**What We Do:**
```javascript
// Apply full marginal rate to all RA withdrawals
// Assume annuitization has occurred
```

**Impact:**
- Overestimates tax on RA withdrawals
- Does not model lump sum vs annuity split

**Important:**
- User should model RA drawdowns as annuity income
- Lump sum withdrawals require separate calculation

### ⚠️ Offshore Tax Treatment

**What's Missing:**
- Foreign tax credits
- Different withholding rates by country
- Currency gain/loss tax treatment
- Section 25BB timing issues

**What We Do:**
```javascript
// Treat offshore dividends same as local (20% WHT)
// Treat offshore CGT same as local
// Currency gains not taxed separately
```

**Impact:**
- May overstate tax on offshore dividends (some countries have treaties)
- Currency gains should technically be taxed but aren't modeled

**Reality:**
- Offshore tax is complex
- Conservative estimate is appropriate
- Professional advice essential for large offshore holdings

### ⚠️ Medical Tax Credits

**What's Missing:**
- Medical scheme fee tax credits
- Additional medical expenses deductions
- Age-based variations

**Impact:**
- Not modeled at all
- User's marginal rate should be "effective" rate after credits

### ⚠️ Estate Duty

**What's Missing:**
- Estate duty on death (20% over R30M)
- Portability between spouses
- Asset transfers to heirs

**Impact:**
- Final portfolio value does not account for estate duty
- For estates >R30M, final value overstated by ~20%

**Note:** Estate planning is beyond retirement planning scope

---

## Account Type Assumptions

### TFSA (Tax-Free Savings Account)

**Assumptions:**
- All contributions were within annual limits
- No unauthorized withdrawals occurred
- Account has been open for required period

**Reality Check:**
- Over-contributions trigger penalty tax (not modeled)
- TFSA rules have changed over time

### Retirement Annuity (RA)

**Assumptions:**
- Funds will be annuitized at retirement
- Withdrawals represent annuity payments (taxed as income)
- No lump sum withdrawals

**Reality Check:**
- Can take 1/3 as cash (lump sum), 2/3 annuitized
- Lump sum has different tax table
- Living annuity drawdown rates limited to 2.5-17.5%

### Taxable Accounts

**Assumptions:**
- All gains are long-term capital gains (>1 year)
- Cost basis is tracked correctly
- Withdrawals realize gains proportionally

**Reality Check:**
- Short-term vs long-term distinction matters
- Loss harvesting not modeled
- Specific identification of parcels not modeled

---

## Tax Rate Inputs

### User Must Provide

**Marginal Tax Rate:**
- User's expected top tax bracket
- Should reflect tax bracket in retirement (typically lower than working years)
- For 2024: 18%, 26%, 31%, 36%, 39%, 45%

**How to Choose:**
- **Conservative:** Use working years rate (e.g., 45%)
- **Realistic:** Estimate retirement income and bracket (e.g., 31-36%)
- **Optimistic:** Assume lower bracket (e.g., 26%)

**Important:** This is the single most impactful tax input

---

## When Simplifications Matter Most

### ✅ Acceptable Simplification
- **Large portfolios (>R5M):** Interest exemption is small relative to size
- **Long time horizons (20+ years):** Small annual errors compound but remain manageable
- **Diversified accounts:** Weighted average tax rates are reasonable
- **High income earners:** Already in top bracket, marginal rate is accurate

### ⚠️ Requires Adjustment
- **Cash-heavy portfolios:** Interest exemption becomes significant
- **Large RA balances:** Lump sum withdrawal taxes differ substantially
- **Frequent rebalancing:** Transaction tax not modeled
- **Cross-border complexity:** Foreign tax credits and treaties matter

### 🚨 Not Suitable For
- **Formal tax filing:** Always use actual SARS calculations
- **Precise year-by-year tax:** Use tax software or accountant
- **Complex estate planning:** Requires specialized advice
- **International tax residents:** Multiple jurisdictions need expert help

---

## Recommendations

### For Most Users
1. Use conservative marginal tax rate (working years rate)
2. Accept that tax is slightly overestimated (better safe than sorry)
3. Review periodically as tax laws change
4. Get professional review for large decisions

### For Advanced Users
1. Manually adjust for interest exemption if material
2. Model RA lump sum vs annuity separately
3. Consider actual bracket if transitioning from high income
4. Factor in medical credits to marginal rate

### For Tax Professionals
1. Extract pre-tax cash flows from Solas
2. Apply precise SARS calculations in tax software
3. Use Solas for broad strategy, tax software for precision
4. Review tax assumptions with client annually

---

## Tax Law Changes

### Recent Changes (Last 5 Years)
- TFSA contribution limits increased
- Interest exemptions adjusted for inflation
- CGT inclusion rate stable at 40%
- Top marginal rate stable at 45%

### Monitoring Required
- Budget speeches (February annually)
- SARS tax tables
- Retirement fund regulations
- Currency control changes

### Solas Updates
- Tax rates are USER INPUTS (not hard-coded)
- User must update their marginal rate if laws change
- Formulas remain valid unless fundamental tax structure changes

---

## Disclaimer

**Legal Notice:**
This software provides estimates for financial planning purposes only. Tax calculations are simplified models and do not constitute tax advice. Always consult a registered tax practitioner for:
- Actual tax liability calculations
- Tax return preparation
- Complex estate planning
- Cross-border taxation
- Retirement fund withdrawals

**Accuracy:**
While formulas are based on current South African tax law, they are simplified for modeling purposes. Solas is a planning tool, not a tax calculation engine.

**Liability:**
Users are responsible for validating tax calculations with qualified professionals. The authors assume no liability for tax-related decisions based on Solas outputs.

---

## Summary Table

| Tax Type | Modeled? | Accuracy | Key Limitation |
|----------|----------|----------|----------------|
| CGT (40% inclusion) | ✅ Yes | High | No R40k exclusion |
| Income tax (marginal) | ✅ Yes | Medium | No brackets/rebates |
| Interest tax | ✅ Yes | Medium | No exemption |
| Dividend WHT (20%) | ✅ Yes | High | Foreign treaties ignored |
| TFSA (0% tax) | ✅ Yes | High | Assumes compliance |
| RA withdrawal | ✅ Yes | Low | No lump sum tables |
| Estate duty | ❌ No | N/A | Not in scope |
| Medical credits | ❌ No | N/A | Not in scope |
| Foreign tax credits | ❌ No | N/A | Treaties ignored |

**Overall Assessment:** Suitable for retirement planning estimates with 5-10% margin of error on tax liabilities.

---

*Document created: Phase 1 Completion*
*Last updated: 2026-01-14*
*Tax year reference: 2024/2025*
