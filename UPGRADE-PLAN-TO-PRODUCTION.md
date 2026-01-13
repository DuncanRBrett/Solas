---
editor_options: 
  markdown: 
    wrap: 72
---

# Solas v3: Upgrade Plan from B+ to A+ Production Quality

## Executive Summary

**Current State**: B+ - Solid architecture, comprehensive features, but
lacks verification and robustness **Target State**: A+ - Bulletproof,
production-ready, trustworthy financial planning tool **Approach**:
Incremental upgrades, never breaking the working app **Timeline**: 6-8
weeks of focused work

------------------------------------------------------------------------

## Guiding Principles

1.  ✅ **Never break the working app** - All changes in branches, tested
    before merge
2.  ✅ **Incremental improvements** - Small PRs, continuous deployment
3.  ✅ **Test everything** - No code ships without tests
4.  ✅ **Document limitations** - Warning banners for unverified
    features
5.  ✅ **User data is sacred** - Multiple backups, migration paths,
    safety nets

------------------------------------------------------------------------

## Priority Matrix

| Priority | Area | Why Critical | Risk if Skipped |
|----------------|----------------|-------------------|-----------------------|
| **P0** | Data Safety | Users lose everything | 🔴 EXTREME - Data loss |
| **P0** | Calculation Accuracy | Wrong retirement advice | 🔴 EXTREME - Life impact |
| **P1** | Error Handling | App crashes | 🟡 HIGH - Bad UX |
| **P1** | Input Validation | Bad data breaks app | 🟡 HIGH - Corruption |
| **P2** | Tax Calculations | Incorrect tax estimates | 🟡 MEDIUM - Misleading |
| **P2** | Portfolio Quality | Poor investment advice | 🟡 MEDIUM - Suboptimal |
| **P3** | UX Polish | Unprofessional feel | 🟢 LOW - Perception |
| **P3** | Performance | Slow with large datasets | 🟢 LOW - Annoyance |

------------------------------------------------------------------------

## Phase 0: Foundation & Safety Net (Week 1)

**Goal**: Ensure we can't break anything and can recover if we do

### 0.1 Version Control & Branching Strategy

``` bash
# Set up Git properly
git init
git add .
git commit -m "Baseline: Working B+ version"
git tag v3.0.0-baseline

# Branch strategy
main          # Production-ready code only
develop       # Integration branch
feature/*     # Feature branches
hotfix/*      # Emergency fixes
```

**Acceptance Criteria**: - [ ] Git repository initialized - [ ] Baseline
commit tagged - [ ] .gitignore properly configured - [ ] All current
code committed

**Time**: 1 hour

------------------------------------------------------------------------

### 0.2 Automated Testing Infrastructure

``` bash
# Install testing tools
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @vitest/ui @vitest/coverage-v8
```

**Create test infrastructure**:

``` javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Package.json updates**:

``` json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest run --coverage"
  }
}
```

**Acceptance Criteria**: - [ ] Vitest configured and working - [ ] Can
run `npm test` without errors - [ ] Coverage reporting works - [ ] UI
test runner accessible

**Time**: 2 hours

------------------------------------------------------------------------

### 0.3 Continuous Integration Setup

**Create `.github/workflows/test.yml`**:

``` yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run tests
      run: npm run test:ci

    - name: Build
      run: npm run build

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
```

**Acceptance Criteria**: - [ ] GitHub Actions configured - [ ] Tests run
on every push - [ ] Build verified on every PR - [ ] Coverage tracked

**Time**: 1 hour

------------------------------------------------------------------------

### 0.4 Data Backup System (CRITICAL)

**Implement automatic versioned backups**:

``` javascript
// src/utils/backup.js (NEW FILE)

/**
 * Automatic backup system for Solas data
 *
 * Strategy:
 * 1. Save a timestamped backup on every profile save
 * 2. Keep last 10 backups per profile
 * 3. Compress old backups after 7 days
 * 4. Provide recovery UI
 */

export const BACKUP_CONFIG = {
  MAX_BACKUPS: 10,
  COMPRESSION_AGE_DAYS: 7,
  MAX_STORAGE_PERCENT: 80,
};

/**
 * Create a backup of the current profile
 */
export const createBackup = (profileName, profileData) => {
  const timestamp = Date.now();
  const backupKey = `solas_backup_${profileName}_${timestamp}`;

  const backup = {
    version: '3.0.0',
    timestamp,
    profileName,
    data: profileData,
    checksum: calculateChecksum(profileData),
  };

  try {
    localStorage.setItem(backupKey, JSON.stringify(backup));
    cleanOldBackups(profileName);
    return { success: true, backupKey };
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate checksum for data integrity verification
 */
const calculateChecksum = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

/**
 * Verify backup integrity
 */
export const verifyBackup = (backup) => {
  if (!backup.data || !backup.checksum) {
    return { valid: false, reason: 'Missing data or checksum' };
  }

  const calculatedChecksum = calculateChecksum(backup.data);
  if (calculatedChecksum !== backup.checksum) {
    return { valid: false, reason: 'Checksum mismatch - data corrupted' };
  }

  return { valid: true };
};

/**
 * Get all backups for a profile
 */
export const getBackups = (profileName) => {
  const allKeys = Object.keys(localStorage);
  const backupKeys = allKeys.filter(k =>
    k.startsWith(`solas_backup_${profileName}_`)
  );

  return backupKeys
    .map(key => {
      try {
        const backup = JSON.parse(localStorage.getItem(key));
        const verification = verifyBackup(backup);

        return {
          key,
          timestamp: backup.timestamp,
          date: new Date(backup.timestamp),
          displayDate: new Date(backup.timestamp).toLocaleString(),
          size: localStorage.getItem(key).length,
          isValid: verification.valid,
          invalidReason: verification.reason,
        };
      } catch (error) {
        return {
          key,
          timestamp: 0,
          isValid: false,
          invalidReason: 'Parse error',
        };
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Clean old backups, keeping only the most recent
 */
export const cleanOldBackups = (profileName) => {
  const backups = getBackups(profileName);
  const validBackups = backups.filter(b => b.isValid);

  // Keep MAX_BACKUPS most recent valid backups
  const toDelete = validBackups.slice(BACKUP_CONFIG.MAX_BACKUPS);

  toDelete.forEach(backup => {
    localStorage.removeItem(backup.key);
  });

  return toDelete.length;
};

/**
 * Restore from backup
 */
export const restoreFromBackup = (backupKey) => {
  try {
    const backupStr = localStorage.getItem(backupKey);
    if (!backupStr) {
      throw new Error('Backup not found');
    }

    const backup = JSON.parse(backupStr);
    const verification = verifyBackup(backup);

    if (!verification.valid) {
      throw new Error(`Backup corrupted: ${verification.reason}`);
    }

    return {
      success: true,
      data: backup.data,
      timestamp: backup.timestamp,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Export all backups for a profile
 */
export const exportAllBackups = (profileName) => {
  const backups = getBackups(profileName);
  const validBackups = backups.filter(b => b.isValid);

  const exportData = validBackups.map(backup => {
    const data = JSON.parse(localStorage.getItem(backup.key));
    return {
      timestamp: backup.timestamp,
      date: backup.displayDate,
      data: data.data,
    };
  });

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solas-${profileName}-backups-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
```

**Update store to use backup system**:

``` javascript
// src/store/useStore.js

import { createBackup } from '../utils/backup';

// Update saveProfile method
saveProfile: () => {
  const { currentProfileName, profile } = get();

  if (!profile) return;

  profile.updatedAt = new Date().toISOString();

  // Save main profile
  localStorage.setItem(
    `solas_profile_${currentProfileName}`,
    JSON.stringify(profile)
  );

  // Create automatic backup
  const result = createBackup(currentProfileName, profile);
  if (!result.success) {
    console.error('Backup failed:', result.error);
    // Don't fail the save, but log the error
  }
},
```

**Acceptance Criteria**: - [ ] Backup system implemented - [ ] Automatic
backups on every save - [ ] Checksum verification works - [ ] Can list
and restore backups - [ ] Old backups cleaned automatically - [ ] Tests
for backup system (90%+ coverage)

**Time**: 4 hours

------------------------------------------------------------------------

### 0.5 Data Migration System

**Handle version upgrades gracefully**:

``` javascript
// src/utils/migrations.js (NEW FILE)

const CURRENT_DATA_VERSION = '3.0.0';

/**
 * Migration registry
 * Each migration transforms data from one version to the next
 */
const migrations = {
  // Example: Migrate from 2.x to 3.0.0
  '2.x_to_3.0.0': (profile) => {
    return {
      ...profile,
      // Add new fields
      expenseCategories: profile.expenseCategories || [],
      ageBasedExpensePlan: profile.ageBasedExpensePlan || null,

      // Migrate old expense format
      expenses: profile.expenses?.map(e => ({
        ...e,
        frequency: e.frequency || 'Monthly',
        currency: e.currency || 'ZAR',
      })) || [],

      // Update settings format
      settings: {
        ...profile.settings,
        reportingCurrency: profile.settings.reportingCurrency || 'ZAR',
        exchangeRates: profile.settings.exchangeRates || {
          USD: 18.5,
          EUR: 19.8,
          GBP: 23.2,
        },
      },

      dataVersion: '3.0.0',
    };
  },

  // Future migrations go here
  // '3.0.0_to_3.1.0': (profile) => { ... },
};

/**
 * Detect profile version
 */
export const detectVersion = (profile) => {
  if (profile.dataVersion) {
    return profile.dataVersion;
  }

  // Heuristics for old versions
  if (profile.settings?.currency?.exchangeRates) {
    return '2.x';
  }

  return 'unknown';
};

/**
 * Migrate profile to current version
 */
export const migrateProfile = (profile) => {
  const currentVersion = detectVersion(profile);

  if (currentVersion === CURRENT_DATA_VERSION) {
    return { migrated: false, profile };
  }

  console.log(`Migrating profile from ${currentVersion} to ${CURRENT_DATA_VERSION}`);

  let migratedProfile = { ...profile };
  let migrations Applied = [];

  // Apply migrations in sequence
  if (currentVersion === '2.x') {
    migratedProfile = migrations['2.x_to_3.0.0'](migratedProfile);
    migrationsApplied.push('2.x_to_3.0.0');
  }

  // Add future migration chains here

  return {
    migrated: true,
    profile: migratedProfile,
    migrationsApplied,
    fromVersion: currentVersion,
    toVersion: CURRENT_DATA_VERSION,
  };
};

/**
 * Safe profile loading with migration
 */
export const loadProfile = (profileData) => {
  try {
    const profile = typeof profileData === 'string'
      ? JSON.parse(profileData)
      : profileData;

    const result = migrateProfile(profile);

    if (result.migrated) {
      console.log(`Profile migrated: ${result.migrationsApplied.join(' → ')}`);
    }

    return {
      success: true,
      profile: result.profile,
      migrated: result.migrated,
    };
  } catch (error) {
    console.error('Profile load failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
```

**Update store initialization**:

``` javascript
// src/store/useStore.js

import { loadProfile } from '../utils/migrations';

init: () => {
  const profilesJson = localStorage.getItem('solas_profiles');
  const profiles = profilesJson ? JSON.parse(profilesJson) : [];

  if (profiles.length === 0) {
    // First time - create default profile
    const defaultProfile = createDefaultProfile('Duncan');
    defaultProfile.dataVersion = '3.0.0';
    localStorage.setItem('solas_profile_Duncan', JSON.stringify(defaultProfile));
    localStorage.setItem('solas_profiles', JSON.stringify(['Duncan']));

    set({
      profiles: ['Duncan'],
      currentProfileName: 'Duncan',
      profile: defaultProfile,
    });
  } else {
    // Load first profile with migration
    const firstProfileName = profiles[0];
    const profileData = localStorage.getItem(`solas_profile_${firstProfileName}`);

    const result = loadProfile(profileData);

    if (result.success) {
      // Save migrated profile
      if (result.migrated) {
        localStorage.setItem(
          `solas_profile_${firstProfileName}`,
          JSON.stringify(result.profile)
        );
      }

      set({
        profiles,
        currentProfileName: firstProfileName,
        profile: result.profile,
      });
    } else {
      // Handle corrupt profile
      console.error('Failed to load profile:', result.error);
      // Try to recover from backup
      // ... recovery logic
    }
  }
},
```

**Acceptance Criteria**: - [ ] Migration system implemented - [ ] Can
detect profile version - [ ] Migrations run automatically on load - [ ]
Migrated profiles saved back - [ ] Tests for all migrations - [ ]
Rollback capability if migration fails

**Time**: 3 hours

------------------------------------------------------------------------

### 0.6 Comprehensive Error Handling

**Add Error Boundary**:

``` javascript
// src/components/ErrorBoundary.jsx (ALREADY PROVIDED IN PREVIOUS RESPONSE)
// See CRITICAL-FIXES-BEFORE-DISTRIBUTION.md section 6
```

**Add global error handler**:

``` javascript
// src/utils/errorHandling.js (NEW FILE)

/**
 * Centralized error handling for Solas
 */

export class SolasError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'SolasError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

// Error codes
export const ErrorCodes = {
  // Data errors
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  DATA_MIGRATION_FAILED: 'DATA_MIGRATION_FAILED',
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  BACKUP_FAILED: 'BACKUP_FAILED',

  // Calculation errors
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // System errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Log error (in production, send to monitoring service)
 */
export const logError = (error, context = {}) => {
  const errorLog = {
    message: error.message,
    code: error.code || ErrorCodes.UNKNOWN_ERROR,
    context: {
      ...context,
      ...(error.context || {}),
    },
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };

  console.error('Solas Error:', errorLog);

  // In production, send to Sentry or similar
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, { extra: errorLog });
  // }

  return errorLog;
};

/**
 * User-friendly error messages
 */
export const getUserMessage = (error) => {
  const messages = {
    [ErrorCodes.DATA_CORRUPTION]:
      'Your data appears to be corrupted. We can try to restore from a backup.',
    [ErrorCodes.STORAGE_QUOTA_EXCEEDED]:
      'Your browser storage is full. Please export your data and clear old backups.',
    [ErrorCodes.BACKUP_FAILED]:
      'Failed to create backup. Your data was saved, but we recommend exporting manually.',
    [ErrorCodes.CALCULATION_ERROR]:
      'A calculation error occurred. Please check your inputs and try again.',
    [ErrorCodes.INVALID_INPUT]:
      'Invalid input detected. Please check your data and try again.',
    [ErrorCodes.UNKNOWN_ERROR]:
      'An unexpected error occurred. Your data is safe, but please try again.',
  };

  return messages[error.code] || messages[ErrorCodes.UNKNOWN_ERROR];
};
```

**Acceptance Criteria**: - [ ] Error boundary implemented - [ ] Global
error handler in place - [ ] User-friendly error messages - [ ] Error
logging configured - [ ] Recovery paths for all critical errors

**Time**: 2 hours

**Total Phase 0 Time**: \~2 days

------------------------------------------------------------------------

## Phase 1: Critical Data & Calculation Verification (Weeks 2-3)

**Goal**: Prove that calculations are correct and data is safe

### 1.1 Core Calculation Test Suite

**Priority**: P0 - CRITICAL

**Test Coverage Targets**: - Currency conversion: 100% - Asset
valuation: 100% - Net worth calculation: 100% - Allocation calculations:
100% - Retirement projections: 100% - Tax calculations: 90%+

``` javascript
// src/utils/__tests__/calculations.test.js

import { describe, it, expect } from 'vitest';
import {
  toReportingCurrency,
  calculateAssetValue,
  calculateNetWorth,
  calculateAllocation,
} from '../calculations';

describe('Currency Conversion', () => {
  const settings = {
    reportingCurrency: 'ZAR',
    exchangeRates: {
      USD: 18.50,
      EUR: 19.80,
      GBP: 23.20,
    },
  };

  it('converts USD to ZAR correctly', () => {
    const result = toReportingCurrency(
      100,
      'USD',
      'ZAR',
      settings.exchangeRates
    );
    expect(result).toBe(1850);
  });

  it('handles same currency (no conversion)', () => {
    const result = toReportingCurrency(
      100,
      'ZAR',
      'ZAR',
      settings.exchangeRates
    );
    expect(result).toBe(100);
  });

  it('handles zero amount', () => {
    const result = toReportingCurrency(
      0,
      'USD',
      'ZAR',
      settings.exchangeRates
    );
    expect(result).toBe(0);
  });

  it('handles missing exchange rate gracefully', () => {
    const result = toReportingCurrency(
      100,
      'JPY',
      'ZAR',
      settings.exchangeRates
    );
    // Should return amount unchanged and log warning
    expect(result).toBe(100);
  });
});

describe('Asset Valuation', () => {
  const settings = {
    reportingCurrency: 'ZAR',
    exchangeRates: { USD: 18.50 },
  };

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

  it('handles fractional units', () => {
    const asset = {
      units: 10.5,
      currentPrice: 1000,
      currency: 'ZAR',
    };
    const result = calculateAssetValue(asset, settings);
    expect(result).toBe(10500);
  });
});

describe('Net Worth Calculation', () => {
  const settings = {
    reportingCurrency: 'ZAR',
    exchangeRates: { USD: 18.50 },
  };

  it('calculates net worth correctly', () => {
    const assets = [
      { units: 1, currentPrice: 1000000, currency: 'ZAR', assetType: 'Investible' },
      { units: 1, currentPrice: 10000, currency: 'USD', assetType: 'Investible' },
    ];
    const liabilities = [
      { principal: 500000, currency: 'ZAR' },
    ];

    const result = calculateNetWorth(assets, liabilities, settings.exchangeRates);

    // 1,000,000 + (10,000 * 18.50) - 500,000 = 685,000
    expect(result).toBe(685000);
  });

  it('handles no liabilities', () => {
    const assets = [
      { units: 1, currentPrice: 1000000, currency: 'ZAR', assetType: 'Investible' },
    ];
    const result = calculateNetWorth(assets, [], settings.exchangeRates);
    expect(result).toBe(1000000);
  });
});

// Add 50+ more tests for edge cases, error conditions, etc.
```

**Acceptance Criteria**: - [ ] 100+ tests written for core
calculations - [ ] All tests passing - [ ] Edge cases covered (zero,
negative, null, undefined) - [ ] Test coverage \> 95% for
calculations.js - [ ] Performance benchmarks established

**Time**: 3-4 days

------------------------------------------------------------------------

### 1.2 Scenario Calculation Verification

**Priority**: P0 - CRITICAL

**Create reference scenarios with known correct answers**:

``` javascript
// src/services/__tests__/scenarioCalculations.test.js

import { describe, it, expect } from 'vitest';
import { runScenario } from '../scenarioCalculations';

describe('Retirement Scenario Calculations', () => {
  // Reference Case 1: Simple accumulation phase
  it('grows portfolio correctly during accumulation (no retirement)', () => {
    const profile = createTestProfile({
      assets: [{ value: 1000000, currency: 'ZAR' }],
      currentAge: 55,
      retirementAge: 65,
    });

    const scenario = {
      marketReturn: 9.0,
      inflationRate: 4.5,
      retirementAge: 65,
      lifeExpectancy: 64, // End before retirement
      monthlySavings: 10000,
      annualExpenses: 0,
    };

    const result = runScenario(scenario, profile);

    // After 10 years (55-64):
    // - Initial: R1,000,000
    // - Annual savings: R120,000
    // - Growth: 9% per year

    // Year 1: (1,000,000 + 120,000) * 1.09 = 1,220,800
    // Year 2: (1,220,800 + 120,000) * 1.09 = 1,461,472
    // ... continue for 10 years

    const expectedFinal = 2_919_060; // Calculated externally
    expect(result.finalValue).toBeCloseTo(expectedFinal, -3); // Within R1,000
  });

  // Reference Case 2: Simple withdrawal phase
  it('calculates retirement drawdown correctly', () => {
    const profile = createTestProfile({
      assets: [{ value: 5000000, currency: 'ZAR' }],
      currentAge: 65,
      retirementAge: 65,
    });

    const scenario = {
      marketReturn: 7.0,
      inflationRate: 4.5,
      retirementAge: 65,
      lifeExpectancy: 75, // 10 years retirement
      monthlySavings: 0,
      annualExpenses: 300000, // R25k/month
    };

    const result = runScenario(scenario, profile);

    // Should succeed (4% real return supports 6% withdrawal)
    expect(result.success).toBe(true);
    expect(result.finalValue).toBeGreaterThan(0);
  });

  // Reference Case 3: Portfolio depletion
  it('correctly identifies portfolio depletion', () => {
    const profile = createTestProfile({
      assets: [{ value: 500000, currency: 'ZAR' }],
      currentAge: 65,
      retirementAge: 65,
    });

    const scenario = {
      marketReturn: 5.0,
      inflationRate: 4.5,
      retirementAge: 65,
      lifeExpectancy: 90, // 25 years
      monthlySavings: 0,
      annualExpenses: 300000, // Way too high for portfolio
    };

    const result = runScenario(scenario, profile);

    expect(result.success).toBe(false);
    expect(result.depletionAge).toBeLessThan(90);
    expect(result.depletionAge).toBeGreaterThan(65);
  });

  // Reference Case 4: Market crash impact
  it('applies market crash correctly', () => {
    const profile = createTestProfile({
      assets: [
        {
          value: 1000000,
          currency: 'ZAR',
          assetClass: 'Offshore Equity', // 100% equity
        }
      ],
      currentAge: 65,
    });

    const scenario = {
      marketReturn: 8.0,
      inflationRate: 4.5,
      retirementAge: 65,
      lifeExpectancy: 90,
      annualExpenses: 0,
      marketCrashes: [
        { age: 66, dropPercentage: 30 },
      ],
    };

    const result = runScenario(scenario, profile);

    // At age 66, should have ~30% loss
    const age66 = result.trajectory.find(t => t.age === 66);
    const age65 = result.trajectory.find(t => t.age === 65);

    const expectedAfterCrash = age65.netWorth * 1.08 * 0.70; // Grow 8%, then 30% drop
    expect(age66.netWorth).toBeCloseTo(expectedAfterCrash, -2);
  });

  // Add 20+ more test cases for various scenarios
});

// Create helper for test profiles
function createTestProfile(options) {
  return {
    assets: options.assets?.map(a => ({
      id: crypto.randomUUID(),
      name: 'Test Asset',
      units: 1,
      currentPrice: a.value,
      costPrice: a.value,
      currency: a.currency || 'ZAR',
      assetType: 'Investible',
      assetClass: a.assetClass || 'Offshore Equity',
      accountType: 'Taxable',
    })) || [],
    liabilities: [],
    income: [],
    expenses: [],
    settings: {
      reportingCurrency: 'ZAR',
      exchangeRates: { USD: 18.5, EUR: 19.8, GBP: 23.2 },
      profile: {
        age: options.currentAge || 55,
        marginalTaxRate: 39,
        retirementAge: options.retirementAge || 65,
        lifeExpectancy: 90,
        monthlySavings: 0,
        annualExpenses: 0,
      },
    },
  };
}
```

**External Verification**:

``` javascript
// Create reference scenarios and verify against:
// 1. Excel spreadsheet with manual calculations
// 2. Commercial retirement calculators (FIRECalc, cFIREsim)
// 3. Financial advisor review

const REFERENCE_SCENARIOS = {
  conservative_success: {
    description: 'R5M portfolio, 4% withdrawal, should succeed',
    expected: { success: true, finalValue: '> R3M' },
  },
  aggressive_failure: {
    description: 'R500k portfolio, 10% withdrawal, should fail',
    expected: { success: false, depletionAge: '< 75' },
  },
  // ... 10 more reference scenarios
};
```

**Acceptance Criteria**: - [ ] 30+ scenario tests written - [ ] All
tests passing - [ ] Results verified against external calculators - [ ]
Edge cases covered (crashes, high expenses, etc.) - [ ] Test coverage \>
90% for scenarioCalculations.js - [ ] Financial advisor reviewed 3 key
scenarios

**Time**: 4-5 days

------------------------------------------------------------------------

### 1.3 Tax Calculation Review & Warning System

**Priority**: P2 - MEDIUM (but add warnings)

**Approach**: Don't try to build a tax engine, but: 1. Document
limitations clearly 2. Add warnings where calculations are simplified 3.
Provide override options for advanced users

``` javascript
// src/services/taxCalculations.js (NEW FILE - extracted from scenarioCalculations)

/**
 * Tax calculations for Solas
 *
 * ⚠️ LIMITATIONS:
 * - Uses simplified South African tax rates
 * - Does not account for:
 *   - Deductions
 *   - Tax credits
 *   - Retirement fund lump sum tables
 *   - Living annuity rules
 *   - Estate duty
 *   - Special circumstances
 *
 * DISCLAIMER: For planning purposes only. Consult a tax professional.
 */

export const TAX_WARNINGS = {
  SIMPLIFIED_CGT: 'CGT calculation is simplified (40% inclusion rate). Actual may vary based on personal circumstances.',
  RETIREMENT_WITHDRAWAL: 'Retirement fund withdrawal tax is complex. This uses marginal rate only.',
  DIVIDEND_TAX: 'Dividend tax assumes 20% withholding. Exemptions not modeled.',
  NO_DEDUCTIONS: 'Medical aid, retirement contributions, and other deductions are not included.',
};

/**
 * Calculate capital gains tax (simplified)
 */
export const calculateCGT = (gain, marginalTaxRate, options = {}) => {
  if (gain <= 0) return 0;

  const inclusionRate = options.inclusionRate || 0.4; // 40% for individuals
  const taxableGain = gain * inclusionRate;
  const tax = taxableGain * (marginalTaxRate / 100);

  return {
    tax,
    effectiveRate: (tax / gain) * 100,
    warning: TAX_WARNINGS.SIMPLIFIED_CGT,
    assumptions: {
      inclusionRate: `${inclusionRate * 100}%`,
      marginalRate: `${marginalTaxRate}%`,
      annualExclusion: 'Not applied',
    },
  };
};

/**
 * Calculate withdrawal tax based on account mix
 */
export const calculateWithdrawalTax = (
  withdrawalAmount,
  accountMix,
  marginalTaxRate,
  options = {}
) => {
  const { TFSA = 0, Taxable = 0, RA = 0 } = accountMix;
  const total = TFSA + Taxable + RA;

  if (total === 0) {
    return {
      netWithdrawal: withdrawalAmount,
      tax: 0,
      effectiveRate: 0,
      warning: 'No account data available',
    };
  }

  // Proportional withdrawal from each account type
  const tfsaWithdrawal = withdrawalAmount * (TFSA / total);
  const taxableWithdrawal = withdrawalAmount * (Taxable / total);
  const raWithdrawal = withdrawalAmount * (RA / total);

  // Tax on each type
  const tfsaTax = 0; // Tax-free
  const taxableTax = calculateCGT(
    taxableWithdrawal * 0.5, // Assume 50% is gain (simplified)
    marginalTaxRate
  ).tax;
  const raTax = raWithdrawal * (marginalTaxRate / 100); // Full income tax

  const totalTax = tfsaTax + taxableTax + raTax;

  return {
    netWithdrawal: withdrawalAmount - totalTax,
    tax: totalTax,
    effectiveRate: (totalTax / withdrawalAmount) * 100,
    breakdown: {
      tfsa: { amount: tfsaWithdrawal, tax: tfsaTax },
      taxable: { amount: taxableWithdrawal, tax: taxableTax },
      ra: { amount: raWithdrawal, tax: raTax },
    },
    warnings: [
      TAX_WARNINGS.SIMPLIFIED_CGT,
      TAX_WARNINGS.RETIREMENT_WITHDRAWAL,
      'Assumes proportional withdrawal from all accounts',
    ],
    disclaimer: 'This is a simplified estimate. Consult a tax professional for accurate tax planning.',
  };
};

// Export warnings for UI display
export { TAX_WARNINGS };
```

**Add warning banners in UI**:

``` jsx
// src/components/Scenarios/TaxWarningBanner.jsx (NEW FILE)

const TaxWarningBanner = () => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="warning-banner tax-warning">
      <div className="warning-header">
        <span className="warning-icon">⚠️</span>
        <h4>Tax Calculation Limitations</h4>
        <button onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {showDetails && (
        <div className="warning-details">
          <p><strong>Our tax calculations are simplified estimates.</strong></p>
          <p>Not included:</p>
          <ul>
            <li>Tax deductions (medical aid, retirement contributions)</li>
            <li>Retirement fund lump sum tax tables</li>
            <li>Living annuity withdrawal rules</li>
            <li>CGT annual exclusions (R40,000)</li>
            <li>Primary residence exclusion</li>
            <li>Estate duty</li>
          </ul>
          <p className="disclaimer">
            <strong>These projections are for planning purposes only.</strong>
            {' '}Consult a qualified tax professional or financial advisor
            for accurate tax planning.
          </p>
        </div>
      )}
    </div>
  );
};
```

**Acceptance Criteria**: - [ ] Tax code extracted and documented - [ ]
All assumptions documented in code - [ ] Warning banners added to
Scenarios and Retirement views - [ ] Tests for tax calculations (edge
cases) - [ ] Tax calculations reviewed by accountant/tax professional -
[ ] User can override tax rates in scenario (advanced mode)

**Time**: 2 days

------------------------------------------------------------------------

### 1.4 Portfolio Quality Assessment Review

**Priority**: P2 - MEDIUM (add warnings for unverified metrics)

**Current State Check**:

``` javascript
// Review src/services/portfolioQuality.js
// - What metrics are being calculated?
// - Are they industry-standard?
// - Are the thresholds reasonable?
```

**Add warning system**:

``` javascript
// src/services/portfolioQuality.js

export const QUALITY_METRICS_STATUS = {
  diversification: {
    verified: true,
    methodology: 'Standard deviation of allocation percentages',
    source: 'Industry standard',
  },
  concentration: {
    verified: true,
    methodology: 'Percentage thresholds',
    source: 'Typical advisor guidelines',
  },
  staleness: {
    verified: true,
    methodology: 'Days since last price update',
    source: 'Custom (reasonable assumption)',
  },
  costEfficiency: {
    verified: false,
    methodology: 'Expense ratio analysis',
    source: 'Needs professional review',
    warning: 'This metric is experimental. Please verify with a financial advisor.',
  },
  assetAllocation: {
    verified: false,
    methodology: 'Comparison to target allocation',
    source: 'User-defined targets',
    warning: 'Target allocation should be determined with a financial advisor based on your risk profile.',
  },
};

export const getMetricStatus = (metricName) => {
  return QUALITY_METRICS_STATUS[metricName] || {
    verified: false,
    warning: 'This metric has not been professionally verified.',
  };
};
```

**Add badges in UI**:

``` jsx
// In PortfolioQualityCard.jsx

const MetricBadge = ({ metricName }) => {
  const status = getMetricStatus(metricName);

  return (
    <div className="metric-row">
      <span className="metric-name">{metricName}</span>
      {status.verified ? (
        <span className="badge verified" title={status.source}>
          ✓ Verified
        </span>
      ) : (
        <span className="badge experimental" title={status.warning}>
          ⚠️ Experimental
        </span>
      )}
    </div>
  );
};
```

**Acceptance Criteria**: - [ ] All portfolio quality metrics reviewed -
[ ] Each metric documented (methodology, source) - [ ] Verification
status added to each metric - [ ] UI shows verified vs experimental
metrics - [ ] Warnings shown for unverified metrics - [ ] Tests for all
quality calculations - [ ] Optional: Financial advisor review

**Time**: 2 days

**Total Phase 1 Time**: 2-3 weeks

------------------------------------------------------------------------

## Phase 2: Input Validation & Error Prevention (Week 4)

**Goal**: Prevent bad data from entering the system

### 2.1 Schema Validation with Zod

**Priority**: P1 - HIGH

*See CRITICAL-FIXES-BEFORE-DISTRIBUTION.md section 2 for implementation*

**Additional validation rules**:

``` javascript
// src/models/validation.js

import { z } from 'zod';

// Enhanced asset validation
export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
    .min(1, 'Asset name is required')
    .max(100, 'Asset name too long'),

  ticker: z.string()
    .max(20, 'Ticker too long')
    .optional(),

  units: z.number()
    .positive('Units must be positive')
    .finite('Units must be a valid number'),

  currentPrice: z.number()
    .nonnegative('Price cannot be negative')
    .finite('Price must be a valid number'),

  costPrice: z.number()
    .nonnegative('Cost price cannot be negative')
    .finite('Cost price must be a valid number'),

  currency: z.enum(['ZAR', 'USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD'], {
    errorMap: () => ({ message: 'Invalid currency' })
  }),

  assetClass: z.enum([
    'Offshore Equity',
    'SA Equity',
    'SA Bonds',
    'Offshore Bonds',
    'Cash',
    'Property',
    'Crypto',
  ]),

  dividendYield: z.number()
    .min(0, 'Yield cannot be negative')
    .max(100, 'Yield cannot exceed 100%')
    .optional(),

  // ... etc
}).refine(
  data => data.currentPrice >= 0 && data.costPrice >= 0,
  { message: 'Prices must be non-negative' }
).refine(
  data => data.units * data.currentPrice < 1000000000000, // R1 trillion max
  { message: 'Asset value exceeds reasonable limit' }
);

// Scenario validation with business rules
export const ScenarioSchema = z.object({
  marketReturn: z.number()
    .min(-50, 'Return too low')
    .max(50, 'Return too high'),

  inflationRate: z.number()
    .min(-10, 'Inflation too low')
    .max(30, 'Inflation too high'),

  retirementAge: z.number()
    .int()
    .min(40, 'Retirement age too low')
    .max(100, 'Retirement age too high'),

  lifeExpectancy: z.number()
    .int()
    .min(60, 'Life expectancy too low')
    .max(120, 'Life expectancy too high'),

  monthlySavings: z.number()
    .nonnegative('Savings cannot be negative'),

  annualExpenses: z.number()
    .nonnegative('Expenses cannot be negative'),

}).refine(
  data => data.marketReturn > data.inflationRate - 10,
  {
    message: 'Real return (market return - inflation) is unrealistically low',
    path: ['marketReturn'],
  }
).refine(
  data => data.lifeExpectancy >= data.retirementAge,
  {
    message: 'Life expectancy must be >= retirement age',
    path: ['lifeExpectancy'],
  }
);
```

**Acceptance Criteria**: - [ ] Zod installed and configured - [ ]
Validation schemas for all data types - [ ] Store methods use validation
before save - [ ] User-friendly error messages - [ ] Tests for all
validation rules - [ ] Edge cases handled gracefully

**Time**: 2 days

------------------------------------------------------------------------

### 2.2 UI Input Controls

**Priority**: P1 - HIGH

**Add client-side validation to forms**:

``` jsx
// src/components/shared/ValidatedInput.jsx (NEW COMPONENT)

import { useState } from 'react';

export const ValidatedInput = ({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  required = false,
  validate,
  helpText,
  ...props
}) => {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const handleChange = (e) => {
    const newValue = e.target.value;

    // Clear error on change
    setError(null);

    // Custom validation
    if (validate) {
      const validationResult = validate(newValue);
      if (!validationResult.valid) {
        setError(validationResult.message);
      }
    }

    onChange(e);
  };

  const handleBlur = () => {
    setTouched(true);

    // Validate on blur
    if (required && !value) {
      setError(`${label} is required`);
    }

    if (type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        setError('Must be a valid number');
      } else if (min !== undefined && num < min) {
        setError(`Must be at least ${min}`);
      } else if (max !== undefined && num > max) {
        setError(`Must be at most ${max}`);
      }
    }
  };

  return (
    <div className={`form-group ${error && touched ? 'has-error' : ''}`}>
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        className={error && touched ? 'error' : ''}
        {...props}
      />

      {helpText && <span className="help-text">{helpText}</span>}
      {error && touched && <span className="error-message">{error}</span>}
    </div>
  );
};

// Number input with constraints
export const NumberInput = ({ min = 0, max, step = 1, ...props }) => {
  return (
    <ValidatedInput
      type="number"
      min={min}
      max={max}
      step={step}
      validate={(value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return { valid: false, message: 'Invalid number' };
        if (min !== undefined && num < min) return { valid: false, message: `Minimum value is ${min}` };
        if (max !== undefined && num > max) return { valid: false, message: `Maximum value is ${max}` };
        return { valid: true };
      }}
      {...props}
    />
  );
};

// Percentage input (0-100)
export const PercentageInput = (props) => {
  return (
    <NumberInput
      min={0}
      max={100}
      step={0.1}
      helpText="Enter as percentage (0-100)"
      {...props}
    />
  );
};

// Currency input
export const CurrencyInput = ({ currency = 'ZAR', ...props }) => {
  return (
    <div className="currency-input-wrapper">
      <span className="currency-symbol">{getCurrencySymbol(currency)}</span>
      <NumberInput
        min={0}
        step={0.01}
        {...props}
      />
    </div>
  );
};
```

**Update all forms to use validated inputs**:

``` jsx
// Example: Assets.jsx

<NumberInput
  label="Number of Units"
  value={formData.units}
  onChange={(e) => setFormData({ ...formData, units: parseFloat(e.target.value) })}
  min={0.000001}
  max={1000000000}
  step={0.000001}
  required
  helpText="Can be fractional (e.g., 10.5)"
/>

<CurrencyInput
  label="Current Price"
  value={formData.currentPrice}
  onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) })}
  currency={formData.currency}
  required
/>

<PercentageInput
  label="Dividend Yield"
  value={formData.dividendYield || 0}
  onChange={(e) => setFormData({ ...formData, dividendYield: parseFloat(e.target.value) })}
  helpText="Annual dividend yield"
/>
```

**Acceptance Criteria**: - [ ] Validated input components created - [ ]
All forms updated to use validated inputs - [ ] Real-time validation
feedback - [ ] Clear error messages - [ ] Help text for complex fields -
[ ] Accessibility (aria labels, keyboard nav)

**Time**: 3 days

**Total Phase 2 Time**: 1 week

------------------------------------------------------------------------

## Phase 3: User Experience & Professional Polish (Week 5)

**Goal**: Make it feel professional and trustworthy

### 3.1 Replace All Alerts with Toast Notifications

**Priority**: P3 - MEDIUM (but easy win)

*See CRITICAL-FIXES-BEFORE-DISTRIBUTION.md section 3 for implementation*

**Acceptance Criteria**: - [ ] react-hot-toast installed - [ ] All 29
alerts replaced - [ ] All confirms replaced with dialogs - [ ]
Consistent toast styling - [ ] Toast positioning configured - [ ]
Success/error/warning variants

**Time**: 1 day

------------------------------------------------------------------------

### 3.2 Loading States & Skeleton Screens

**Priority**: P3 - LOW

**Add loading indicators**:

``` jsx
// src/components/shared/LoadingState.jsx

export const LoadingSpinner = ({ size = 'medium' }) => {
  return (
    <div className={`spinner spinner-${size}`}>
      <div className="spinner-icon"></div>
    </div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-text"></div>
      <div className="skeleton-line skeleton-text"></div>
    </div>
  );
};

// Use in Dashboard
{!profile ? (
  <div className="dashboard-skeleton">
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </div>
) : (
  <Dashboard />
)}
```

**Acceptance Criteria**: - [ ] Loading states for all async operations -
[ ] Skeleton screens for initial page loads - [ ] Smooth transitions - [
] No jarring layout shifts

**Time**: 1 day

------------------------------------------------------------------------

### 3.3 Improved Documentation

**Priority**: P3 - LOW

**Update README.md**:

``` markdown
# Solas v3 - Personal Retirement Planning Tool

## What is Solas?

Solas is a comprehensive, privacy-first financial planning application that helps you:
- Track your net worth across multiple currencies
- Model retirement scenarios with various assumptions
- Analyze portfolio allocation and concentration risks
- Plan for market crashes and unexpected expenses
- Support multiple profiles for different planning scenarios

**Key Features:**
- ✅ 100% client-side (all data stays in your browser)
- ✅ Multi-currency support
- ✅ Sophisticated retirement modeling
- ✅ Portfolio quality analysis
- ✅ Scenario planning with market crashes
- ✅ Import/export for data portability

## Quick Start

### For Users

1. Open the application in your browser
2. Start adding your assets, liabilities, income, and expenses
3. Create scenarios to model your retirement
4. Export your data regularly for backup

### For Developers

See [DEVELOPMENT.md](DEVELOPMENT.md) for setup instructions.

## Important Disclaimers

⚠️ **This tool is for planning purposes only.**
- Tax calculations are simplified
- Not professional financial advice
- Consult qualified advisors for real decisions
- Your results may vary significantly

## Data Storage

- All data stored in browser localStorage
- No cloud sync or server storage
- Export regularly to prevent data loss
- Maximum ~10MB storage (typically sufficient)

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Support

- Documentation: See `/docs` folder
- Issues: [GitHub Issues](link)
- Contact: support@example.com

## License

[Your chosen license]
```

**Create DEVELOPMENT.md**:

``` markdown
# Development Guide

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Project Structure

\`\`\`
src/
├── components/     # React components
├── services/       # Business logic
├── store/          # Zustand state management
├── utils/          # Helper functions
├── models/         # Data models and defaults
└── test/           # Test utilities
\`\`\`

## Testing

\`\`\`bash
npm test              # Run tests
npm run test:ui       # Test UI
npm run test:coverage # Coverage report
\`\`\`

## Code Style

- ESLint for linting
- Run \`npm run lint\` before committing
- Follow existing patterns

## Contributing

1. Create feature branch from \`develop\`
2. Write tests for new features
3. Ensure all tests pass
4. Submit PR to \`develop\`

## Release Process

1. Merge to \`main\`
2. Tag release: \`git tag v3.1.0\`
3. Build: \`npm run build\`
4. Deploy

\`\`\`
```

**Acceptance Criteria**: - [ ] README.md updated with accurate info - [
] DEVELOPMENT.md created - [ ] Screenshots added to README - [ ] FAQ
document created - [ ] Contributing guidelines written

**Time**: 1 day

**Total Phase 3 Time**: 1 week

------------------------------------------------------------------------

## Phase 4: Performance & Scalability (Week 6)

**Goal**: Handle large datasets gracefully

### 4.1 Performance Optimization

**Priority**: P3 - LOW (but good practice)

**Optimize React rendering**:

``` javascript
// Memoize expensive calculations
const stats = useMemo(() => {
  return calculateStats(assets, liabilities, settings);
}, [assets, liabilities, settings]); // Only recalc when these change

// Memoize components
const AssetRow = memo(({ asset, onEdit, onDelete }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Custom comparison for when to re-render
  return prevProps.asset.id === nextProps.asset.id &&
         prevProps.asset.currentPrice === nextProps.asset.currentPrice;
});

// Virtualize long lists
import { FixedSizeList } from 'react-window';

const AssetList = ({ assets }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={assets.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AssetRow asset={assets[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

**Debounce expensive operations**:

``` javascript
// src/hooks/useDebounce.js

import { useState, useEffect } from 'react';

export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Use in search/filter
const FilteredAssets = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const filtered = useMemo(() => {
    return assets.filter(a =>
      a.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [assets, debouncedSearch]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
};
```

**Acceptance Criteria**: - [ ] Memoization added to expensive
calculations - [ ] Components memoized where appropriate - [ ] List
virtualization for 100+ items - [ ] Debouncing on search/filter inputs -
[ ] Performance benchmarks established - [ ] App remains responsive with
500+ assets

**Time**: 2 days

------------------------------------------------------------------------

### 4.2 localStorage Quota Management

**Priority**: P1 - HIGH

*See CRITICAL-FIXES-BEFORE-DISTRIBUTION.md section 5 for implementation*

**Acceptance Criteria**: - [ ] Storage monitoring implemented - [ ]
Quota handling with graceful degradation - [ ] Automatic cleanup of old
backups - [ ] Warning at 80% capacity - [ ] UI shows storage usage - [ ]
Tests for quota scenarios

**Time**: 1 day

**Total Phase 4 Time**: 1 week

------------------------------------------------------------------------

## Phase 5: Deployment & Monitoring (Week 7-8)

**Goal**: Deploy safely with monitoring

### 5.1 Deployment Strategy

**Host on Netlify** (recommended for ease):

``` bash
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

**Or GitHub Pages**:

``` bash
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Acceptance Criteria**: - [ ] Deployment configured - [ ] Custom domain
(optional) - [ ] HTTPS enabled - [ ] Deployment on every merge to main -
[ ] Rollback capability

**Time**: 1 day

------------------------------------------------------------------------

### 5.2 Error Monitoring (Optional but Recommended)

**Add Sentry for error tracking**:

``` bash
npm install @sentry/react
```

``` javascript
// src/main.jsx

import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "your-sentry-dsn",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% of errors
  });
}
```

**Acceptance Criteria**: - [ ] Sentry configured (or alternative) - [ ]
Errors logged to monitoring service - [ ] Privacy policy updated (data
collection) - [ ] Error alerts configured

**Time**: 1 day (optional)

------------------------------------------------------------------------

### 5.3 Analytics (Optional)

**Add simple analytics**:

``` bash
npm install react-ga4
```

``` javascript
// src/utils/analytics.js

import ReactGA from 'react-ga4';

export const initAnalytics = () => {
  if (import.meta.env.PROD) {
    ReactGA.initialize('G-XXXXXXXXXX');
  }
};

export const trackPageView = (page) => {
  if (import.meta.env.PROD) {
    ReactGA.send({ hitType: 'pageview', page });
  }
};

export const trackEvent = (category, action, label) => {
  if (import.meta.env.PROD) {
    ReactGA.event({ category, action, label });
  }
};

// Usage
trackEvent('Scenario', 'Run', scenario.name);
trackEvent('Export', 'Profile', currentProfileName);
```

**Acceptance Criteria**: - [ ] Analytics configured - [ ] Privacy policy
added - [ ] Cookie consent (if required by law) - [ ] Track key user
journeys - [ ] Dashboard for viewing metrics

**Time**: 1 day (optional)

**Total Phase 5 Time**: 1-2 weeks

------------------------------------------------------------------------

## Summary Timeline

| Phase       | Focus                    | Duration  | Priority      |
|-------------|--------------------------|-----------|---------------|
| **Phase 0** | Foundation & Safety      | 2 days    | P0 - CRITICAL |
| **Phase 1** | Calculation Verification | 2-3 weeks | P0 - CRITICAL |
| **Phase 2** | Input Validation         | 1 week    | P1 - HIGH     |
| **Phase 3** | UX Polish                | 1 week    | P3 - MEDIUM   |
| **Phase 4** | Performance              | 1 week    | P1/P3 - MIXED |
| **Phase 5** | Deployment               | 1-2 weeks | P1 - HIGH     |

**Total Time**: 6-8 weeks

**Minimum Viable Production**: Phases 0, 1, 2, 4.2, 5.1 = \~4 weeks
**Full Production Ready**: All phases = 6-8 weeks

------------------------------------------------------------------------

## Risk Mitigation

### "Never Break the Working App"

1.  **Always branch**: Never commit directly to main
2.  **Feature flags**: Add new features behind flags
3.  **Incremental rollout**: Test with small group first
4.  **Backup before upgrade**: Export all data before major changes
5.  **Rollback plan**: Keep previous version accessible

### Testing Before Merge

``` bash
# Pre-merge checklist
□ npm test                    # All tests pass
□ npm run lint                # No lint errors
□ npm run build               # Builds successfully
□ Test manually in browser    # Smoke test
□ Test import/export          # Data integrity
□ Test with large dataset     # Performance OK
□ Code review by second person
```

------------------------------------------------------------------------

## Feature Flags for Gradual Rollout

``` javascript
// src/utils/featureFlags.js

export const FEATURES = {
  NEW_TAX_CALCULATIONS: false,  // Roll out gradually
  PORTFOLIO_QUALITY_V2: false,
  EXPERIMENTAL_METRICS: false,
  ADVANCED_TAX_MODE: false,
};

// Usage
{FEATURES.ADVANCED_TAX_MODE && (
  <AdvancedTaxSettings />
)}
```

------------------------------------------------------------------------

## Success Metrics

### Code Quality Metrics

-   [ ] Test coverage \> 80% overall
-   [ ] Test coverage \> 95% for calculations
-   [ ] Zero critical bugs in production
-   [ ] \< 5 known minor bugs
-   [ ] All security warnings addressed

### Performance Metrics

-   [ ] Page load \< 2 seconds
-   [ ] Interaction latency \< 100ms
-   [ ] Handles 500+ assets without lag
-   [ ] Build size \< 5MB

### User Experience Metrics

-   [ ] Zero data loss incidents
-   [ ] Calculation accuracy verified by professional
-   [ ] \< 1% error rate on form submissions
-   [ ] Positive user feedback

------------------------------------------------------------------------

## Warnings & Disclaimers Strategy

**Where to add warnings**:

1.  **First-time user onboarding**: Big disclaimer about accuracy
2.  **Scenarios view**: Tax calculation limitations
3.  **Portfolio Quality**: Experimental metrics flagged
4.  **Settings**: Data storage limitations
5.  **Export**: "Not encrypted" warning

**Warning levels**: - 🔴 **Critical**: Data loss risk, legal
disclaimer - 🟡 **Important**: Calculation limitations, simplified
assumptions - 🔵 **Info**: Tips, best practices, recommendations

------------------------------------------------------------------------

## Post-Launch Maintenance Plan

### Monthly

-   [ ] Review error logs
-   [ ] Check for security updates
-   [ ] Update dependencies
-   [ ] Review user feedback

### Quarterly

-   [ ] Add new features based on feedback
-   [ ] Performance audit
-   [ ] Accessibility audit
-   [ ] Update documentation

### Annually

-   [ ] Major version release
-   [ ] Tax law changes review
-   [ ] Financial advisor consultation
-   [ ] Security audit

------------------------------------------------------------------------

## Conclusion

**This plan transforms Solas from B+ to A+ in 6-8 weeks** while: - ✅
Never breaking the working app - ✅ Adding comprehensive tests - ✅
Verifying calculation accuracy - ✅ Adding proper error handling - ✅
Improving UX significantly - ✅ Being honest about limitations

**Start with Phase 0 this week** - that's your safety net. **Then Phase
1** - that's your credibility (correct calculations). **Everything
else** is polish and professionalism.

You'll have a bulletproof app people can trust with their financial
futures.
