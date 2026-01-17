/**
 * localStorage Quota Management
 *
 * Monitors localStorage usage and prevents quota exceeded errors
 * Typical limits: 5-10MB depending on browser
 */

/**
 * Check storage quota and return usage statistics
 * @returns {Promise<Object>} Storage usage info
 */
export async function checkStorageQuota() {
  try {
    // Modern API (Chrome, Edge, Firefox, Safari 15.2+)
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();

      return {
        usage, // bytes used
        quota, // bytes available
        usageMB: (usage / (1024 * 1024)).toFixed(2),
        quotaMB: (quota / (1024 * 1024)).toFixed(2),
        percentUsed: ((usage / quota) * 100).toFixed(1),
        available: quota - usage,
        availableMB: ((quota - usage) / (1024 * 1024)).toFixed(2),
      };
    }

    // Fallback: Estimate by checking localStorage size
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }

    // Assume 5MB limit as conservative estimate
    const estimatedQuota = 5 * 1024 * 1024;

    return {
      usage: totalSize,
      quota: estimatedQuota,
      usageMB: (totalSize / (1024 * 1024)).toFixed(2),
      quotaMB: (estimatedQuota / (1024 * 1024)).toFixed(2),
      percentUsed: ((totalSize / estimatedQuota) * 100).toFixed(1),
      available: estimatedQuota - totalSize,
      availableMB: ((estimatedQuota - totalSize) / (1024 * 1024)).toFixed(2),
      estimated: true, // Flag to indicate this is an estimate
    };
  } catch (error) {
    console.error('Failed to check storage quota:', error);
    return null;
  }
}

/**
 * Get size of a specific profile in localStorage
 * @param {string} profileName - Name of the profile
 * @returns {Object} Size information
 */
export function getProfileSize(profileName) {
  try {
    const profileData = localStorage.getItem(`solas_profile_${profileName}`);
    if (!profileData) {
      return { bytes: 0, kb: 0, mb: 0 };
    }

    const bytes = profileData.length;
    return {
      bytes,
      kb: (bytes / 1024).toFixed(2),
      mb: (bytes / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('Failed to get profile size:', error);
    return { bytes: 0, kb: 0, mb: 0 };
  }
}

/**
 * Get total size of all Solas data in localStorage
 * @returns {Object} Total size information
 */
export function getTotalSolasSize() {
  try {
    let totalBytes = 0;

    // Get all solas-related keys
    for (let key in localStorage) {
      if (key.startsWith('solas_')) {
        totalBytes += localStorage[key].length + key.length;
      }
    }

    return {
      bytes: totalBytes,
      kb: (totalBytes / 1024).toFixed(2),
      mb: (totalBytes / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('Failed to get total size:', error);
    return { bytes: 0, kb: 0, mb: 0 };
  }
}

/**
 * Check if storage is approaching quota limits
 * @param {number} warningThreshold - Percentage threshold for warning (default 80)
 * @param {number} dangerThreshold - Percentage threshold for danger (default 90)
 * @returns {Promise<Object>} Status object
 */
export async function checkStorageHealth(warningThreshold = 80, dangerThreshold = 90) {
  const quota = await checkStorageQuota();

  if (!quota) {
    return {
      status: 'unknown',
      message: 'Unable to check storage quota',
    };
  }

  const percentUsed = parseFloat(quota.percentUsed);

  if (percentUsed >= dangerThreshold) {
    return {
      status: 'danger',
      level: 'error',
      message: `Storage ${percentUsed}% full (${quota.usageMB}MB / ${quota.quotaMB}MB). Please export your data and consider removing old profiles.`,
      quota,
      action: 'export',
    };
  }

  if (percentUsed >= warningThreshold) {
    return {
      status: 'warning',
      level: 'warning',
      message: `Storage ${percentUsed}% full (${quota.usageMB}MB / ${quota.quotaMB}MB). Consider exporting your data to free up space.`,
      quota,
      action: 'export',
    };
  }

  return {
    status: 'healthy',
    level: 'info',
    message: `Storage ${percentUsed}% used (${quota.usageMB}MB / ${quota.quotaMB}MB)`,
    quota,
  };
}

/**
 * Check before saving to ensure we won't exceed quota
 * @param {number} additionalBytes - Additional bytes to be saved
 * @returns {Promise<Object>} { canSave: boolean, reason: string }
 */
export async function canSave(additionalBytes = 0) {
  try {
    const quota = await checkStorageQuota();

    if (!quota) {
      // Can't check quota, allow save but warn
      return {
        canSave: true,
        warning: 'Unable to verify storage quota',
      };
    }

    const availableBytes = quota.available;
    const requiredBytes = additionalBytes * 1.2; // Add 20% buffer for overhead

    if (requiredBytes > availableBytes) {
      return {
        canSave: false,
        reason: `Insufficient storage space. Need ${(requiredBytes / 1024).toFixed(0)}KB, available ${(availableBytes / 1024).toFixed(0)}KB.`,
        quota,
      };
    }

    // Check if we're approaching limit (>90% after save)
    const percentAfterSave = ((quota.usage + requiredBytes) / quota.quota) * 100;

    if (percentAfterSave > 90) {
      return {
        canSave: true,
        warning: `Storage will be ${percentAfterSave.toFixed(0)}% full after saving. Consider exporting data.`,
        quota,
      };
    }

    return {
      canSave: true,
      quota,
    };
  } catch (error) {
    console.error('Error checking if can save:', error);
    return {
      canSave: true,
      warning: 'Could not verify storage availability',
    };
  }
}

/**
 * Get recommendations for freeing up storage space
 * @returns {Promise<Array>} List of recommendations
 */
export async function getStorageRecommendations() {
  const recommendations = [];
  const quota = await checkStorageQuota();

  if (!quota) {
    return recommendations;
  }

  const percentUsed = parseFloat(quota.percentUsed);

  if (percentUsed > 70) {
    // Check for multiple profiles
    const profilesJson = localStorage.getItem('solas_profiles');
    const profiles = profilesJson ? JSON.parse(profilesJson) : [];

    if (profiles.length > 1) {
      recommendations.push({
        action: 'delete_old_profiles',
        title: 'Delete unused profiles',
        description: `You have ${profiles.length} profiles. Consider deleting profiles you no longer use.`,
        savings: 'High',
      });
    }

    // Check for old backups
    let backupCount = 0;
    for (let key in localStorage) {
      if (key.startsWith('solas_backup_')) {
        backupCount++;
      }
    }

    if (backupCount > 10) {
      recommendations.push({
        action: 'clean_old_backups',
        title: 'Clean old backups',
        description: `${backupCount} automatic backups found. Old backups can be safely deleted.`,
        savings: 'Medium',
      });
    }

    // Always recommend export
    recommendations.push({
      action: 'export_data',
      title: 'Export your data',
      description: 'Export your profiles to Excel files for safekeeping and to free up browser storage.',
      savings: 'Variable',
    });
  }

  return recommendations;
}
