# Solas v3 - Financial Planning Application

## Project Overview

Solas is a comprehensive personal financial planning tool that helps users:
- Track assets, liabilities, income, and expenses
- Model retirement scenarios with multiple variables
- Analyze portfolio allocation and concentration risks
- Plan for market crashes and unexpected expenses
- Support multiple profiles for different planning scenarios

## Current Status

### Existing Implementation
- **File**: `solas_v3_professional.html`
- **Size**: 116KB, 2,619 lines
- **Architecture**: Single-file HTML with embedded JavaScript and CSS
- **Storage**: Browser localStorage
- **Dependencies**: Chart.js, SheetJS
- **Status**: Functional but becoming difficult to maintain

### Known Issues
1. **Browser Compatibility**: Works in Safari but has issues in Chrome (recently fixed)
2. **Scenario Calculations**: Expenses withdrawal logic needed debugging
3. **Performance**: Full page re-renders on every navigation
4. **Maintenance**: Single file makes debugging and feature additions difficult
5. **Testing**: No automated tests, manual testing only

## Migration Plan

### Goal
Migrate from single-file HTML to modular React application while:
- Maintaining all existing functionality
- Improving performance and maintainability
- Adding better error handling and validation
- Enabling easier testing and debugging
- Preserving all user data

### Approach
**Incremental migration** - build module by module, validate each before moving forward.

## Technical Architecture

### Current Architecture (Single File)

```
solas_v3_professional.html
├── HTML Structure (header, nav, app container, modals)
├── CSS (embedded styles)
└── JavaScript
    ├── State Management (global State object)
    ├── Storage (localStorage wrapper)
    ├── Calculations Module
    │   ├── Asset valuations
    │   ├── Net worth calculations
    │   ├── Allocation analysis
    │   ├── Concentration risk detection
    │   ├── Retirement projections
    │   └── Tax calculations
    ├── UI Module
    │   ├── Render functions for each view
    │   ├── Modal management
    │   └── Chart initialization
    ├── Data Modules
    │   ├── Assets (CRUD)
    │   ├── Liabilities (CRUD)
    │   ├── Income (CRUD)
    │   ├── Expenses (CRUD)
    │   ├── Scenarios (CRUD + run)
    │   └── Funds (reference data)
    ├── Settings Management
    ├── Profile Management
    └── Import/Export
```

### Target Architecture (Modular React)

```
solas-v3-app/
├── public/
│   └── (static assets)
├── src/
│   ├── main.jsx                    (Entry point)
│   ├── App.jsx                     (Root component)
│   │
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── NetWorthCard.jsx
│   │   │   ├── AllocationChart.jsx
│   │   │   ├── ConcentrationAlerts.jsx
│   │   │   └── RetirementReadiness.jsx
│   │   │
│   │   ├── Assets/
│   │   │   ├── AssetList.jsx
│   │   │   ├── AssetTable.jsx
│   │   │   ├── AssetRow.jsx
│   │   │   └── AssetModal.jsx
│   │   │
│   │   ├── Liabilities/
│   │   │   ├── LiabilityList.jsx
│   │   │   └── LiabilityModal.jsx
│   │   │
│   │   ├── Income/
│   │   │   ├── IncomeList.jsx
│   │   │   └── IncomeModal.jsx
│   │   │
│   │   ├── Expenses/
│   │   │   ├── ExpenseList.jsx
│   │   │   └── ExpenseModal.jsx
│   │   │
│   │   ├── Scenarios/
│   │   │   ├── ScenarioList.jsx
│   │   │   ├── ScenarioModal.jsx
│   │   │   ├── ScenarioResults.jsx
│   │   │   └── ScenarioChart.jsx
│   │   │
│   │   ├── Rebalancing/
│   │   │   ├── RebalancingView.jsx
│   │   │   └── RebalancingAdvice.jsx
│   │   │
│   │   ├── Settings/
│   │   │   ├── Settings.jsx
│   │   │   ├── ProfileSettings.jsx
│   │   │   ├── ExchangeRates.jsx
│   │   │   └── ExpectedReturns.jsx
│   │   │
│   │   └── shared/
│   │       ├── Navigation.jsx
│   │       ├── ProfileSwitcher.jsx
│   │       ├── Modal.jsx
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       └── StatCard.jsx
│   │
│   ├── services/
│   │   ├── calculations.js         (Pure functions for all calculations)
│   │   ├── storage.js              (localStorage wrapper)
│   │   ├── scenarios.js            (Scenario execution logic)
│   │   ├── import-export.js        (Data import/export)
│   │   └── validation.js           (Input validation)
│   │
│   ├── store/
│   │   ├── useStore.js             (Zustand store)
│   │   ├── slices/
│   │   │   ├── assetsSlice.js
│   │   │   ├── liabilitiesSlice.js
│   │   │   ├── incomeSlice.js
│   │   │   ├── expensesSlice.js
│   │   │   ├── scenariosSlice.js
│   │   │   ├── settingsSlice.js
│   │   │   └── profilesSlice.js
│   │
│   ├── models/
│   │   ├── Asset.js
│   │   ├── Liability.js
│   │   ├── Income.js
│   │   ├── Expense.js
│   │   ├── Scenario.js
│   │   ├── Settings.js
│   │   └── defaults.js
│   │
│   ├── utils/
│   │   ├── formatters.js           (Currency, date formatting)
│   │   ├── validators.js           (Input validation)
│   │   └── helpers.js              (Common utilities)
│   │
│   ├── hooks/
│   │   ├── useCalculations.js
│   │   ├── useLocalStorage.js
│   │   └── useDebounce.js
│   │
│   ├── styles/
│   │   ├── global.css
│   │   ├── variables.css
│   │   └── components/
│   │
│   └── __tests__/
│       ├── services/
│       │   ├── calculations.test.js
│       │   └── scenarios.test.js
│       └── components/
│           └── Dashboard.test.jsx
│
├── package.json
├── vite.config.js
├── vitest.config.js                (Test configuration)
└── README.md
```

## Data Models

### Asset
```javascript
{
  id: string (uuid)
  name: string
  ticker: string
  assetClass: 'Offshore Equity' | 'SA Equity' | 'SA Bonds' | 'Offshore Bonds' | 'Cash' | 'Property' | 'Crypto'
  assetType: 'investment' | 'lifestyle'
  accountType: 'TFSA' | 'Taxable' | 'RA'
  numberOfUnits: number
  unitCurrentPrice: number
  unitCostPrice: number
  currency: 'ZAR' | 'USD' | 'EUR' | 'GBP'
  lastUpdated: ISO date string
  priceUpdateURL: string (optional)
  notes: string (optional)
  portfolio: 'Core' | 'Satellite' | 'Speculative'
  sector: string
  region: string
  liquidity: 'Liquid' | 'Illiquid'
}
```

### Liability
```javascript
{
  id: string (uuid)
  name: string
  amount: number
  currency: string
  interestRate: number
  monthlyPayment: number
  maturityDate: ISO date string (optional)
}
```

### Income Source
```javascript
{
  id: string (uuid)
  name: string
  monthlyAmount: number
  currency: string
  startAge: number
  endAge: number | null (null = lifetime)
  inflationAdjusted: boolean
  taxable: boolean
}
```

### Expense
```javascript
{
  id: string (uuid)
  name: string
  monthlyAmount: number
  expenseType: 'monthly' | 'annual'
  category: string (optional)
}
```

### Scenario
```javascript
{
  id: string (uuid)
  name: string
  assumptions: {
    nominalReturn: number (%)
    inflationRate: number (%)
    retirementAge: number
    monthlySavings: number
    lifeExpectancy: number (optional)
    annualExpenses: number (optional)
    marketCrashes: Array<{
      year: number (age)
      dropPercent: number
      description: string
    }>
    unexpectedExpenses: Array<{
      year: number (age)
      amount: number
      description: string
    }>
    expensePhases: object (optional)
  }
  results: {
    trajectory: Array<{ age: number, netWorth: number }>
    success: boolean
    shortfall: number
    finalValue: number
    weightedReturn: number
    nominalReturn: number
    realReturn: number
    withdrawalTaxRate: number
  }
}
```

### Settings
```javascript
{
  version: string
  profile: {
    age: number | null
    marginalTaxRate: number (decimal)
    retirementAge: number
    lifeExpectancy: number
    annualExpenses: number
    monthlySavings: number
  }
  reportingCurrency: 'ZAR' | 'USD' | 'EUR' | 'GBP'
  exchangeRates: {
    ZAR: 1.0
    USD: number
    EUR: number
    GBP: number
  }
  targetAllocation: {
    'Offshore Equity': number (%)
    'SA Equity': number (%)
    'SA Bonds': number (%)
    'Offshore Bonds': number (%)
    'Cash': number (%)
    'Property': number (%)
    'Crypto': number (%)
  }
  expectedReturns: {
    'Offshore Equity': number (% p.a.)
    'SA Equity': number (% p.a.)
    // ... etc
  }
  concentrationThresholds: {
    singleAsset: { green: 15, yellow: 25 }
    assetClass: { green: 60, yellow: 75 }
    currency: { green: 70, yellow: 85 }
    portfolio: { green: 40, yellow: 60 }
    sector: { green: 30, yellow: 50 }
    region: { green: 60, yellow: 80 }
  }
  stalenessThresholds: {
    fresh: 7 (days)
    stale: 30 (days)
  }
  rebalancing: {
    driftThreshold: 5 (%)
    reviewFrequency: 'quarterly' | 'monthly' | 'annual'
  }
}
```

### Profile
```javascript
{
  id: string
  name: string
  assets: Array<Asset>
  liabilities: Array<Liability>
  incomeSources: Array<Income>
  expenses: Array<Expense>
  scenarios: Array<Scenario>
  funds: Array<Fund> (reference data)
  settings: Settings
}
```

## Key Calculations

### 1. Net Worth Calculation
```
Gross Assets = Σ(asset.units × asset.currentPrice × exchangeRate)
  (excluding lifestyle assets)

Lifestyle Assets = Σ(asset.units × asset.currentPrice × exchangeRate)
  (only lifestyle assets)

Total Liabilities = Σ(liability.amount × exchangeRate)

Net Worth = Gross Assets - Total Liabilities
```

### 2. Allocation Calculation
Groups assets by specified dimension (assetClass, currency, portfolio, sector, region):
```
For each group:
  value = Σ(asset value in reporting currency)
  percentage = (value / grossAssets) × 100
  count = number of assets
```

### 3. Concentration Risk Detection
Flags assets/groups exceeding thresholds:
- **Yellow**: Approaching concentration limit
- **Red**: Exceeds concentration limit

### 4. Retirement Projection
```
For each year from currentAge to lifeExpectancy:

  Calculate income from active sources:
    - Filter income sources by age range
    - Apply inflation adjustment if applicable
    - Calculate tax on taxable income
    - Net income = Gross income - Tax

  If pre-retirement (age < retirementAge):
    - Add monthly savings
    - Add net income
    - Grow by nominal return

  If post-retirement (age >= retirementAge):
    - Calculate inflation-adjusted expenses
    - Apply age-based expense multiplier:
      * 60-70: 100%
      * 70-80: 80%
      * 80+: 60%
    - Net needed = Expenses - Income
    - If net needed > 0:
        Withdraw: net needed / (1 - withdrawal tax rate)
    - Else:
        Add surplus to portfolio
    - Grow by nominal return

  Apply market crashes (if age matches):
    - Crash only affects equity portion
    - Loss = equity % × crash drop %

  Deduct unexpected expenses (if age matches)

  Record trajectory point: { age, netWorth }

Success = portfolio never goes below zero
Shortfall = max(0, -min(netWorth in trajectory))
```

### 5. Withdrawal Tax Calculation
```
Based on account type allocation:
- TFSA: 0% tax (up to contribution limits)
- Taxable: 18% CGT (40% inclusion × 45% marginal rate)
- RA: Full income tax (marginal rate)

Withdrawal Tax Rate = weighted average based on account mix
```

## Technology Stack

### Core
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **JavaScript** (or TypeScript optional)

### State Management
- **Zustand** - Lightweight state management (simpler than Redux)

### UI & Styling
- **CSS Modules** or **Tailwind CSS** (to decide)
- Existing CSS can be migrated

### Charts
- **Chart.js** with **react-chartjs-2** wrapper

### Storage
- **localStorage** (same as current)
- Consider IndexedDB for larger datasets (future)

### Testing
- **Vitest** - Fast unit testing
- **React Testing Library** - Component testing

### Data Export
- **xlsx** library (SheetJS) - Excel export

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **React DevTools** - Browser extension for debugging

## Migration Phases

### Phase 0: Setup & Planning ✓ (Current)
- ✅ Document current architecture
- ✅ Create migration plan
- ✅ Set up claude.md
- ⏳ Create project structure
- ⏳ Set up development environment

### Phase 1: Foundation (Week 1)
**Goal**: Basic infrastructure and data layer

1. **Project Setup**
   - Initialize Vite + React project
   - Install dependencies
   - Configure build and dev tools

2. **Data Models**
   - Define TypeScript interfaces (or JSDoc types)
   - Create default values
   - Set up validation schemas

3. **Storage Layer**
   - Migrate localStorage wrapper
   - Implement state persistence
   - Create data migration utility from old format

4. **Calculations Service**
   - Extract pure calculation functions
   - Write unit tests for calculations
   - Verify results match current implementation

5. **State Management**
   - Set up Zustand store
   - Create store slices for each data type
   - Implement CRUD operations

**Deliverable**: Can import existing data and perform calculations

### Phase 2: Core UI (Week 2)
**Goal**: Basic navigation and viewing

1. **Layout & Navigation**
   - App shell with header
   - Navigation tabs
   - Profile switcher

2. **Dashboard Component**
   - Net worth display
   - Asset allocation chart
   - Concentration alerts
   - Retirement readiness

3. **Settings Component**
   - Profile settings form
   - Exchange rates
   - Expected returns
   - Thresholds configuration

**Deliverable**: Can view dashboard and edit settings

### Phase 3: Asset Management (Week 3)
**Goal**: Full CRUD for financial data

1. **Assets Module**
   - Asset list/table
   - Add/edit/delete modal
   - Sorting and filtering
   - Bulk operations

2. **Liabilities Module**
   - Liability list
   - CRUD operations

3. **Income Module**
   - Income sources list
   - Age-based income configuration

4. **Expenses Module**
   - Expense tracking
   - Monthly/annual categorization

**Deliverable**: Full financial data management

### Phase 4: Scenarios (Week 4)
**Goal**: Retirement scenario modeling

1. **Scenario List**
   - Display all scenarios
   - Run/edit/delete

2. **Scenario Configuration**
   - Assumptions form
   - Market crashes
   - Unexpected expenses

3. **Scenario Execution**
   - Run projection calculation
   - Display trajectory chart
   - Show results summary

4. **Debugging & Testing**
   - Verify calculations match old version
   - Test edge cases
   - Fix any discrepancies

**Deliverable**: Working scenario analysis

### Phase 5: Advanced Features (Week 5)
**Goal**: Remaining features and polish

1. **Rebalancing**
   - Current vs target allocation
   - Rebalancing recommendations

2. **Multi-Profile Support**
   - Create new profiles
   - Switch between profiles
   - Delete profiles (with confirmation)

3. **Import/Export**
   - Export to Excel
   - Import from old version
   - Import from Excel

4. **Polish**
   - Responsive design
   - Loading states
   - Error handling
   - Input validation

**Deliverable**: Feature-complete application

### Phase 6: Testing & Migration (Week 6)
**Goal**: Ensure reliability and migrate data

1. **Testing**
   - Unit tests for calculations
   - Component tests for key UI
   - Integration tests for workflows
   - Browser compatibility testing

2. **Performance**
   - Optimize re-renders
   - Lazy loading
   - Code splitting

3. **Documentation**
   - User guide
   - Developer documentation
   - Migration guide

4. **Data Migration**
   - Backup current data
   - Import into new app
   - Verify all data migrated correctly
   - Run parallel testing

**Deliverable**: Production-ready application

## Development Workflow

### Daily Workflow
```bash
# Start development
cd ~/Documents/Solas/solas-v3-app
npm run dev

# Make changes in VS Code
# Browser auto-refreshes

# Run tests
npm test

# Check for errors
npm run lint

# Build for production
npm run build
```

### Git Workflow (Recommended)
```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create feature branch
git checkout -b feature/dashboard

# Work on feature...
git add .
git commit -m "Add dashboard component"

# Merge to main
git checkout main
git merge feature/dashboard
```

## Testing Strategy

### Unit Tests
Test pure functions in isolation:
```javascript
// Example: calculations.test.js
test('calculateNetWorth returns correct total', () => {
  const assets = [
    { units: 100, currentPrice: 500, currency: 'ZAR', assetType: 'investment' }
  ]
  const liabilities = [
    { amount: 10000, currency: 'ZAR' }
  ]
  const result = calculateNetWorth(assets, liabilities, settings)
  expect(result.netWorth).toBe(40000)
})
```

### Component Tests
Test UI components:
```javascript
// Example: Dashboard.test.jsx
test('Dashboard displays net worth', () => {
  render(<Dashboard />)
  expect(screen.getByText(/Net Worth/i)).toBeInTheDocument()
  expect(screen.getByText(/R 29,700,000/i)).toBeInTheDocument()
})
```

### Integration Tests
Test complete workflows:
```javascript
test('Creating a scenario and running it works', async () => {
  render(<App />)

  // Navigate to scenarios
  await userEvent.click(screen.getByText('Scenarios'))

  // Create new scenario
  await userEvent.click(screen.getByText('+ New'))
  await userEvent.type(screen.getByLabelText('Name'), 'Test Scenario')
  await userEvent.type(screen.getByLabelText('Nominal Return'), '9')
  await userEvent.click(screen.getByText('Save'))

  // Run scenario
  await userEvent.click(screen.getByText('Run'))

  // Verify results
  expect(screen.getByText(/Final Value/i)).toBeInTheDocument()
})
```

## Known Issues to Address

### From Current Implementation
1. **Scenario expense withdrawal** - Ensure expenses are properly deducted
2. **Chrome compatibility** - Verify all fixes work across browsers
3. **Pre-retirement income** - Confirm income is added correctly
4. **Market crash age vs year** - Clear labeling to avoid confusion
5. **Settings initialization** - Ensure settings never null/undefined

### New Considerations
1. **Performance with large datasets** - Test with 100+ assets
2. **Data validation** - Prevent invalid inputs
3. **Error recovery** - Handle corrupted localStorage gracefully
4. **Undo/redo** - Consider adding for better UX
5. **Mobile responsiveness** - Current version desktop-only

## Success Criteria

**The migration is successful when:**

✅ All features from current version work in new version
✅ All existing data can be imported without loss
✅ Calculations produce identical results
✅ No browser-specific bugs
✅ Faster performance (no full page re-renders)
✅ Scenarios correctly model expense withdrawals
✅ Automated tests pass
✅ Code is maintainable (modular, documented)
✅ User experience is equal or better

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Calculation discrepancies | High | Write tests comparing old vs new results |
| Data loss during migration | High | Export backup before migration, test import thoroughly |
| Longer than expected | Medium | Build incrementally, validate each phase |
| Learning curve too steep | Medium | Start with simple components, gradually increase complexity |
| Browser compatibility issues | Medium | Test in Safari/Chrome throughout development |
| Performance regressions | Low | Monitor with React DevTools, optimize as needed |

## Resources & References

### Documentation
- React: https://react.dev
- Vite: https://vitejs.dev
- Zustand: https://github.com/pmndrs/zustand
- Chart.js: https://www.chartjs.org
- Vitest: https://vitest.dev

### Learning
- React Tutorial: https://react.dev/learn
- Modern JS: https://javascript.info
- ES6 Features: https://es6-features.org

## Notes

### Design Decisions

**Why React over Vue/Svelte?**
- Larger ecosystem and community
- Better tooling (DevTools, testing libraries)
- More resources for learning
- Industry standard

**Why Zustand over Redux?**
- Simpler API, less boilerplate
- Good enough for this app size
- Easy to learn
- Can migrate to Redux later if needed

**Why Vite over Create React App?**
- Much faster dev server
- Faster builds
- Modern defaults (ES modules)
- Better DX overall

**Why keep localStorage?**
- Current implementation works well
- No need for backend
- Simple to migrate
- Can upgrade to IndexedDB later if needed

### Future Enhancements (Post-Migration)

**Nice to have but not required:**
- TypeScript for better type safety
- PWA for offline support
- Mobile app (React Native)
- Cloud sync (Firebase/Supabase)
- PDF report generation
- Historical tracking (time-series data)
- Goal-based planning
- Monte Carlo simulations
- Integration with investment platforms
- Multi-currency real-time rates
- Tax optimization suggestions

## Changelog

**2026-01-11**
- Initial planning document created
- Current architecture documented
- Migration phases defined
- Data models specified
