# Solas User Manual

**Version 3.0** | Personal Financial Planning Tool

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Assets](#assets)
4. [Liabilities](#liabilities)
5. [Income](#income)
6. [Expenses](#expenses)
7. [Scenarios](#scenarios)
8. [Fees](#fees)
9. [Settings](#settings)
10. [Profiles](#profiles)
11. [Import/Export](#importexport)
12. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

Solas is a personal financial planning tool designed to help you:
- Track your assets, liabilities, income, and expenses
- Model retirement scenarios with various assumptions
- Analyze portfolio concentration and risk
- Understand fee impacts on long-term wealth
- Plan for different life phases

### First Launch

When you first open Solas, a default profile is created. Your data is stored locally in your browser's localStorage - nothing is sent to any server.

### Navigation

Use the navigation tabs at the top to move between sections:
- **Dashboard** - Overview of your financial position
- **Assets** - Manage your investments and property
- **Liabilities** - Track debts and loans
- **Income** - Record income sources
- **Expenses** - Budget and track spending
- **Scenarios** - Model retirement projections
- **Fees** - Analyze investment costs
- **Settings** - Configure preferences

---

## Dashboard

The Dashboard provides an at-a-glance view of your financial health.

### Net Worth

Shows your total net worth calculated as:
```
Net Worth = Total Investible Assets - Total Liabilities
```

Non-investible assets (like your primary home) are shown separately.

### Asset Allocation

A pie chart showing how your portfolio is distributed across asset classes:
- Offshore Equity
- SA Equity
- SA Bonds
- Offshore Bonds
- Cash
- Property
- Crypto

### Concentration Alerts

Warnings appear when:
- A single asset exceeds 10% of your portfolio
- An asset class exceeds 50%
- A single currency exceeds 70%
- A sector exceeds 30%

These thresholds are configurable in Settings.

### Quick Stats

- **Monthly Income** - Total from all income sources
- **Monthly Expenses** - Total budgeted expenses
- **Retirement Readiness** - Years until your target retirement age

---

## Assets

Manage all your investments, property, and other assets.

### Adding an Asset

1. Click **+ Add Asset**
2. Fill in the required fields:
   - **Name** - Descriptive name (e.g., "Satrix S&P 500 ETF")
   - **Asset Class** - Category (Offshore Equity, SA Equity, etc.)
   - **Asset Type** - Investible or Non-Investible
   - **Units** - Number of units/shares held
   - **Current Price** - Price per unit
   - **Currency** - Currency of the asset

### Asset Types

- **Investible** - Generates returns (shares, ETFs, bonds, investment property)
- **Non-Investible** - Appreciates but no yield (primary home, collectibles)

Only investible assets are included in retirement projections.

### Account Types

- **Taxable** - Standard investment account, subject to CGT
- **TFSA** - Tax-free savings account, no CGT
- **RA** - Retirement annuity, taxed as income on withdrawal

### Yield Information

Enter NET yields (after tax withheld at source):
- **Dividend Yield** - Net yield after 20% withholding tax
- **Interest Yield** - Gross yield (taxed at your marginal rate)

### TER (Total Expense Ratio)

Enter the fund's TER percentage. This is used in fee calculations but does NOT reduce displayed prices (it's already reflected in unit prices).

### Sorting and Filtering

Use the column headers to sort assets. Use the search box to filter by name.

---

## Liabilities

Track your debts and loans.

### Adding a Liability

1. Click **+ Add Liability**
2. Enter:
   - **Name** - Description (e.g., "Home Loan")
   - **Principal** - Outstanding balance
   - **Interest Rate** - Annual percentage
   - **Monthly Payment** - Regular payment amount
   - **Maturity Date** - When the loan ends (optional)

### Impact on Net Worth

Liabilities reduce your net worth. The dashboard shows:
```
Net Worth = Assets - Liabilities
```

---

## Income

Record all income sources for retirement planning.

### Income Types

- **Work** - Salary, wages, bonuses
- **Investment** - Dividends, interest (auto-calculated from assets)
- **Pension** - Retirement income
- **Rental** - Property income
- **Annuity** - Living or life annuity income
- **Other** - Any other income source

### Age Ranges

Specify when income starts and ends:
- **Start Age** - When income begins (null = current age)
- **End Age** - When income stops (null = lifetime)

### Inflation Adjustment

Toggle whether income adjusts with inflation in projections.

### Annuities

For annuities, specify:
- **Type** - Living (drawdown) or Life (guaranteed)
- **Capital Value** - Current capital or purchase price
- **Escalation Rate** - Annual increase percentage
- **Provider** - Institution name

---

## Expenses

Track your spending across life phases.

### Expense Categories

Organize expenses by category:
- Housing
- Food
- Transport
- Healthcare
- Insurance
- Entertainment
- Education
- Utilities
- Other

### Subcategories

Each category can have multiple subcategories with:
- **Name** - Description
- **Amount** - Monthly or annual amount
- **Currency** - For foreign expenses
- **Frequency** - Monthly or Annual
- **Expense Type** - Fixed, Variable, Luxury, or Wealth Building

### Expense Types

- **Fixed Non-Discretionary** - Essential, unchangeable (rates, insurance)
- **Variable Discretionary** - Essential but adjustable (food, utilities)
- **Luxury** - Nice-to-have spending
- **Wealth Building** - Savings and investments

### Life Phases

Expenses can vary across life phases:
1. **Working** - Pre-retirement (100% of expenses)
2. **Active Retirement** - Early retirement (100%)
3. **Slower Pace** - Reduced activity (80%)
4. **Later Years** - Final phase (60%)

Percentages are configurable in Settings.

---

## Scenarios

Model retirement projections with different assumptions.

### Creating a Scenario

1. Click **+ New Scenario**
2. Configure assumptions:
   - **Name** - Descriptive title
   - **Inflation Rate** - Expected inflation (%)
   - **Retirement Age** - When you stop working
   - **Life Expectancy** - Planning horizon
   - **Monthly Savings** - Pre-retirement contributions

### Expected Returns

Use settings defaults or override per-scenario:
- Returns are weighted by your actual portfolio allocation
- Each asset class can have a different expected return

### Currency Movement

Model foreign currency appreciation/depreciation:
- Positive = foreign currency strengthens vs ZAR
- Affects returns on non-ZAR assets

Your currency settings are remembered for future scenarios.

### Market Crashes

Simulate market downturns:
1. Click **+ Add Crash**
2. Set the age when the crash occurs
3. Specify drop percentages per asset class
4. Equity typically drops 30-50%, bonds less

Your asset class selections are remembered for future crashes.

### Unexpected Expenses

Model large one-time costs:
- Medical emergencies
- Home repairs
- Family support

### Running Scenarios

1. Click **Run** to execute the projection
2. View results:
   - Success/failure status
   - Final portfolio value
   - Total withdrawn
   - Expense coverage breakdown

### Understanding Results

**Success** means your money lasts to life expectancy.

**Expense Coverage** shows how expenses are funded:
- By Income (pensions, dividends)
- By Returns (portfolio growth)
- By Capital Drawdown (selling assets)

**Drawdown Rate** should stay under 4% for sustainability.

### Comparing Scenarios

1. Click **Compare**
2. Select 2-4 scenarios
3. View side-by-side chart and metrics

---

## Fees

Analyze how investment fees impact your wealth.

### Configuring Fees

First, set up fees in **Settings > Fees & Platforms**:

1. **Platforms** - Where your assets are held
   - Add platforms with fee structures
   - Assign assets to platforms

2. **Advisor Fee** - If you use a financial advisor
   - Enable and set percentage or fixed amount

### Fee Analysis

The Fees page shows:
- **Current Year Fees** - What you're paying now
- **Breakdown by Asset** - Detailed fee allocation
- **Lifetime Projection** - Cumulative fees over time
- **Fee Drag** - Money lost to fees vs no-fee scenario

### Projection Settings

Adjust projection parameters (these are remembered):
- **Projection Period** - Years to project (5-50)
- **Inflation Rate** - Expected inflation
- **Portfolio Growth Rate** - Expected returns

### What-If Scenarios

See potential savings by reducing your fee rate:
- Scenarios show impact of 0.25%, 0.50%, 0.75% reductions
- Includes specific savings amounts and final portfolio values

### Optimization Recommendations

The system suggests ways to reduce fees:
- Consolidate accounts
- Switch to lower-cost platforms
- Replace active funds with ETFs
- Negotiate with advisors

---

## Settings

Configure Solas to match your situation.

### Profile Settings

- **Age** - Your current age
- **Marginal Tax Rate** - Highest tax bracket
- **Retirement Age** - Target retirement
- **Life Expectancy** - Planning horizon
- **Monthly Savings** - Regular contributions
- **Expected Inflation** - Default inflation rate
- **Income Growth** - Expected salary increases

### Currency Settings

- **Reporting Currency** - Base currency for calculations
- **Enabled Currencies** - Available in dropdowns
- **Exchange Rates** - Current rates vs reporting currency

### Expected Returns

Set expected returns by asset class:
- Used in scenarios and projections
- Override per-scenario if needed

### Target Allocation

Define your ideal portfolio mix:
- Used for rebalancing recommendations
- Total should equal 100%

### Life Phases

Configure the four life phases:
- Adjust age ranges
- Set expense percentages for each phase

### Thresholds

Set warning thresholds for:
- Single asset concentration
- Asset class concentration
- Currency exposure
- Sector concentration
- Staleness (days since price update)

### Fees & Platforms

Configure platforms and fees:
1. Add platforms with fee structures
2. Assign assets to platforms
3. Configure advisor fees

---

## Profiles

Manage multiple profiles for different scenarios.

### Creating a Profile

1. Click the profile dropdown
2. Select **+ New Profile**
3. Enter a name
4. Configure from scratch or import data

### Switching Profiles

1. Click the profile dropdown
2. Select the desired profile
3. All data switches to that profile

### Use Cases

- Separate profiles for individual vs joint planning
- "What-if" profiles for major life changes
- Testing different strategies

### Deleting Profiles

1. Open Settings
2. Go to Profile Management
3. Click Delete (cannot delete last profile)

---

## Import/Export

### Exporting Data

1. Go to Settings
2. Click **Export Profile**
3. Choose format:
   - **JSON** - Complete backup
   - **Excel** - Spreadsheet format

### Importing Data

1. Go to Settings
2. Click **Import Profile**
3. Select a JSON file
4. Review and confirm

### Backup Recommendations

- Export regularly (weekly/monthly)
- Keep multiple backup versions
- Store backups securely offline

---

## Tips and Best Practices

### Accuracy

- Update prices regularly (weekly/monthly)
- Verify exchange rates
- Review expenses annually

### Scenarios

- Create multiple scenarios (optimistic, base, pessimistic)
- Test market crashes at different ages
- Include unexpected expenses

### Fees

- Review fees annually
- Consider fee impact over 20-30 years
- Small fee reductions compound significantly

### Tax Efficiency

- Maximize TFSA contributions
- Use RA for tax deductions
- Understand CGT implications

### Data Security

- Data stays in your browser
- Export backups regularly
- Clear data when using shared computers

---

## Troubleshooting

### Data Not Saving

- Check browser localStorage is enabled
- Clear cache and reload
- Export and re-import if needed

### Calculations Seem Wrong

- Verify exchange rates
- Check asset types (Investible vs Non-Investible)
- Ensure income age ranges are correct

### Performance Issues

- Reduce number of assets if very large
- Clear browser cache
- Use a modern browser (Chrome, Firefox, Safari)

---

## Glossary

| Term | Definition |
|------|------------|
| **CGT** | Capital Gains Tax - tax on investment profits |
| **TER** | Total Expense Ratio - annual fund management fee |
| **TFSA** | Tax-Free Savings Account |
| **RA** | Retirement Annuity |
| **AUM** | Assets Under Management |
| **Drawdown Rate** | Annual withdrawal as % of portfolio |
| **Investible Assets** | Assets that generate returns |
| **Net Worth** | Total assets minus liabilities |
| **Reporting Currency** | Base currency for all calculations |

---

## Support

Solas is a personal project. For issues or suggestions:
- Check the documentation
- Review the source code
- Create detailed notes for future reference

---

*Last updated: January 2025*
