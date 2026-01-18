import { create } from 'zustand';
import { createDefaultProfile } from '../models/defaults';
import { createBackup } from '../utils/backup';
import { loadProfile, addVersionToProfile } from '../utils/migrations';
import { debounce } from '../utils/debounce';
import { checkStorageHealth } from '../utils/storageQuota';
import {
  AssetSchema,
  LiabilitySchema,
  IncomeSchema,
  ExpenseSchema,
  ScenarioSchema,
  validateData,
  formatValidationErrors,
} from '../models/validation';

// Create debounced save function (saves 1 second after last change)
// This prevents excessive localStorage writes when user is actively editing
let debouncedSaveProfile;

// Multi-profile Zustand store
const useStore = create((set, get) => ({
  // Profile management
  currentProfileName: null,
  profiles: [], // List of profile names

  // Current profile data
  profile: null,

  // Error state for initialization/loading issues
  // Components should check this and display appropriate toast/message
  initError: null,
  clearInitError: () => set({ initError: null }),

  // Initialize from localStorage
  init: () => {
    const profilesJson = localStorage.getItem('solas_profiles');
    const profiles = profilesJson ? JSON.parse(profilesJson) : [];

    if (profiles.length === 0) {
      // First time - create default profile
      const defaultProfile = createDefaultProfile('Duncan');
      addVersionToProfile(defaultProfile);
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
        // Save migrated profile back if it was migrated
        if (result.migrated) {
          console.log('Profile migrated, saving...');
          localStorage.setItem(
            `solas_profile_${firstProfileName}`,
            JSON.stringify(result.profile)
          );
          // Create backup of migrated profile
          createBackup(firstProfileName, result.profile);
        }

        set({
          profiles,
          currentProfileName: firstProfileName,
          profile: result.profile,
        });
      } else {
        // Handle corrupt profile - try to recover
        console.error('Failed to load profile:', result.error);
        console.log('Attempting to recover from backup...');

        // TODO: Add backup recovery UI in Phase 0.7
        // For now, create a new default profile
        const defaultProfile = createDefaultProfile(firstProfileName);
        addVersionToProfile(defaultProfile);

        set({
          profiles,
          currentProfileName: firstProfileName,
          profile: defaultProfile,
          initError: 'Profile data was corrupted and could not be loaded. A new profile has been created. You may be able to restore from a backup.',
        });
      }
    }
  },

  // Switch profile
  // Returns { success: true } or { success: false, error: string }
  switchProfile: (profileName) => {
    const profileDataStr = localStorage.getItem(`solas_profile_${profileName}`);

    if (!profileDataStr) {
      return { success: false, error: `Profile "${profileName}" not found` };
    }

    const result = loadProfile(profileDataStr);

    if (result.success) {
      // Save migrated profile back if it was migrated
      if (result.migrated) {
        localStorage.setItem(
          `solas_profile_${profileName}`,
          JSON.stringify(result.profile)
        );
        createBackup(profileName, result.profile);
      }

      set({
        currentProfileName: profileName,
        profile: result.profile,
      });

      return { success: true };
    } else {
      console.error('Failed to switch to profile:', result.error);
      return { success: false, error: `Failed to load profile "${profileName}": ${result.error}` };
    }
  },

  // Create new profile
  // Returns { success: true } or { success: false, error: string }
  createProfile: (profileName) => {
    const { profiles } = get();

    if (profiles.includes(profileName)) {
      return { success: false, error: 'Profile already exists' };
    }

    const newProfile = createDefaultProfile(profileName);
    addVersionToProfile(newProfile);
    localStorage.setItem(`solas_profile_${profileName}`, JSON.stringify(newProfile));

    const updatedProfiles = [...profiles, profileName];
    localStorage.setItem('solas_profiles', JSON.stringify(updatedProfiles));

    set({
      profiles: updatedProfiles,
      currentProfileName: profileName,
      profile: newProfile,
    });

    return { success: true };
  },

  // Delete profile
  // Note: Caller should show confirmation dialog BEFORE calling this
  // Returns { success: true } or { success: false, error: string }
  deleteProfile: (profileName) => {
    const { profiles, currentProfileName } = get();

    if (profiles.length === 1) {
      return { success: false, error: 'Cannot delete the only profile' };
    }

    // Remove from localStorage
    localStorage.removeItem(`solas_profile_${profileName}`);

    const updatedProfiles = profiles.filter(p => p !== profileName);
    localStorage.setItem('solas_profiles', JSON.stringify(updatedProfiles));

    // If deleting current profile, switch to first available
    if (profileName === currentProfileName) {
      const newCurrentProfile = updatedProfiles[0];
      const profileData = JSON.parse(
        localStorage.getItem(`solas_profile_${newCurrentProfile}`)
      );

      set({
        profiles: updatedProfiles,
        currentProfileName: newCurrentProfile,
        profile: profileData,
      });
    } else {
      set({ profiles: updatedProfiles });
    }

    return { success: true };
  },

  // Rename profile
  // Returns { success: true } or { success: false, error: string }
  renameProfile: (oldName, newName) => {
    const { profiles, currentProfileName } = get();

    if (profiles.includes(newName)) {
      return { success: false, error: 'Profile with that name already exists' };
    }

    // Get profile data
    const profileData = JSON.parse(localStorage.getItem(`solas_profile_${oldName}`));
    profileData.name = newName;
    profileData.updatedAt = new Date().toISOString();

    // Save with new name
    localStorage.setItem(`solas_profile_${newName}`, JSON.stringify(profileData));
    localStorage.removeItem(`solas_profile_${oldName}`);

    // Update profiles list
    const updatedProfiles = profiles.map(p => p === oldName ? newName : p);
    localStorage.setItem('solas_profiles', JSON.stringify(updatedProfiles));

    set({
      profiles: updatedProfiles,
      currentProfileName: currentProfileName === oldName ? newName : currentProfileName,
      profile: currentProfileName === oldName ? profileData : get().profile,
    });

    return { success: true };
  },

  // Save current profile to localStorage (IMMEDIATE - no debouncing)
  // Use this for critical operations like deleting, switching profiles, etc.
  saveProfileImmediate: () => {
    const { currentProfileName, profile } = get();
    if (profile) {
      profile.updatedAt = new Date().toISOString();

      try {
        // Save main profile
        localStorage.setItem(`solas_profile_${currentProfileName}`, JSON.stringify(profile));

        // Create automatic backup
        const backupResult = createBackup(currentProfileName, profile);
        if (!backupResult.success) {
          console.error('Backup failed:', backupResult.error);
          // Don't fail the save, but log the error
          // User will be notified via console, and we can add UI notifications later
        }

        // Check storage health periodically (every 10th save)
        if (Math.random() < 0.1) {
          checkStorageHealth().then(health => {
            if (health.status === 'danger') {
              console.error('Storage quota danger:', health.message);
              // In future: show toast notification to user
            } else if (health.status === 'warning') {
              console.warn('Storage quota warning:', health.message);
            }
          });
        }
      } catch (error) {
        // Handle QuotaExceededError
        if (error.name === 'QuotaExceededError') {
          console.error('localStorage quota exceeded!');
          alert('Storage quota exceeded! Please export your data and remove old profiles.');
        } else {
          console.error('Failed to save profile:', error);
        }
        throw error; // Re-throw for caller to handle
      }
    }
  },

  // Save current profile to localStorage (DEBOUNCED - waits 1 second)
  // Use this for normal operations like adding/editing assets, updating settings, etc.
  // This prevents excessive localStorage writes during active editing
  saveProfile: () => {
    // Initialize debounced function if not already created
    if (!debouncedSaveProfile) {
      debouncedSaveProfile = debounce(() => {
        get().saveProfileImmediate();
      }, 1000); // Wait 1 second after last change
    }

    // Call debounced save
    debouncedSaveProfile();
  },

  // Flush any pending debounced saves immediately
  // Use before operations that need guaranteed save (like navigation away, logout, etc.)
  flushSave: () => {
    if (debouncedSaveProfile) {
      debouncedSaveProfile.flush();
    }
  },

  // Update settings
  updateSettings: (newSettings) => {
    set((state) => ({
      profile: {
        ...state.profile,
        settings: { ...state.profile.settings, ...newSettings },
      },
    }));
    get().saveProfile();
  },

  // Assets
  addAsset: (asset) => {
    // Validate asset before adding
    const result = validateData(AssetSchema, asset);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Asset validation failed:', errorMsg);
      // Return error for UI to handle
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        assets: [...state.profile.assets, result.data],
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  setAssets: (assets) => {
    set((state) => ({
      profile: {
        ...state.profile,
        assets: assets,
      },
    }));
    get().saveProfile();
  },

  updateAsset: (id, updates) => {
    // Find the asset and create updated version
    const currentAsset = get().profile.assets.find(a => a.id === id);
    if (!currentAsset) {
      return { success: false, message: 'Asset not found' };
    }

    const updatedAsset = { ...currentAsset, ...updates };

    // Validate updated asset
    const result = validateData(AssetSchema, updatedAsset);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Asset validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        assets: state.profile.assets.map((a) =>
          a.id === id ? result.data : a
        ),
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  deleteAsset: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        assets: state.profile.assets.filter((a) => a.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Liabilities
  addLiability: (liability) => {
    // Validate liability before adding
    const result = validateData(LiabilitySchema, liability);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Liability validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        liabilities: [...state.profile.liabilities, result.data],
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  updateLiability: (id, updates) => {
    const currentLiability = get().profile.liabilities.find(l => l.id === id);
    if (!currentLiability) {
      return { success: false, message: 'Liability not found' };
    }

    const updatedLiability = { ...currentLiability, ...updates };
    const result = validateData(LiabilitySchema, updatedLiability);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Liability validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        liabilities: state.profile.liabilities.map((l) =>
          l.id === id ? result.data : l
        ),
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  deleteLiability: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        liabilities: state.profile.liabilities.filter((l) => l.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Income
  addIncome: (income) => {
    const result = validateData(IncomeSchema, income);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Income validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        income: [...state.profile.income, result.data],
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  updateIncome: (id, updates) => {
    const currentIncome = get().profile.income.find(i => i.id === id);
    if (!currentIncome) {
      return { success: false, message: 'Income source not found' };
    }

    const updatedIncome = { ...currentIncome, ...updates };
    const result = validateData(IncomeSchema, updatedIncome);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Income validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        income: state.profile.income.map((i) =>
          i.id === id ? result.data : i
        ),
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  deleteIncome: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        income: state.profile.income.filter((i) => i.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Expenses
  addExpense: (expense) => {
    const result = validateData(ExpenseSchema, expense);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Expense validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        expenses: [...state.profile.expenses, result.data],
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  updateExpense: (id, updates) => {
    const currentExpense = get().profile.expenses.find(e => e.id === id);
    if (!currentExpense) {
      return { success: false, message: 'Expense not found' };
    }

    const updatedExpense = { ...currentExpense, ...updates };
    const result = validateData(ExpenseSchema, updatedExpense);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Expense validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        expenses: state.profile.expenses.map((e) =>
          e.id === id ? result.data : e
        ),
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  deleteExpense: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenses: state.profile.expenses.filter((e) => e.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Expense Categories (Hierarchical)
  addExpenseCategory: (category) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: [...(state.profile.expenseCategories || []), category],
      },
    }));
    get().saveProfile();
  },

  updateExpenseCategory: (id, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      },
    }));
    get().saveProfile();
  },

  deleteExpenseCategory: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).filter((c) => c.id !== id),
      },
    }));
    get().saveProfile();
  },

  // Subcategories within a category
  addSubcategory: (categoryId, subcategory) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: [...c.subcategories, subcategory] }
            : c
        ),
      },
    }));
    get().saveProfile();
  },

  updateSubcategory: (categoryId, subcategoryId, updates) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === categoryId
            ? {
                ...c,
                subcategories: c.subcategories.map((s) =>
                  s.id === subcategoryId ? { ...s, ...updates } : s
                ),
              }
            : c
        ),
      },
    }));
    get().saveProfile();
  },

  deleteSubcategory: (categoryId, subcategoryId) => {
    set((state) => ({
      profile: {
        ...state.profile,
        expenseCategories: (state.profile.expenseCategories || []).map((c) =>
          c.id === categoryId
            ? {
                ...c,
                subcategories: c.subcategories.filter((s) => s.id !== subcategoryId),
              }
            : c
        ),
      },
    }));
    get().saveProfile();
  },

  // Age-Based Expense Plan
  updateAgeBasedExpensePlan: (plan) => {
    set((state) => ({
      profile: {
        ...state.profile,
        ageBasedExpensePlan: plan,
      },
    }));
    get().saveProfile();
  },

  // Scenarios
  addScenario: (scenario) => {
    const result = validateData(ScenarioSchema, scenario);
    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Scenario validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        scenarios: [...state.profile.scenarios, result.data],
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  updateScenario: (id, updates) => {
    const currentScenario = get().profile.scenarios.find(s => s.id === id);
    if (!currentScenario) {
      return { success: false, message: 'Scenario not found' };
    }

    const updatedScenario = { ...currentScenario, ...updates };
    const result = validateData(ScenarioSchema, updatedScenario);

    if (!result.success) {
      const errorMsg = formatValidationErrors(result.errors);
      console.error('Scenario validation failed:', errorMsg);
      return { success: false, errors: result.errors, message: errorMsg };
    }

    set((state) => ({
      profile: {
        ...state.profile,
        scenarios: state.profile.scenarios.map((s) =>
          s.id === id ? result.data : s
        ),
      },
    }));
    get().saveProfile();
    return { success: true };
  },

  deleteScenario: (id) => {
    set((state) => ({
      profile: {
        ...state.profile,
        scenarios: state.profile.scenarios.filter((s) => s.id !== id),
      },
    }));
    get().saveProfile();
  },
}));

export default useStore;
