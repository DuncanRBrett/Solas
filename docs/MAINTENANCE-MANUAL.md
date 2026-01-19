# Solas Maintenance Manual

**Version 3.0** | Developer Documentation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [State Management](#state-management)
5. [Data Models](#data-models)
6. [Key Services](#key-services)
7. [Adding New Features](#adding-new-features)
8. [Common Maintenance Tasks](#common-maintenance-tasks)
9. [Testing](#testing)
10. [Build and Deployment](#build-and-deployment)
11. [Known Issues and Limitations](#known-issues-and-limitations)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Solas is a single-page React application that runs entirely in the browser. All data is stored in localStorage - there is no backend server.

### Key Design Principles

1. **Client-side only** - No server dependency
2. **Multi-profile support** - Multiple independent data sets
3. **Modular components** - Each feature is self-contained
4. **Pure calculations** - Business logic separated from UI
5. **Persistent settings** - User preferences saved automatically

### Data Flow

```
User Input → Component → Store Action → State Update → localStorage → UI Re-render
```

---

## Project Structure

```
solas-v3-app/
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Root component, routing
│   │
│   ├── components/
│   │   ├── Dashboard/           # Net worth, charts, alerts
│   │   ├── Assets/              # Asset management
│   │   ├── Liabilities/         # Debt tracking
│   │   ├── Income/              # Income sources
│   │   ├── Expenses/            # Expense categories
│   │   ├── Scenarios/           # Retirement projections
│   │   ├── Fees/                # Fee analysis
│   │   ├── Settings/            # Configuration
│   │   └── shared/              # Reusable components
│   │
│   ├── store/
│   │   ├── useStore.js          # Zustand store (main)
│   │   └── historySlice.js      # Undo/redo functionality
│   │
│   ├── services/
│   │   ├── scenarioCalculations.js  # Retirement projections
│   │   ├── feeCalculations.js       # Fee analysis
│   │   └── validation.js            # Input validation
│   │
│   ├── models/
│   │   ├── defaults.js          # Default values, constants
│   │   └── validation.js        # Schema definitions
│   │
│   ├── utils/
│   │   ├── calculations.js      # Currency conversion, formatting
│   │   ├── migrations.js        # Data version upgrades
│   │   ├── backup.js            # Auto-backup system
│   │   └── debounce.js          # Performance utilities
│   │
│   └── styles/                  # Global CSS
│
├── docs/                        # Documentation
├── public/                      # Static assets
└── dist/                        # Production build
```

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool, dev server |
| Zustand | 4.x | State management |
| Chart.js | 4.x | Charts and graphs |
| react-chartjs-2 | 5.x | React Chart.js wrapper |
| react-hot-toast | 2.x | Notifications |
| xlsx | 0.18.x | Excel export |

### Why These Choices

- **React** - Mature ecosystem, component-based
- **Vite** - Fast dev server, efficient builds
- **Zustand** - Simpler than Redux, sufficient for this app size
- **Chart.js** - Full-featured, well-documented

---

## State Management

### Zustand Store

The main store is in `src/store/useStore.js`. It manages:

- Current profile data
- Profile list
- All CRUD operations
- Persistence to localStorage

### Store Structure

```javascript
{
  currentProfileName: string,
  profiles: string[],           // List of profile names
  profile: {
    name: string,
    assets: Asset[],
    liabilities: Liability[],
    income: Income[],
    expenses: Expense[],
    expenseCategories: ExpenseCategory[],
    scenarios: Scenario[],
    settings: Settings,
  },
  initError: string | null,
}
```

### Key Store Methods

```javascript
// Profile management
init()                          // Load from localStorage
switchProfile(name)             // Change active profile
createProfile(name)             // New profile
deleteProfile(name)             // Remove profile

// Data operations
addAsset(asset)                 // Add with validation
updateAsset(id, updates)        // Update with validation
deleteAsset(id)                 // Remove asset

// Settings
updateSettings(newSettings)     // Merge settings
```

### Persistence

- `saveProfile()` - Debounced save (1 second delay)
- `saveProfileImmediate()` - Immediate save (critical operations)
- `flushSave()` - Force pending saves

### Validation

All data is validated before save using Zod schemas:

```javascript
const result = validateData(AssetSchema, asset);
if (!result.success) {
  return { success: false, errors: result.errors };
}
```

---

## Data Models

### Asset

```javascript
{
  id: string,                   // UUID
  name: string,
  assetClass: string,           // 'Offshore Equity', 'SA Equity', etc.
  assetType: string,            // 'Investible' or 'Non-Investible'
  accountType: string,          // 'Taxable', 'TFSA', 'RA'
  currency: string,             // 'ZAR', 'USD', etc.
  platform: string,             // Where held
  units: number,
  currentPrice: number,
  costPrice: number,
  dividendYield: number,        // % (net after withholding)
  interestYield: number,        // % (gross)
  ter: number,                  // % (Total Expense Ratio)
  lastUpdated: string,          // ISO date
}
```

### Scenario

```javascript
{
  id: string,
  name: string,
  description: string,

  // Assumptions
  inflationRate: number,        // %
  retirementAge: number,
  lifeExpectancy: number,
  monthlySavings: number,
  useExpensesModule: boolean,
  annualExpenses: number,       // If not using expenses module

  // Returns
  useCustomReturns: boolean,
  expectedReturns: {            // Per asset class
    'Offshore Equity': number,
    // ...
  },

  // Currency movement
  useCurrencyMovement: boolean,
  currencyMovement: {
    USD: number,                // % p.a.
    EUR: number,
    GBP: number,
  },

  // Expense phases
  useCustomExpensePhases: boolean,
  expensePhases: {
    working: { ageStart, ageEnd, percentage },
    activeRetirement: { ... },
    slowerPace: { ... },
    laterYears: { ... },
  },

  // Shocks
  marketCrashes: [
    { age: number, description: string, assetClassDrops: { ... } }
  ],
  unexpectedExpenses: [
    { age: number, amount: number, description: string }
  ],

  // Results (after running)
  results: { ... },
  lastRun: string,              // ISO date
}
```

### Settings

```javascript
{
  profile: {
    age: number,
    marginalTaxRate: number,    // %
    retirementAge: number,
    lifeExpectancy: number,
    monthlySavings: number,
    expectedInflation: number,  // %
    incomeGrowth: number,       // %
  },

  reportingCurrency: string,
  enabledCurrencies: string[],
  exchangeRates: { ... },

  expectedReturns: { ... },     // Per asset class
  targetAllocation: { ... },    // Per asset class (%)

  lifePhases: { ... },          // 4 phases with percentages

  thresholds: { ... },          // Concentration warnings

  platforms: [ ... ],           // Fee structures
  advisorFee: { ... },          // Advisor fee config

  uiPreferences: {              // Persisted UI state
    fees: {
      projectionYears: number,
      inflationRate: number,
      portfolioGrowthRate: number,
    },
    scenarios: {
      defaultCurrencyMovement: { ... },
      defaultCrashAssetClasses: string[],
    },
  },
}
```

---

## Key Services

### Scenario Calculations (`services/scenarioCalculations.js`)

The main retirement projection engine.

```javascript
runScenario(scenario, profile) → results
```

**Algorithm:**
1. Initialize portfolio value from current assets
2. For each year from current age to life expectancy:
   - Pre-retirement: Add savings, apply returns
   - Post-retirement: Calculate expenses, apply phase multipliers
   - Deduct expense shortfall from portfolio
   - Apply market crashes (if any)
   - Deduct unexpected expenses (if any)
   - Calculate taxes on withdrawals
3. Return trajectory and success/failure

**Key considerations:**
- Weighted returns based on actual asset allocation
- CGT on taxable accounts
- Tax-free withdrawals from TFSA
- Income tax on RA withdrawals

### Fee Calculations (`services/feeCalculations.js`)

Analyzes investment fees.

```javascript
calculateTotalAnnualFees(assets, settings) → fees
calculateLifetimeFees(assets, settings, years, inflation, growth) → projection
```

**Fee types handled:**
- Platform fees (flat, percentage, tiered)
- Advisor fees (percentage or fixed)
- TER (informational only)

### Validation (`models/validation.js`)

Zod schemas for all data types.

```javascript
validateData(schema, data) → { success, data?, errors? }
formatValidationErrors(errors) → string
```

---

## Adding New Features

### Adding a New Asset Field

1. **Update schema** (`models/validation.js`):
   ```javascript
   export const AssetSchema = z.object({
     // ...existing fields
     newField: z.number().default(0),
   });
   ```

2. **Update defaults** (`models/defaults.js`):
   ```javascript
   export const createDefaultAsset = () => ({
     // ...existing fields
     newField: 0,
   });
   ```

3. **Update migration** (`utils/migrations.js`):
   ```javascript
   // In migrateAsset function
   if (asset.newField === undefined) {
     asset.newField = 0;
   }
   ```

4. **Update UI** (`components/Assets/AssetModal.jsx`):
   - Add form field
   - Handle onChange

### Adding a New Setting

1. **Update defaults** (`models/defaults.js`):
   ```javascript
   export const DEFAULT_SETTINGS = {
     // ...existing
     newSetting: defaultValue,
   };
   ```

2. **Update migration** (`utils/migrations.js`):
   ```javascript
   // In migrateSettings function
   if (settings.newSetting === undefined) {
     settings.newSetting = DEFAULT_SETTINGS.newSetting;
   }
   ```

3. **Update UI** (`components/Settings/`):
   - Add form control
   - Call `updateSettings({ newSetting: value })`

### Adding a New Component/Page

1. Create component directory:
   ```
   src/components/NewFeature/
   ├── NewFeature.jsx
   ├── NewFeature.css
   └── SubComponent.jsx
   ```

2. Add to routing (`App.jsx`):
   ```javascript
   const routes = {
     // ...existing
     newfeature: NewFeature,
   };
   ```

3. Add to navigation (`components/shared/Navigation.jsx`)

---

## Common Maintenance Tasks

### Updating Exchange Rates

Default rates are in `models/defaults.js`:

```javascript
export const DEFAULT_EXCHANGE_RATES = {
  USD: 18.50,
  EUR: 19.80,
  GBP: 23.20,
};
```

Users override these in Settings.

### Updating Tax Rates

Tax configuration is in `models/defaults.js`:

```javascript
export const DEFAULT_SETTINGS = {
  taxConfig: {
    taxYear: '2025/2026',
    incomeTaxBrackets: [ ... ],
    taxRebates: { ... },
    cgt: { ... },
  },
};
```

### Adding a New Platform

1. Add to `DEFAULT_SETTINGS.platforms`:
   ```javascript
   {
     id: 'newplatform',
     name: 'New Platform',
     feeStructure: {
       type: 'percentage',  // or 'tiered-percentage' or 'fixed'
       rate: 0.50,          // 0.50% p.a.
     }
   }
   ```

2. Add to `DEFAULT_PLATFORMS` array

### Adding a New Currency

1. Add to `ALL_CURRENCIES`:
   ```javascript
   TWD: { symbol: 'NT$', name: 'Taiwan Dollar' },
   ```

2. Add default exchange rate:
   ```javascript
   export const DEFAULT_EXCHANGE_RATES = {
     // ...existing
     TWD: 0.58,  // 1 TWD = 0.58 ZAR
   };
   ```

---

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage
```

### Test Structure

```
src/__tests__/
├── services/
│   ├── calculations.test.js
│   └── scenarios.test.js
└── components/
    └── Dashboard.test.jsx
```

### Writing Tests

```javascript
import { describe, it, expect } from 'vitest';
import { calculateNetWorth } from '../services/calculations';

describe('calculateNetWorth', () => {
  it('should calculate correctly with assets and liabilities', () => {
    const assets = [{ units: 100, currentPrice: 500, ... }];
    const liabilities = [{ principal: 10000, ... }];
    const result = calculateNetWorth(assets, liabilities, settings);
    expect(result.netWorth).toBe(40000);
  });
});
```

---

## Build and Deployment

### Development

```bash
npm install           # Install dependencies
npm run dev           # Start dev server (localhost:5173)
```

### Production Build

```bash
npm run build         # Build to dist/
npm run preview       # Preview build locally
```

### Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── (other static assets)
```

### Deployment Options

1. **Static hosting** (Netlify, Vercel, GitHub Pages)
   - Upload `dist/` folder
   - No server required

2. **Local file**
   - Open `dist/index.html` directly
   - May need to adjust base path in `vite.config.js`

---

## Known Issues and Limitations

### Data Storage

- **localStorage limit** - ~5-10MB depending on browser
- **No sync** - Data is device/browser specific
- **No encryption** - Data stored in plain text

### Calculations

- **Tax estimates** - Simplified, consult tax professional
- **Returns are estimates** - Actual returns vary
- **Inflation is constant** - Real inflation fluctuates

### Browser Support

- **Modern browsers only** - Chrome 90+, Firefox 90+, Safari 14+
- **No IE support**
- **Mobile responsive** but desktop preferred

### Known Bugs

1. **Safari date handling** - Some date inputs may behave differently
2. **Large portfolios** - Performance may degrade with 100+ assets

---

## Troubleshooting

### "Profile data was corrupted"

1. Check localStorage in browser dev tools
2. Look for `solas_profile_[name]` keys
3. Try parsing the JSON manually
4. Restore from backup if available

### Calculations don't match expected

1. Verify exchange rates are current
2. Check asset types (Investible vs Non-Investible)
3. Confirm income age ranges
4. Review expense phase percentages

### Store not updating

1. Check browser console for errors
2. Verify Zustand store methods return correctly
3. Check validation errors

### Build fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Dev server not starting

```bash
# Check port availability
lsof -i :5173
# Kill process if needed
kill -9 [PID]
# Restart
npm run dev
```

---

## Code Quality Standards

### Component Structure

```javascript
function ComponentName() {
  // 1. Store hooks
  const { profile, updateSettings } = useStore();

  // 2. Local state
  const [isOpen, setIsOpen] = useState(false);

  // 3. Derived values / memos
  const total = useMemo(() => /* ... */, [deps]);

  // 4. Effects
  useEffect(() => { /* ... */ }, [deps]);

  // 5. Handlers
  const handleClick = () => { /* ... */ };

  // 6. Render
  return ( /* JSX */ );
}
```

### CSS Conventions

- BEM-like naming: `.component__element--modifier`
- Component-specific CSS files
- CSS variables for theming

### Commit Messages

```
type: short description

Longer description if needed.

Types: feat, fix, refactor, docs, style, test
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Jan 2025 | React migration, modular architecture |
| 2.x | 2024 | Single-file HTML version |

---

## Contact

This is a personal project. For maintenance:
- Review this documentation
- Check source code comments
- Test changes thoroughly before deploying

---

*Last updated: January 2025*
