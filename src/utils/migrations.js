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
 * Migrate profile to current version
 *
 * @param {object} profile - Profile data to migrate
 * @returns {object} - { migrated: boolean, profile: object, ... }
 */
export const migrateProfile = (profile) => {
  const currentVersion = detectVersion(profile);

  // Already at current version
  if (currentVersion === CURRENT_DATA_VERSION) {
    return {
      migrated: false,
      profile,
      currentVersion,
    };
  }

  console.log(`Migrating profile from ${currentVersion} to ${CURRENT_DATA_VERSION}`);

  let migratedProfile = { ...profile };
  const migrationsApplied = [];

  // Apply migration chain
  if (currentVersion === '2.x') {
    migratedProfile = migrations['2.x_to_3.0.0'](migratedProfile);
    migrationsApplied.push('2.x_to_3.0.0');
  }

  // Future migration chains
  // if (currentVersion === '3.0.0') {
  //   migratedProfile = migrations['3.0.0_to_3.1.0'](migratedProfile);
  //   migrationsApplied.push('3.0.0_to_3.1.0');
  // }

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
  return migrations.hasOwnProperty(migrationKey);
};

/**
 * Get current data version
 *
 * @returns {string} - Current version
 */
export const getCurrentVersion = () => CURRENT_DATA_VERSION;

// Export for testing
export { migrations };
