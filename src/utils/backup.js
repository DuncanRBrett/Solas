/**
 * Automatic backup system for Solas data
 *
 * Strategy:
 * 1. Save a timestamped backup on every profile save
 * 2. Keep last 10 backups per profile
 * 3. Provide checksum verification for data integrity
 * 4. Provide recovery UI
 *
 * CRITICAL: This prevents data loss from:
 * - Bad saves/corrupted data
 * - Browser cache clearing
 * - Accidental deletions
 * - Failed migrations
 */

export const BACKUP_CONFIG = {
  MAX_BACKUPS: 10,
  MAX_STORAGE_PERCENT: 80,
  BACKUP_PREFIX: 'solas_backup_',
};

/**
 * Calculate checksum for data integrity verification
 * Simple hash function for detecting corruption
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
 * Create a backup of the current profile
 *
 * @param {string} profileName - Name of the profile to backup
 * @param {object} profileData - Profile data to backup
 * @returns {object} - { success: boolean, backupKey?: string, error?: string }
 */
export const createBackup = (profileName, profileData) => {
  const timestamp = Date.now();
  const backupKey = `${BACKUP_CONFIG.BACKUP_PREFIX}${profileName}_${timestamp}`;

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

    // If quota exceeded, try cleaning old backups and retry
    if (error.name === 'QuotaExceededError') {
      try {
        cleanOldBackups(profileName, true); // Aggressive cleanup
        localStorage.setItem(backupKey, JSON.stringify(backup));
        return { success: true, backupKey, warning: 'Had to delete old backups due to storage limit' };
      } catch (retryError) {
        return { success: false, error: 'Storage quota exceeded. Please export your data and clear old backups.' };
      }
    }

    return { success: false, error: error.message };
  }
};

/**
 * Verify backup integrity
 *
 * @param {object} backup - Backup object to verify
 * @returns {object} - { valid: boolean, reason?: string }
 */
export const verifyBackup = (backup) => {
  if (!backup || !backup.data || !backup.checksum) {
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
 *
 * @param {string} profileName - Name of the profile
 * @returns {array} - Array of backup metadata objects
 */
export const getBackups = (profileName) => {
  // Get all keys from localStorage (handle both real and mock implementations)
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }

  const backupKeys = allKeys.filter(k =>
    k.startsWith(`${BACKUP_CONFIG.BACKUP_PREFIX}${profileName}_`)
  );

  return backupKeys
    .map(key => {
      try {
        const backup = JSON.parse(localStorage.getItem(key));
        const verification = verifyBackup(backup);
        const backupSize = localStorage.getItem(key).length;

        return {
          key,
          timestamp: backup.timestamp,
          date: new Date(backup.timestamp),
          displayDate: new Date(backup.timestamp).toLocaleString(),
          size: backupSize,
          sizeKB: Math.round(backupSize / 1024),
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
    .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
};

/**
 * Clean old backups, keeping only the most recent
 *
 * @param {string} profileName - Name of the profile
 * @param {boolean} aggressive - If true, keep only 3 backups (emergency cleanup)
 * @returns {number} - Number of backups deleted
 */
export const cleanOldBackups = (profileName, aggressive = false) => {
  const backups = getBackups(profileName);
  const validBackups = backups.filter(b => b.isValid);

  // In aggressive mode, keep only 3 backups
  const keepCount = aggressive ? 3 : BACKUP_CONFIG.MAX_BACKUPS;

  // Delete oldest backups beyond the keep limit
  const toDelete = validBackups.slice(keepCount);

  toDelete.forEach(backup => {
    try {
      localStorage.removeItem(backup.key);
    } catch (error) {
      console.error('Failed to delete backup:', backup.key, error);
    }
  });

  // Also delete any invalid backups
  const invalidBackups = backups.filter(b => !b.isValid);
  invalidBackups.forEach(backup => {
    try {
      localStorage.removeItem(backup.key);
    } catch (error) {
      console.error('Failed to delete invalid backup:', backup.key, error);
    }
  });

  return toDelete.length + invalidBackups.length;
};

/**
 * Restore from backup
 *
 * @param {string} backupKey - Key of the backup to restore
 * @returns {object} - { success: boolean, data?: object, timestamp?: number, error?: string }
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
      profileName: backup.profileName,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Export all backups for a profile as downloadable JSON
 *
 * @param {string} profileName - Name of the profile
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

/**
 * Get storage statistics
 *
 * @returns {object} - Storage usage information
 */
export const getStorageStats = () => {
  let totalSize = 0;
  let backupSize = 0;
  let backupCount = 0;

  // Iterate through localStorage (handle both real and mock implementations)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const item = localStorage.getItem(key);
      if (item) {
        const itemSize = item.length;
        totalSize += itemSize;

        if (key.startsWith(BACKUP_CONFIG.BACKUP_PREFIX)) {
          backupSize += itemSize;
          backupCount++;
        }
      }
    }
  }

  // Estimate quota (typically 5-10MB per origin)
  const estimatedQuota = 10 * 1024 * 1024; // 10MB estimate
  const usagePercent = (totalSize / estimatedQuota) * 100;

  return {
    totalSize,
    totalSizeKB: Math.round(totalSize / 1024),
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    backupSize,
    backupSizeKB: Math.round(backupSize / 1024),
    backupCount,
    estimatedQuota,
    usagePercent: Math.round(usagePercent),
    nearQuota: usagePercent > BACKUP_CONFIG.MAX_STORAGE_PERCENT,
  };
};

/**
 * Delete all backups for a profile
 * USE WITH CAUTION - only for testing or explicit user request
 *
 * @param {string} profileName - Name of the profile
 * @returns {number} - Number of backups deleted
 */
export const deleteAllBackups = (profileName) => {
  const backups = getBackups(profileName);

  backups.forEach(backup => {
    try {
      localStorage.removeItem(backup.key);
    } catch (error) {
      console.error('Failed to delete backup:', backup.key, error);
    }
  });

  return backups.length;
};
