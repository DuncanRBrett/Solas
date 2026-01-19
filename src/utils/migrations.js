/**
 * Data Migration System for Solas
 *
 * Handles version upgrades gracefully by:
 * - Detecting profile version
 * - Applying necessary migrations
 * - Preserving user data
 * - Providing rollback capability
 */

const CURRENT_DATA_VERSION = '3.0.0';

/**
 * Migration registry
 * Each migration transforms data from one version to the next
 */
const migrations = {
  /**
   * Example: Migrate from hypothetical 2.x to 3.0.0
   * This would be used if you had an earlier version
   */
  '2.x_to_3.0.0': (profile) => {
    return {
      ...profile,

      // Add new fields with defaults
      expenseCategories: profile.expenseCategories || [],
      ageBasedExpensePlan: profile.ageBasedExpensePlan || null,

      // Migrate old expense format (if needed)
      expenses: profile.expenses?.map(e => ({
        ...e,
        frequency: e.frequency || 'Monthly',
        currency: e.currency || 'ZAR',
        category: e.category || 'General',
      })) || [],

      // Update settings format
      settings: {
        ...profile.settings,
        reportingCurrency: profile.settings?.reportingCurrency || 'ZAR',
        exchangeRates: profile.settings?.exchangeRates || {
          ZAR: 1.0,
          USD: 18.5,
          EUR: 19.8,
          GBP: 23.2,
        },
      },

      // Add version field
      dataVersion: '3.0.0',
      migratedAt: new Date().toISOString(),
    };
  },

  // Future migrations go here
  // Example:
  // '3.0.0_to_3.1.0': (profile) => {
  //   return {
  //     ...profile,
  //     newFeature: defaultNewFeatureValue,
  //     dataVersion: '3.1.0',
  //   };
  // },
};

/**
 * Detect profile version
 *
 * @param {object} profile - Profile data
 * @returns {string} - Detected version
 */
export const detectVersion = (profile) => {
  // If profile has explicit version field, use it
  if (profile?.dataVersion) {
    return profile.dataVersion;
  }

  // Heuristics for detecting older versions
  // (Add more heuristics as needed)

  // Check for v2.x characteristics
  if (profile?.settings?.currency?.exchangeRates) {
    return '2.x';
  }

  // If profile has basic structure but no version, assume current
  if (profile?.assets && profile?.settings) {
    return CURRENT_DATA_VERSION;
  }

  return 'unknown';
};

/**
 * Normalize expense subcategory fields
 * Migrates 'monthlyAmount' to 'amount' (field was misleadingly named)
 *
 * @param {object} subcategory - Expense subcategory object
 * @returns {object} - Normalized subcategory
 */
const normalizeExpenseSubcategory = (subcategory) => {
  if (!subcategory) return subcategory;

  // If subcategory has old 'monthlyAmount' field but not 'amount', migrate it
  if (subcategory.monthlyAmount !== undefined && subcategory.amount === undefined) {
    const { monthlyAmount, ...rest } = subcategory;
    return {
      ...rest,
      amount: monthlyAmount,
    };
  }

  // If both exist (shouldn't happen, but be safe), prefer 'amount'
  if (subcategory.monthlyAmount !== undefined && subcategory.amount !== undefined) {
    const { monthlyAmount, ...rest } = subcategory;
    return rest;
  }

  return subcategory;
};

/**
 * Apply field normalizations to profile
 * These run on every load to ensure data consistency
 *
 * @param {object} profile - Profile to normalize
 * @returns {{ profile: object, normalized: boolean }}
 */
const normalizeProfileFields = (profile) => {
  let normalized = false;

  // Normalize expense categories and subcategories
  if (profile.expenseCategories && Array.isArray(profile.expenseCategories)) {
    const normalizedCategories = profile.expenseCategories.map(category => {
      if (category.subcategories && Array.isArray(category.subcategories)) {
        const normalizedSubs = category.subcategories.map(sub => {
          const normalizedSub = normalizeExpenseSubcategory(sub);
          if (normalizedSub !== sub) {
            normalized = true;
          }
          return normalizedSub;
        });
        return { ...category, subcategories: normalizedSubs };
      }
      return category;
    });

    if (normalized) {
      profile = { ...profile, expenseCategories: normalizedCategories };
    }
  }

  return { profile, normalized };
};

/**
 * Migrate profile to current version
 *
 * @param {object} profile - Profile data to migrate
 * @returns {object} - { migrated: boolean, profile: object, ... }
 */
export const migrateProfile = (profile) => {
  const currentVersion = detectVersion(profile);
  let migratedProfile = { ...profile };
  const migrationsApplied = [];
  let wasVersionMigrated = false;

  // Apply version-based migrations
  if (currentVersion !== CURRENT_DATA_VERSION) {
    console.log(`Migrating profile from ${currentVersion} to ${CURRENT_DATA_VERSION}`);

    // Apply migration chain
    if (currentVersion === '2.x') {
      migratedProfile = migrations['2.x_to_3.0.0'](migratedProfile);
      migrationsApplied.push('2.x_to_3.0.0');
      wasVersionMigrated = true;
    }

    // Future migration chains
    // if (currentVersion === '3.0.0') {
    //   migratedProfile = migrations['3.0.0_to_3.1.0'](migratedProfile);
    //   migrationsApplied.push('3.0.0_to_3.1.0');
    // }
  }

  // Apply field normalizations (always, regardless of version)
  // This handles field renames and other non-version-specific migrations
  const normalizationResult = normalizeProfileFields(migratedProfile);
  migratedProfile = normalizationResult.profile;

  if (normalizationResult.normalized) {
    migrationsApplied.push('field-normalization');
  }

  const wasMigrated = wasVersionMigrated || normalizationResult.normalized;

  return {
    migrated: wasMigrated,
    profile: migratedProfile,
    migrationsApplied,
    fromVersion: currentVersion,
    toVersion: CURRENT_DATA_VERSION,
  };
};

/**
 * Safe profile loading with migration
 *
 * @param {string|object} profileData - Profile data (JSON string or object)
 * @returns {object} - { success: boolean, profile?: object, error?: string }
 */
export const loadProfile = (profileData) => {
  try {
    // Parse if string
    const profile = typeof profileData === 'string'
      ? JSON.parse(profileData)
      : profileData;

    // Validate basic structure
    if (!profile || typeof profile !== 'object') {
      throw new Error('Invalid profile data structure');
    }

    // Attempt migration
    const result = migrateProfile(profile);

    if (result.migrated) {
      console.log(`Profile migrated successfully: ${result.migrationsApplied.join(' → ')}`);
    }

    return {
      success: true,
      profile: result.profile,
      migrated: result.migrated,
      migrationsApplied: result.migrationsApplied,
      fromVersion: result.fromVersion,
      toVersion: result.toVersion,
    };
  } catch (error) {
    console.error('Profile load failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Add data version to profile if missing
 * Use this when creating new profiles
 *
 * @param {object} profile - Profile object
 * @returns {object} - Profile with version added
 */
export const addVersionToProfile = (profile) => {
  if (!profile.dataVersion) {
    profile.dataVersion = CURRENT_DATA_VERSION;
    profile.createdAt = profile.createdAt || new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
  }
  return profile;
};

/**
 * Check if migration is available for a version
 *
 * @param {string} fromVersion - Starting version
 * @param {string} toVersion - Target version (defaults to current)
 * @returns {boolean} - True if migration path exists
 */
export const canMigrate = (fromVersion, toVersion = CURRENT_DATA_VERSION) => {
  // Same version
  if (fromVersion === toVersion) {
    return true;
  }

  // Check if migration exists
  const migrationKey = `${fromVersion}_to_${toVersion}`;
  return Object.prototype.hasOwnProperty.call(migrations, migrationKey);
};

/**
 * Get current data version
 *
 * @returns {string} - Current version
 */
export const getCurrentVersion = () => CURRENT_DATA_VERSION;

// Export for testing
export { migrations };
