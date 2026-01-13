import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createBackup,
  verifyBackup,
  getBackups,
  cleanOldBackups,
  restoreFromBackup,
  getStorageStats,
  deleteAllBackups,
  BACKUP_CONFIG,
} from '../backup';

describe('Backup System', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should create a backup with correct structure', () => {
      const profileData = {
        assets: [{ id: '1', name: 'Test Asset', value: 1000 }],
        liabilities: [],
        settings: { currency: 'ZAR' },
      };

      const result = createBackup('TestProfile', profileData);

      expect(result.success).toBe(true);
      expect(result.backupKey).toMatch(/^solas_backup_TestProfile_\d+$/);

      // Verify backup was saved
      const savedBackup = JSON.parse(localStorage.getItem(result.backupKey));
      expect(savedBackup.version).toBe('3.0.0');
      expect(savedBackup.profileName).toBe('TestProfile');
      expect(savedBackup.data).toEqual(profileData);
      expect(savedBackup.checksum).toBeDefined();
      expect(savedBackup.timestamp).toBeGreaterThan(0);
    });

    it('should handle storage quota errors gracefully', () => {
      const profileData = { test: 'data' };

      // Save original setItem
      const originalSetItem = localStorage.setItem;

      // Override setItem to throw QuotaExceededError
      localStorage.setItem = () => {
        const quotaError = new Error('QuotaExceededError');
        quotaError.name = 'QuotaExceededError';
        throw quotaError;
      };

      const result = createBackup('TestProfile', profileData);

      // Restore original setItem
      localStorage.setItem = originalSetItem;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
    });

    it('should create multiple backups for the same profile', () => {
      const profileData1 = { version: 1 };
      const profileData2 = { version: 2 };

      createBackup('TestProfile', profileData1);
      createBackup('TestProfile', profileData2);

      const backups = getBackups('TestProfile');
      expect(backups.length).toBe(2);
    });
  });

  describe('verifyBackup', () => {
    it('should verify valid backup', () => {
      const profileData = { test: 'data' };
      const result = createBackup('TestProfile', profileData);

      const backup = JSON.parse(localStorage.getItem(result.backupKey));
      const verification = verifyBackup(backup);

      expect(verification.valid).toBe(true);
    });

    it('should detect corrupted backup (invalid checksum)', () => {
      const profileData = { test: 'data' };
      const result = createBackup('TestProfile', profileData);

      // Corrupt the backup
      const backup = JSON.parse(localStorage.getItem(result.backupKey));
      backup.data = { corrupted: 'data' }; // Change data without updating checksum

      const verification = verifyBackup(backup);

      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain('Checksum mismatch');
    });

    it('should detect missing data', () => {
      const verification = verifyBackup({ checksum: 'abc123' });

      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain('Missing data');
    });

    it('should detect missing checksum', () => {
      const verification = verifyBackup({ data: { test: 'data' } });

      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain('Missing');
    });
  });

  describe('getBackups', () => {
    it('should return empty array when no backups exist', () => {
      const backups = getBackups('NonExistent');
      expect(backups).toEqual([]);
    });

    it('should return all backups for a profile', () => {
      createBackup('Profile1', { data: 1 });
      createBackup('Profile1', { data: 2 });
      createBackup('Profile2', { data: 3 });

      const profile1Backups = getBackups('Profile1');
      const profile2Backups = getBackups('Profile2');

      expect(profile1Backups.length).toBe(2);
      expect(profile2Backups.length).toBe(1);
    });

    it('should sort backups by timestamp (most recent first)', () => {
      // Create backups with small delays
      createBackup('TestProfile', { version: 1 });
      createBackup('TestProfile', { version: 2 });
      createBackup('TestProfile', { version: 3 });

      const backups = getBackups('TestProfile');

      expect(backups[0].timestamp).toBeGreaterThan(backups[1].timestamp);
      expect(backups[1].timestamp).toBeGreaterThan(backups[2].timestamp);
    });

    it('should include metadata for each backup', () => {
      createBackup('TestProfile', { test: 'data' });

      const backups = getBackups('TestProfile');
      const backup = backups[0];

      expect(backup.key).toBeDefined();
      expect(backup.timestamp).toBeGreaterThan(0);
      expect(backup.date).toBeInstanceOf(Date);
      expect(backup.displayDate).toBeDefined();
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.sizeKB).toBeGreaterThan(0);
      expect(backup.isValid).toBe(true);
    });

    it('should detect invalid backups', () => {
      // Create valid backup
      createBackup('TestProfile', { test: 'data' });

      // Add invalid backup manually
      localStorage.setItem('solas_backup_TestProfile_999', 'invalid json');

      const backups = getBackups('TestProfile');

      const invalidBackup = backups.find(b => b.timestamp === 0);
      expect(invalidBackup).toBeDefined();
      expect(invalidBackup.isValid).toBe(false);
    });
  });

  describe('cleanOldBackups', () => {
    it('should keep only MAX_BACKUPS most recent backups', () => {
      // Create more than MAX_BACKUPS
      for (let i = 0; i < 15; i++) {
        createBackup('TestProfile', { version: i });
      }

      cleanOldBackups('TestProfile');

      const backups = getBackups('TestProfile');
      expect(backups.length).toBe(BACKUP_CONFIG.MAX_BACKUPS);
    });

    it('should keep only 3 backups in aggressive mode', () => {
      // Create many backups
      for (let i = 0; i < 15; i++) {
        createBackup('TestProfile', { version: i });
      }

      cleanOldBackups('TestProfile', true); // Aggressive mode

      const backups = getBackups('TestProfile');
      expect(backups.length).toBe(3);
    });

    it('should remove invalid backups', () => {
      // Create valid backups
      createBackup('TestProfile', { version: 1 });
      createBackup('TestProfile', { version: 2 });

      // Add invalid backup
      localStorage.setItem('solas_backup_TestProfile_999', 'invalid');

      cleanOldBackups('TestProfile');

      const backups = getBackups('TestProfile');
      const hasInvalid = backups.some(b => !b.isValid);
      expect(hasInvalid).toBe(false);
    });

    it('should return number of deleted backups', () => {
      for (let i = 0; i < 15; i++) {
        createBackup('TestProfile', { version: i });
      }

      const deleted = cleanOldBackups('TestProfile');
      expect(deleted).toBe(5); // 15 - 10 = 5 deleted
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore valid backup', () => {
      const originalData = { assets: [{ id: '1', value: 1000 }] };
      const backupResult = createBackup('TestProfile', originalData);

      const restoreResult = restoreFromBackup(backupResult.backupKey);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.data).toEqual(originalData);
      expect(restoreResult.timestamp).toBeGreaterThan(0);
      expect(restoreResult.profileName).toBe('TestProfile');
    });

    it('should fail on non-existent backup', () => {
      const result = restoreFromBackup('nonexistent_key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail on corrupted backup', () => {
      const backupResult = createBackup('TestProfile', { test: 'data' });

      // Corrupt the backup
      const backup = JSON.parse(localStorage.getItem(backupResult.backupKey));
      backup.data = { corrupted: true };
      localStorage.setItem(backupResult.backupKey, JSON.stringify(backup));

      const restoreResult = restoreFromBackup(backupResult.backupKey);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.error).toContain('corrupted');
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', () => {
      createBackup('Profile1', { data: 'test1' });
      createBackup('Profile2', { data: 'test2' });

      const stats = getStorageStats();

      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.totalSizeKB).toBeGreaterThan(0);
      expect(stats.totalSizeMB).toBeDefined();
      expect(stats.backupSize).toBeGreaterThan(0);
      expect(stats.backupCount).toBe(2);
      expect(stats.estimatedQuota).toBeGreaterThan(0);
      expect(stats.usagePercent).toBeGreaterThanOrEqual(0);
      expect(typeof stats.nearQuota).toBe('boolean');
    });

    it('should detect when near quota', () => {
      // This is hard to test without actually filling storage
      // but we can at least verify the structure
      const stats = getStorageStats();
      expect(stats.nearQuota).toBe(stats.usagePercent > BACKUP_CONFIG.MAX_STORAGE_PERCENT);
    });
  });

  describe('deleteAllBackups', () => {
    it('should delete all backups for a profile', () => {
      createBackup('TestProfile', { version: 1 });
      createBackup('TestProfile', { version: 2 });
      createBackup('OtherProfile', { version: 1 });

      const deleted = deleteAllBackups('TestProfile');

      expect(deleted).toBe(2);
      expect(getBackups('TestProfile').length).toBe(0);
      expect(getBackups('OtherProfile').length).toBe(1); // Should not delete other profiles
    });

    it('should return 0 when no backups exist', () => {
      const deleted = deleteAllBackups('NonExistent');
      expect(deleted).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete backup/restore workflow', () => {
      const originalData = {
        assets: [
          { id: '1', name: 'Asset 1', value: 1000 },
          { id: '2', name: 'Asset 2', value: 2000 },
        ],
        liabilities: [{ id: '1', amount: 500 }],
        settings: { currency: 'ZAR', age: 55 },
      };

      // Create backup
      const backupResult = createBackup('MyProfile', originalData);
      expect(backupResult.success).toBe(true);

      // Verify it exists
      const backups = getBackups('MyProfile');
      expect(backups.length).toBe(1);
      expect(backups[0].isValid).toBe(true);

      // Restore it
      const restoreResult = restoreFromBackup(backupResult.backupKey);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.data).toEqual(originalData);
    });

    it('should automatically clean old backups on create', () => {
      // Create MAX_BACKUPS + 5 backups
      for (let i = 0; i < BACKUP_CONFIG.MAX_BACKUPS + 5; i++) {
        createBackup('TestProfile', { version: i });
      }

      // Should only have MAX_BACKUPS
      const backups = getBackups('TestProfile');
      expect(backups.length).toBe(BACKUP_CONFIG.MAX_BACKUPS);

      // Should have most recent backups
      const firstBackup = JSON.parse(localStorage.getItem(backups[0].key));
      expect(firstBackup.data.version).toBeGreaterThanOrEqual(BACKUP_CONFIG.MAX_BACKUPS);
    });
  });
});
