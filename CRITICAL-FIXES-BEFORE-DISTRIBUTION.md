# CRITICAL FIXES BEFORE DISTRIBUTION

## ⚠️ DO NOT DISTRIBUTE UNTIL THESE ARE FIXED

These issues could cause **data loss**, **incorrect financial calculations**, or **app crashes** for your users.

---

## 1. AUTOMATIC DATA BACKUPS (CRITICAL - Data Loss Risk)

**Problem**: If user clears browser cache, all data is lost forever.

**Fix**: Add automatic versioned backups

```javascript
// src/store/useStore.js

// Update the saveProfile function:
saveProfile: () => {
  const { currentProfileName, profile } = get();

  if (!profile) return;

  // Add timestamp and version to profile
  profile.updatedAt = new Date().toISOString();
  profile.version = '3.0.0';

  // Save main profile
  const mainKey = `solas_profile_${currentProfileName}`;
  localStorage.setItem(mainKey, JSON.stringify(profile));

  // Create timestamped backup
  const backupKey = `solas_backup_${currentProfileName}_${Date.now()}`;
  localStorage.setItem(backupKey, JSON.stringify(profile));

  // Keep only last 5 backups to avoid filling storage
  const allKeys = Object.keys(localStorage);
  const backups = allKeys
    .filter(k => k.startsWith(`solas_backup_${currentProfileName}_`))
    .sort() // Older timestamps come first
    .reverse(); // Newest first

  // Delete old backups (keep only 5 most recent)
  backups.slice(5).forEach(oldBackup => {
    localStorage.removeItem(oldBackup);
  });
},

// Add recovery function
getBackups: () => {
  const { currentProfileName } = get();
  const allKeys = Object.keys(localStorage);

  return allKeys
    .filter(k => k.startsWith(`solas_backup_${currentProfileName}_`))
    .map(key => {
      const timestamp = parseInt(key.split('_').pop());
      return {
        key,
        date: new Date(timestamp),
        displayDate: new Date(timestamp).toLocaleString(),
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
},

recoverFromBackup: (backupKey) => {
  try {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      alert('Backup not found');
      return false;
    }

    const profile = JSON.parse(backupData);
    set({ profile });
    get().saveProfile(); // Save as current

    return true;
  } catch (error) {
    console.error('Recovery failed:', error);
    alert('Failed to recover backup: ' + error.message);
    return false;
  }
},
```

**Add UI in Settings component**:
```jsx
// In Settings.jsx, add a "Data Recovery" section:

<div className="settings-section">
  <h3>💾 Data Recovery</h3>

  <button onClick={() => {
    const backups = getBackups();
    if (backups.length === 0) {
      alert('No backups found');
      return;
    }

    // Show backup list
    setShowBackupList(true);
  }}>
    View Available Backups ({getBackups().length})
  </button>

  {showBackupList && (
    <div className="backup-list">
      <h4>Available Backups:</h4>
      {getBackups().map(backup => (
        <div key={backup.key} className="backup-item">
          <span>{backup.displayDate}</span>
          <button onClick={() => {
            if (confirm('Restore this backup? Current data will be replaced.')) {
              recoverFromBackup(backup.key);
              alert('Backup restored successfully!');
              setShowBackupList(false);
            }
          }}>
            Restore
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 2. INPUT VALIDATION (CRITICAL - Bad Data Risk)

**Problem**: Users can enter invalid data that breaks calculations.

**Fix**: Install and configure Zod for validation

```bash
npm install zod
```

```javascript
// src/models/validation.js (new file)

import { z } from 'zod';

// Asset validation schema
export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100),
  units: z.number().positive('Units must be positive'),
  currentPrice: z.number().nonnegative('Price cannot be negative'),
  costPrice: z.number().nonnegative('Cost price cannot be negative'),
  currency: z.enum(['ZAR', 'USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD']),
  assetClass: z.enum([
    'Offshore Equity',
    'SA Equity',
    'SA Bonds',
    'Offshore Bonds',
    'Cash',
    'Property',
    'Crypto'
  ]),
  assetType: z.enum(['Investible', 'Non-Investible']),
  accountType: z.enum(['TFSA', 'Taxable', 'RA']),
  lastUpdated: z.string().datetime(),
  dividendYield: z.number().min(0).max(100).optional(),
  interestYield: z.number().min(0).max(100).optional(),
});

// Profile validation schema
export const ProfileSettingsSchema = z.object({
  age: z.number().int().min(0).max(120),
  marginalTaxRate: z.number().min(0).max(100),
  retirementAge: z.number().int().min(0).max(120),
  lifeExpectancy: z.number().int().min(0).max(150),
  monthlySavings: z.number().nonnegative(),
  annualExpenses: z.number().nonnegative(),
}).refine(data => data.retirementAge >= data.age, {
  message: 'Retirement age must be greater than current age',
  path: ['retirementAge'],
}).refine(data => data.lifeExpectancy >= data.retirementAge, {
  message: 'Life expectancy must be greater than retirement age',
  path: ['lifeExpectancy'],
});

// Validate before adding/updating
export const validateAsset = (asset) => {
  try {
    return AssetSchema.parse(asset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      throw new Error(`Invalid asset data: ${messages}`);
    }
    throw error;
  }
};

export const validateProfileSettings = (settings) => {
  try {
    return ProfileSettingsSchema.parse(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid settings: ${messages}`);
    }
    throw error;
  }
};
```

**Update store to use validation**:
```javascript
// src/store/useStore.js

import { validateAsset, validateProfileSettings } from '../models/validation';

// Update addAsset:
addAsset: (asset) => {
  try {
    const validatedAsset = validateAsset(asset);
    set((state) => ({
      profile: {
        ...state.profile,
        assets: [...state.profile.assets, validatedAsset],
      },
    }));
    get().saveProfile();
  } catch (error) {
    alert(error.message);
    throw error;
  }
},

// Update updateSettings:
updateSettings: (newSettings) => {
  try {
    const validatedSettings = validateProfileSettings(newSettings.profile);
    set((state) => ({
      profile: {
        ...state.profile,
        settings: {
          ...state.profile.settings,
          ...newSettings,
          profile: validatedSettings
        },
      },
    }));
    get().saveProfile();
  } catch (error) {
    alert(error.message);
    throw error;
  }
},
```

---

## 3. REPLACE ALL ALERTS (HIGH - UX Issue)

**Problem**: 29 uses of alert() and confirm() - very unprofessional.

**Fix**: Install a toast library and replace alerts

```bash
npm install react-hot-toast
```

```javascript
// src/App.jsx - Add toast provider

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#fff',
            },
          },
        }}
      />
      {/* rest of app */}
    </div>
  );
}
```

**Replace alerts throughout codebase**:
```javascript
// OLD:
alert('Profile already exists');

// NEW:
import toast from 'react-hot-toast';
toast.error('Profile already exists');

// OLD:
alert('Settings saved successfully!');

// NEW:
toast.success('Settings saved successfully!');

// OLD:
if (confirm('Are you sure you want to delete this asset?')) {
  deleteAsset(id);
}

// NEW:
// Create a custom confirm dialog component
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="confirm-dialog">
    <p>{message}</p>
    <button onClick={onConfirm}>Yes</button>
    <button onClick={onCancel}>Cancel</button>
  </div>
);

// Use it:
toast((t) => (
  <div>
    <p>Are you sure you want to delete this asset?</p>
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <button onClick={() => {
        deleteAsset(id);
        toast.dismiss(t.id);
        toast.success('Asset deleted');
      }}>
        Yes, delete
      </button>
      <button onClick={() => toast.dismiss(t.id)}>
        Cancel
      </button>
    </div>
  </div>
), { duration: Infinity });
```

**Search and replace all 29 instances**:
```bash
# Find all alerts
grep -rn "alert\|confirm" src/

# Files to update:
# - src/store/useStore.js (4 instances)
# - src/components/Settings/Settings.jsx (8 instances)
# - src/components/Assets/Assets.jsx (1 instance)
# - src/components/Liabilities/Liabilities.jsx (1 instance)
# - src/components/Income/Income.jsx (1 instance)
# - src/components/Expenses/ExpensesV2.jsx (5 instances)
# - src/components/Expenses/AgeBasedExpensePlanning.jsx (1 instance)
# - src/components/Scenarios/Scenarios.jsx (1 instance)
# - src/services/expenseImportExport.js (1 instance)
```

---

## 4. CALCULATION VERIFICATION (CRITICAL - Accuracy Risk)

**Problem**: No tests = no confidence that retirement calculations are correct.

**Fix**: Create reference test cases with known correct answers

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

```javascript
// vitest.config.js (new file)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

```javascript
// src/test/setup.js (new file)
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

```javascript
// src/services/__tests__/scenarioCalculations.test.js (new file)

import { describe, it, expect } from 'vitest';
import { runScenario } from '../scenarioCalculations';

describe('Retirement Scenario Calculations', () => {
  it('calculates simple scenario correctly', () => {
    // Reference case: R1,000,000 portfolio, 9% return, 4.5% inflation
    // Retire at 65, live to 90, need R30,000/month

    const profile = {
      assets: [
        {
          id: '1',
          name: 'Test Portfolio',
          units: 1,
          currentPrice: 1000000,
          costPrice: 1000000,
          currency: 'ZAR',
          assetType: 'Investible',
          assetClass: 'Offshore Equity',
          accountType: 'Taxable',
        }
      ],
      liabilities: [],
      income: [],
      expenses: [],
      settings: {
        reportingCurrency: 'ZAR',
        exchangeRates: { USD: 18.5, EUR: 19.8, GBP: 23.2 },
        profile: {
          age: 55,
          marginalTaxRate: 39,
          retirementAge: 65,
          lifeExpectancy: 90,
          monthlySavings: 0,
          annualExpenses: 360000, // R30k/month
        },
      },
    };

    const scenario = {
      id: 'test',
      name: 'Test Scenario',
      marketReturn: 9.0,
      inflationRate: 4.5,
      retirementAge: 65,
      lifeExpectancy: 90,
      monthlySavings: 0,
      useExpensesModule: false,
      annualExpenses: 360000,
      marketCrashes: [],
      unexpectedExpenses: [],
    };

    const result = runScenario(scenario, profile);

    // Verify basic properties
    expect(result).toHaveProperty('trajectory');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('finalValue');

    // Verify trajectory length
    expect(result.trajectory.length).toBe(36); // 55 to 90 = 36 years

    // Verify growth during accumulation phase (age 55-64)
    const ageAt64 = result.trajectory.find(t => t.age === 64);
    expect(ageAt64.netWorth).toBeGreaterThan(1000000); // Should grow

    // Verify positive outcome (should not run out of money)
    expect(result.success).toBe(true);
    expect(result.finalValue).toBeGreaterThan(0);

    // Real return should be approximately 4.5% (9% - 4.5% inflation)
    expect(result.metrics.realReturn).toBeCloseTo(4.3, 1);
  });

  it('handles market crash correctly', () => {
    const profile = { /* same as above */ };
    const scenario = {
      /* same as above */
      marketCrashes: [
        { age: 66, dropPercentage: 30, description: 'Market crash' }
      ],
    };

    const result = runScenario(scenario, profile);

    // Should still succeed (scenario is conservative)
    expect(result.success).toBe(true);

    // Net worth at 66 should reflect the crash
    const age66 = result.trajectory.find(t => t.age === 66);
    const age65 = result.trajectory.find(t => t.age === 65);

    // Should be significantly lower
    expect(age66.netWorth).toBeLessThan(age65.netWorth * 0.8);
  });

  it('detects portfolio depletion', () => {
    const profile = { /* same but smaller portfolio */ };
    profile.assets[0].currentPrice = 100000; // Only R100k

    const scenario = {
      /* same expenses R360k/year - will deplete quickly */
    };

    const result = runScenario(scenario, profile);

    expect(result.success).toBe(false);
    expect(result.depletionAge).toBeLessThan(90);
    expect(result.finalValue).toBe(0);
  });
});
```

**Update package.json**:
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

**Run tests before every distribution**:
```bash
npm test
```

---

## 5. LOCALSTORAGE QUOTA HANDLING (HIGH - Crash Risk)

**Problem**: If user exceeds 10MB localStorage limit, app crashes.

**Fix**: Monitor and handle quota

```javascript
// src/utils/storage.js (new file)

export const getStorageInfo = () => {
  let used = 0;

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  const limit = 10 * 1024 * 1024; // 10MB typical limit

  return {
    used,
    usedMB: (used / 1024 / 1024).toFixed(2),
    limit,
    limitMB: (limit / 1024 / 1024).toFixed(0),
    percentUsed: ((used / limit) * 100).toFixed(1),
    remaining: limit - used,
    remainingMB: ((limit - used) / 1024 / 1024).toFixed(2),
  };
};

export const isStorageNearLimit = () => {
  const info = getStorageInfo();
  return parseFloat(info.percentUsed) > 80;
};

export const cleanOldBackups = (profileName, keepCount = 3) => {
  const allKeys = Object.keys(localStorage);
  const backups = allKeys
    .filter(k => k.startsWith(`solas_backup_${profileName}_`))
    .sort()
    .reverse();

  const toDelete = backups.slice(keepCount);
  toDelete.forEach(key => localStorage.removeItem(key));

  return toDelete.length;
};

export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try to free up space
      console.log('Storage quota exceeded, cleaning up...');

      // Get current profile name to clean its backups
      const currentProfile = JSON.parse(localStorage.getItem('solas_profiles') || '[]')[0];
      const deleted = cleanOldBackups(currentProfile, 2);

      if (deleted > 0) {
        // Try again
        try {
          localStorage.setItem(key, value);
          console.log(`Freed up space by deleting ${deleted} old backups`);
          return true;
        } catch (retryError) {
          console.error('Still not enough space after cleanup');
          throw new Error(
            'Storage full. Please export your data and delete old profiles.'
          );
        }
      } else {
        throw new Error(
          'Storage full and no old backups to clean. Please export and reset.'
        );
      }
    }
    throw error;
  }
};
```

**Update store to use safe storage**:
```javascript
// src/store/useStore.js

import { safeSetItem, getStorageInfo } from '../utils/storage';

saveProfile: () => {
  const { currentProfileName, profile } = get();

  try {
    const data = JSON.stringify(profile);
    safeSetItem(`solas_profile_${currentProfileName}`, data);

    // Create backup
    const backupKey = `solas_backup_${currentProfileName}_${Date.now()}`;
    safeSetItem(backupKey, data);
  } catch (error) {
    toast.error(error.message);
    throw error;
  }
},
```

**Add storage monitor to Settings**:
```jsx
// In Settings.jsx

import { getStorageInfo, isStorageNearLimit } from '../../utils/storage';

const StorageMonitor = () => {
  const info = getStorageInfo();
  const isNearLimit = isStorageNearLimit();

  return (
    <div className={`storage-info ${isNearLimit ? 'warning' : ''}`}>
      <h4>💾 Storage Usage</h4>
      <div className="storage-bar">
        <div
          className="storage-fill"
          style={{ width: `${info.percentUsed}%` }}
        />
      </div>
      <p>
        {info.usedMB} MB / {info.limitMB} MB ({info.percentUsed}% used)
      </p>
      {isNearLimit && (
        <div className="warning">
          ⚠️ Storage is {info.percentUsed}% full.
          Consider exporting and cleaning up old data.
        </div>
      )}
    </div>
  );
};
```

---

## 6. ERROR BOUNDARIES (HIGH - Crash Prevention)

**Problem**: Unhandled errors crash the entire app.

**Fix**: Add React Error Boundaries

```javascript
// src/components/ErrorBoundary.jsx (new file)

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Log to error monitoring service (if you add one)
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <h1>😔 Something went wrong</h1>
          <p>The app encountered an unexpected error.</p>

          <div className="error-actions">
            <button onClick={() => window.location.reload()}>
              Reload App
            </button>

            <button onClick={() => {
              // Try to recover last backup
              const profiles = JSON.parse(
                localStorage.getItem('solas_profiles') || '[]'
              );
              if (profiles.length > 0) {
                const backups = Object.keys(localStorage)
                  .filter(k => k.startsWith(`solas_backup_${profiles[0]}`))
                  .sort()
                  .reverse();

                if (backups.length > 0) {
                  const backup = localStorage.getItem(backups[0]);
                  localStorage.setItem(
                    `solas_profile_${profiles[0]}`,
                    backup
                  );
                  window.location.reload();
                }
              }
            }}>
              Restore Last Backup
            </button>

            <button onClick={() => {
              // Export current state for debugging
              const data = {};
              for (let key in localStorage) {
                if (key.startsWith('solas_')) {
                  data[key] = localStorage[key];
                }
              }

              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `solas-error-dump-${Date.now()}.json`;
              a.click();
            }}>
              Export Data for Support
            </button>
          </div>

          <details className="error-details">
            <summary>Technical Details</summary>
            <pre>{this.state.error?.toString()}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>

          <p className="error-help">
            If this keeps happening, please contact support with the exported data.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Wrap app in error boundary**:
```javascript
// src/main.jsx

import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

## Summary Checklist

Before you send Solas to anyone:

- [ ] ✅ Automatic backups implemented (keeps last 5 versions)
- [ ] ✅ Input validation added (Zod schemas)
- [ ] ✅ All 29 alerts replaced with toast notifications
- [ ] ✅ Tests written for critical calculations
- [ ] ✅ localStorage quota handling implemented
- [ ] ✅ Error boundaries added
- [ ] ✅ Storage monitor added to Settings
- [ ] ✅ Backup recovery UI added to Settings
- [ ] ✅ Tested in clean browser (no data)
- [ ] ✅ Tested import/export workflow
- [ ] ✅ Tested with 100+ assets (performance)
- [ ] ✅ Verified calculations match manual calculations
- [ ] ✅ Added disclaimer about accuracy
- [ ] ✅ Created README for users

**Estimated time**: 2-3 days of focused work

**Priority order**:
1. Automatic backups (2-3 hours) - CRITICAL
2. Replace alerts (1-2 hours) - HIGH
3. Input validation (2-3 hours) - HIGH
4. localStorage quota (1-2 hours) - HIGH
5. Error boundaries (1 hour) - HIGH
6. Tests (4-6 hours) - CRITICAL but can be incremental

**After these fixes**: Your app will be safe to distribute confidently.

**Without these fixes**: You WILL get angry users who lost their financial data or got wrong retirement projections.

Choose wisely! 🚨
