# Reference Retirement Scenarios

This document provides hand-calculated reference scenarios with known correct answers. These serve as benchmarks to validate the retirement projection calculations in Solas.

## Scenario 1: Simple Growth (No Expenses)

**Setup:**
- Starting portfolio: R5,000,000
- Current age: 65 (already retired)
- Life expectancy: 75
- Annual return: 8%
- Inflation: 0% (to simplify)
- Annual expenses: R0
- No income, market crashes, or unexpected expenses

**Hand Calculation:**
```
Year 1 (Age 65): R5,000,000 × 1.08 = R5,400,000
Year 2 (Age 66): R5,400,000 × 1.08 = R5,832,000
Year 3 (Age 67): R5,832,000 × 1.08 = R6,298,560
Year 4 (Age 68): R6,298,560 × 1.08 = R6,802,445
Year 5 (Age 69): R6,802,445 × 1.08 = R7,346,640
Year 6 (Age 70): R7,346,640 × 1.08 = R7,934,371
Year 7 (Age 71): R7,934,371 × 1.08 = R8,569,121
Year 8 (Age 72): R8,569,121 × 1.08 = R9,254,650
Year 9 (Age 73): R9,254,650 × 1.08 = R9,995,022
Year 10 (Age 74): R9,995,022 × 1.08 = R10,794,624
Year 11 (Age 75): R10,794,624 × 1.08 = R11,658,193
```

**Expected Result:**
- Success: ✓ (portfolio never depletes)
- Final value: R11,658,193
- Total withdrawn: R0

---

## Scenario 2: Fixed Expenses (No Inflation)

**Setup:**
- Starting portfolio: R5,000,000
- Current age: 65
- Life expectancy: 75
- Annual return: 8%
- Inflation: 0%
- Annual expenses: R300,000 (fixed)
- Withdrawal tax rate: 0% (simplified)
- No income

**Hand Calculation:**
```
Year 1 (Age 65):
  Start: R5,000,000
  Withdraw: R300,000
  Remaining: R4,700,000
  Growth: R4,700,000 × 1.08 = R5,076,000

Year 2 (Age 66):
  Start: R5,076,000
  Withdraw: R300,000
  Remaining: R4,776,000
  Growth: R4,776,000 × 1.08 = R5,158,080

Year 3 (Age 67):
  Start: R5,158,080
  Withdraw: R300,000
  Remaining: R4,858,080
  Growth: R4,858,080 × 1.08 = R5,246,726

Continuing this pattern...

Year 10 (Age 74):
  Start: R5,686,968
  Withdraw: R300,000
  Remaining: R5,386,968
  Growth: R5,386,968 × 1.08 = R5,817,925

Year 11 (Age 75):
  Start: R5,817,925
  Withdraw: R300,000
  Final: R5,517,925 (no more growth after last year)
```

**Expected Result:**
- Success: ✓ (portfolio sustains all expenses)
- Final value: ~R5,500,000 (approximate)
- Total withdrawn: R3,300,000 (R300k × 11 years)

**Key Insight:** Portfolio grows because 8% return on R5M (R400k) exceeds R300k expenses.

---

## Scenario 3: Income Covering Expenses

**Setup:**
- Starting portfolio: R2,000,000
- Current age: 65
- Life expectancy: 70
- Annual return: 5%
- Inflation: 0%
- Annual expenses: R240,000
- Annual income: R240,000 (pension, not inflation-adjusted)
- Withdrawal tax rate: 0%

**Hand Calculation:**
```
Since income exactly matches expenses, no withdrawals needed.
Portfolio just grows at 5% annually.

Year 1 (Age 65): R2,000,000 × 1.05 = R2,100,000
Year 2 (Age 66): R2,100,000 × 1.05 = R2,205,000
Year 3 (Age 67): R2,205,000 × 1.05 = R2,315,250
Year 4 (Age 68): R2,315,250 × 1.05 = R2,431,013
Year 5 (Age 69): R2,431,013 × 1.05 = R2,552,563
Year 6 (Age 70): R2,552,563 × 1.05 = R2,680,191
```

**Expected Result:**
- Success: ✓
- Final value: R2,680,191
- Total withdrawn: R0
- Total expenses: R1,440,000
- Expenses covered by income: 100%

---

## Scenario 4: Portfolio Depletion

**Setup:**
- Starting portfolio: R1,000,000
- Current age: 65
- Life expectancy: 85 (20 years)
- Annual return: 5%
- Inflation: 0%
- Annual expenses: R150,000
- Withdrawal tax rate: 0%
- No income

**Analysis:**
- 4% safe withdrawal rate on R1M = R40,000/year sustainable
- Drawing R150,000/year is unsustainable
- Portfolio will deplete

**Approximate Depletion:**
```
Using simplified calculation:
Net annual drain ≈ R150,000 - (5% of diminishing portfolio)

Year 1: R1,000,000 - R150,000 + R42,500 (5% of R850k) = R892,500
Year 2: R892,500 - R150,000 + R37,125 = R779,625
Year 3: R779,625 - R150,000 + R31,481 = R661,106
Year 4: R661,106 - R150,000 + R25,555 = R536,661
Year 5: R536,661 - R150,000 + R19,333 = R405,994
Year 6: R405,994 - R150,000 + R12,800 = R268,794
Year 7: R268,794 - R150,000 + R5,940 = R124,734
Year 8: R124,734 - R150,000 = DEPLETED

Depletion age: ~72 (age 65 + 7 years)
```

**Expected Result:**
- Success: ✗ (portfolio depletes)
- Depletion age: ~72
- Final value: R0
- Shortfall: Expenses from age 72-85 cannot be met

---

## Scenario 5: Market Crash Impact

**Setup:**
- Starting portfolio: R10,000,000
- Current age: 65
- Life expectancy: 70
- Annual return: 8%
- Inflation: 0%
- Annual expenses: R0
- Market crash: Age 68, 30% drop
- Equity percentage: 60%

**Hand Calculation:**
```
Year 1 (Age 65): R10,000,000 × 1.08 = R10,800,000
Year 2 (Age 66): R10,800,000 × 1.08 = R11,664,000
Year 3 (Age 67): R11,664,000 × 1.08 = R12,597,120

Year 4 (Age 68):
  Before crash: R12,597,120 × 1.08 = R13,604,890
  Crash impact: 60% equity × 30% drop = 18% total loss
  Loss amount: R13,604,890 × 0.18 = R2,448,880
  After crash: R13,604,890 - R2,448,880 = R11,156,010

Year 5 (Age 69): R11,156,010 × 1.08 = R12,048,491
Year 6 (Age 70): R12,048,491 × 1.08 = R13,012,370
```

**Expected Result:**
- Success: ✓
- Final value: R13,012,370
- Loss from crash: R2,448,880
- Recovery: Portfolio recovers but ends lower than no-crash scenario (would be R15.7M)

**Key Insight:** 30% crash on 60% equity = 18% total portfolio loss

---

## Scenario 6: Age-Based Expense Phases

**Setup:**
- Starting portfolio: R8,000,000
- Current age: 65
- Life expectancy: 85
- Annual return: 7%
- Inflation: 4%
- Base annual expenses: R400,000 (in today's money)
- Expense phases:
  - Ages 65-69: 100% of base
  - Ages 70-79: 80% of base
  - Ages 80-85: 60% of base
- Withdrawal tax rate: 18% CGT
- No income

**Sample Calculation for Age 70:**
```
Years from now: 5
Inflation factor: (1.04)^5 = 1.217
Base expenses at age 70: R400,000 × 1.217 = R486,800
Age multiplier: 80%
Actual expenses: R486,800 × 0.80 = R389,440

Gross withdrawal needed: R389,440 / (1 - 0.18) = R474,927
```

**Expected Patterns:**
- Expenses rise with inflation but...
- Expenses drop at age 70 (80% multiplier offsets some inflation)
- Expenses drop further at age 80 (60% multiplier)
- Withdrawal tax increases actual portfolio draw

---

## Scenario 7: Pre-Retirement Savings

**Setup:**
- Starting portfolio: R1,000,000
- Current age: 60
- Retirement age: 65
- Life expectancy: 75
- Annual return: 8%
- Inflation: 4%
- Monthly savings: R10,000 (inflation-adjusted)
- Post-retirement expenses: R300,000/year
- Withdrawal tax rate: 18%

**Pre-Retirement Phase (Ages 60-64):**
```
Year 1 (Age 60):
  Start: R1,000,000
  Add savings: R10,000 × 12 × 1.04^0 = R120,000
  Total: R1,120,000
  Growth: R1,120,000 × 1.08 = R1,209,600

Year 2 (Age 61):
  Start: R1,209,600
  Add savings: R10,000 × 12 × 1.04 = R124,800
  Total: R1,334,400
  Growth: R1,334,400 × 1.08 = R1,441,152

...continuing to age 65

Approximate portfolio at 65: R2,200,000
```

**Expected Result:**
- Portfolio should grow from R1M to ~R2.2M by age 65
- Then begin drawdown phase
- Should sustain through age 75

---

## Validation Checklist

Use these scenarios to verify:

✓ **Simple growth compounds correctly**
✓ **Fixed expense withdrawals work as expected**
✓ **Income offsets expenses properly**
✓ **Portfolio depletion is detected at correct age**
✓ **Market crashes only affect equity portion**
✓ **Age-based expense multipliers apply correctly**
✓ **Pre-retirement savings accumulate with growth**
✓ **Inflation adjustments compound properly**
✓ **Withdrawal tax grosses up correctly**
✓ **Real vs nominal returns calculated accurately**

---

## Testing Notes

1. **Tolerance:** Allow ±2% variance due to rounding and calculation order
2. **Compound frequency:** Calculations assume annual compounding
3. **Withdrawal timing:** Withdrawals at start of year, growth at end
4. **Tax application:** Applied to gross withdrawal amount
5. **Market crashes:** Applied after growth, before next year

---

## Common Pitfalls to Avoid

1. **Expense timing:** Apply age multiplier BEFORE inflation adjustment? Or after? (Answer: Apply to base, then inflate)
2. **Growth timing:** Growth before or after withdrawals? (Answer: After withdrawals)
3. **Crash timing:** When in the year does crash occur? (Answer: After annual growth)
4. **Income tax:** Applied to gross income or just taxable portion? (Answer: Just taxable)
5. **Withdrawal tax:** Applied to entire withdrawal or only to gains? (Answer: Entire amount for RA, proportion for taxable accounts)

---

## Formula Summary

**Annual Cycle Order:**
1. Calculate income for year (age-filtered, inflation-adjusted)
2. Calculate expenses for year (age-multiplied, inflation-adjusted)
3. Calculate net needed: expenses - income
4. If net needed > 0: Withdraw net / (1 - tax rate)
5. If net needed < 0: Add surplus to portfolio
6. Apply investment returns: portfolio × (1 + return rate)
7. Apply market crashes (if any): portfolio × equity % × crash %
8. Apply unexpected expenses (if any): portfolio - expense amount

**Key Formulas:**
- Future value with inflation: `amount × (1 + inflation_rate)^years`
- Gross withdrawal with tax: `net_needed / (1 - tax_rate)`
- Market crash impact: `portfolio × equity_percentage × crash_percentage`
- Age expense multiplier: `base_expense × phase_percentage / 100`
- Compound growth: `principal × (1 + rate)^periods`

---

*Document created: Phase 1 Completion*
*Last updated: 2026-01-14*
